import React from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import { ViewState } from '../types';

interface TransactionDetailsViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function TransactionDetailsView({ setCurrentView }: TransactionDetailsViewProps) {
  const { showToast } = useToast();

  // Mock transaction data
  const transaction = {
    id: '#TXN-9921',
    date: 'Oct 26, 2023',
    desc: 'Supplier Payment (Aashirvaad)',
    amount: '-₹45,000',
    type: 'expense',
    status: 'Completed',
    category: 'Inventory',
    method: 'Bank Transfer'
  };

  return (
    <>
      <TopBar title={`Transaction ${transaction.id}`} />
      <div className="px-6 md:px-10 mb-8 mt-6 max-w-4xl mx-auto">
        <button 
          onClick={() => setCurrentView('finance')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-bold text-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Finance
        </button>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] ambient-shadow ghost-border space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/20 pb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${transaction.type === 'income' ? 'bg-tertiary-fixed text-tertiary' : 'bg-error-container text-error'}`}>
                <span className="material-symbols-outlined text-3xl">{transaction.type === 'income' ? 'south_west' : 'north_east'}</span>
              </div>
              <div>
                <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-1">{transaction.desc}</h1>
                <p className="text-on-surface-variant font-medium">{transaction.date}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-sm font-bold uppercase tracking-wide`}>
              {transaction.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Transaction Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Amount</span>
                  <span className={`font-headline font-extrabold text-2xl ${transaction.type === 'income' ? 'text-tertiary' : 'text-error'}`}>{transaction.amount}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Category</span>
                  <span className="font-medium text-on-surface">{transaction.category}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Payment Method</span>
                  <span className="font-medium text-on-surface">{transaction.method}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Actions</h2>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => showToast('Receipt downloaded', 'success')}
                  className="w-full py-3 rounded-full bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-outline-variant/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">download</span>
                  Download Receipt
                </button>
                <button 
                  onClick={() => showToast('Transaction disputed', 'info')}
                  className="w-full py-3 rounded-full bg-error-container text-on-error-container font-bold text-sm hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">report</span>
                  Dispute Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
