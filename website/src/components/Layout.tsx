import React, { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { LayoutProps } from '../types';

export default function Layout({ currentView, setCurrentView, children, onLogoClick }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onLogoClick={onLogoClick} />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-20' : 'md:ml-72'} pb-24 md:pb-8 relative overflow-x-hidden`}>
        {children}
      </main>

      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
}
