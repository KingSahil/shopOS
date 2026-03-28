import React, { useState } from 'react';
import { ViewState } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onLogoClick?: () => void;
}

export default function Sidebar({ currentView, setCurrentView, isCollapsed, setIsCollapsed, onLogoClick }: SidebarProps) {
  const { showToast } = useToast();
  const navItems: { id: ViewState; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'orders', label: 'Orders', icon: 'shopping_cart' },
    { id: 'udhar', label: 'Udhar Ledger', icon: 'account_balance_wallet' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory_2' },
    { id: 'finance', label: 'Finance', icon: 'payments' },
    { id: 'insights', label: 'AI Insights', icon: 'insights' },
  ];

  return (
    <aside className={`hidden md:flex fixed left-0 top-0 h-screen flex-col bg-surface dark:bg-[#071e27] shadow-[20px_0px_40px_rgba(7,30,39,0.06)] z-50 transition-all duration-300 ease-in-out rounded-r-2xl ${isCollapsed ? 'w-20' : 'w-72'}`}>
      <div className={`py-10 flex items-center relative ${isCollapsed ? 'justify-center px-0' : 'px-8 gap-3'}`}>
        <div 
          className={`flex items-center gap-3 ${onLogoClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={onLogoClick}
        >
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed text-3xl">storefront</span>
          {!isCollapsed && (
            <h1 className="font-headline font-extrabold text-primary-container dark:text-primary-fixed text-2xl tracking-tight whitespace-nowrap">
              {"Kirana Keeper".split('').map((char, index) => (
                <span 
                  key={index}
                  className="inline-block animate-char opacity-0"
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
          )}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 liquid-glass rounded-full p-1.5 text-on-surface dark:text-white hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-sm">
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
              }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center py-3 my-1 rounded-r-full font-label text-sm font-medium transition-colors ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-6'} ${
                isActive
                  ? 'bg-secondary text-white'
                  : 'text-on-surface dark:text-white hover:bg-surface-variant dark:hover:bg-white/10'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-outline-variant/10 ${isCollapsed ? 'p-4 flex justify-center' : 'p-6'}`}>
        <div 
          className={`flex items-center cursor-pointer hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : 'gap-3'}`}
          onClick={() => showToast('Opening profile settings...', 'info')}
        >
          <div className="w-10 h-10 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center text-white font-bold">
            SK
          </div>
          {!isCollapsed && (
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold text-on-surface dark:text-white truncate">Suresh Kumar</p>
              <p className="text-[10px] text-outline dark:text-white/60 uppercase tracking-wider truncate">Elite Distributor</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
