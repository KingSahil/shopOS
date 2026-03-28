import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../contexts/ToastContext';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface OrderDetailsViewProps {
  setCurrentView: (view: ViewState) => void;
  orderId?: string | null;
}

export default function OrderDetailsView({ setCurrentView, orderId }: OrderDetailsViewProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || !orderId) {
      if (!orderId) {
        showToast('No order selected', 'error');
        setCurrentView('orders');
      }
      return;
    }
    
    const docRef = doc(db, `users/${auth.currentUser.uid}/orders/${orderId}`);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setOrder({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        showToast('Order not found', 'error');
        setCurrentView('orders');
      }
      setIsLoading(false);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/orders/${orderId}`);
      showToast('Failed to load order details', 'error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, setCurrentView, showToast]);

  const handlePrint = () => {
    window.print();
  };

  const shopName = user?.displayName ? `${user.displayName}'s Shop` : 'My Retail Shop';

  if (isLoading || !order) {
    return (
      <div className="flex justify-center items-center py-20 mt-10 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <TopBar title={`Order ${order.id}`} />
      </div>
      
      <div className="px-6 md:px-10 mb-8 mt-6 max-w-4xl mx-auto print:m-0 print:p-0 print:max-w-full">
        <button 
          onClick={() => setCurrentView('orders')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-bold text-sm print:hidden"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Orders
        </button>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] ambient-shadow ghost-border space-y-8 print:shadow-none print:border-none print:p-0 print:rounded-none">
          
          {/* Print-only Invoice Header */}
          <div className="hidden print:block border-b-2 border-outline-variant/50 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="font-headline font-black text-4xl text-primary mb-1">{shopName}</h1>
                <p className="text-on-surface-variant text-sm">123 Market Street, Business District</p>
                <p className="text-on-surface-variant text-sm">Phone: +91 98765 43210</p>
              </div>
              <div className="text-right">
                <h2 className="font-headline font-bold text-2xl text-on-surface mb-1">INVOICE</h2>
                <p className="text-on-surface-variant font-medium">Invoice No: {order.id}</p>
                <p className="text-on-surface-variant font-medium">Date: {order.date}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/20 pb-6 print:hidden">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-2">{order.name}</h1>
              <p className="text-on-surface-variant font-medium">Placed on {order.date}</p>
            </div>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${order.sColor}-fixed text-on-${order.sColor}-fixed-variant text-sm font-bold uppercase tracking-wide`}>
              <span className={`w-2 h-2 rounded-full bg-${order.sColor}`}></span>
              {order.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-12">
            <div className="bg-surface-container-low p-6 rounded-2xl print:bg-transparent print:p-0 print:border print:border-outline-variant/30 print:p-4">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Billed To</h2>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full bg-${order.sColor}-fixed-dim flex items-center justify-center text-lg font-bold text-on-${order.sColor}-container print:hidden`}>
                  {order.initials}
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">{order.customer}</p>
                  <p className="text-sm text-on-surface-variant">Retail Partner</p>
                  {order.phone && order.phone !== 'N/A' && (
                    <div className="flex items-center gap-2 mt-2 font-bold text-primary font-body text-xs">
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {order.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-2xl print:bg-transparent print:p-0 print:border print:border-outline-variant/30 print:p-4">
              <h2 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="font-medium text-on-surface">₹{order.amount}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-on-surface-variant">Taxes & Fees</span>
                  <span className="font-medium text-on-surface">₹0.00</span>
                </div>
                <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                  <span className="font-bold text-on-surface">Total</span>
                  <span className="font-headline font-extrabold text-primary text-2xl">₹{order.amount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Print-only Footer */}
          <div className="hidden print:block mt-16 pt-8 border-t border-outline-variant/30 text-center text-on-surface-variant text-sm">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any queries regarding this invoice, please contact us.</p>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex-1 py-4 rounded-full bg-surface-container-highest text-on-surface font-bold text-base hover:bg-outline-variant/30 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">print</span>
              Print / Download Invoice
            </button>
            <button 
              onClick={() => showToast('Order status updated', 'success')}
              className="flex-1 py-4 rounded-full glass-gradient text-white font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined">edit</span>
              Update Status
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
