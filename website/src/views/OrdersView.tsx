import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import { ViewState } from '../types';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import Modal from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';

interface OrdersViewProps {
  setCurrentView: (view: ViewState) => void;
  setSelectedOrderId?: (id: string) => void;
}

export default function OrdersView({ setCurrentView, setSelectedOrderId }: OrdersViewProps) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Delivered'>('all');
  const [amountSort, setAmountSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [quickOrderSearchQuery, setQuickOrderSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const getAvailableStock = (item: any) => Math.max(0, Number(item?.stock) || 0);
  const showInsufficientStockAlert = (itemName: string, requestedQuantity: number, availableStock: number) => {
    window.alert(
      `The specified product amount is not available for ${itemName}. Requested: ${requestedQuantity}, available: ${availableStock}.`
    );
  };

  const getStatusTone = (order: any) => {
    if (order.status === 'Delivered') {
      return {
        badge: 'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
        dot: 'bg-tertiary',
        avatar: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      };
    }

    if (order.status === 'Cancelled') {
      return {
        badge: 'bg-error-container/70 text-on-error-container',
        dot: 'bg-error',
        avatar: 'bg-surface-container-highest text-on-surface-variant',
      };
    }

    return {
      badge: 'bg-secondary-fixed/70 text-on-secondary-fixed-variant',
      dot: 'bg-secondary',
      avatar: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    };
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const ordersRef = collection(db, `users/${auth.currentUser.uid}/orders`);
    const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);

    const unsubscribeInventory = onSnapshot(inventoryRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setInventoryItems(items);
    }, (error) => {
      console.error('Error fetching inventory:', error);
    });
    
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));
      
      // Sort client-side because dates are stored as formatted strings (e.g. "Oct 25, 2023")
      // which don't sort correctly alphabetically.
      items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setOrders(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/orders`);
      showToast('Failed to load orders', 'error');
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeInventory();
    };
  }, []);

  // Filtered Orders Logic
  const filteredOrders = React.useMemo(() => {
    let result = [...orders];

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(query) || 
        order.name.toLowerCase().includes(query) || 
        order.customer.toLowerCase().includes(query) ||
        (order.phone && order.phone.toLowerCase().includes(query))
      );
    }

    // Status Filter
    if (statusFilter === 'Delivered') {
      result = result.filter(order => order.status === 'Delivered');
    }

    // Date Range Filter
    if (dateRange) {
      const start = new Date(dateRange.start).getTime();
      const end = new Date(dateRange.end).getTime();
      result = result.filter(order => {
        const orderTime = new Date(order.date).getTime();
        return orderTime >= start && orderTime <= end;
      });
    }

    // Amount Sort
    if (amountSort !== 'none') {
      result.sort((a, b) => {
        const amtA = parseFloat(a.amount.toString().replace(/,/g, ''));
        const amtB = parseFloat(b.amount.toString().replace(/,/g, ''));
        return amountSort === 'asc' ? amtA - amtB : amtB - amtA;
      });
    }

    return result;
  }, [orders, searchQuery, statusFilter, amountSort, dateRange]);

  const handleDelete = async () => {
    if (!auth.currentUser || !orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/orders`, orderToDelete.docId));
      showToast(`Order ${orderToDelete.id} deleted successfully`, 'success');
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast('Failed to delete order', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkDelivered = async (order: any) => {
    if (!auth.currentUser || !order) return;
    
    setOpenMenuId(null);
    try {
      const orderRef = doc(db, `users/${auth.currentUser.uid}/orders`, order.docId);
      await updateDoc(orderRef, {
        status: 'Delivered',
        sColor: 'tertiary'
      });
      showToast(`Order ${order.id} marked as delivered`, 'success');
    } catch (error) {
      console.error("Error updating order:", error);
      showToast('Failed to update order status', 'error');
    }
  };

  const handleSelectItem = (item: any) => {
    const existingItem = selectedItems.find(i => i.id === item.id);
    const availableStock = getAvailableStock(item);

    if (availableStock <= 0) {
      showInsufficientStockAlert(item.name, 1, availableStock);
      showToast(`${item.name} is out of stock`, 'error');
      return;
    }

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;
      if (nextQuantity > availableStock) {
        showInsufficientStockAlert(item.name, nextQuantity, availableStock);
        showToast(`Only ${availableStock} units of ${item.name} are available`, 'error');
        return;
      }

      setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: nextQuantity } : i));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
    setQuickOrderSearchQuery('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setSelectedItems(selectedItems.map(i => {
      if (i.id === id) {
        const availableStock = getAvailableStock(i);
        const newQuantity = Math.max(1, i.quantity + delta);

        if (newQuantity > availableStock) {
          showInsufficientStockAlert(i.name, newQuantity, availableStock);
          showToast(`Only ${availableStock} units of ${i.name} are available`, 'error');
          return i;
        }

        return { ...i, quantity: newQuantity };
      }
      return i;
    }));
  };

  const filteredQuickOrderItems = quickOrderSearchQuery.trim() === ''
    ? []
    : inventoryItems.filter(item => item.name.toLowerCase().includes(quickOrderSearchQuery.toLowerCase()));

  const totalAmount = selectedItems.reduce((sum, item) => {
    const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <>
      <div className="hidden md:block">
        <TopBar title="Orders" />
      </div>

      <header className="md:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => showToast('Menu clicked', 'info')}
              className="text-primary flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[28px]">menu</span>
            </button>
            <h2 className="font-headline font-bold text-[2rem] leading-none text-primary">Orders</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => showToast('No new notifications', 'info')}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-primary"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
            </button>
            <button 
              onClick={() => setIsQuickOrderModalOpen(true)}
              className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(0,105,92,0.25)]"
            >
              <span className="material-symbols-outlined text-[22px]">add</span>
              <span>New</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-10 mb-8 mt-4 md:mt-6">
        {/* Search & Filter Bar */}
        <div className="bg-surface-container-lowest p-4 rounded-[1.35rem] md:rounded-2xl flex flex-col md:flex-row gap-3 md:gap-4 items-center ambient-shadow ghost-border border border-outline-variant/15">
          <div className="relative w-full md:flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input 
              type="text"
              placeholder="Search ID, Name, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl md:rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm placeholder:text-outline/60 outline-none transition-shadow"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setStatusFilter(prev => prev === 'all' ? 'Delivered' : 'all')}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl md:rounded-full text-sm font-medium transition-all whitespace-nowrap h-11 md:h-12 ${
                statusFilter === 'Delivered'
                ? 'bg-tertiary text-white shadow-lg shadow-tertiary/20'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span className="md:hidden">Status</span>
              <span className="hidden md:inline">Delivered</span>
            </button>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl md:rounded-full text-sm font-medium transition-all whitespace-nowrap h-11 md:h-12 ${
                dateRange
                ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              {dateRange ? 'Custom Range' : 'Date Range'}
            </button>
            <button 
              onClick={() => {
                setAmountSort(prev => {
                  if (prev === 'none') return 'desc';
                  if (prev === 'desc') return 'asc';
                  return 'none';
                });
              }}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl md:rounded-full text-sm font-medium transition-all whitespace-nowrap h-11 md:h-12 ${
                amountSort !== 'none'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {amountSort === 'none' ? 'sort' : amountSort === 'desc' ? 'arrow_downward' : 'arrow_upward'}
              </span>
              Amount {amountSort !== 'none' && `(${amountSort === 'desc' ? 'High' : 'Low'})`}
            </button>
            {(searchQuery || statusFilter !== 'all' || amountSort !== 'none' || dateRange) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setAmountSort('none');
                  setDateRange(null);
                }}
                className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-error-container/10 text-error rounded-xl md:rounded-full hover:bg-error-container/20 transition-colors"
                title="Clear Filters"
              >
                <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="px-4 md:px-10 space-y-4 md:space-y-4">
        {/* Table Header (Desktop Only) */}
        <div className="hidden md:grid grid-cols-6 px-6 py-2 text-[11px] font-label font-bold uppercase tracking-widest text-outline">
          <div className="col-span-1">Order Details</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1">Customer</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1 text-right pr-4">Actions</div>
        </div>

        {/* Order Cards */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 rounded-2xl flex flex-col items-center justify-center text-center ambient-shadow ghost-border">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 text-outline">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2 font-display">No Orders Found</h3>
            <p className="text-on-surface-variant max-w-xs font-body">
              Try adjusting your search query or filters to find what you're looking for.
            </p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setAmountSort('none');
                setDateRange(null);
              }}
              className="mt-6 text-primary font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filteredOrders.map((order, idx) => (
            <div key={idx} className="bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-bright hover:border-primary/20 p-5 md:p-6 rounded-[1.5rem] md:rounded-2xl md:grid md:grid-cols-6 items-center transition-all duration-300 group shadow-[0_8px_24px_rgba(7,30,39,0.04)]">
              <div className="col-span-1 flex flex-col gap-1 mb-3 md:mb-0">
                <span className="text-[11px] md:text-xs font-bold text-outline uppercase tracking-[0.16em] md:tracking-tighter">{order.id}</span>
                <span className="text-[1.7rem] leading-none md:text-sm font-semibold md:font-semibold text-on-surface">{order.name}</span>
              </div>
              <div className="col-span-1 mb-4 md:mb-0">
                <span className="text-[15px] md:text-sm text-on-surface-variant font-medium">{order.date}</span>
              </div>
              <div className="col-span-1 flex items-center gap-3 mb-4 md:mb-0">
                <div className={`w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-full ${getStatusTone(order).avatar} flex items-center justify-center text-[11px] md:text-[10px] font-bold shrink-0`}>
                  {order.initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] md:text-sm font-medium truncate">{order.customer}</span>
                  {order.phone && order.phone !== 'N/A' && (
                    <span className="text-[12px] md:text-[10px] text-outline font-medium md:font-bold truncate tracking-tight">{order.phone}</span>
                  )}
                </div>
              </div>
              <div className="col-span-1 flex justify-start md:justify-center mb-5 md:mb-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getStatusTone(order).badge} text-[11px] font-bold uppercase tracking-wide`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusTone(order).dot}`}></span>
                  {order.status}
                </span>
              </div>
              <div className="col-span-1 text-left md:text-right mb-6 md:mb-0">
                <span className="text-[2rem] leading-none md:text-sm font-black text-on-surface">₹{order.amount}</span>
              </div>
              <div className="col-span-1 flex justify-end gap-2 relative">
                <button 
                  onClick={() => {
                    if (setSelectedOrderId) setSelectedOrderId(order.docId);
                    setCurrentView('orderDetails');
                  }}
                  className="w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-full bg-surface-container-low text-primary hover:bg-surface-container-highest transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px] text-secondary">visibility</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === order.docId ? null : order.docId)}
                    className={`w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-full transition-colors flex items-center justify-center ${
                      openMenuId === order.docId
                        ? 'bg-surface-container-highest'
                        : 'bg-surface-container-low hover:bg-surface-container-highest'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-outline">more_vert</span>
                  </button>
                  
                  <AnimatePresence>
                    {openMenuId === order.docId && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-surface-bright/80 backdrop-blur-xl rounded-[1rem] ambient-shadow ghost-border z-50 py-2 overflow-hidden"
                      >
                        <button 
                          onClick={() => handleMarkDelivered(order)}
                          className="w-full px-4 py-3 text-left text-sm font-bold font-label hover:bg-surface-container-low transition-colors flex items-center gap-3 text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[20px] text-tertiary">check_circle</span>
                          Mark Delivered
                        </button>
                        <button 
                          onClick={() => {
                            setOpenMenuId(null);
                            setOrderToDelete(order);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-bold font-label text-error hover:bg-error-container/10 transition-colors flex items-center gap-3"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                          Delete Order
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="px-4 md:px-10 mt-8 mb-28 md:mb-10 flex flex-col items-center gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => showToast('Previous page', 'info')}
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm">1</button>
          <button 
            onClick={() => showToast('Loading page 2...', 'info')}
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-sm font-bold text-on-surface hover:bg-surface-container-high transition-all"
          >
            2
          </button>
          <button 
            onClick={() => showToast('Loading page 3...', 'info')}
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-sm font-bold text-on-surface hover:bg-surface-container-high transition-all"
          >
            3
          </button>
          <button 
            onClick={() => showToast('Next page', 'info')}
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
        <span className="text-[11px] font-bold text-outline uppercase tracking-[0.18em]">
          Showing {Math.min(filteredOrders.length, 4)} of {orders.length} orders
        </span>
      </div>

      <Modal
        isOpen={isQuickOrderModalOpen}
        onClose={() => setIsQuickOrderModalOpen(false)}
        title="Quick Order"
      >
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.currentUser || selectedItems.length === 0) return;
          
          try {
            const formData = new FormData(e.currentTarget);
            const customerName = formData.get('customerName') as string || 'Walk-in Customer';
            const customerPhone = formData.get('customerPhone') as string || 'N/A';
            
            const ordersRef = collection(db, `users/${auth.currentUser.uid}/orders`);
            const orderRef = doc(ordersRef);
            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
            const transactionRef = doc(transactionsRef);

            const newOrder = {
              id: `#ORD-${Math.floor(Math.random() * 100000)}`,
              name: selectedItems.length === 1 ? selectedItems[0].name : `${selectedItems.length} Items`,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              customer: customerName,
              phone: customerPhone,
              initials: customerName.substring(0, 2).toUpperCase(),
              status: 'Delivered',
              amount: totalAmount.toFixed(2),
              sColor: 'tertiary',
              items: selectedItems
            };

            const newTransaction = {
              id: `#TR-${Math.floor(Math.random() * 100000)}`,
              entity: customerName,
              initials: customerName.substring(0, 2).toUpperCase(),
              bg: 'bg-tertiary-fixed',
              phone: customerPhone,
              text: 'text-on-tertiary-fixed',
              date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: 'COMPLETED',
              statusBg: 'bg-tertiary-fixed',
              statusText: 'text-on-tertiary-fixed-variant',
              amount: `+ ₹${totalAmount.toFixed(2)}`,
              amountColor: 'text-tertiary'
            };

            await runTransaction(db, async (transaction) => {
              for (const item of selectedItems) {
                const itemRef = doc(db, `users/${auth.currentUser.uid}/inventory/${item.id}`);
                const inventorySnapshot = await transaction.get(itemRef);

                if (!inventorySnapshot.exists()) {
                  throw new Error(`Product "${item.name}" is no longer available in inventory.`);
                }

                const currentStock = getAvailableStock(inventorySnapshot.data());
                const requestedQuantity = Math.max(1, Number(item.quantity) || 1);

                if (requestedQuantity > currentStock) {
                  throw new Error(
                    `The specified product amount is not available for ${item.name}. Requested: ${requestedQuantity}, available: ${currentStock}.`
                  );
                }

                const newStock = Math.max(0, currentStock - requestedQuantity);
                const newStatus = newStock < 20 ? 'error' : 'tertiary';

                transaction.update(itemRef, {
                  stock: newStock,
                  status: newStatus
                });
              }

              transaction.set(orderRef, newOrder);
              transaction.set(transactionRef, newTransaction);
            });

            showToast('Order created successfully and stock updated', 'success');
            setIsQuickOrderModalOpen(false);
            setSelectedItems([]);
            setQuickOrderSearchQuery('');
          } catch (error) {
            const isInventoryAvailabilityError = error instanceof Error
              && (error.message.includes('not available') || error.message.includes('no longer available'));

            if (isInventoryAvailabilityError && error instanceof Error) {
              window.alert(error.message);
              showToast(error.message, 'error');
              return;
            }

            handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/orders`);
            showToast('Failed to create order', 'error');
          }
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Customer Name</label>
              <input 
                type="text" 
                name="customerName"
                placeholder="Walk-in Customer"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Phone Number</label>
              <input 
                type="tel" 
                name="customerPhone"
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Scan Barcode or Search Item</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                type="text" 
                placeholder="Search..."
                value={quickOrderSearchQuery}
                onChange={(e) => setQuickOrderSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
              {filteredQuickOrderItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-sm shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredQuickOrderItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => handleSelectItem(item)}
                      className="px-4 py-3 hover:bg-surface-bright cursor-pointer flex justify-between items-center border-b border-outline-variant/10 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-sm text-on-surface">{item.name}</p>
                        <p className="text-xs text-on-surface-variant">{item.category} • Stock: {item.stock}</p>
                      </div>
                      <span className="font-bold text-primary">₹{item.unitPrice || item.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-surface-container-highest p-4 rounded-sm border border-outline-variant/20 max-h-60 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-sm">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-on-surface">{item.name}</p>
                      <p className="text-xs text-primary font-bold">₹{item.unitPrice || item.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-surface-container-highest rounded-full">
                        <button type="button" onClick={() => handleQuantityChange(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => handleQuantityChange(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-error hover:bg-error-container/50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-on-surface">Total Amount:</span>
            <span className="font-headline text-2xl font-extrabold text-primary">₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsQuickOrderModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors h-12"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity h-12"
            >
              Checkout
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!orderToDelete} 
        onClose={() => setOrderToDelete(null)} 
        title="Delete Order"
      >
        <div className="flex flex-col gap-6">
          <p className="text-on-surface-variant font-body leading-relaxed">
            Are you sure you want to delete order <span className="font-bold text-on-surface">{orderToDelete?.id}</span>? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              onClick={() => setOrderToDelete(null)}
              className="px-6 py-3 rounded-full bg-surface-container text-sm font-bold font-label hover:bg-surface-container-highest transition-colors h-12 min-w-[100px]"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-3 rounded-full bg-error text-white text-sm font-bold font-label hover:opacity-90 transition-all h-12 min-w-[100px] flex items-center justify-center gap-2"
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

      {/* Date Range Modal */}
      <Modal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        title="Select Date Range"
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold font-label uppercase text-outline">Start Date</label>
              <input 
                type="date" 
                className="w-full p-4 bg-surface-container-highest rounded-sm border-none font-body text-sm focus:ring-1 focus:ring-secondary outline-none"
                defaultValue={dateRange?.start}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRange(prev => ({ start: val, end: prev?.end || val }));
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold font-label uppercase text-outline">End Date</label>
              <input 
                type="date" 
                className="w-full p-4 bg-surface-container-highest rounded-sm border-none font-body text-sm focus:ring-1 focus:ring-secondary outline-none"
                defaultValue={dateRange?.end}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRange(prev => ({ start: prev?.start || val, end: val }));
                }}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Today', getValue: () => {
                const d = new Date().toISOString().split('T')[0];
                return { start: d, end: d };
              }},
              { label: 'Last 7 Days', getValue: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                return { 
                  start: start.toISOString().split('T')[0], 
                  end: end.toISOString().split('T')[0] 
                };
              }},
              { label: 'This Month', getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                return { 
                  start: start.toISOString().split('T')[0], 
                  end: now.toISOString().split('T')[0] 
                };
              }}
            ].map(preset => (
              <button 
                key={preset.label}
                onClick={() => setDateRange(preset.getValue())}
                className="px-4 py-2 bg-surface-container rounded-full text-xs font-bold hover:bg-surface-container-highest transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => {
                setDateRange(null);
                setIsFilterModalOpen(false);
              }}
              className="px-6 py-3 rounded-full bg-surface-container text-sm font-bold font-label hover:bg-surface-container-highest transition-colors h-12"
            >
              Clear Range
            </button>
            <button 
              onClick={() => setIsFilterModalOpen(false)}
              className="px-8 py-3 rounded-full bg-primary text-white text-sm font-bold font-label shadow-lg shadow-primary/20 hover:opacity-90 transition-all h-12"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
