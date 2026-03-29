import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { collection, onSnapshot, query, orderBy, setDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export default function InsightsView() {
  const { showToast } = useToast();
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<{title: string, desc: string} | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [insightsSummary, setInsightsSummary] = useState<any>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const insightsRef = collection(db, `users/${auth.currentUser.uid}/insights`);
    const q = query(insightsRef, orderBy('cat'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInsights(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/insights`);
      showToast('Failed to load insights', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const summaryDocRef = doc(db, `users/${auth.currentUser.uid}/insights/summary`);
    
    const unsubscribe = onSnapshot(summaryDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setInsightsSummary(docSnap.data());
        setIsSummaryLoading(false);
      } else {
        // Initialize default insights summary
        const defaultData = {
          growthForecast: 18.4,
          deadStock: 2.4,
          overstock: 8.1,
          inventoryHealth: 94,
          earlyMorningBuyers: 42,
          creditFirstRetailers: 28,
          highVolumeWholesalers: 30,
          peakActivityStart: '08:30 AM',
          peakActivityEnd: '11:00 AM'
        };
        try {
          await setDoc(summaryDocRef, defaultData);
          setInsightsSummary(defaultData);
        } catch (error) {
          console.error('Error initializing insights summary:', error);
        }
        setIsSummaryLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/insights/summary`);
      showToast('Failed to load insights summary', 'error');
      setIsSummaryLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRestock = async () => {
    if (!auth.currentUser) return;
    
    try {
      const restockData = {
        orderedAt: new Date().toISOString(),
        userId: auth.currentUser.uid,
        product: 'Premium Basmati',
        quantity: 500,
        estimatedCost: 45000,
        status: 'pending'
      };
      const restocksRef = collection(db, `users/${auth.currentUser.uid}/restocks`);
      await setDoc(doc(restocksRef), restockData);
      
      showToast('Restock order placed successfully!', 'success');
      setIsRestockModalOpen(false);
    } catch (error) {
      console.error('Error placing restock order:', error);
      showToast('Failed to place restock order', 'error');
    }
  };

  return (
    <>
      <TopBar title="AI Insights" />
      <div className="p-6 space-y-8 max-w-7xl mx-auto pb-24">
        {/* Hero Bento Grid: Intelligent Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prediction Main Card */}
          <div className="lg:col-span-2 glass-card rounded-[1.5rem] p-8 ambient-shadow ghost-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6">
              <span className="material-symbols-outlined text-secondary opacity-20 text-8xl group-hover:scale-110 transition-transform duration-500 filled">auto_awesome</span>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-white text-[10px] font-bold uppercase tracking-widest mb-4">
                Live Forecast
              </span>
              <h3 className="text-3xl font-headline font-extrabold text-on-surface mb-2">Q4 Growth Trajectory</h3>
              <p className="text-on-surface-variant font-body max-w-md mb-8">
                AI models suggest a <span className="text-tertiary font-bold">
                  {isSummaryLoading ? '...' : `+${insightsSummary?.growthForecast || 0}%`} surge
                </span> in bulk orders for the next 21 days based on seasonal Diwali patterns.
              </p>
              
              <div className="flex items-end gap-2 h-32">
                <div className="flex-1 bg-surface-container-highest rounded-t-lg h-[40%]"></div>
                <div className="flex-1 bg-surface-container-highest rounded-t-lg h-[55%]"></div>
                <div className="flex-1 bg-surface-container-highest rounded-t-lg h-[45%]"></div>
                <div className="flex-1 bg-surface-container-highest rounded-t-lg h-[70%]"></div>
                <div className="flex-1 bg-secondary rounded-t-lg h-[85%] relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] py-1 px-2 rounded">Today</div>
                </div>
                <div className="flex-1 bg-primary-container opacity-40 rounded-t-lg h-[92%] border-2 border-dashed border-primary"></div>
                <div className="flex-1 bg-primary-container opacity-40 rounded-t-lg h-[98%] border-2 border-dashed border-primary"></div>
              </div>
            </div>
          </div>

          {/* Smart Alert Stack */}
          <div className="space-y-6">
            <div className="glass-gradient text-white p-6 rounded-[1.5rem] ambient-shadow relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
              <h4 className="font-headline font-bold text-lg mb-2">Smart Alert</h4>
              <p className="text-sm opacity-80 font-body mb-4">Stock for "Premium Basmati" will deplete in 4 days. Reorder now to save ₹2,400 on shipping.</p>
              <button 
                onClick={() => setIsRestockModalOpen(true)}
                className="bg-white text-primary px-6 py-2 rounded-full text-xs font-bold font-headline hover:bg-surface-variant transition-colors h-10 flex items-center justify-center"
              >
                Restock Now
              </button>
            </div>
            
            <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ghost-border ambient-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm">Profit Optimization</h4>
                  <p className="text-[10px] uppercase text-on-surface-variant tracking-wider">AI Suggestion</p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant font-body">Increasing margins on 'Household Cleaning' items by 2% won't affect volume based on recent competitor trends.</p>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Customer Behavior Card */}
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] space-y-6 ambient-shadow ghost-border">
            <h4 className="font-headline font-bold text-on-surface border-b border-surface-container pb-4">Customer Behavior</h4>
            <div className="space-y-4">
              {[
                { label: 'Early Morning Buyers', value: isSummaryLoading ? '...' : `${insightsSummary?.earlyMorningBuyers || 0}%`, color: 'bg-secondary' },
                { label: 'Credit-First Retailers', value: isSummaryLoading ? '...' : `${insightsSummary?.creditFirstRetailers || 0}%`, color: 'bg-primary-container' },
                { label: 'High-Volume Wholesalers', value: isSummaryLoading ? '...' : `${insightsSummary?.highVolumeWholesalers || 0}%`, color: 'bg-tertiary' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                      <span className="text-xs font-medium text-on-surface-variant">{stat.label}</span>
                    </div>
                    <span className="text-sm font-bold">{stat.value}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className={`${stat.color} h-full rounded-full`} style={{ width: stat.value }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-[11px] text-on-surface-variant italic">
                Peak Activity: {isSummaryLoading ? '...' : `${insightsSummary?.peakActivityStart || '08:30 AM'} - ${insightsSummary?.peakActivityEnd || '11:00 AM'}`} IST
              </p>
            </div>
          </div>

          {/* Inventory Health Matrix */}
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] ambient-shadow ghost-border">
            <div className="flex justify-between items-start mb-6">
              <h4 className="font-headline font-bold text-on-surface">Inventory Health</h4>
              <span className="material-symbols-outlined text-tertiary filled">check_circle</span>
            </div>
            <div className="relative h-48 flex items-center justify-center">
              {/* Abstract Donut Visualization */}
              <div className="w-40 h-40 rounded-full border-[12px] border-surface-container-high relative">
                <div className="absolute inset-0 rounded-full border-[12px] border-primary border-t-transparent border-r-transparent -rotate-45"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-on-surface">
                    {isSummaryLoading ? '...' : `${insightsSummary?.inventoryHealth || 0}%`}
                  </span>
                  <span className="text-[9px] uppercase tracking-tighter text-on-surface-variant">Optimal</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] text-on-surface-variant uppercase">Dead Stock</p>
                <p className="text-lg font-bold text-error">
                  {isSummaryLoading ? '...' : `${insightsSummary?.deadStock || 0}%`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-on-surface-variant uppercase">Overstock</p>
                <p className="text-lg font-bold text-secondary">
                  {isSummaryLoading ? '...' : `${insightsSummary?.overstock || 0}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Growth Insights List */}
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col ambient-shadow ghost-border">
            <h4 className="font-headline font-bold text-on-surface mb-6">Market Opportunities</h4>
            <div className="flex-1 space-y-5">
              {[
                { title: 'New Area Potential', desc: 'High demand for organic pulses detected in North-West Sector.', icon: 'storefront' },
                { title: 'Route Efficiency', desc: 'Combine Friday deliveries to save 12% on fuel costs.', icon: 'local_shipping' },
                { title: 'Retention Strategy', desc: 'Top 10 buyers show risk of churn. Send loyalty coupon.', icon: 'loyalty' },
              ].map((opp, i) => (
                <div 
                  key={i} 
                  className="flex gap-4 group cursor-pointer"
                  onClick={async () => {
                    setSelectedOpportunity(opp);
                    if (!auth.currentUser) return;
                    try {
                      const viewData = {
                        viewedAt: new Date().toISOString(),
                        userId: auth.currentUser.uid,
                        opportunityTitle: opp.title
                      };
                      const viewsRef = collection(db, `users/${auth.currentUser.uid}/opportunity_views`);
                      await setDoc(doc(viewsRef), viewData);
                    } catch (error) {
                      console.error('Error tracking opportunity view:', error);
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center group-hover:bg-primary-container group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{opp.icon}</span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold">{opp.title}</h5>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{opp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deep Dive Sales Table */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] overflow-hidden ambient-shadow ghost-border">
          <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low">
            <h4 className="font-headline font-bold text-lg text-primary">Sales Forecasting by Category</h4>
            <button 
              onClick={async () => {
                if (!auth.currentUser) return;
                try {
                  showToast('Downloading Sales Forecast Report...', 'info');
                  const reportData = {
                    downloadedAt: new Date().toISOString(),
                    userId: auth.currentUser.uid,
                    type: 'sales_forecast_report',
                    categoriesCount: insights.length
                  };
                  const reportsRef = collection(db, `users/${auth.currentUser.uid}/reports`);
                  await setDoc(doc(reportsRef), reportData);
                  showToast('Sales forecast report downloaded', 'success');
                } catch (error) {
                  console.error('Error downloading report:', error);
                  showToast('Failed to download report', 'error');
                }
              }}
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
            >
              Download Report
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest">
                  <th className="px-8 py-4 font-bold">Category</th>
                  <th className="px-8 py-4 font-bold">Current Month</th>
                  <th className="px-8 py-4 font-bold">AI Forecast</th>
                  <th className="px-8 py-4 font-bold">Confidence</th>
                  <th className="px-8 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  insights.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-bright transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">{row.icon}</span>
                          </div>
                          <span className="text-sm font-bold">{row.cat}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium">{row.current}</td>
                      <td className={`px-8 py-6 text-sm font-bold text-${row.sColor === 'tertiary' ? 'tertiary' : 'on-surface'}`}>{row.forecast}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[60px] bg-surface-container h-1 rounded-full overflow-hidden">
                            <div className={`bg-${row.sColor === 'tertiary' ? 'tertiary' : 'secondary'} h-full`} style={{ width: `${row.conf}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold">{row.conf}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 ${row.sColor === 'tertiary' ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container text-on-surface-variant'} text-[10px] font-bold rounded-full uppercase`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Restock Premium Basmati"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            AI suggests restocking 500kg of Premium Basmati to meet upcoming demand and save ₹2,400 on bulk shipping.
          </p>
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold">Suggested Quantity</span>
              <span className="text-sm font-bold text-primary">500 kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Estimated Cost</span>
              <span className="text-sm font-bold text-primary">₹45,000</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsRestockModalOpen(false)}
              className="px-6 py-2 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!auth.currentUser) return;
                try {
                  await handleRestock();
                  const summaryDocRef = doc(db, `users/${auth.currentUser.uid}/insights/summary`);
                  await updateDoc(summaryDocRef, {
                    lastRestockOrder: new Date().toISOString(),
                    restockCount: increment(1)
                  });
                } catch (error) {
                  console.error('Error confirming restock:', error);
                }
              }}
              className="px-6 py-2 rounded-full text-sm font-bold text-white glass-gradient hover:opacity-90 transition-opacity"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </Modal>

      {/* Opportunity Details Modal */}
      <Modal
        isOpen={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        title="Market Opportunity"
      >
        {selectedOpportunity && (
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-lg text-primary">{selectedOpportunity.title}</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {selectedOpportunity.desc}
            </p>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 mt-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Recommended Action</h5>
              <p className="text-sm">
                Review the detailed AI report and consider implementing the suggested strategy within the next 7 days for maximum impact.
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={async () => {
                  if (!auth.currentUser) return;
                  try {
                    const actionData = {
                      acknowledgedAt: new Date().toISOString(),
                      userId: auth.currentUser.uid,
                      opportunityTitle: selectedOpportunity?.title
                    };
                    const actionsRef = collection(db, `users/${auth.currentUser.uid}/opportunity_actions`);
                    await setDoc(doc(actionsRef), actionData);
                    showToast('Opportunity acknowledged', 'success');
                  } catch (error) {
                    console.error('Error acknowledging opportunity:', error);
                  }
                  setSelectedOpportunity(null);
                }}
                className="px-6 py-2 rounded-full text-sm font-bold text-white glass-gradient hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
