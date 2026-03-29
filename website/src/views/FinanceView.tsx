import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { ViewState } from '../types';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface FinanceViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function FinanceView({ setCurrentView }: FinanceViewProps) {
  const { showToast } = useToast();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const financeRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
    const q = query(financeRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/transactions`);
      showToast('Failed to load transactions', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <TopBar title="Finance Overview" />
      <div className="px-6 space-y-8 max-w-7xl mx-auto mt-6 pb-24">
        {/* Hero Metrics Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative overflow-hidden glass-gradient p-6 rounded-[1.5rem] text-white ambient-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-6xl filled">trending_up</span>
            </div>
            <p className="font-label text-sm uppercase tracking-wider opacity-80">Monthly Revenue</p>
            <h3 className="font-headline font-bold text-3xl mt-2">₹12,45,000</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-full text-xs font-bold">+14.2%</span>
              <span className="text-xs opacity-70">vs last month</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ghost-border ambient-shadow">
            <p className="font-label text-sm uppercase tracking-wider text-on-surface-variant">Net Profit</p>
            <h3 className="font-headline font-bold text-3xl mt-2 text-on-surface">₹3,84,200</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-full text-xs font-bold">+8.1%</span>
              <span className="text-xs text-on-surface-variant">Margin: 30.8%</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ghost-border ambient-shadow">
            <p className="font-label text-sm uppercase tracking-wider text-on-surface-variant">Pending Receivables</p>
            <h3 className="font-headline font-bold text-3xl mt-2 text-error">₹1,12,500</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-xs font-bold">12 Active</span>
              <span className="text-xs text-on-surface-variant">Avg. 14 days delay</span>
            </div>
          </div>

          {/* Action Hub Card */}
          <div className="p-6 rounded-[1.5rem] bg-surface-container-low flex flex-col justify-center gap-4 ghost-border ambient-shadow">
            <button 
              onClick={() => setIsIncomeModalOpen(true)}
              className="w-full bg-surface-container-lowest text-primary py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-bright transition-all active:scale-95 h-12 ghost-border ambient-shadow"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add Income
            </button>
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-full glass-gradient text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 h-12 ambient-shadow"
            >
              <span className="material-symbols-outlined">remove_circle</span>
              Record Expense
            </button>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cash Flow Visualization */}
          <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] ghost-border ambient-shadow">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-headline font-bold text-lg">Cash Flow Analysis</h4>
                <p className="font-body text-sm text-on-surface-variant">Income vs. Expenses (Last 6 Months)</p>
              </div>
              <button 
                onClick={() => showToast('Exporting Cash Flow Analysis...', 'info')}
                className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-4 px-2">
              {[
                { m: 'SEP', i: '60%', e: '40%' },
                { m: 'OCT', i: '75%', e: '35%' },
                { m: 'NOV', i: '55%', e: '45%' },
                { m: 'DEC', i: '90%', e: '50%' },
                { m: 'JAN', i: '70%', e: '40%' },
                { m: 'FEB', i: '85%', e: '30%' },
              ].map((data, idx) => (
                <div key={idx} className="flex-1 space-y-2">
                  <div className="flex justify-center gap-1 h-full items-end">
                    <div className="w-4 bg-primary rounded-t-sm" style={{ height: data.i }}></div>
                    <div className="w-4 bg-secondary rounded-t-sm" style={{ height: data.e }}></div>
                  </div>
                  <p className="text-[10px] text-center font-bold text-on-surface-variant">{data.m}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-xs font-bold">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-secondary rounded-full"></div>
                <span className="text-xs font-bold">Expense</span>
              </div>
            </div>
          </div>

          {/* Profit Margin Glass Card */}
          <div className="glass-card p-8 rounded-[1.5rem] ghost-border ambient-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-secondary filled">auto_awesome</span>
                <h4 className="font-headline font-bold text-lg">AI Smart Insights</h4>
              </div>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">Your profit margins have increased by <span className="text-tertiary font-bold">4.2%</span> due to optimized procurement from "MegaWholesale Ltd". We recommend clearing your pending udhar for the 'Dairy' category to unlock extra 2% cashback.</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Efficiency Score</span>
                <span className="text-2xl font-headline font-extrabold text-primary">88/100</span>
              </div>
              <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary h-full w-[88%]"></div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button 
                onClick={() => showToast('Optimizing stocks...', 'info')}
                className="bg-secondary text-white py-3 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform h-12"
              >
                Optimize Stocks
              </button>
              <button 
                onClick={() => showToast('Generating Full Report...', 'info')}
                className="bg-surface-container-highest text-on-surface py-3 rounded-full font-bold text-sm active:scale-95 transition-transform h-12"
              >
                Full Report
              </button>
            </div>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="bg-surface-container-lowest rounded-[1.5rem] overflow-hidden ghost-border ambient-shadow">
          <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low/30">
            <h4 className="font-headline font-bold text-xl">Recent Transactions</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => showToast('Opening filters...', 'info')}
                className="px-4 py-2 bg-surface-container-lowest rounded-full ghost-border text-xs font-bold hover:bg-surface-bright transition-colors flex items-center gap-2 h-10"
              >
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button 
                onClick={() => showToast('Exporting transaction list...', 'info')}
                className="px-4 py-2 bg-surface-container-lowest rounded-full ghost-border text-xs font-bold hover:bg-surface-bright transition-colors flex items-center gap-2 h-10"
              >
                <span className="material-symbols-outlined text-sm">ios_share</span>
                Export List
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="px-8 py-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">Transaction ID</th>
                  <th className="px-8 py-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">Entity</th>
                  <th className="px-8 py-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">Date</th>
                  <th className="px-8 py-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">Status</th>
                  <th className="px-8 py-4 font-label text-xs uppercase tracking-widest text-on-surface-variant text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tr, idx) => (
                    <tr key={idx} className="hover:bg-surface-bright transition-colors cursor-pointer" onClick={() => setCurrentView('transactionDetails')}>
                      <td className="px-8 py-5 font-bold text-sm">{tr.id}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full ${tr.bg} flex items-center justify-center ${tr.text} text-[10px] font-black shrink-0`}>{tr.initials}</div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{tr.entity}</span>
                            {tr.phone && tr.phone !== 'N/A' && (
                              <span className="text-[10px] text-outline font-bold truncate tracking-tight">{tr.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-on-surface-variant">{tr.date}</td>
                      <td className="px-8 py-5">
                        <span className={`${tr.statusBg} ${tr.statusText} px-3 py-1 rounded-full text-[10px] font-bold`}>{tr.status}</span>
                      </td>
                      <td className={`px-8 py-5 text-sm font-bold text-right ${tr.amountColor}`}>{tr.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title="Add Income"
      >
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.currentUser) return;
          
          try {
            const formData = new FormData(e.currentTarget);
            const source = formData.get('source') as string;
            const amount = Number(formData.get('amount'));
            
            const newTransaction = {
              id: `#TR-${Math.floor(Math.random() * 100000)}`,
              entity: source,
              initials: source.substring(0, 2).toUpperCase(),
              bg: 'bg-primary-fixed',
              text: 'text-on-primary-fixed',
              date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: 'COMPLETED',
              statusBg: 'bg-tertiary-fixed',
              statusText: 'text-on-tertiary-fixed-variant',
              amount: `+ ₹${amount.toLocaleString('en-IN')}`,
              amountColor: 'text-tertiary'
            };

            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
            await setDoc(doc(transactionsRef), newTransaction);

            showToast('Income added successfully', 'success');
            setIsIncomeModalOpen(false);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/transactions`);
            showToast('Failed to add income', 'error');
          }
        }}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Source / Category</label>
            <select name="source" className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
              <option>Daily Sales</option>
              <option>Udhar Collection</option>
              <option>Other Income</option>
            </select>
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
            <label className="block text-sm font-bold text-on-surface mb-1">Notes / Description</label>
            <input 
              type="text" 
              name="notes"
              placeholder="e.g. Evening cash collection"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsIncomeModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors h-12"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity h-12"
            >
              Add Income
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Expense"
      >
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!auth.currentUser) return;
          
          try {
            const formData = new FormData(e.currentTarget);
            const category = formData.get('category') as string;
            const amount = Number(formData.get('amount'));
            
            const newTransaction = {
              id: `#TR-${Math.floor(Math.random() * 100000)}`,
              entity: category,
              initials: category.substring(0, 2).toUpperCase(),
              bg: 'bg-secondary-fixed',
              text: 'text-on-secondary-fixed',
              date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: 'COMPLETED',
              statusBg: 'bg-tertiary-fixed',
              statusText: 'text-on-tertiary-fixed-variant',
              amount: `- ₹${amount.toLocaleString('en-IN')}`,
              amountColor: 'text-error'
            };

            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
            await setDoc(doc(transactionsRef), newTransaction);

            showToast('Expense recorded successfully', 'success');
            setIsExpenseModalOpen(false);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/transactions`);
            showToast('Failed to record expense', 'error');
          }
        }}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Expense Category</label>
            <select name="category" className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
              <option>Inventory Purchase</option>
              <option>Rent</option>
              <option>Electricity Bill</option>
              <option>Staff Salary</option>
              <option>Miscellaneous</option>
            </select>
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
            <label className="block text-sm font-bold text-on-surface mb-1">Notes / Description</label>
            <input 
              type="text" 
              name="notes"
              placeholder="e.g. Paid to MegaWholesale Ltd"
              className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors h-12"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-full glass-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity h-12"
            >
              Record Expense
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
