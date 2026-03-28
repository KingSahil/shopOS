import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, writeBatch } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const seedData = async (uid: string) => {
  const batch = writeBatch(db);

  // Inventory
  const inventoryItems = [
    { id: 1, name: 'Dhara Mustard Oil (1L)', sku: 'OIL-DH-1029', category: 'Essentials', stock: 14, maxStock: 100, price: 2450, unitPrice: 175, status: 'error' },
    { id: 2, name: 'Fortune Basmati Rice (5kg)', sku: 'RIC-FO-502', category: 'Grains', stock: 142, maxStock: 200, price: 78100, unitPrice: 550, status: 'tertiary' },
    { id: 3, name: 'Amul Taaza Milk (1L)', sku: 'DAI-AM-100', category: 'Dairy', stock: 88, maxStock: 150, price: 5632, unitPrice: 64, status: 'tertiary' },
    { id: 4, name: "McVitie's Digestive (250g)", sku: 'SNK-MC-250', category: 'Snacks', stock: 3, maxStock: 50, price: 225, unitPrice: 75, status: 'error' },
  ];
  inventoryItems.forEach(item => {
    const ref = doc(collection(db, `users/${uid}/inventory`));
    batch.set(ref, item);
  });

  // Orders
  const orders = [
    { id: '#ORD-88219', name: 'Premium Tea Batch', date: 'Oct 24, 2023', customer: 'Amit Kirana', initials: 'AK', status: 'Delivered', amount: '12,450.00', sColor: 'tertiary' },
    { id: '#ORD-88220', name: 'Bulk Flour Supply', date: 'Oct 25, 2023', customer: 'Raja Stores', initials: 'RS', status: 'Pending', amount: '45,200.00', sColor: 'secondary' },
    { id: '#ORD-88221', name: 'Dairy Products', date: 'Oct 25, 2023', customer: 'Mehra Kirana', initials: 'MK', status: 'Cancelled', amount: '3,150.00', sColor: 'error' },
    { id: '#ORD-88222', name: 'Edible Oils Cargo', date: 'Oct 26, 2023', customer: 'Hira Sweets', initials: 'HS', status: 'Delivered', amount: '89,000.00', sColor: 'tertiary' },
  ];
  orders.forEach(item => {
    const ref = doc(collection(db, `users/${uid}/orders`));
    batch.set(ref, item);
  });

  // Udhar
  const udharCustomers = [
    { initials: 'AK', name: 'Anil Kirana Store', lastPayment: '2 days ago', amount: '24,500', bg: 'bg-secondary-fixed', text: 'text-on-secondary-container' },
    { initials: 'RM', name: 'Rajesh Mart', lastPayment: 'Today', amount: '1,12,000', bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant' },
    { initials: 'SG', name: 'Saraswati General', lastPayment: '15 days ago', amount: '8,740', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant' },
    { initials: 'PV', name: 'Pooja Varieties', lastPayment: 'Never', amount: '15,200', bg: 'bg-surface-dim', text: 'text-on-surface' },
  ];
  udharCustomers.forEach(item => {
    const ref = doc(collection(db, `users/${uid}/udhar`));
    batch.set(ref, item);
  });

  // Finance
  const transactions = [
    { id: '#TR-88219', entity: 'MegaWholesale Ltd', initials: 'MW', bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed', date: '24 Feb, 2024', status: 'COMPLETED', statusBg: 'bg-tertiary-fixed', statusText: 'text-on-tertiary-fixed-variant', amount: '- ₹42,000.00', amountColor: 'text-error' },
    { id: '#TR-88218', entity: 'Ramesh Kirana Store', initials: 'RK', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed', date: '23 Feb, 2024', status: 'COMPLETED', statusBg: 'bg-tertiary-fixed', statusText: 'text-on-tertiary-fixed-variant', amount: '+ ₹12,400.00', amountColor: 'text-tertiary' },
    { id: '#TR-88215', entity: 'Patel Dairy Products', initials: 'PD', bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed', date: '22 Feb, 2024', status: 'PENDING', statusBg: 'bg-secondary-fixed', statusText: 'text-on-secondary-fixed-variant', amount: '₹8,900.00', amountColor: 'text-on-surface' },
  ];
  transactions.forEach(item => {
    const ref = doc(collection(db, `users/${uid}/transactions`));
    batch.set(ref, item);
  });

  // Insights
  const insights = [
    { cat: 'Grains & Pulses', icon: 'grain', current: '₹4,82,000', forecast: '₹5,20,000', conf: 95, status: 'Bullish', sColor: 'tertiary' },
    { cat: 'Edible Oils', icon: 'oil_barrel', current: '₹2,15,000', forecast: '₹2,10,000', conf: 88, status: 'Stable', sColor: 'on-surface-variant' },
    { cat: 'Detergents', icon: 'soap', current: '₹1,12,000', forecast: '₹1,45,000', conf: 82, status: 'Growth', sColor: 'tertiary' },
  ];
  insights.forEach(item => {
    const ref = doc(collection(db, `users/${uid}/insights`));
    batch.set(ref, item);
  });

  // Dashboard Data
  const dashboardData = {
    revenue: '₹42,850',
    revenueGrowth: '+12%',
    pendingUdhar: '₹18,200',
    smartAlert: '"Sugar stock will likely deplete by Wednesday based on current trends."',
    profitOptimizer: '"Bundle pulses and oil for a 15% increase in basket size this weekend."'
  };
  const dashboardRef = doc(db, `users/${uid}/dashboard/main`);
  batch.set(dashboardRef, dashboardData);

  await batch.commit();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: currentUser.email,
            role: 'user'
          });
          await seedData(currentUser.uid);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
