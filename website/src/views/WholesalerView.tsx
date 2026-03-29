import React, { useState } from 'react';
import { ViewState } from '../types';
import Layout from '../components/Layout';
import OrdersView from './OrdersView';
import FinanceView from './FinanceView';
import InventoryView from './InventoryView';
import UdharView from './UdharView';
import InsightsView from './InsightsView';
import OrderDetailsView from './OrderDetailsView';
import TransactionDetailsView from './TransactionDetailsView';
import CustomerDetailsView from './CustomerDetailsView';
import TopBar from '../components/TopBar';

interface WholesalerViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function WholesalerView({ setCurrentView: setGlobalView }: WholesalerViewProps) {
  const [activeTab, setActiveTab] = useState<ViewState>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <OrdersView setCurrentView={setActiveTab} />;
      case 'orderDetails':
        return <OrderDetailsView setCurrentView={setActiveTab} />;
      case 'finance':
        return <FinanceView setCurrentView={setActiveTab} />;
      case 'transactionDetails':
        return <TransactionDetailsView setCurrentView={setActiveTab} />;
      case 'inventory':
        return <InventoryView />;
      case 'udhar':
        return <UdharView setCurrentView={setActiveTab} setSelectedCustomer={setSelectedCustomer} />;
      case 'customerDetails':
        return <CustomerDetailsView setCurrentView={setActiveTab} selectedCustomer={selectedCustomer} />;
      case 'insights':
        return <InsightsView />;
      case 'dashboard':
      case 'wholesaler':
      default:
        return (
          <>
            <TopBar title="Wholesale Overview" />
            <div className="p-6 md:p-10 max-w-7xl mx-auto">
              {/* Header Section */}
              <section className="mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">Wholesale Overview</h1>
                    <p className="text-on-surface-variant font-medium">Welcome back, manager. Here's what's happening today.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="bg-surface-container-lowest text-primary font-bold px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2">
                      <span className="material-symbols-outlined">download</span>
                      Export Report
                    </button>
                    <button className="bg-gradient-to-br from-primary to-primary-container text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2">
                      <span className="material-symbols-outlined">add</span>
                      New Entry
                    </button>
                  </div>
                </div>
              </section>

              {/* Grid-Based Navigation Modules */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {/* Shop Orders Card */}
                <div 
                  className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm"
                  onClick={() => setActiveTab('orders')}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-3xl">shopping_bag</span>
                    </div>
                    <span className="bg-secondary-fixed text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">24 NEW</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Shop Orders</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Manage incoming bulk orders from registered kirana stores.</p>
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                    <span>Go to Orders</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>

                {/* Delivery Management Card */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-3xl">local_shipping</span>
                    </div>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-3 py-1 rounded-full text-xs font-bold">8 IN TRANSIT</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Delivery Management</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Track vehicles, assign routes, and manage delivery personnel.</p>
                  <div className="flex items-center gap-2 text-tertiary font-bold text-sm">
                    <span>Track Shipments</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>

                {/* Inventory Card */}
                <div 
                  className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm"
                  onClick={() => setActiveTab('inventory')}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary-fixed/40 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">inventory</span>
                    </div>
                    <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold">LOW STOCK</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Inventory</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Real-time warehouse tracking and automated SKU updates.</p>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span>Audit Warehouse</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>

                {/* Employees Card */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-secondary-fixed/40 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-3xl">badge</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Employees</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Staff attendance, payroll, and performance metrics.</p>
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                    <span>Staff Directory</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>

                {/* Kirana Shops Card */}
                <div 
                  className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm"
                  onClick={() => setActiveTab('udhar')}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary-fixed/40 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">store</span>
                    </div>
                    <span className="text-on-surface-variant text-xs font-bold">142 TOTAL</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Kirana Shops</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Client directory, location mapping, and shop history.</p>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span>View Partners</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>

                {/* Finance Card */}
                <div 
                  className="bg-surface-container-lowest p-6 rounded-3xl group hover:bg-surface-container-low transition-colors cursor-pointer shadow-sm"
                  onClick={() => setActiveTab('finance')}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">Finance</h3>
                  <p className="text-on-surface-variant text-sm mb-4">Cash flow, pending credits, and digital ledger history.</p>
                  <div className="flex items-center gap-2 text-tertiary font-bold text-sm">
                    <span>Manage Ledger</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </section>

              {/* Analytics AI Powered Section */}
              <section className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/40 shadow-xl overflow-hidden relative">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-xl filled">auto_awesome</span>
                    </div>
                    <h2 className="text-2xl font-black text-on-surface font-headline">Analytics (Ai Powered)</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white/50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Demand Forecasting</p>
                      <p className="text-lg font-bold text-on-surface mb-4">Pulses & Grains</p>
                      <div className="h-32 flex items-end gap-2 px-2">
                        <div className="w-full bg-primary/20 rounded-t-lg h-1/2"></div>
                        <div className="w-full bg-primary/40 rounded-t-lg h-3/4"></div>
                        <div className="w-full bg-primary rounded-t-lg h-full"></div>
                        <div className="w-full bg-primary/60 rounded-t-lg h-4/5"></div>
                        <div className="w-full bg-primary/30 rounded-t-lg h-2/3"></div>
                      </div>
                      <p className="text-xs mt-4 text-on-surface-variant">Projected 15% increase in demand next week.</p>
                    </div>
                    <div className="bg-white/50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Route Optimization</p>
                      <p className="text-lg font-bold text-on-surface mb-2">Save 12% Fuel</p>
                      <div className="rounded-xl overflow-hidden h-32 bg-slate-200">
                        <img className="w-full h-full object-cover grayscale opacity-50" alt="Stylized map showing delivery routes" src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" referrerPolicy="no-referrer" />
                      </div>
                      <button className="mt-4 text-secondary text-sm font-bold flex items-center gap-1 hover:underline">
                        Apply suggested routes <span className="material-symbols-outlined text-sm">bolt</span>
                      </button>
                    </div>
                    <div className="bg-white/50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-tertiary mb-1 uppercase tracking-wider">Credit Risk</p>
                      <p className="text-lg font-bold text-on-surface mb-3">Health Score: 94/100</p>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-tertiary w-[94%]"></div>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">Most shops are paying 2 days earlier than last month. Liquidity is excellent.</p>
                    </div>
                  </div>
                </div>
                {/* Background decoration for AI section */}
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -left-20 -top-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
              </section>
            </div>
          </>
        );
    }
  };

  return (
    <Layout currentView={activeTab} setCurrentView={setActiveTab} onLogoClick={() => setGlobalView('landing')}>
      {renderContent()}
    </Layout>
  );
}

