import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export default function InventoryView() {
  const { showToast } = useToast();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
    const q = query(inventoryRef, orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setInventoryItems(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/inventory`);
      showToast('Failed to load inventory', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const stock = Number(formData.get('stock'));
    const unitPrice = Number(formData.get('unitPrice'));
    const price = unitPrice * stock;
    const maxStock = Math.max(100, stock * 2);
    const sku = (formData.get('sku') as string) || `SKU-${Math.floor(Math.random() * 10000)}`;
    
    const newItem = {
      id: Date.now(), // Using timestamp as numeric ID for schema compatibility
      name: formData.get('name') as string,
      sku,
      category: formData.get('category') as string,
      stock,
      maxStock,
      price,
      unitPrice,
      status: stock < 20 ? 'error' : 'tertiary'
    };

    try {
      const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
      await addDoc(inventoryRef, newItem);
      showToast('Product added successfully', 'success');
      setIsAddProductOpen(false);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/inventory`);
      showToast('Failed to add product', 'error');
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
              <h3 className="text-3xl font-headline font-extrabold mt-1">₹12,84,500.00</h3>
            </div>
            <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>4.2% from last month</span>
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
              <h3 className="text-2xl font-headline font-extrabold text-on-surface">12 Items</h3>
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
              <h3 className="text-2xl font-headline font-extrabold text-on-surface">18 Sectors</h3>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
            <button 
              onClick={() => setIsAddProductOpen(true)}
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
            <h4 className="font-headline font-bold text-lg text-secondary">AI Prediction: Restock Alert</h4>
            <p className="text-on-surface-variant text-sm mt-1">Based on seasonal trends and current sales velocity, "Dhara Mustard Oil (1L)" will be out of stock in <span className="text-error font-bold">3 days</span>. We recommend ordering 15 cases today.</p>
          </div>
          <button 
            onClick={() => showToast('Order placed successfully!', 'success')}
            className="bg-secondary/10 text-secondary border border-secondary/20 px-6 py-3 rounded-full font-bold text-sm hover:bg-secondary hover:text-white transition-all h-12"
          >
            Order Now
          </button>
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
            inventoryItems.map((item, idx) => (
              <div key={item.id || idx} className={`bg-surface-container-lowest p-5 rounded-[1.5rem] ghost-border flex flex-col md:grid md:grid-cols-12 gap-4 items-center hover:bg-surface-bright transition-all ambient-shadow relative overflow-hidden group`}>
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
                  <span className={`text-${item.status} font-extrabold text-sm`}>{item.stock} Units{item.status === 'error' ? ' Left' : ''}</span>
                  <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`bg-${item.status} h-full rounded-full`} style={{ width: `${(item.stock / item.maxStock) * 100}%` }}></div>
                  </div>
                </div>
                
                <div className="col-span-2 text-right w-full">
                  <p className="font-headline font-bold text-on-surface">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-outline">Unit: ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <div className="col-span-1 flex justify-end w-full">
                  <button 
                    onClick={() => showToast(`Options for ${item.name}`, 'info')}
                    className="w-10 h-10 flex items-center justify-center text-outline hover:text-secondary hover:bg-secondary/10 rounded-full transition-all"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-lowest px-6 py-4 rounded-2xl ghost-border ambient-shadow">
          <span className="text-sm text-on-surface-variant font-medium">Showing <span className="text-on-surface font-bold">1-10</span> of 1,242 products</span>
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
        onClose={() => setIsAddProductOpen(false)}
        title="Add New Product"
      >
        <form className="space-y-5" onSubmit={handleAddProduct}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Product Name</label>
            <input 
              type="text" 
              name="name"
              required
              placeholder="e.g. Aashirvaad Atta (5kg)"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Category</label>
              <select name="category" className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
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
                placeholder="Auto-generated"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
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
                placeholder="0"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
