import React, { useState } from 'react';
import Layout from './components/Layout';
import { ViewState } from './types';
import DashboardView from './views/DashboardView';
import OrdersView from './views/OrdersView';
import OrderDetailsView from './views/OrderDetailsView';
import UdharView from './views/UdharView';
import CustomerDetailsView from './views/CustomerDetailsView';
import InventoryView from './views/InventoryView';
import FinanceView from './views/FinanceView';
import TransactionDetailsView from './views/TransactionDetailsView';
import InsightsView from './views/InsightsView';
import LandingView from './views/LandingView';
import WholesalerView from './views/WholesalerView';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 text-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-4">storefront</span>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">Kirana Connect</h1>
          <p className="text-on-surface-variant mb-8">Sign in to manage your store inventory, orders, and udhar.</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-primary text-white py-3 px-4 rounded-full font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">login</span>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'landing') {
    return (
      <ToastProvider>
        <LandingView setCurrentView={setCurrentView} />
      </ToastProvider>
    );
  }

  if (currentView === 'wholesaler') {
    return (
      <ToastProvider>
        <WholesalerView setCurrentView={setCurrentView} />
      </ToastProvider>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView setCurrentView={setCurrentView} />;
      case 'orders':
        return <OrdersView setCurrentView={setCurrentView} setSelectedOrderId={setSelectedOrderId} />;
      case 'orderDetails':
        return <OrderDetailsView setCurrentView={setCurrentView} orderId={selectedOrderId} />;
      case 'udhar':
        return <UdharView setCurrentView={setCurrentView} />;
      case 'customerDetails':
        return <CustomerDetailsView setCurrentView={setCurrentView} />;
      case 'inventory':
        return <InventoryView />;
      case 'finance':
        return <FinanceView setCurrentView={setCurrentView} />;
      case 'transactionDetails':
        return <TransactionDetailsView setCurrentView={setCurrentView} />;
      case 'insights':
        return <InsightsView />;
      default:
        return <DashboardView setCurrentView={setCurrentView} />;
    }
  };

  return (
    <ToastProvider>
      <Layout currentView={currentView} setCurrentView={setCurrentView} onLogoClick={() => setCurrentView('landing')}>
        {renderView()}
      </Layout>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

