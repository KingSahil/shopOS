import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { ViewState } from '../types';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface UdharViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function UdharView({ setCurrentView }: UdharViewProps) {
  const { showToast } = useToast();
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const udharRef = collection(db, `users/${auth.currentUser.uid}/udhar`);
    const q = query(udharRef, orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/udhar`);
      showToast('Failed to load udhar customers', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <TopBar title="Udhar Ledger" />
      <div className="px-6 pt-6 max-w-7xl mx-auto">
        {/* Summary Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Outstanding Card */}
          <div className="glass-card p-8 rounded-[1.5rem] bg-surface-container-lowest/70 ghost-border flex flex-col justify-between overflow-hidden relative group ambient-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-7xl text-primary">account_balance_wallet</span>
            </div>
            <div>
              <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant font-semibold">Total Outstanding</p>
              <h2 className="font-headline text-4xl font-extrabold text-primary mt-2">₹4,82,950</h2>
            </div>
            <div className="mt-6 flex items-center gap-2 text-error font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-sm">8% increase from last month</span>
            </div>
          </div>

          {/* Collections Today Card */}
          <div className="p-8 rounded-[1.5rem] bg-surface-container-lowest flex flex-col justify-between ghost-border ambient-shadow">
            <div>
              <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant font-semibold">Collections Today</p>
              <h2 className="font-headline text-4xl font-extrabold text-tertiary mt-2">₹12,400</h2>
            </div>
            <div className="mt-6 flex items-center gap-2 text-tertiary font-semibold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span className="text-sm">14 invoices settled</span>
            </div>
          </div>

          {/* Action Hub Card */}
          <div className="p-8 rounded-[1.5rem] glass-gradient text-white flex flex-col justify-center gap-4 ambient-shadow">
            <button 
              onClick={() => setIsCreditModalOpen(true)}
              className="w-full bg-surface-container-lowest text-primary py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-bright transition-all active:scale-95 h-12"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Give Credit
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full bg-primary text-white border border-primary-fixed-dim/30 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-all active:scale-95 h-12"
            >
              <span className="material-symbols-outlined">payments</span>
              Receive Payment
            </button>
          </div>
        </div>

        {/* Ledger Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Active Customer Accounts</h2>
            <div className="flex gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  className="pl-10 pr-4 py-3 bg-surface-container-highest rounded-sm border-none focus:ring-1 focus:ring-secondary w-full md:w-64 font-body text-sm outline-none transition-shadow h-12"
                />
              </div>
              <button 
                onClick={() => showToast('Opening filters...', 'info')}
                className="p-3 bg-surface-container-lowest rounded-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors h-12 w-12 flex items-center justify-center ambient-shadow ghost-border"
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              customers.map((customer, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-5 rounded-[1.5rem] flex items-center justify-between hover:bg-surface-bright transition-all group ambient-shadow ghost-border">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${customer.bg} ${customer.text} flex items-center justify-center font-bold text-lg`}>
                      {customer.initials}
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-lg text-on-surface">{customer.name}</h4>
                      <p className="text-sm text-on-surface-variant">Last payment: {customer.lastPayment}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant mb-1">Pending Amount</p>
                    <p className="font-headline text-xl font-extrabold text-error">₹{customer.amount}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setCurrentView('customerDetails')}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined">history</span>
                    </button>
                    <button 
                      onClick={() => setCurrentView('customerDetails')}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        title="Give Credit"
      >
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.currentUser) return;
          
          try {
            const formData = new FormData(e.currentTarget);
            const customerName = formData.get('customerName') as string;
            const amount = Number(formData.get('amount'));
            
            const newCustomer = {
              name: customerName,
              initials: customerName.substring(0, 2).toUpperCase(),
              lastPayment: 'Never',
              amount: amount.toLocaleString('en-IN'),
              bg: 'bg-secondary-fixed',
              text: 'text-on-secondary-container'
            };

            const udharRef = collection(db, `users/${auth.currentUser.uid}/udhar`);
            await setDoc(doc(udharRef), newCustomer);

            showToast('Credit added successfully', 'success');
            setIsCreditModalOpen(false);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/udhar`);
            showToast('Failed to add credit', 'error');
          }
        }}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Customer Name</label>
            <input 
              type="text" 
              name="customerName"
              required
              placeholder="e.g. Anil Kirana Store"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Amount (₹)</label>
            <input 
              type="number" 
              name="amount"
              required
              min="1"
              placeholder="0.00"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Notes / Invoice Ref</label>
            <input 
              type="text" 
              name="notes"
              placeholder="e.g. Invoice #INV-102"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsCreditModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors h-12"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity h-12"
            >
              Confirm Credit
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Receive Payment"
      >
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.currentUser) return;
          
          try {
            const formData = new FormData(e.currentTarget);
            const customerId = formData.get('customerId') as string;
            const amount = Number(formData.get('amount'));
            
            const customer = customers.find(c => c.id === customerId);
            if (!customer) return;

            const currentAmount = Number(customer.amount.replace(/,/g, ''));
            const newAmount = Math.max(0, currentAmount - amount);

            const customerRef = doc(db, `users/${auth.currentUser.uid}/udhar`, customerId);
            await setDoc(customerRef, {
              ...customer,
              amount: newAmount.toLocaleString('en-IN'),
              lastPayment: 'Today'
            });

            showToast('Payment recorded successfully', 'success');
            setIsPaymentModalOpen(false);
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/udhar`);
            showToast('Failed to record payment', 'error');
          }
        }}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Select Customer</label>
            <select name="customerId" required className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
              <option value="">Select a customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (Pending: ₹{c.amount})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Amount Received (₹)</label>
            <input 
              type="number" 
              name="amount"
              required
              min="1"
              placeholder="0.00"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Payment Method</label>
            <select name="method" className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
              <option>UPI</option>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors h-12"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity h-12"
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
