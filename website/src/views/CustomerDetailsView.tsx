import React from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import { ViewState } from '../types';

interface CustomerDetailsViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function CustomerDetailsView({ setCurrentView }: CustomerDetailsViewProps) {
  const { showToast } = useToast();

  // Mock customer data
  const customer = {
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    totalDue: '4,500',
    lastPayment: 'Oct 20, 2023',
    status: 'High Risk',
    sColor: 'error'
  };

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
                {customer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-1">{customer.name}</h1>
                <p className="text-on-surface-variant font-medium">{customer.phone}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${customer.sColor}-fixed text-on-${customer.sColor}-fixed-variant text-sm font-bold uppercase tracking-wide`}>
              <span className={`w-2 h-2 rounded-full bg-${customer.sColor}`}></span>
              {customer.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Credit Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Total Due</span>
                  <span className="font-headline font-extrabold text-error text-2xl">₹{customer.totalDue}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Last Payment</span>
                  <span className="font-medium text-on-surface">{customer.lastPayment}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => showToast('Reminder sent via WhatsApp', 'success')}
                  className="w-full py-3 rounded-full bg-[#25D366]/10 text-[#075E54] font-bold text-sm hover:bg-[#25D366]/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Send WhatsApp Reminder
                </button>
                <button 
                  onClick={() => showToast('Payment recorded', 'success')}
                  className="w-full py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-sm hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">payments</span>
                  Record Payment
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {[
                { date: 'Oct 24, 2023', desc: 'Bought Groceries', amount: '-₹1,200', type: 'credit' },
                { date: 'Oct 20, 2023', desc: 'Cash Payment', amount: '+₹500', type: 'payment' },
                { date: 'Oct 15, 2023', desc: 'Bought Rice (25kg)', amount: '-₹1,800', type: 'credit' },
              ].map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-surface-container-highest rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'payment' ? 'bg-tertiary-fixed text-tertiary' : 'bg-error-container text-error'}`}>
                      <span className="material-symbols-outlined text-sm">{tx.type === 'payment' ? 'south_west' : 'north_east'}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{tx.desc}</p>
                      <p className="text-xs text-on-surface-variant">{tx.date}</p>
                    </div>
                  </div>
                  <span className={`font-extrabold ${tx.type === 'payment' ? 'text-tertiary' : 'text-error'}`}>{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
