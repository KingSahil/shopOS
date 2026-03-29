import React, { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import { ViewState } from '../types';
import { collection, doc, onSnapshot, query, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface CustomerDetailsViewProps {
  setCurrentView: (view: ViewState) => void;
  selectedCustomer?: {
    id?: string;
    name?: string;
    phone?: string;
    amount?: string;
    amountNumber?: number;
    lastPayment?: string;
    computedLastPayment?: string;
    initials?: string;
    bg?: string;
    text?: string;
    customerKey?: string;
  } | null;
}

interface Transaction {
  id: string;
  customerId?: string;
  customerName: string;
  type: 'credit' | 'payment';
  amount: number;
  description: string;
  paymentMethod?: string;
  timestamp?: { toDate?: () => Date } | Date | null;
}

const parseCurrencyValue = (value: unknown) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const formatCurrency = (value: number) => value.toLocaleString('en-IN');

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

export default function CustomerDetailsView({ setCurrentView, selectedCustomer }: CustomerDetailsViewProps) {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const customer = selectedCustomer || {
    id: 'unknown',
    name: 'Unknown Customer',
    phone: '',
    amountNumber: 0,
    computedLastPayment: 'Never',
    initials: 'UC',
    customerKey: 'unknown'
  };

  useEffect(() => {
    if (!auth.currentUser || !customer?.name) return;

    const transactionsRef = collection(db, `users/${auth.currentUser.uid}/udharTransactions`);
    const q = query(transactionsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data(),
          amount: parseCurrencyValue(itemDoc.data().amount)
        } as Transaction))
        .filter((transaction) => {
          const selectedPhone = String(customer.phone || '').replace(/\D/g, '');
          const transactionId = String(transaction.customerId || '').replace(/\D/g, '');

          if (selectedPhone && transactionId && selectedPhone === transactionId) {
            return true;
          }

          return normalizeName(transaction.customerName || '') === normalizeName(customer.name || '');
        })
        .sort((a, b) => {
          const firstDate = a.timestamp instanceof Date ? a.timestamp : a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
          const secondDate = b.timestamp instanceof Date ? b.timestamp : b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
          return secondDate.getTime() - firstDate.getTime();
        });

      setTransactions(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/udharTransactions`);
      showToast('Failed to load customer transactions', 'error');
    });

    return () => unsubscribe();
  }, [customer?.name, customer?.phone, showToast]);

  const totalDue = useMemo(() => {
    if (transactions.length === 0) {
      return customer.amountNumber || parseCurrencyValue(customer.amount);
    }

    return Math.max(0, transactions.reduce((sum, transaction) => {
      return sum + (transaction.type === 'credit' ? transaction.amount : -transaction.amount);
    }, 0));
  }, [customer.amount, customer.amountNumber, transactions]);

  const lastPayment = useMemo(() => {
    const payment = transactions.find(transaction => transaction.type === 'payment');
    return payment ? formatTransactionDate(payment.timestamp) : customer.computedLastPayment || customer.lastPayment || 'Never';
  }, [customer.computedLastPayment, customer.lastPayment, transactions]);

  const creditCount = transactions.filter(transaction => transaction.type === 'credit').length;
  const paymentCount = transactions.filter(transaction => transaction.type === 'payment').length;
  const displayPhone = customer.phone || 'N/A';
  const displayInitials = customer.initials || String(customer.name || 'UC').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <TopBar title={`Customer: ${customer.name}`} />
      <div className="px-6 md:px-10 mb-8 mt-6 max-w-4xl mx-auto">
        <button
          onClick={() => setCurrentView('udhar')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-bold text-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Udhar Ledger
        </button>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] ambient-shadow ghost-border space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/20 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold text-white">
                {displayInitials}
              </div>
              <div>
                <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-1">{customer.name}</h1>
                <p className="text-on-surface-variant font-medium">{displayPhone}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-error-container text-error text-sm font-bold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              Outstanding
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Credit Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Total Due</span>
                  <span className="font-headline font-extrabold text-error text-2xl">₹{formatCurrency(totalDue)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Last Payment</span>
                  <span className="font-medium text-on-surface">{lastPayment}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Credit Entries</span>
                  <span className="font-medium text-on-surface">{creditCount}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Payments</span>
                  <span className="font-medium text-on-surface">{paymentCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      if (!auth.currentUser) {
                        showToast('Please sign in to send reminders', 'error');
                        return;
                      }

                      if (!customer.phone) {
                        showToast('Customer phone number not available', 'error');
                        return;
                      }

                      const message = `🔔 *Payment Reminder*\n\nDear ${customer.name},\n\nThis is a friendly reminder about your pending payment.\n\n💰 *Amount Due:* ₹${formatCurrency(totalDue)}\n📅 *Last Payment:* ${lastPayment}\n\nPlease clear your dues at your earliest convenience.\n\nThank you for your business! 🙏`;

                      const whatsappRef = collection(db, `users/${auth.currentUser.uid}/whatsapp_messages`);
                      await setDoc(doc(whatsappRef), {
                        to: customer.phone,
                        message,
                        customerId: customer.id || 'unknown',
                        customerName: customer.name,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        type: 'payment_reminder'
                      });

                      showToast('WhatsApp reminder queued successfully', 'success');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser?.uid}/whatsapp_messages`);
                      showToast('Failed to send WhatsApp reminder', 'error');
                    }
                  }}
                  className="w-full py-3 rounded-full bg-[#25D366]/10 text-[#075E54] font-bold text-sm hover:bg-[#25D366]/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Send WhatsApp Reminder
                </button>
                <button
                  onClick={() => setCurrentView('udhar')}
                  className="w-full py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-sm hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">payments</span>
                  Back to Ledger
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="flex justify-between items-center p-4 bg-surface-container-highest rounded-xl">
                  <p className="text-sm text-on-surface-variant">No udhar transactions found for this customer yet.</p>
                </div>
              ) : (
                transactions.map((transaction) => {
                  const isPayment = transaction.type === 'payment';
                  return (
                    <div key={transaction.id} className="flex justify-between items-center p-4 bg-surface-container-highest rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPayment ? 'bg-tertiary-fixed text-tertiary' : 'bg-error-container text-error'}`}>
                          <span className="material-symbols-outlined text-sm">{isPayment ? 'south_west' : 'north_east'}</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface">{transaction.description}</p>
                          <p className="text-xs text-on-surface-variant">{formatTransactionDate(transaction.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-extrabold ${isPayment ? 'text-tertiary' : 'text-error'}`}>
                          {isPayment ? '+' : '-'}₹{formatCurrency(transaction.amount)}
                        </span>
                        {transaction.paymentMethod && (
                          <p className="text-xs text-on-surface-variant">{transaction.paymentMethod}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
