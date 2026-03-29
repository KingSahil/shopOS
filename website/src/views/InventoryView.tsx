import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
      };
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const DEFAULT_PRODUCT_FORM = {
  name: '',
  category: 'Essentials',
  sku: '',
  barcode: '',
  unitPrice: '',
  stock: '0'
};

type BarcodeLookupResult = {
  barcode: string;
  name: string;
  brand: string;
  quantity: string;
  imageUrl: string;
  unitPrice: number | null;
  currency: string | null;
  priceSource: string | null;
};

const BARCODE_LOOKUP_USER_AGENT = 'shopos/1.0 inventory-lookup';

const extractRupeePrice = (...values: Array<string | null | undefined>) => {
  const combinedValue = values
    .map(value => String(value || ' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!combinedValue) return null;

  const directMatch = combinedValue.match(/(?:₹|rs\.?|mrp\s*[:\-]?\s*)(\d+(?:\.\d{1,2})?)/i);
  if (directMatch) {
    return Number(directMatch[1]);
  }

  const compactMatch = combinedValue.match(/(\d+(?:\.\d{1,2})?)\s*(?:rs|rupees)\b/i);
  if (compactMatch) {
    return Number(compactMatch[1]);
  }

  const suffixMatch = combinedValue.match(/(\d+(?:\.\d{1,2})?)\s*(?:g|kg|ml|l|gm)\s*(\d+(?:\.\d{1,2})?)\s*(?:rs|rupees)\b/i);
  if (suffixMatch) {
    return Number(suffixMatch[2]);
  }

  return null;
};

const cleanProductTitle = (...values: Array<string | null | undefined>) => {
  const combinedValue = values
    .map(value => String(value || ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!combinedValue) return '';

  return combinedValue
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|kg|gm|ml|l|ltr|litre|litres)\s*\d+(?:\.\d{1,2})?\s*(?:rs|rupees)\b/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|kg|gm|ml|l|ltr|litre|litres)\b/gi, ' ')
    .replace(/(?:₹|rs\.?|mrp\s*[:\-]?\s*)\d+(?:\.\d{1,2})?/gi, ' ')
    .replace(/\b\d+(?:\.\d{1,2})?\s*(?:rs|rupees)\b/gi, ' ')
    .replace(/\bpack of \d+\b/gi, ' ')
    .replace(/\b\d+\s*(?:pcs|pieces)\b/gi, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[-,/:]+$/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const resolveInventoryName = (item: Record<string, unknown>) =>
  String(item.name ?? item.description ?? item.productName ?? '').trim();

const resolveInventoryUnitPrice = (item: Record<string, unknown>) => {
  const directUnitPrice = Number(item.unitPrice ?? item.mrp);
  if (Number.isFinite(directUnitPrice) && directUnitPrice >= 0) {
    return directUnitPrice;
  }

  const stock = Math.max(0, Number(item.stock) || 0);
  const totalPrice = Number(item.price);
  if (stock > 0 && Number.isFinite(totalPrice) && totalPrice >= 0) {
    return totalPrice / stock;
  }

  return 0;
};

export default function InventoryView() {
  const { showToast } = useToast();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [isLookingUpProduct, setIsLookingUpProduct] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [stats, setStats] = useState({ totalValue: 0, lowStockCount: 0, categoryCount: 0, lowestStockItem: null as any });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const lastDetectedRef = useRef<{ code: string; detectedAt: number } | null>(null);
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const normalizeProductName = (value: unknown) => String(value ?? '').trim().toLowerCase();
  const normalizeLookupValue = (value: unknown) => String(value ?? '').trim().toLowerCase();

  const resetAddProductForm = () => {
    setProductForm(DEFAULT_PRODUCT_FORM);
    setScannerError('');
  };

  const stopScanner = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    scannerReaderRef.current = null;

    if (scannerFrameRef.current) {
      cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(track => track.stop());
      scannerStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    lastDetectedRef.current = null;
  };

  const closeAddProductModal = () => {
    stopScanner();
    setIsScannerOpen(false);
    setIsAddProductOpen(false);
    setEditingProduct(null);
    resetAddProductForm();
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setOpenMenuId(null);
    setIsAddProductOpen(true);
    resetAddProductForm();
  };

  const openEditProductModal = (item: any) => {
    setEditingProduct(item);
    setOpenMenuId(null);
    stopScanner();
    setIsScannerOpen(false);
    setScannerError('');
    setProductForm({
      name: resolveInventoryName(item),
      category: item.category ?? DEFAULT_PRODUCT_FORM.category,
      sku: item.sku ?? '',
      barcode: item.barcode ?? '',
      unitPrice: String(resolveInventoryUnitPrice(item) || ''),
      stock: String(item.stock ?? 0)
    });
    setIsAddProductOpen(true);
  };

  const findInventoryItemByCode = (rawCode: string) => {
    const normalizedCode = normalizeLookupValue(rawCode);
    if (!normalizedCode) return null;

    return inventoryItems.find(item => {
      const candidates = [item.barcode, item.sku, item.id];
      return candidates.some(candidate => normalizeLookupValue(candidate) === normalizedCode);
    }) || null;
  };

  const fetchBarcodeProductDetails = async (barcode: string) => {
    const normalizedBarcode = String(barcode || '').trim();
    if (!normalizedBarcode) return null;

    setIsLookingUpProduct(true);

    try {
      let result: BarcodeLookupResult | null = null;

      try {
        const proxiedResponse = await fetch(`/api/barcode-lookup?code=${encodeURIComponent(normalizedBarcode)}`);
        const proxiedContentType = proxiedResponse.headers.get('content-type') || '';

        if (proxiedResponse.ok && proxiedContentType.includes('application/json')) {
          result = await proxiedResponse.json() as BarcodeLookupResult;
        }
      } catch (proxyError) {
        console.warn('Local barcode lookup endpoint unavailable, falling back to direct web lookup.', proxyError);
      }

      if (!result) {
        const productResponse = await fetch(
          `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(normalizedBarcode)}?fields=product_name,product_name_en,product_name_hi,brands,quantity,image_front_url`,
          {
            headers: {
              'User-Agent': BARCODE_LOOKUP_USER_AGENT
            }
          }
        );

        if (!productResponse.ok) {
          throw new Error(`Lookup failed with status ${productResponse.status}`);
        }

        const productPayload = await productResponse.json();
        const product = productPayload?.product ?? {};

        result = {
          barcode: normalizedBarcode,
          name: String(product.product_name_hi || product.product_name_en || product.product_name || '').trim(),
          brand: String(product.brands || '').trim(),
          quantity: String(product.quantity || '').trim(),
          imageUrl: String(product.image_front_url || '').trim(),
          unitPrice: null,
          currency: null,
          priceSource: null
        };
      }

      setProductForm(currentForm => {
        const rawResolvedName = result.name || currentForm.name;
        const cleanedName = cleanProductTitle(rawResolvedName);
        const cleanedBrand = cleanProductTitle(result.brand);
        const cleanedQuantity = cleanProductTitle(result.quantity);
        const resolvedNameWithBrand = [cleanedBrand, cleanedName].filter(Boolean).join(' ').trim() || currentForm.name;
        const resolvedDisplayName = cleanProductTitle(resolvedNameWithBrand, cleanedQuantity) || resolvedNameWithBrand;
        const parsedRupeePrice = extractRupeePrice(result.name, result.quantity, resolvedDisplayName);
        const resolvedUnitPrice = result.currency === 'INR' && result.unitPrice != null
          ? String(result.unitPrice)
          : currentForm.unitPrice || (parsedRupeePrice != null ? String(parsedRupeePrice) : '');

        return {
          ...currentForm,
          barcode: normalizedBarcode,
          sku: currentForm.sku || normalizedBarcode,
          name: currentForm.name || resolvedDisplayName,
          unitPrice: currentForm.unitPrice || resolvedUnitPrice,
          stock: currentForm.stock === '0' ? '1' : currentForm.stock
        };
      });

      if (result.name && result.currency === 'INR' && result.unitPrice != null) {
        setScannerError(`Fetched ${result.name} and filled unit price from ${result.priceSource}.`);
        showToast(`${result.name} found with MRP ₹${result.unitPrice}`, 'success');
      } else if (result.name) {
        const cleanedResultName = cleanProductTitle(result.brand, result.name);
        const parsedRupeePrice = extractRupeePrice(result.name, result.quantity, cleanedResultName);

        if (parsedRupeePrice != null) {
          setScannerError(`Fetched ${cleanedResultName || result.name} and detected ₹${parsedRupeePrice} from the product title.`);
          showToast(`${cleanedResultName || result.name} found with detected MRP ₹${parsedRupeePrice}`, 'success');
          return result;
        }

        setScannerError(`Fetched ${cleanedResultName || result.name}. Please confirm the MRP because no INR price was available online.`);
        showToast(`Fetched ${cleanedResultName || result.name}. Add the MRP manually if needed.`, 'info');
      } else {
        setScannerError(`Barcode ${normalizedBarcode} is new. Add the product details below to save it to inventory.`);
        showToast(`Barcode ${normalizedBarcode} captured for a new product`, 'info');
      }

      return result;
    } catch (error) {
      console.error('Error fetching product details from barcode:', error);
      setProductForm(currentForm => ({
        ...currentForm,
        barcode: normalizedBarcode,
        sku: currentForm.sku || normalizedBarcode,
        stock: currentForm.stock === '0' ? '1' : currentForm.stock
      }));
      setScannerError(`Could not fetch product details for barcode ${normalizedBarcode}. Add the product name and MRP manually.`);
      showToast('Barcode captured, but online details were unavailable', 'info');
      return null;
    } finally {
      setIsLookingUpProduct(false);
    }
  };

  const restockInventoryItem = async (item: any, scannedCode: string) => {
    if (!auth.currentUser) return;

    const currentStock = Math.max(0, Number(item.stock) || 0);
    const updatedStock = currentStock + 1;
    const nextUnitPrice = Number(item.unitPrice) || 0;
    const resolvedBarcode = normalizeLookupValue(item.barcode) ? item.barcode : scannedCode;

    await updateDoc(doc(db, `users/${auth.currentUser.uid}/inventory/${item.id}`), {
      barcode: resolvedBarcode,
      stock: updatedStock,
      price: nextUnitPrice * updatedStock,
      maxStock: Math.max(Number(item.maxStock) || 0, updatedStock, updatedStock * 2, 100),
      status: updatedStock < 20 ? 'error' : 'tertiary'
    });

    showToast(`${item.name} stock increased to ${updatedStock}`, 'success');
  };

  const startInventoryScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Camera access is not available on this device. You can still use a hardware scanner or type the SKU/barcode.');
      showToast('Camera access is not available on this device', 'error');
      return;
    }

    try {
      stopScanner();
      setScannerError('');
      setIsScannerOpen(true);
      setIsStartingScanner(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      scannerStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const processDetectedCode = async (rawCode: string) => {
        const normalizedCode = normalizeLookupValue(rawCode);
        const now = Date.now();
        const lastDetected = lastDetectedRef.current;

        if (lastDetected && lastDetected.code === normalizedCode && now - lastDetected.detectedAt <= 2500) {
          return;
        }

        lastDetectedRef.current = { code: normalizedCode, detectedAt: now };

        const matchedItem = findInventoryItemByCode(rawCode);
        if (matchedItem) {
          try {
            await restockInventoryItem(matchedItem, rawCode);
        setProductForm(currentForm => ({
          ...currentForm,
          barcode: rawCode,
          sku: currentForm.sku || rawCode
            }));
            setScannerError('');
          } catch (error) {
            console.error('Error updating inventory from scan:', error);
            setScannerError(`Unable to update ${matchedItem.name} from barcode scan right now.`);
            showToast('Failed to update scanned product stock', 'error');
          }
          return;
        }

        await fetchBarcodeProductDetails(rawCode);
      };

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar']
        });

        const scanFrame = async () => {
          if (!videoRef.current) return;

          try {
            const detectedBarcodes = await detector.detect(videoRef.current);
            const rawCode = detectedBarcodes[0]?.rawValue;

            if (rawCode) {
              await processDetectedCode(rawCode);
            }
          } catch (error) {
            console.error('Inventory barcode scan failed:', error);
          }

          scannerFrameRef.current = requestAnimationFrame(scanFrame);
        };

        scannerFrameRef.current = requestAnimationFrame(scanFrame);
      } else {
        const reader = new BrowserMultiFormatReader();
        scannerReaderRef.current = reader;
        scannerControlsRef.current = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          },
          videoRef.current ?? undefined,
          (result, error) => {
            if (result?.getText()) {
              void processDetectedCode(result.getText());
              return;
            }

            if (error && error.name !== 'NotFoundException') {
              console.error('Inventory compatibility barcode scan failed:', error);
            }
          }
        );
        showToast('Compatibility barcode scanner started', 'info');
      }
    } catch (error) {
      console.error('Error starting inventory barcode scanner:', error);
      setIsScannerOpen(false);
      setScannerError('Camera access was blocked. Allow camera permission to scan product barcodes.');
      showToast('Unable to start barcode scanner', 'error');
      stopScanner();
    } finally {
      setIsStartingScanner(false);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
    const q = query(inventoryRef, orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupedItems = new Map<string, any>();

      snapshot.docs.forEach((inventoryDoc) => {
        const data = inventoryDoc.data();
        const resolvedName = resolveInventoryName(data);
        const normalizedName = normalizeProductName(resolvedName);
        const safeStock = Math.max(0, Number(data.stock) || 0);
        const safeUnitPrice = resolveInventoryUnitPrice(data);
        const existingItem = groupedItems.get(normalizedName);

        if (!existingItem) {
          groupedItems.set(normalizedName, {
            ...data,
            id: inventoryDoc.id,
            name: resolvedName || 'Unnamed Item',
            mrp: safeUnitPrice,
            stock: safeStock,
            unitPrice: safeUnitPrice,
            price: safeUnitPrice * safeStock,
            maxStock: Math.max(Number(data.maxStock) || 0, safeStock, 100),
            status: safeStock < 20 ? 'error' : 'tertiary'
          });
          return;
        }

        const mergedStock = existingItem.stock + safeStock;
        const mergedUnitPrice = safeUnitPrice || existingItem.unitPrice || 0;
        groupedItems.set(normalizedName, {
          ...existingItem,
          name: existingItem.name || resolvedName || 'Unnamed Item',
          mrp: mergedUnitPrice,
          stock: mergedStock,
          unitPrice: mergedUnitPrice,
          price: mergedUnitPrice * mergedStock,
          maxStock: Math.max(existingItem.maxStock || 0, Number(data.maxStock) || 0, mergedStock, 100),
          status: mergedStock < 20 ? 'error' : 'tertiary'
        });
      });

      const items = Array.from(groupedItems.values());
      const totalValue = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
      const lowStockCount = items.filter((item: any) => item.status === 'error').length;
      const categoryCount = new Set(items.map((item: any) => item.category).filter(Boolean)).size;
      const lowestStockItem = items.length > 0
        ? items.slice().sort((a: any, b: any) => {
            const ratioA = a.maxStock > 0 ? a.stock / a.maxStock : 1;
            const ratioB = b.maxStock > 0 ? b.stock / b.maxStock : 1;
            return ratioA - ratioB;
          })[0]
        : null;
      setStats({ totalValue, lowStockCount, categoryCount, lowestStockItem });
      setInventoryItems(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/inventory`);
      showToast('Failed to load inventory', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAddProductOpen) {
      stopScanner();
      setIsScannerOpen(false);
      setScannerError('');
    }
  }, [isAddProductOpen]);

  useEffect(() => () => stopScanner(), []);

  useEffect(() => {
    if (!openMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-inventory-actions="true"]')) {
        return;
      }
      setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenuId]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const stock = Math.max(0, Number(productForm.stock));
    const unitPrice = Math.max(0, Number(productForm.unitPrice));
    const price = unitPrice * stock;
    const maxStock = Math.max(100, stock * 2);
    const sku = productForm.sku.trim() || `SKU-${Math.floor(Math.random() * 10000)}`;
    const barcode = productForm.barcode.trim();
    const name = productForm.name.trim();
    const normalizedName = normalizeProductName(name);

    const newItem = {
      id: Date.now(), // Using timestamp as numeric ID for schema compatibility
      name,
      description: name,
      sku,
      barcode,
      category: productForm.category,
      stock,
      maxStock,
      price,
      unitPrice,
      mrp: unitPrice,
      status: stock < 20 ? 'error' : 'tertiary'
    };

    try {
      const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
      const existingItem = inventoryItems.find(item => {
        if (editingProduct && item.id === editingProduct.id) {
          return false;
        }
        return normalizeProductName(item.name) === normalizedName;
      });

      if (editingProduct) {
        await updateDoc(doc(db, `users/${auth.currentUser.uid}/inventory/${editingProduct.id}`), {
          name,
          description: name,
          sku,
          barcode,
          category: productForm.category,
          stock,
          unitPrice,
          mrp: unitPrice,
          price,
          maxStock,
          status: stock < 20 ? 'error' : 'tertiary'
        });
        showToast('Product updated successfully', 'success');
      } else if (existingItem) {
        const updatedStock = Math.max(0, Number(existingItem.stock) || 0) + stock;
        const updatedUnitPrice = unitPrice;
        await updateDoc(doc(db, `users/${auth.currentUser.uid}/inventory/${existingItem.id}`), {
          name,
          description: name,
          sku,
          barcode: barcode || existingItem.barcode || '',
          category: productForm.category,
          stock: updatedStock,
          unitPrice: updatedUnitPrice,
          mrp: updatedUnitPrice,
          price: updatedUnitPrice * updatedStock,
          maxStock: Math.max(Number(existingItem.maxStock) || 0, updatedStock, updatedStock * 2, 100),
          status: updatedStock < 20 ? 'error' : 'tertiary'
        });
        showToast('Product stock updated successfully', 'success');
      } else {
        await addDoc(inventoryRef, newItem);
        showToast('Product added successfully', 'success');
      }

      closeAddProductModal();
    } catch (error) {
      handleFirestoreError(
        error,
        editingProduct ? OperationType.UPDATE : OperationType.CREATE,
        `users/${auth.currentUser.uid}/inventory`
      );
      showToast(editingProduct ? 'Failed to update product' : 'Failed to add product', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!auth.currentUser || !productToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/inventory`, productToDelete.id));
      showToast(`${productToDelete.name} deleted successfully`, 'success');
      setProductToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/inventory`);
      showToast('Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <TopBar title="Inventory" />
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Quick Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2 glass-gradient p-6 rounded-[1.5rem] text-white flex flex-col justify-between h-44 ambient-shadow">
            <div>
              <p className="text-on-primary-container text-sm font-medium opacity-80">Total Inventory Value</p>
              <h3 className="text-3xl font-headline font-extrabold mt-1">₹{stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-xs">inventory_2</span>
              <span>{inventoryItems.length} product{inventoryItems.length !== 1 ? 's' : ''} tracked</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ambient-shadow ghost-border flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-error-container/30 text-error rounded-xl">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="text-xs font-bold text-error bg-error-container px-2 py-1 rounded-full">ACTION NEEDED</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium">Low Stock Alerts</p>
              <h3 className="text-2xl font-headline font-extrabold text-on-surface">{stats.lowStockCount} Item{stats.lowStockCount !== 1 ? 's' : ''}</h3>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ambient-shadow ghost-border flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-tertiary-container/20 text-tertiary rounded-xl">
                <span className="material-symbols-outlined">inventory</span>
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium">Categories</p>
              <h3 className="text-2xl font-headline font-extrabold text-on-surface">{stats.categoryCount} Sector{stats.categoryCount !== 1 ? 's' : ''}</h3>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
            <button 
              onClick={openAddProductModal}
              className="glass-gradient text-white px-6 py-3 rounded-full font-headline font-bold text-sm flex items-center gap-2 ambient-shadow active:scale-95 transition-transform whitespace-nowrap h-12"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add New Product
            </button>
            <button 
              onClick={() => showToast('Opening filters...', 'info')}
              className="bg-surface-container-lowest text-on-surface-variant px-6 py-3 rounded-full font-headline font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-colors whitespace-nowrap h-12 ambient-shadow ghost-border"
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-lg">sort</span>
            <span>Sort by: <span className="text-on-surface font-bold">Stock Level (Low to High)</span></span>
          </div>
        </div>

        {/* AI Insight Glassmorphism Card */}
        <div className="glass-card ghost-border p-6 rounded-[1.5rem] mb-10 flex flex-col md:flex-row items-center gap-6 ambient-shadow">
          <div className="w-16 h-16 glass-gradient rounded-2xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-3xl filled">auto_awesome</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            {stats.lowestStockItem ? (
              <>
                <h4 className="font-headline font-bold text-lg text-secondary">AI Prediction: Restock Alert</h4>
                <p className="text-on-surface-variant text-sm mt-1">
                  Based on seasonal trends and current sales velocity, &quot;{stats.lowestStockItem.name}&quot; will be out of stock in{' '}
                  <span className="text-error font-bold">
                    {stats.lowestStockItem.stock === 0
                      ? 'already depleted'
                      : `${Math.max(1, Math.ceil(stats.lowestStockItem.stock / 3))} day${Math.max(1, Math.ceil(stats.lowestStockItem.stock / 3)) !== 1 ? 's' : ''}`}
                  </span>.
                  {' '}We recommend ordering {Math.max(20, Math.ceil((stats.lowestStockItem.maxStock || 100) * 0.5))} units today.
                </p>
              </>
            ) : (
              <>
                <h4 className="font-headline font-bold text-lg text-secondary">AI Prediction: Inventory Stable</h4>
                <p className="text-on-surface-variant text-sm mt-1">All inventory items are well stocked. Keep monitoring for early restock alerts.</p>
              </>
            )}
          </div>
          {stats.lowestStockItem && (
            <button
              onClick={() => showToast('Restock order placed successfully!', 'success')}
              className="bg-secondary/10 text-secondary border border-secondary/20 px-6 py-3 rounded-full font-bold text-sm hover:bg-secondary hover:text-white transition-all h-12"
            >
              Order Now
            </button>
          )}
        </div>

        {/* Inventory List (Asymmetric/Modern Layout) */}
        <div className="space-y-4">
          {/* Header row for the list */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 text-xs font-bold text-outline uppercase tracking-widest mb-2">
            <div className="col-span-5">Product Details</div>
            <div className="col-span-2 text-center">Category</div>
            <div className="col-span-2 text-center">Stock Level</div>
            <div className="col-span-2 text-right">Value</div>
            <div className="col-span-1"></div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            inventoryItems.map((item, idx) => {
              const safeStock = Math.max(0, Number(item.stock) || 0);
              const stockRatio = item.maxStock > 0 ? Math.min(100, Math.max(0, (safeStock / item.maxStock) * 100)) : 0;

              return (
              <div key={item.id || idx} className={`bg-surface-container-lowest p-5 rounded-[1.5rem] ghost-border flex flex-col md:grid md:grid-cols-12 gap-4 items-center hover:bg-surface-bright transition-all ambient-shadow relative group`}>
                {item.status === 'error' && <div className="absolute left-0 top-0 h-full w-1.5 bg-error"></div>}
                
                <div className="col-span-5 flex items-center gap-4 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-outline">
                    <span className="material-symbols-outlined">image</span>
                  </div>
                  <div>
                    <h5 className="font-headline font-bold text-on-surface">{item.name}</h5>
                    <p className="text-xs text-outline font-medium">SKU: {item.sku}</p>
                  </div>
                </div>
                
                <div className="col-span-2 flex justify-center w-full">
                  <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold">{item.category}</span>
                </div>
                
                <div className="col-span-2 flex flex-col items-center gap-1 w-full">
                  <span className={`text-${item.status} font-extrabold text-sm`}>{safeStock} Units{item.status === 'error' ? ' Left' : ''}</span>
                  <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`bg-${item.status} h-full rounded-full`} style={{ width: `${stockRatio}%` }}></div>
                  </div>
                </div>
                
                <div className="col-span-2 text-right w-full">
                  <p className="font-headline font-bold text-on-surface">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-outline">Unit: ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <div className="col-span-1 flex justify-end w-full relative" data-inventory-actions="true">
                  <button 
                    onClick={() => setOpenMenuId(currentId => currentId === item.id ? null : item.id)}
                    className="w-10 h-10 flex items-center justify-center text-outline hover:text-secondary hover:bg-secondary/10 rounded-full transition-all"
                    aria-label={`Open actions for ${item.name}`}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                  {openMenuId === item.id && (
                    <div className="absolute right-0 top-12 z-20 min-w-[11rem] rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl p-2">
                      <button
                        type="button"
                        onClick={() => openEditProductModal(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          setProductToDelete(item);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )})
          )}
        </div>

        {/* Pagination */}
        <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-lowest px-6 py-4 rounded-2xl ghost-border ambient-shadow">
          <span className="text-sm text-on-surface-variant font-medium">Showing <span className="text-on-surface font-bold">1–{Math.min(10, inventoryItems.length)}</span> of {inventoryItems.length} product{inventoryItems.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => showToast('Previous page', 'info')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-outline hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-white font-bold text-sm">1</button>
            <button 
              onClick={() => showToast('Loading page 2...', 'info')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface font-bold text-sm hover:bg-surface-variant transition-colors"
            >
              2
            </button>
            <button 
              onClick={() => showToast('Loading page 3...', 'info')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface font-bold text-sm hover:bg-surface-variant transition-colors"
            >
              3
            </button>
            <button 
              onClick={() => showToast('Next page', 'info')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-outline hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddProductOpen}
        onClose={closeAddProductModal}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form className="space-y-5" onSubmit={handleSaveProduct}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Scan Product Barcode</label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isScannerOpen) {
                    stopScanner();
                    setIsScannerOpen(false);
                    setScannerError('');
                  } else {
                    void startInventoryScanner();
                  }
                }}
                className={`h-12 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  isScannerOpen
                    ? 'bg-error/10 text-error border border-error/20'
                    : 'bg-secondary text-white hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{isScannerOpen ? 'stop_circle' : 'qr_code_scanner'}</span>
                {isStartingScanner ? 'Starting...' : isScannerOpen ? 'Stop Scan' : 'Scan Product'}
              </button>
              {isScannerOpen && (
                <div className="rounded-[1rem] overflow-hidden border border-outline-variant/20 bg-surface-container-highest">
                  <div className="aspect-[4/3] bg-on-surface/90 relative">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-2 border-dashed border-secondary rounded-2xl h-28 pointer-events-none"></div>
                    <div className="absolute left-4 right-4 bottom-4 text-center text-white text-xs font-bold tracking-wide">
                      Scan the same barcode again anytime to increase that product&apos;s stock by 1
                    </div>
                  </div>
                </div>
              )}
              {scannerError && (
                <p className="text-xs text-error font-medium">{scannerError}</p>
              )}
              {isLookingUpProduct && (
                <p className="text-xs text-secondary font-medium">Fetching product name and online MRP from the barcode...</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Product Name</label>
            <input 
              type="text" 
              name="name"
              required
              value={productForm.name}
              onChange={(e) => setProductForm(currentForm => ({ ...currentForm, name: e.target.value }))}
              placeholder="e.g. Aashirvaad Atta (5kg)"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Category</label>
              <select
                name="category"
                value={productForm.category}
                onChange={(e) => setProductForm(currentForm => ({ ...currentForm, category: e.target.value }))}
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none"
              >
                <option>Essentials</option>
                <option>Grains</option>
                <option>Dairy</option>
                <option>Snacks</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">SKU</label>
              <input 
                type="text" 
                name="sku"
                value={productForm.sku}
                onChange={(e) => setProductForm(currentForm => ({ ...currentForm, sku: e.target.value }))}
                placeholder="Auto-generated"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Barcode</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="barcode"
                value={productForm.barcode}
                onChange={(e) => setProductForm(currentForm => ({ ...currentForm, barcode: e.target.value }))}
                placeholder="Scanned barcode appears here"
                className="flex-1 px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
              <button
                type="button"
                onClick={() => void fetchBarcodeProductDetails(productForm.barcode)}
                disabled={isLookingUpProduct || !productForm.barcode.trim()}
                className="px-4 py-3 rounded-full bg-secondary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLookingUpProduct ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Unit Price (₹)</label>
              <input 
                type="number" 
                name="unitPrice"
                required
                min="0"
                step="0.01"
                value={productForm.unitPrice}
                onChange={(e) => setProductForm(currentForm => ({ ...currentForm, unitPrice: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Initial Stock</label>
              <input 
                type="number" 
                name="stock"
                required
                min="0"
                value={productForm.stock}
                onChange={(e) => setProductForm(currentForm => ({ ...currentForm, stock: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={closeAddProductModal}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!productToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
          }
        }}
        title="Delete Product"
      >
        <div className="flex flex-col gap-6">
          <p className="text-on-surface-variant font-body leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-on-surface">{productToDelete?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setProductToDelete(null)}
              disabled={isDeleting}
              className="px-6 py-3 rounded-full bg-surface-container text-sm font-bold hover:bg-surface-container-highest transition-colors h-12 min-w-[100px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="px-6 py-3 rounded-full bg-error text-white text-sm font-bold hover:opacity-90 transition-all h-12 min-w-[100px] flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-[18px]">delete</span>
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
