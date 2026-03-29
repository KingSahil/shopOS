import React from 'react';
import { ViewState } from '../types';

interface LandingViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function LandingView({ setCurrentView }: LandingViewProps) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body">
      {/* Top Navigation Anchor (Suppressed in Transactional Flow but branding remains) */}
      <header className="w-full top-0 sticky bg-[#f3faff] flex items-center justify-between px-6 py-8 z-50">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">storefront</span>
          <h1 className="font-headline font-extrabold text-2xl tracking-tight text-primary">Kirana Keeper</h1>
        </div>
        <div className="hidden md:flex gap-6">
          <button className="font-label font-bold text-secondary">Help</button>
          <button className="font-label font-bold text-on-surface">Language</button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 max-w-5xl mx-auto w-full pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-2xl">
          <span className="inline-block px-4 py-1.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-xs font-bold font-label tracking-wider uppercase mb-6">
            AI-Powered Growth
          </span>
          <h2 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface mb-6 leading-tight">
            Empowering India's Retail <span className="text-primary italic">Ecosystem</span>
          </h2>
          <p className="font-body text-lg text-on-surface-variant leading-relaxed">
            The digital ledger for modern commerce. Choose how you want to scale your business today.
          </p>
        </div>

        {/* Role Selection - Bento Grid Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-16">
          {/* Retailer Card */}
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface-container-lowest transition-all duration-300 hover:scale-[1.02] hover:bg-surface-container-low active:scale-95 text-left overflow-hidden shadow-[0px_20px_40px_rgba(7,30,39,0.06)]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="w-16 h-16 bg-primary-fixed flex items-center justify-center rounded-2xl mb-8 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">shopping_basket</span>
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">Retailer</h3>
            <p className="font-body text-on-surface-variant mb-6 text-sm leading-relaxed">
              Manage inventory, track customer udhar, and optimize restocks with AI insights.
            </p>
            <div className="flex items-center gap-2 font-label font-bold text-primary group-hover:gap-4 transition-all">
              <span>Get Started</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </button>

          {/* Wholesaler Card */}
          <button 
            onClick={() => setCurrentView('wholesaler')}
            className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface-container-lowest transition-all duration-300 hover:scale-[1.02] hover:bg-surface-container-low active:scale-95 text-left overflow-hidden shadow-[0px_20px_40px_rgba(7,30,39,0.06)]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="w-16 h-16 bg-secondary-fixed flex items-center justify-center rounded-2xl mb-8 group-hover:bg-secondary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">local_shipping</span>
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">Wholesaler</h3>
            <p className="font-body text-on-surface-variant mb-6 text-sm leading-relaxed">
              Bulk order management, digital invoicing, and deep supply chain analytics.
            </p>
            <div className="flex items-center gap-2 font-label font-bold text-secondary group-hover:gap-4 transition-all">
              <span>Connect Business</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </button>
        </div>

        {/* Trust Indicator */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">verified</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">Trusted by 10k+ Shops</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">security</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">Safe & Secure Ledger</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">psychology</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">AI-Optimized</span>
          </div>
        </div>
      </main>

      {/* Secondary Action Footer */}
      <footer className="w-full py-10 px-6 bg-surface-container-low flex flex-col items-center">
        <p className="font-body text-on-surface-variant mb-6">Already have an account?</p>
        <button className="px-10 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-label font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all">
          Login / Register
        </button>
        <div className="mt-12 flex gap-8">
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Support</a>
        </div>
      </footer>

      {/* Decorative Elements (Glassmorphic blobs) */}
      <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-secondary/5 rounded-full blur-[100px] -z-10"></div>
    </div>
  );
}
