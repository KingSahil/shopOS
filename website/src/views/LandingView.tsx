import React, { useEffect, useRef, useState } from 'react';
import { ViewState } from '../types';

interface LandingViewProps {
  setCurrentView: (view: ViewState) => void;
}

interface GroceryItem {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const content = {
  en: {
    badge: "📱 WhatsApp-First • Works Offline",
    hero: "Run Your Kirana Store from",
    heroHighlight: "Your Phone",
    subtitle: "No app downloads. Just WhatsApp. Scan barcodes with your phone camera, manage inventory offline, and get AI insights - all without internet.",
    cta: "Launch Dashboard →",
    whatsappTitle: "WhatsApp Bot Control",
    whatsappDesc: "No app needed! Manage your entire store through WhatsApp messages. Check stock, record sales, add udhar, get AI insights - all via simple text commands.",
    whatsappCmd1: "💬 \"Stock maggi\" → Get instant stock levels",
    whatsappCmd2: "💬 \"Add sale\" → Record transactions",
    whatsappCmd3: "💬 \"Udhar report\" → View pending payments",
    scannerTitle: "Phone Camera Scanner",
    scannerDesc: "Use your phone camera to scan product barcodes. Works completely offline - no internet required. Instant product lookup and billing.",
    scannerCmd1: "📸 Scan barcode → Instant product info",
    scannerCmd2: "🔌 Works offline → Syncs when online",
    scannerCmd3: "⚡ Fast billing → No typing needed",
    inventoryTitle: "Smart Inventory",
    inventoryDesc: "Real-time stock tracking with AI-powered low-stock alerts and restock recommendations.",
    udharTitle: "Udhar Management",
    udharDesc: "Digital credit ledger for customers with payment reminders and transaction history.",
    aiTitle: "AI Insights",
    aiDesc: "Get intelligent recommendations on restocking, pricing, and sales patterns.",
    whyTitle: "Built for Real Kirana Stores",
    noAppTitle: "No App Downloads",
    noAppDesc: "Works on any phone through WhatsApp. No smartphone needed.",
    offlineTitle: "Offline First",
    offlineDesc: "Scanner and billing work without internet. Syncs automatically.",
    indiaTitle: "Made for India",
    indiaDesc: "Hindi/English support. Understands udhar, bahi-khata culture.",
    trust1: "Works on Any Phone",
    trust2: "Offline Capable",
    trust3: "Hindi + English",
    footer: "Built for Indian kirana stores to digitize operations and compete with modern retail.",
    help: "Help",
    language: "Language"
  },
  hi: {
    badge: "📱 WhatsApp पर चलाएं • बिना इंटरनेट काम करे",
    hero: "अपनी दुकान चलाएं",
    heroHighlight: "अपने फ़ोन से",
    subtitle: "कोई App नहीं चाहिए। सिर्फ WhatsApp। बारकोड स्कैन करें, इन्वेंटरी मैनेज करें, उधार ट्रैक करें - सब कुछ आसान!",
    cta: "Dashboard खोलें →",
    whatsappTitle: "WhatsApp Bot Control",
    whatsappDesc: "कोई App की ज़रूरत नहीं! WhatsApp से पूरी दुकान चलाएं। स्टॉक चेक करें, बिक्री दर्ज करें, उधार जोड़ें - सब WhatsApp पर!",
    whatsappCmd1: "💬 \"Stock maggi\" → तुरंत स्टॉक देखें",
    whatsappCmd2: "💬 \"Add sale\" → बिक्री दर्ज करें",
    whatsappCmd3: "💬 \"Udhar report\" → उधार रिपोर्ट देखें",
    scannerTitle: "Phone Camera Scanner",
    scannerDesc: "अपने फ़ोन के कैमरे से बारकोड स्कैन करें। बिना इंटरनेट काम करता है। तुरंत बिलिंग।",
    scannerCmd1: "📸 बारकोड स्कैन → प्रोडक्ट जानकारी",
    scannerCmd2: "🔌 बिना इंटरनेट → ऑनलाइन होने पर sync",
    scannerCmd3: "⚡ तेज़ बिलिंग → टाइपिंग की ज़रूरत नहीं",
    inventoryTitle: "Smart Inventory",
    inventoryDesc: "Real-time स्टॉक ट्रैकिंग AI alerts के साथ। कम स्टॉक की सूचना तुरंत मिलेगी।",
    udharTitle: "Udhar Management",
    udharDesc: "Digital बही-खाता। Customer credit tracking payment reminders के साथ।",
    aiTitle: "AI Insights",
    aiDesc: "क्या बेचना है, कब खरीदना है - AI बताएगा। Smart recommendations मिलेंगे।",
    whyTitle: "असली किराना दुकानों के लिए बनाया गया",
    noAppTitle: "कोई App नहीं चाहिए",
    noAppDesc: "किसी भी फ़ोन पर WhatsApp से काम करता है। Feature phone भी चलेगा!",
    offlineTitle: "बिना इंटरनेट काम करे",
    offlineDesc: "Scanner और billing बिना इंटरनेट काम करते हैं। बाद में sync हो जाएगा।",
    indiaTitle: "भारत के लिए बनाया",
    indiaDesc: "Hindi/English support। Udhar, bahi-khata - सब समझता है।",
    trust1: "किसी भी फ़ोन पर",
    trust2: "बिना इंटरनेट",
    trust3: "हिंदी + अंग्रेज़ी",
    footer: "भारतीय किराना दुकानों के लिए बनाया गया - आधुनिक retail से मुकाबला करने के लिए।",
    help: "मदद",
    language: "भाषा"
  }
};

export default function LandingView({ setCurrentView }: LandingViewProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const additionalRef = useRef<HTMLDivElement>(null);
  const whyWorksRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const t = content[lang];

  // Indian grocery items
  const groceryEmojis = ['🍚', '🫘', '🌾', '🥛', '🧈', '🍞', '🥔', '🧅', '🥕', '🌶️', '🥜', '🫚', '🧄', '🍅', '🥒', '🫑', '🍋', '🥥', '🍌', '🥭'];

  useEffect(() => {
    // Initialize grocery items
    const items: GroceryItem[] = groceryEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.4
    }));
    setGroceryItems(items);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Scroll observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const refs = [heroRef, featuresRef, additionalRef, whyWorksRef, trustRef];
    refs.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      refs.forEach(ref => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body relative overflow-hidden">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        [ref] {
          opacity: 0;
          transform: translateY(30px);
        }

