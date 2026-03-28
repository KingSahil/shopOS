import React from 'react';

export type ViewState = 'landing' | 'wholesaler' | 'dashboard' | 'orders' | 'orderDetails' | 'udhar' | 'customerDetails' | 'inventory' | 'finance' | 'transactionDetails' | 'insights';

export interface LayoutProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  children: React.ReactNode;
  onLogoClick?: () => void;
}
