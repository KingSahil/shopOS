import React, { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { ViewState } from '../types';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface UdharViewProps {
  setCurrentView: (view: ViewState) => void;
  setSelectedCustomer?: (customer: UdharCustomer) => void;
}

interface Transaction {
  id: string;
  customerId?: string;
  customerName: string;
  type: 'credit' | 'payment';
  amount: number;
  description: string;
  timestamp?: { toDate?: () => Date } | Date | null;
  paymentMethod?: string;
}

interface BaseCustomer {
  id: string;
  name: string;
  initials?: string;
  phone?: string;
  lastPayment?: string;
  amount?: string;
  bg?: string;
  text?: string;
  lastUpdated?: string;
}

interface UdharCustomer extends BaseCustomer {
  amountNumber: number;
  computedLastPayment: string;
  transactionCount: number;
  customerKey: string;
}

const parseCurrencyValue = (value: unknown) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
};

const formatCurrency = (value: number) => value.toLocaleString('en-IN');

const normalizeName = (value: string) => value.trim().toLowerCase();

const formatTransactionDate = (timestamp?: { toDate?: () => Date } | Date | null) => {
  const date = timestamp instanceof Date
    ? timestamp
    : timestamp?.toDate
      ? timestamp.toDate()
      : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getCustomerKey = (customer: Pick<BaseCustomer, 'phone' | 'name'>) => {
  const phone = String(customer.phone || '').replace(/\D/g, '');
  return phone || normalizeName(customer.name || '');
};

const transactionMatchesCustomer = (transaction: Transaction, customer: Pick<BaseCustomer, 'phone' | 'name'>) => {
  const customerPhone = String(customer.phone || '').replace(/\D/g, '');
  const transactionCustomerId = String(transaction.customerId || '').replace(/\D/g, '');
  const transactionName = normalizeName(transaction.customerName || '');

  if (customerPhone && transactionCustomerId && customerPhone === transactionCustomerId) {
    return true;
  }

  return transactionName === normalizeName(customer.name || '');
};

export default function UdharView({ setCurrentView, setSelectedCustomer }: UdharViewProps) {
  const { showToast } = useToast();
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [baseCustomers, setBaseCustomers] = useState<BaseCustomer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleViewCustomerDetails = (customer: UdharCustomer) => {
    if (setSelectedCustomer) {
      setSelectedCustomer(customer);
    }
    setCurrentView('customerDetails');
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const udharRef = collection(db, `users/${auth.currentUser.uid}/udhar`);
    const q = query(udharRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(itemDoc => ({
        id: itemDoc.id,
        ...itemDoc.data()
      })) as BaseCustomer[];
      setBaseCustomers(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/udhar`);
      showToast('Failed to load udhar customers', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [showToast]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const transactionsRef = collection(db, `users/${auth.currentUser.uid}/udharTransactions`);
    const q = query(transactionsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(itemDoc => ({
        id: itemDoc.id,
        ...itemDoc.data(),
        amount: parseCurrencyValue(itemDoc.data().amount)
      })) as Transaction[];
      setTransactions(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/udharTransactions`);
      showToast('Failed to load transactions', 'error');
    });

    return () => unsubscribe();
  }, [showToast]);

  const customers = useMemo(() => {
    const transactionSummary = new Map<string, {
      amountNumber: number;
      lastPaymentDate: Date | null;
      transactionCount: number;
      lastTransactionDate: Date | null;
    }>();

    transactions.forEach((transaction) => {
      const key = String(transaction.customerId || '').replace(/\D/g, '') || normalizeName(transaction.customerName || '');
      if (!key) return;

      const current = transactionSummary.get(key) || {
        amountNumber: 0,
        lastPaymentDate: null,
        transactionCount: 0,
        lastTransactionDate: null
      };

      const amount = parseCurrencyValue(transaction.amount);
      const date = transaction.timestamp instanceof Date
        ? transaction.timestamp
        : transaction.timestamp?.toDate
          ? transaction.timestamp.toDate()
          : null;

      current.amountNumber += transaction.type === 'credit' ? amount : -amount;
      current.transactionCount += 1;

      if (date && (!current.lastTransactionDate || date > current.lastTransactionDate)) {
        current.lastTransactionDate = date;
      }

      if (transaction.type === 'payment' && date && (!current.lastPaymentDate || date > current.lastPaymentDate)) {
        current.lastPaymentDate = date;
      }

      transactionSummary.set(key, current);
    });

    const baseCustomerMap = new Map(baseCustomers.map(customer => [getCustomerKey(customer), customer]));
    const allKeys = new Set([...baseCustomerMap.keys(), ...transactionSummary.keys()]);

    return Array.from(allKeys)
      .map((key) => {
        const baseCustomer = baseCustomerMap.get(key);
        const summary = transactionSummary.get(key);
        const amountNumber = Math.max(0, summary?.amountNumber ?? parseCurrencyValue(baseCustomer?.amount));
        const lastPaymentDate = summary?.lastPaymentDate;
        const computedLastPayment = lastPaymentDate
          ? formatTransactionDate(lastPaymentDate)
          : baseCustomer?.lastPayment || 'Never';
        const name = baseCustomer?.name || transactions.find(item => {
          const txKey = String(item.customerId || '').replace(/\D/g, '') || normalizeName(item.customerName || '');
          return txKey === key;
        })?.customerName || 'Unknown Customer';

        return {
          id: baseCustomer?.id || key,
          name,
          initials: baseCustomer?.initials || name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
          phone: baseCustomer?.phone || '',
          lastPayment: computedLastPayment,
          amount: formatCurrency(amountNumber),
          bg: baseCustomer?.bg || 'bg-secondary-fixed',
          text: baseCustomer?.text || 'text-on-secondary-container',
          lastUpdated: baseCustomer?.lastUpdated,
          amountNumber,
          computedLastPayment,
          transactionCount: summary?.transactionCount || 0,
          customerKey: key
        } satisfies UdharCustomer;
      })
      .filter(customer => customer.amountNumber > 0 || customer.transactionCount > 0)
      .sort((a, b) => b.amountNumber - a.amountNumber || a.name.localeCompare(b.name));
  }, [baseCustomers, transactions]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeName(searchQuery);
    if (!normalizedQuery) return customers;

    return customers.filter(customer => {
      const phone = String(customer.phone || '').replace(/\D/g, '');
      return normalizeName(customer.name).includes(normalizedQuery) || phone.includes(normalizedQuery.replace(/\D/g, ''));
    });
  }, [customers, searchQuery]);

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.amountNumber, 0),
    [customers]
  );

  const collectionsToday = useMemo(() => {
    const today = new Date();
    return transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'payment') return sum;
      const date = transaction.timestamp instanceof Date
        ? transaction.timestamp
        : transaction.timestamp?.toDate
          ? transaction.timestamp.toDate()
          : null;
      if (!date) return sum;

      const isToday = date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear();

      return isToday ? sum + parseCurrencyValue(transaction.amount) : sum;
    }, 0);
  }, [transactions]);

  const paymentsTodayCount = useMemo(() => {
    const today = new Date();
    return transactions.filter((transaction) => {
      if (transaction.type !== 'payment') return false;
      const date = transaction.timestamp instanceof Date
        ? transaction.timestamp
        : transaction.timestamp?.toDate
          ? transaction.timestamp.toDate()
          : null;
      if (!date) return false;
      return date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear();
    }).length;
  }, [transactions]);

  return (
    <>
      <TopBar title="Udhar Ledger" />
      <div className="px-6 pt-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-8 rounded-[1.5rem] bg-surface-container-lowest/70 ghost-border flex flex-col justify-between overflow-hidden relative group ambient-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-7xl text-primary">account_balance_wallet</span>
            </div>
            <div>
              <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant font-semibold">Total Outstanding</p>
              <h2 className="font-headline text-4xl font-extrabold text-primary mt-2">₹{formatCurrency(totalOutstanding)}</h2>
            </div>
            <div className="mt-6 flex items-center gap-2 text-error font-semibold">
              <span className="material-symbols-outlined text-sm">groups</span>
              <span className="text-sm">{customers.length} active customer accounts</span>
            </div>
          </div>

          <div className="p-8 rounded-[1.5rem] bg-surface-container-lowest flex flex-col justify-between ghost-border ambient-shadow">
            <div>
              <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant font-semibold">Collections Today</p>
              <h2 className="font-headline text-4xl font-extrabold text-tertiary mt-2">₹{formatCurrency(collectionsToday)}</h2>
            </div>
            <div className="mt-6 flex items-center gap-2 text-tertiary font-semibold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span className="text-sm">{paymentsTodayCount} payments recorded today</span>
            </div>
          </div>

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

        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Active Customer Accounts</h2>
            <div className="flex gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search customers..."
                  className="pl-10 pr-4 py-3 bg-surface-container-highest rounded-sm border-none focus:ring-1 focus:ring-secondary w-full md:w-64 font-body text-sm outline-none transition-shadow h-12"
                />
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="p-3 bg-surface-container-lowest rounded-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors h-12 w-12 flex items-center justify-center ambient-shadow ghost-border"
              >
                <span className="material-symbols-outlined">{searchQuery ? 'close' : 'filter_list'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant">
                <p>{customers.length === 0 ? 'No customers yet. Click "Give Credit" to add your first customer.' : 'No matching customers found.'}</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.customerKey} className="bg-surface-container-lowest p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-surface-bright transition-all group ambient-shadow ghost-border">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-full ${customer.bg} ${customer.text} flex items-center justify-center font-bold text-lg`}>
                      {customer.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-headline font-bold text-lg text-on-surface truncate">{customer.name}</h4>
                      <p className="text-sm text-on-surface-variant">Last payment: {customer.computedLastPayment}</p>
                    </div>
                  </div>
                  <div className="w-52 shrink-0 text-center">
                    <p className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant mb-1">Pending Amount</p>
                    <p className="font-headline text-xl font-extrabold text-error">₹{formatCurrency(customer.amountNumber)}</p>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-10 shrink-0">
                    <button
                      onClick={() => handleViewCustomerDetails(customer)}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined">history</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8 mb-8">
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">Recent Transactions</h2>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant bg-surface-container-lowest rounded-[1.5rem] p-6">
                <p>No transactions yet.</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((transaction) => {
                const isCredit = transaction.type === 'credit';

                return (
                  <div key={transaction.id} className="bg-surface-container-lowest p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-surface-bright transition-all ambient-shadow ghost-border">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-error/10' : 'bg-tertiary/10'}`}>
                        <span className={`material-symbols-outlined text-xl ${isCredit ? 'text-error' : 'text-tertiary'}`}>
                          {isCredit ? 'north_east' : 'south_west'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-base text-on-surface">{transaction.customerName}</h4>
                        <p className="text-xs text-on-surface-variant">
                          {transaction.description} • {formatTransactionDate(transaction.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-headline text-lg font-extrabold ${isCredit ? 'text-error' : 'text-tertiary'}`}>
                        {isCredit ? '-' : '+'}₹{formatCurrency(parseCurrencyValue(transaction.amount))}
                      </p>
                      {transaction.paymentMethod && (
                        <p className="text-xs text-on-surface-variant">{transaction.paymentMethod}</p>
                      )}
                    </div>
                  </div>
                );
              })
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
            const customerName = String(formData.get('customerName') || '').trim();
            const amount = Number(formData.get('amount'));
            const notes = String(formData.get('notes') || '').trim() || 'Credit given';

            const existingCustomer = customers.find(customer => normalizeName(customer.name) === normalizeName(customerName));

            if (existingCustomer) {
              const customerRef = doc(db, `users/${auth.currentUser.uid}/udhar`, existingCustomer.id);
              await updateDoc(customerRef, {
                amount: formatCurrency(existingCustomer.amountNumber + amount),
                lastUpdated: new Date().toISOString()
              });
            } else {
              const newCustomer = {
                name: customerName,
                initials: customerName.substring(0, 2).toUpperCase(),
                lastPayment: 'Never',
                amount: formatCurrency(amount),
                bg: 'bg-secondary-fixed',
                text: 'text-on-secondary-container'
              };

              const udharRef = collection(db, `users/${auth.currentUser.uid}/udhar`);
              await setDoc(doc(udharRef), newCustomer);
            }

            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/udharTransactions`);
            await addDoc(transactionsRef, {
              customerId: existingCustomer?.phone || existingCustomer?.id || customerName,
              customerName,
              type: 'credit',
              amount,
              description: notes,
              timestamp: Timestamp.now()
            });

            showToast('Credit added successfully', 'success');
            setIsCreditModalOpen(false);
            e.currentTarget.reset();
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
            const customerId = String(formData.get('customerId') || '');
            const amount = Number(formData.get('amount'));
            const paymentMethod = String(formData.get('method') || 'UPI');

            const customer = customers.find(item => item.id === customerId);
            if (!customer) return;

            const newAmount = Math.max(0, customer.amountNumber - amount);

            const customerRef = doc(db, `users/${auth.currentUser.uid}/udhar`, customerId);
            await updateDoc(customerRef, {
              amount: formatCurrency(newAmount),
              lastPayment: 'Today',
              lastUpdated: new Date().toISOString()
            });

            const transactionsRef = collection(db, `users/${auth.currentUser.uid}/udharTransactions`);
            await addDoc(transactionsRef, {
              customerId: customer.phone || customer.id,
              customerName: customer.name,
              type: 'payment',
              amount,
              description: `${paymentMethod} payment`,
              paymentMethod,
              timestamp: Timestamp.now()
            });

            showToast('Payment recorded successfully', 'success');
            setIsPaymentModalOpen(false);
            e.currentTarget.reset();
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/udhar`);
            showToast('Failed to record payment', 'error');
          }
        }}>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">Select Customer</label>
            <select name="customerId" required className="w-full px-4 py-3 bg-surface-container-highest border-none rounded-sm focus:ring-1 focus:ring-secondary font-body text-sm outline-none transition-shadow appearance-none">
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.customerKey} value={customer.id}>{customer.name} (Pending: ₹{formatCurrency(customer.amountNumber)})</option>
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