        .grocery-item {
          transition: transform 0.3s ease-out;
          will-change: transform;
        }
      `}</style>

      {/* Interactive Grocery Items Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {groceryItems.map((item) => {
          const dx = mousePos.x - (window.innerWidth * item.x / 100);
          const dy = mousePos.y - (window.innerHeight * item.y / 100);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 300;
          const influence = Math.max(0, 1 - distance / maxDistance);
          const moveX = (dx / distance) * influence * 30;
          const moveY = (dy / distance) * influence * 30;

          return (
            <div
              key={item.id}
              className="grocery-item absolute text-4xl opacity-10 hover:opacity-30"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(${moveX}px, ${moveY}px) rotate(${item.rotation + influence * 20}deg) scale(${item.scale + influence * 0.3})`,
                fontSize: `${2 + item.scale}rem`
              }}
            >
              {item.emoji}
            </div>
          );
        })}
      </div>

      {/* Top Navigation */}
      <header className="w-full top-0 sticky bg-[#f3faff] flex items-center justify-between px-6 py-8 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl animate-pulse-slow">storefront</span>
          <h1 className="font-headline font-extrabold text-2xl tracking-tight text-primary">Kirana Keeper</h1>
        </div>
        <div className="flex gap-6">
          <button className="font-label font-bold text-secondary hover:scale-110 transition-transform">{t.help}</button>
          <button 
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="font-label font-bold text-on-surface hover:scale-110 transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">language</span>
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 max-w-6xl mx-auto w-full pb-20 relative z-10">
        {/* Hero Section */}
        <div ref={heroRef} className="text-center mb-12 max-w-3xl">
          <span className="inline-block px-4 py-1.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-xs font-bold font-label tracking-wider uppercase mb-6 animate-pulse-slow">
            {t.badge}
          </span>
          <h2 className="font-headline font-extrabold text-4xl md:text-6xl text-on-surface mb-6 leading-tight">
            {t.hero} <span className="text-primary bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">{t.heroHighlight}</span>
          </h2>
          <p className="font-body text-xl text-on-surface-variant leading-relaxed mb-8">
            {t.subtitle}
          </p>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="px-12 py-5 bg-gradient-to-br from-primary to-primary-container text-white font-label font-bold rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all text-lg hover:scale-105 transform"
          >
            {t.cta}
          </button>
        </div>

        {/* Highlighted Features - WhatsApp & Scanner */}
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
          {/* WhatsApp Bot - HERO FEATURE */}
          <div className="relative flex flex-col items-start p-8 rounded-3xl bg-gradient-to-br from-green-50 to-green-100 border-4 border-green-500 shadow-[0px_20px_50px_rgba(34,197,94,0.2)] overflow-hidden transform hover:scale-105 hover:rotate-1 transition-all duration-300 hover:shadow-[0px_30px_60px_rgba(34,197,94,0.3)]">
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse-slow">
              🔥 KEY FEATURE
            </div>
            <div className="w-16 h-16 bg-green-500 flex items-center justify-center rounded-2xl mb-4 animate-float">
              <span className="material-symbols-outlined text-3xl text-white">chat</span>
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">{t.whatsappTitle}</h3>
            <p className="font-body text-on-surface-variant leading-relaxed mb-6">
              {t.whatsappDesc}
            </p>
            <div className="space-y-3 w-full">
              <div className="flex items-start gap-3 text-green-900">
                <span className="text-lg">💬</span>
                <div className="flex-1">
                  <code className="font-semibold text-sm">"Stock maggi"</code>
                  <span className="text-green-700 text-sm ml-2">→ {lang === 'en' ? 'Get instant stock levels' : 'तुरंत स्टॉक देखें'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-green-900">
                <span className="text-lg">💬</span>
                <div className="flex-1">
                  <code className="font-semibold text-sm">"Add sale"</code>
                  <span className="text-green-700 text-sm ml-2">→ {lang === 'en' ? 'Record transactions' : 'बिक्री दर्ज करें'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-green-900">
                <span className="text-lg">💬</span>
                <div className="flex-1">
                  <code className="font-semibold text-sm">"Udhar report"</code>
                  <span className="text-green-700 text-sm ml-2">→ {lang === 'en' ? 'View pending payments' : 'उधार रिपोर्ट देखें'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Scanner - HERO FEATURE */}
          <div className="relative flex flex-col items-start p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 border-4 border-blue-500 shadow-[0px_20px_50px_rgba(59,130,246,0.2)] overflow-hidden transform hover:scale-105 hover:-rotate-1 transition-all duration-300 hover:shadow-[0px_30px_60px_rgba(59,130,246,0.3)]">
            <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse-slow animation-delay-500">
              📱 OFFLINE READY
            </div>
            <div className="w-16 h-16 bg-blue-500 flex items-center justify-center rounded-2xl mb-4 animate-float animation-delay-300">
              <span className="material-symbols-outlined text-3xl text-white">qr_code_scanner</span>
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">{t.scannerTitle}</h3>
            <p className="font-body text-on-surface-variant leading-relaxed mb-6">
              {t.scannerDesc}
            </p>
            <div className="space-y-3 w-full">
              <div className="flex items-start gap-3 text-blue-900">
                <span className="text-lg">📸</span>
                <div className="flex-1">
                  <span className="font-semibold text-sm">{lang === 'en' ? 'Scan barcode' : 'बारकोड स्कैन'}</span>
                  <span className="text-blue-700 text-sm ml-2">→ {lang === 'en' ? 'Instant product info' : 'प्रोडक्ट जानकारी'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-blue-900">
                <span className="text-lg">🔌</span>
                <div className="flex-1">
                  <span className="font-semibold text-sm">{lang === 'en' ? 'Works offline' : 'बिना इंटरनेट'}</span>
                  <span className="text-blue-700 text-sm ml-2">→ {lang === 'en' ? 'Syncs when online' : 'ऑनलाइन होने पर sync'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-blue-900">
                <span className="text-lg">⚡</span>
                <div className="flex-1">
                  <span className="font-semibold text-sm">{lang === 'en' ? 'Fast billing' : 'तेज़ बिलिंग'}</span>
                  <span className="text-blue-700 text-sm ml-2">→ {lang === 'en' ? 'No typing needed' : 'टाइपिंग की ज़रूरत नहीं'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features Grid */}
        <div ref={additionalRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {/* Feature 1 */}
          <div className="flex flex-col items-start p-6 rounded-2xl bg-surface-container-lowest shadow-[0px_10px_30px_rgba(7,30,39,0.04)] hover:shadow-[0px_20px_40px_rgba(7,30,39,0.08)] transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-primary-fixed flex items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl text-primary">inventory_2</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">{t.inventoryTitle}</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              {t.inventoryDesc}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-start p-6 rounded-2xl bg-surface-container-lowest shadow-[0px_10px_30px_rgba(7,30,39,0.04)] hover:shadow-[0px_20px_40px_rgba(7,30,39,0.08)] transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-secondary-fixed flex items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl text-secondary">account_balance_wallet</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">{t.udharTitle}</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              {t.udharDesc}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-start p-6 rounded-2xl bg-surface-container-lowest shadow-[0px_10px_30px_rgba(7,30,39,0.04)] hover:shadow-[0px_20px_40px_rgba(7,30,39,0.08)] transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-tertiary-fixed flex items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl text-tertiary">psychology</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">{t.aiTitle}</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              {t.aiDesc}
            </p>
          </div>
        </div>

        {/* Why It Works Section */}
        <div ref={whyWorksRef} className="w-full mb-16 p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-300 transition-all duration-300">
          <h3 className="font-headline font-bold text-3xl text-center text-on-surface mb-8">
            {t.whyTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-4xl mb-3 animate-float">📱</div>
              <h4 className="font-headline font-bold text-lg mb-2">{t.noAppTitle}</h4>
              <p className="font-body text-sm text-on-surface-variant">
                {t.noAppDesc}
              </p>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-4xl mb-3 animate-float animation-delay-200">🔌</div>
              <h4 className="font-headline font-bold text-lg mb-2">{t.offlineTitle}</h4>
              <p className="font-body text-sm text-on-surface-variant">
                {t.offlineDesc}
              </p>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform duration-300">
              <div className="text-4xl mb-3 animate-float animation-delay-400">🇮🇳</div>
              <h4 className="font-headline font-bold text-lg mb-2">{t.indiaTitle}</h4>
              <p className="font-body text-sm text-on-surface-variant">
                {t.indiaDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div ref={trustRef} className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          <div className="flex items-center gap-2 hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined text-xl text-green-600 animate-pulse-slow">check_circle</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">{t.trust1}</span>
          </div>
          <div className="flex items-center gap-2 hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined text-xl text-blue-600 animate-pulse-slow animation-delay-200">wifi_off</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">{t.trust2}</span>
          </div>
          <div className="flex items-center gap-2 hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined text-xl text-primary animate-pulse-slow animation-delay-400">language</span>
            <span className="font-label font-bold text-xs tracking-widest uppercase">{t.trust3}</span>
          </div>
        </div>
      </main>

      {/* Secondary Action Footer */}
      <footer className="w-full py-10 px-6 bg-surface-container-low flex flex-col items-center">
        <p className="font-body text-on-surface-variant mb-4 text-center max-w-xl">
          {t.footer}
        </p>
        <div className="mt-8 flex gap-8">
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors hover:scale-110 transform" href="#">About</a>
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors hover:scale-110 transform" href="#">Features</a>
          <a className="font-label text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors hover:scale-110 transform" href="#">Support</a>
        </div>
      </footer>

      {/* Decorative Elements (Glassmorphic blobs) */}
      <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-secondary/5 rounded-full blur-[100px] -z-10 animate-pulse-slow animation-delay-500"></div>
    </div>
  );
}
