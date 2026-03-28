import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { ViewState } from '../types';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface DashboardViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function DashboardView({ setCurrentView }: DashboardViewProps) {
  const { showToast } = useToast();
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Order State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Inventory
    const inventoryRef = collection(db, `users/${auth.currentUser.uid}/inventory`);
    const unsubscribeInventory = onSnapshot(inventoryRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setInventoryItems(items);
    }, (error) => {
      console.error('Error fetching inventory:', error);
    });

    // Fetch Dashboard Data
    const dashboardRef = doc(db, `users/${auth.currentUser.uid}/dashboard/main`);
    const unsubscribeDashboard = onSnapshot(dashboardRef, async (docSnap) => {
      if (docSnap.exists()) {
        setDashboardData(docSnap.data());
        setIsLoading(false);
      } else {
        // Initialize default dashboard data if it doesn't exist
        const defaultData = {
          revenue: '₹0',
          revenueGrowth: '+0%',
          pendingUdhar: '₹0',
          smartAlert: 'No alerts at this time.',
          profitOptimizer: 'Add inventory to get insights.'
        };
        try {
          await setDoc(dashboardRef, defaultData);
          setDashboardData(defaultData);
        } catch (error) {
          console.error('Error initializing dashboard data:', error);
        }
        setIsLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/dashboard/main`);
      showToast('Failed to load dashboard data', 'error');
      setIsLoading(false);
    });

    // Fetch Bot Status
    const botStatusRef = doc(db, `users/${auth.currentUser.uid}/bot/status`);
    const unsubscribeBotStatus = onSnapshot(botStatusRef, (docSnap) => {
      if (docSnap.exists()) {
        setBotStatus(docSnap.data());
      }
    }, (error) => {
      console.error('Error fetching bot status:', error);
    });

    return () => {
      unsubscribeInventory();
      unsubscribeDashboard();
      unsubscribeBotStatus();
    };
  }, []);

  const handleSelectItem = (item: any) => {
    const existingItem = selectedItems.find(i => i.id === item.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
    setSearchQuery('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setSelectedItems(selectedItems.map(i => {
      if (i.id === id) {
        const newQuantity = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQuantity };
      }
      return i;
    }));
  };

  const handleUnlink = async () => {
    if (!auth.currentUser) return;
    
    try {
      const botStatusRef = doc(db, `users/${auth.currentUser.uid}/bot/status`);
      await updateDoc(botStatusRef, { 
        requestedAction: 'logout',
        isOnline: false,
        qr: null,
        connection: 'unlinking...'
      });
      showToast('Unlink request sent. Bot is disconnecting...', 'info');
    } catch (error) {
      console.error('Error unlinking bot:', error);
      showToast('Failed to unlink bot', 'error');
    }
  };

  const filteredItems = searchQuery.trim() === '' 
    ? [] 
    : inventoryItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalAmount = selectedItems.reduce((sum, item) => {
    const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <>
      <TopBar 
        title="Retailer Dashboard" 
        onLinkBotClick={() => setIsBotModalOpen(true)}
      />
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-8 pb-32">
        {/* Hero Stats / Bento Grid Start */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Primary Action Card */}
          <div className="md:col-span-2 glass-gradient p-8 rounded-[1.5rem] text-white ambient-shadow relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="font-headline text-3xl font-extrabold mb-2 tracking-tight">Manage your store effortlessly.</h2>
              <p className="text-primary-fixed opacity-90 mb-6 max-w-xs">Track sales, manage credits, and restock with AI precision.</p>
              <button 
                onClick={() => setIsQuickOrderModalOpen(true)}
                className="bg-secondary text-white font-bold px-8 rounded-full shadow-lg active:scale-95 transition-transform h-12 flex items-center justify-center"
              >
                Create New Sale
              </button>
            </div>
            {/* Decorative Element */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
          </div>

          {/* Bento Info Cards */}
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between ambient-shadow ghost-border">
            <div className="flex justify-between items-start">
              <div className="bg-tertiary text-white w-10 h-10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-tertiary font-bold text-xs">{isLoading ? '...' : dashboardData?.revenueGrowth}</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-semibold">Today's Revenue</p>
              <p className="text-on-surface font-headline text-2xl font-black">{isLoading ? '...' : dashboardData?.revenue}</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between ambient-shadow ghost-border">
            <div className="flex justify-between items-start">
              <div className="bg-secondary text-white w-10 h-10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <span className="text-error font-bold text-xs">Due</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-semibold">Pending Udhar</p>
              <p className="text-on-surface font-headline text-2xl font-black">{isLoading ? '...' : dashboardData?.pendingUdhar}</p>
            </div>
          </div>
        </section>

        {/* Grid Navigation for Core Actions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-xl font-bold text-on-surface">Store Actions</h3>
            <button onClick={() => showToast('Opening all actions...', 'info')} className="text-secondary font-bold text-sm hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Orders', icon: 'shopping_cart', color: 'primary', view: 'orders' as ViewState },
              { label: 'Udhar', icon: 'menu_book', color: 'secondary', view: 'udhar' as ViewState },
              { label: 'Finance', icon: 'account_balance', color: 'tertiary', view: 'finance' as ViewState },
              { label: 'Restock Planner', icon: 'auto_graph', color: 'primary-dim', view: 'insights' as ViewState },
              { label: 'Inventory', icon: 'inventory_2', color: 'surface', view: 'inventory' as ViewState },
              { label: 'Customer', icon: 'person', color: 'secondary-dim', view: 'dashboard' as ViewState },
            ].map((action, idx) => {
              const bgColors: Record<string, string> = {
                'primary': 'bg-primary-fixed text-primary',
                'secondary': 'bg-secondary-fixed text-secondary',
                'tertiary': 'bg-tertiary-fixed text-tertiary',
                'primary-dim': 'bg-primary-fixed-dim text-primary-container',
                'surface': 'bg-surface-variant text-on-surface-variant',
                'secondary-dim': 'bg-secondary-fixed-dim text-on-secondary-container',
              };
              return (
                <div 
                  key={idx} 
                  onClick={() => setCurrentView(action.view)}
                  className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col items-center gap-3 hover:bg-surface-bright transition-colors cursor-pointer group ambient-shadow ghost-border"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${bgColors[action.color]}`}>
                    <span className="material-symbols-outlined">{action.icon}</span>
                  </div>
                  <span className="font-headline font-bold text-on-surface text-center leading-tight text-sm">{action.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Prominent Analytics AI Powered Section */}
        <section className="glass-card bg-surface-container-lowest rounded-[1.5rem] p-8 ambient-shadow ghost-border overflow-hidden relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-secondary animate-pulse">auto_awesome</span>
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">AI Insights Engine</span>
              </div>
              <h3 className="font-headline text-2xl font-black text-on-surface">Analytics (Ai Powered)</h3>
            </div>
            <div className="flex items-center gap-3 bg-surface-container-highest p-1 rounded-full">
              <button onClick={() => showToast('Loading sales trends...', 'info')} className="bg-surface-container-lowest text-on-surface px-6 py-2 rounded-full font-bold text-sm shadow-sm h-10">Sales</button>
              <button onClick={() => showToast('Loading AI predictions...', 'info')} className="text-on-surface-variant px-6 py-2 rounded-full font-bold text-sm hover:bg-surface-container-lowest/50 transition-colors h-10">Predictions</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {/* Visualization Placeholder */}
            <div className="lg:col-span-2 h-64 bg-surface-container-highest rounded-[1.5rem] flex items-end justify-around px-8 pb-4 relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <span className="material-symbols-outlined text-[120px]">monitoring</span>
              </div>
              {/* Mock Chart Bars */}
              <div className="w-12 bg-primary rounded-t-xl h-[40%]"></div>
              <div className="w-12 bg-primary/60 rounded-t-xl h-[60%]"></div>
              <div className="w-12 bg-primary rounded-t-xl h-[85%]"></div>
              <div className="w-12 bg-secondary rounded-t-xl h-[55%]"></div>
              <div className="w-12 bg-primary rounded-t-xl h-[95%]"></div>
              <div className="w-12 bg-primary/40 rounded-t-xl h-[45%]"></div>
              <div className="w-12 bg-tertiary rounded-t-xl h-[75%]"></div>
            </div>

            {/* Insight Cards */}
            <div className="space-y-4">
              <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] ghost-border ambient-shadow">
                <p className="text-xs text-secondary font-bold mb-1">SMART ALERT</p>
                <p className="text-on-surface font-semibold text-sm">{isLoading ? 'Loading...' : dashboardData?.smartAlert}</p>
              </div>
              <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] ghost-border ambient-shadow">
                <p className="text-xs text-tertiary font-bold mb-1">PROFIT OPTIMIZER</p>
                <p className="text-on-surface font-semibold text-sm">{isLoading ? 'Loading...' : dashboardData?.profitOptimizer}</p>
              </div>
              <button 
                onClick={() => showToast('Generating deep dive report...', 'success')}
                className="w-full bg-on-surface text-surface-container-lowest font-headline font-bold rounded-full hover:bg-primary transition-colors h-12"
              >
                Deep Dive Report
              </button>
            </div>
          </div>
          {/* Background Abstract */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-fixed opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        </section>
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

            const ordersRef = collection(db, `users/${auth.currentUser.uid}/orders`);
            await setDoc(doc(ordersRef), newOrder);

            // Also add a transaction
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
            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
            await setDoc(doc(transactionsRef), newTransaction);
            
            // 📉 Update Inventory Stock atomically
            const batch = writeBatch(db);
            for (const item of selectedItems) {
              const itemRef = doc(db, `users/${auth.currentUser.uid}/inventory/${item.id}`);
              
              // We'll update the stock using increment for atomicity
              // and status based on the current known stock minus order quantity
              const estNewStock = Math.max(0, (item.stock || 0) - (item.quantity || 1));
              const newStatus = estNewStock < 20 ? 'error' : 'tertiary';
              
              batch.update(itemRef, { 
                stock: increment(-(item.quantity || 1)),
                status: newStatus
              });
            }
            await batch.commit();

            showToast('Order created successfully and stock updated', 'success');
            setIsQuickOrderModalOpen(false);
            setSelectedItems([]);
            setSearchQuery('');
          } catch (error) {
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
              />
              {filteredItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-sm shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredItems.map(item => (
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
      <Modal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        title="Connect WhatsApp Bot"
      >
        <div className="flex flex-col gap-6 items-center">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-[#25D366]/20">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            </div>
            <div>
              <h3 className="font-headline text-lg font-black text-on-surface tracking-tight leading-tight">Link Baiyles Bot</h3>
              <p className="text-xs text-on-surface-variant font-medium">Connect your store for automated updates</p>
            </div>
          </div>

          <div className="text-sm text-on-surface-variant leading-relaxed">
            Link the <span className="font-bold text-primary">Baiyles WhatsApp Bot</span> to send automated customer updates, digital receipts, and professional udhar (credit) reminders.
          </div>

          <div className="w-full bg-surface-container-low p-6 rounded-[1.5rem] flex flex-col items-center gap-4 ghost-border">
            {botStatus?.isOnline ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <p className="font-bold text-on-surface">Bot is Online & Connected</p>
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => setIsBotModalOpen(false)}
                    className="bg-surface-container-highest text-on-surface py-2.5 px-6 rounded-full font-bold text-sm"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleUnlink}
                    className="bg-error/10 text-error hover:bg-error/20 py-2.5 px-6 rounded-full font-bold text-sm transition-colors border border-error/20"
                  >
                    Unlink Bot
                  </button>
                </div>
              </div>
            ) : botStatus?.qr ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-outline-variant/20 relative group">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(botStatus.qr)}&size=200x200&color=004f45&bgcolor=ffffff&margin=10`} 
                    alt="Bot QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                     <span className="material-symbols-outlined text-4xl text-primary animate-pulse">qr_code_scanner</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-secondary rounded-full animate-bounce"></span>
                  Scan to Connect
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-on-surface-variant">Waiting for bot to generate QR...</p>
                <p className="text-xs text-outline">{botStatus?.connection || 'Bot initializing'}</p>
              </div>
            )}
          </div>

          <ul className="space-y-3 w-full">
            {[
              'Automated Digital Receipts',
              'Professional Credit Reminders',
              'Order Status Real-time Updates'
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-on-surface font-semibold text-sm">
                <span className="material-symbols-outlined text-[#25D366] text-xl">check_circle</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}
