import React from 'react';
import { ViewState } from '../types';
import { useToast } from '../contexts/ToastContext';

interface TopBarProps {
  title: string;
  onLinkBotClick?: () => void;
}

export default function TopBar({ title, onLinkBotClick }: TopBarProps) {
  const { showToast } = useToast();

  return (
    <header className="w-full top-0 sticky bg-surface z-30">
      <div className="flex justify-between items-center px-6 py-4 md:py-6 md:px-10 w-full">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => showToast('Menu clicked', 'info')}
            className="md:hidden text-primary"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="font-headline font-bold text-2xl text-primary-container">{title}</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={onLinkBotClick}
            className="flex items-center gap-2 bg-[#25D366]/10 text-[#075e54] hover:bg-[#25D366]/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all active:scale-95 text-xs sm:text-sm font-bold border border-[#25D366]/20"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            <span className="hidden xs:inline">Link Bot</span>
          </button>
          <div className="hidden sm:flex items-center bg-surface-container-highest rounded-full px-4 py-2 w-64">
            <span className="material-symbols-outlined text-outline text-sm">search</span>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full font-body ml-2 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  showToast(`Searching for: ${e.currentTarget.value}`, 'info');
                }
              }}
            />
          </div>
          <button 
            onClick={() => showToast('No new notifications', 'info')}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-highest transition-colors text-primary"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div 
            onClick={() => showToast('Opening profile settings...', 'info')}
            className="hidden md:flex w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container items-center justify-center font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
          >
            SK
          </div>
        </div>
      </div>
    </header>
  );
}
