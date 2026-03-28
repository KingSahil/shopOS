import React from 'react';
import { ViewState } from '../types';
import { useToast } from '../contexts/ToastContext';

interface BottomNavProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export default function BottomNav({ currentView, setCurrentView }: BottomNavProps) {
  const { showToast } = useToast();
  const navItems: { id: ViewState; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'orders', label: 'Orders', icon: 'receipt_long' },
    { id: 'udhar', label: 'udhar', icon: 'group' },
    { id: 'inventory', label: 'Inventory', icon: 'package_2' },
    { id: 'insights', label: 'AI', icon: 'auto_awesome' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-md border-t border-surface-variant/20 shadow-[0px_-10px_30px_rgba(7,30,39,0.05)] rounded-t-[2rem]">
      {navItems.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setCurrentView(item.id);
            }}
            className={`flex flex-col items-center justify-center px-4 py-2 transition-transform active:scale-90 ${
              isActive
                ? 'bg-secondary text-white rounded-2xl'
                : 'text-on-surface opacity-60 hover:opacity-100'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span className="font-label text-[10px] uppercase tracking-wider mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
