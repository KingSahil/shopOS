import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, collectionGroup, query, where, updateDoc, deleteDoc, orderBy, limit, doc, setDoc, getDoc, writeBatch, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDL1BDF5M78MWd_E35UEz31lXBxbI3hpDE",
  authDomain: "kiranakeeper.firebaseapp.com",
  projectId: "kiranakeeper",
  storageBucket: "kiranakeeper.firebasestorage.app",
  messagingSenderId: "961575852149",
  appId: "1:961575852149:web:112391cf89ba751717403c",
  measurementId: "G-RBD63NGY6Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

let isAuthenticated = false;

async function authenticateFirebase() {
  if (isAuthenticated) return true;
  const email = process.env.FIREBASE_EMAIL;
  const password = process.env.FIREBASE_PASSWORD;
  
  if (!email || !password) {
    console.error("Firebase email or password missing in .env. Cannot sync orders to website.");
    return false;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    isAuthenticated = true;
    console.log("Logged into Firebase successfully.");
    return true;
  } catch (error) {
    console.error("Firebase authentication failed:", error);
    return false;
  }
}

export async function saveOrderToFirebase({ phone, items, totalAmount, customerName, paymentStatus = 'Pending' }) {
  try {
    const inventoryGroupRef = collectionGroup(db, 'inventory');
    const inventorySnap = await getDocs(inventoryGroupRef);
    
    if (inventorySnap.empty) {
        console.error("No inventory found. Ensure the catalog is synced before placing orders.");
        return false;
    }
    const userId = inventorySnap.docs[0].ref.path.split('/')[1];
    
    const ordersRef = collection(db, `users/${userId}/orders`);
    const cleanPhone = phone.replace(/\D/g, '');
    
    const descriptions = items.map((item, i) => {
        return i === items.length - 1 ? item.description : item.description + ',';
    }).join(' ');

    const orderDoc = {
      id: `#ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      name: descriptions || 'Custom Order',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: new Date().getTime(), // Add timestamp for easier sorting/cancellation
      customer: customerName ? `${customerName} (${cleanPhone})` : `Phone: +${cleanPhone}`,
      phone: cleanPhone, // Explicit phone field for easier lookup
      initials: customerName ? customerName.substring(0, 2).toUpperCase() : 'WA',
      status: paymentStatus === 'Paid' ? 'Paid' : 'Pending', // Show 'Paid' or 'Pending'
      amount: `${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sColor: paymentStatus === 'Paid' ? 'tertiary' : 'secondary',
      items: items // Save the items details
    };
    
    await addDoc(ordersRef, orderDoc);
    console.log("Order successfully saved to Firebase!");

    // 📉 Update Inventory Stock atomically
    const batch = writeBatch(db);
    for (const item of items) {
      if (!item.id) continue;
      const itemRef = doc(db, `users/${userId}/inventory/${item.id}`);
      
      // Update the stock using increment for atomicity
      // and status based on a rough estimate (using current fetched stock)
      const estNewStock = Math.max(0, (item.stock || 0) - (item.quantity || 1));
      const newStatus = estNewStock < 20 ? 'error' : 'tertiary';
      
      batch.update(itemRef, { 
        stock: increment(-(item.quantity || 1)),
        status: newStatus
      });
      console.log(`📉 Queued stock update for ${item.description}: -${item.quantity || 1}`);
    }
    await batch.commit();
    console.log("✅ Inventory batch update completed.");

    return true;
  } catch (error) {
    console.error("Error saving order to Firebase:", error);
    return false;
  }
}

/**
 * Cancel (delete) the most recent order for a specific phone number
 * @param {string} phone - The customer's phone number digits
 */
export async function cancelLastOrderFromFirebase(phone) {
  try {
    const cleanPhone = phone.replace(/\D/g, ''); 
    console.log(`🔍 Resolving merchant ID to find orders for: ${cleanPhone}`);
    
    // Get userId from inventory (standard way for this bot)
    const inventoryGroupRef = collectionGroup(db, 'inventory');
    const inventorySnap = await getDocs(inventoryGroupRef);
    
    if (inventorySnap.empty) {
      console.error("❌ No inventory found. Cannot resolve merchant ID.");
      return false;
    }
    const userId = inventorySnap.docs[0].ref.path.split('/')[1];
    console.log(`🏢 Searching in orders for store owner: ${userId}`);
    
    // Fetch recent orders from THIS user's collection (prevents index requirements for collectionGroup)
    const ordersRef = collection(db, `users/${userId}/orders`);
    const snapshot = await getDocs(ordersRef);
    
    if (snapshot.empty) {
      console.log(`📭 No orders found for user ${userId}`);
      return false;
    }
    
    // Filter and sort in JavaScript for maximum flexibility
    const relevantOrders = snapshot.docs
      .map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() }))
      .filter(doc => {
        const data = doc.data;
        const dbPhone = String(data.phone || "").replace(/\D/g, '');
        const dbCustomer = String(data.customer || "").toLowerCase();
        
        // Exact match on phone field
        if (dbPhone === cleanPhone) return true;
        // Or if the phone number is part of the customer name/string
        if (dbCustomer.includes(cleanPhone)) return true;
        // Or if it's a partial match (last 10 digits) - common with country code variations
        if (cleanPhone.length >= 10 && dbPhone.endsWith(cleanPhone.slice(-10))) return true;
        
        return false;
      })
      .sort((a, b) => (b.data.timestamp || 0) - (a.data.timestamp || 0));
    
    if (relevantOrders.length === 0) {
      console.log(`❌ No matching orders found for ${cleanPhone} among ${snapshot.size} total orders.`);
      return false;
    }
    
    const docToDelete = relevantOrders[0];
    await deleteDoc(docToDelete.ref);
    console.log(`✅ Successfully deleted order ${docToDelete.data.id} for ${cleanPhone}`);
    return true;
  } catch (error) {
    console.error("❌ Error in cancelLastOrderFromFirebase:", error);
    return false;
  }
}

export async function saveUdharToFirebase({ phone, customerName, amount }) {
  try {
    const inventoryGroupRef = collectionGroup(db, 'inventory');
    const inventorySnap = await getDocs(inventoryGroupRef);
    
    if (inventorySnap.empty) return false;
    const userId = inventorySnap.docs[0].ref.path.split('/')[1];
    
    const udharRef = collection(db, `users/${userId}/udhar`);
    
    // Check if customer already exists in udhar
    const q = query(udharRef, where("name", "==", customerName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Update existing
      const docRef = querySnapshot.docs[0].ref;
      const data = querySnapshot.docs[0].data();
      // Remove commas for calculation
      const currentAmount = parseFloat(data.amount?.toString().replace(/,/g, '') || '0');
      const newAmount = currentAmount + amount;
      
      await updateDoc(docRef, {
        amount: newAmount.toLocaleString('en-IN'),
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Create new
      const newUdhar = {
        name: customerName,
        initials: customerName.substring(0, 2).toUpperCase(),
        lastPayment: 'Never',
        amount: amount.toLocaleString('en-IN'),
        bg: 'bg-secondary-fixed',
        text: 'text-on-secondary-container',
        phone: phone,
        lastUpdated: new Date().toISOString()
      };
      await addDoc(udharRef, newUdhar);
    }
    
    console.log("Udhar successfully recorded!");
    return true;
  } catch (error) {
    console.error("Error saving Udhar to Firebase:", error);
    return false;
  }
}

export async function fetchMenuFromFirebase() {
  try {
    const inventoryRef = collectionGroup(db, 'inventory');
    const snapshot = await getDocs(inventoryRef);
    
    const menuObj = {};
    const seenNames = new Set();
    let index = 1;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').trim();
      
      if (!name || seenNames.has(name.toLowerCase())) {
        return;
      }
      
      seenNames.add(name.toLowerCase());
      menuObj[index] = {
        description: name,
        price: data.unitPrice || 0,
        id: doc.id,
        sku: data.sku || '',
        stock: data.stock || 0,
      };
      index++;
    });
    console.log(`Fetched ${Object.keys(menuObj).length} unique menu items from Firebase.`);
    return menuObj;
  } catch (error) {
    console.error("Error fetching menu from Firebase:", error);
    return null;
  }
}

/**
 * Updates the bot's status (QR code, connection state) in Firebase
 * @param {Object} status - { qr, connection, isOnline }
 */
export async function updateBotStatusInFirebase(status) {
  try {
    const inventoryGroupRef = collectionGroup(db, 'inventory');
    const inventorySnap = await getDocs(inventoryGroupRef);
    
    if (inventorySnap.empty) {
      console.warn("No inventory found to resolve userId for bot status.");
      return;
    }
    const userId = inventorySnap.docs[0].ref.path.split('/')[1];
    const botStatusRef = doc(db, `users/${userId}/bot/status`);
    
    await setDoc(botStatusRef, {
      ...status,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log("Bot status updated in Firebase.");
  } catch (error) {
    console.error("Error updating bot status in Firebase:", error);
  }
}
/**
 * Fetches all store data (orders, inventory, udhar) to provide context for AI admin queries
 */
export async function fetchAdminSummaryData() {
  try {
    const inventoryGroupRef = collectionGroup(db, 'inventory');
    const inventorySnap = await getDocs(inventoryGroupRef);
    
    if (inventorySnap.empty) {
      return { orders: [], inventory: [], udhar: [] };
    }
    const userId = inventorySnap.docs[0].ref.path.split('/')[1];
    
    // 1. Fetch Orders
    const ordersRef = collection(db, `users/${userId}/orders`);
    const ordersSnap = await getDocs(ordersRef);
    const orders = ordersSnap.docs.map(doc => doc.data());
    
    // 2. Fetch Inventory
    const inventoryRef = collection(db, `users/${userId}/inventory`);
    const invSnap = await getDocs(inventoryRef);
    const inventory = invSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // 3. Fetch Udhar (Credits)
    const udharRef = collection(db, `users/${userId}/udhar`);
    const udharSnap = await getDocs(udharRef);
    const udhar = udharSnap.docs.map(doc => doc.data());
    
    return {
      orders,
      inventory,
      udhar
    };
  } catch (error) {
    console.error("Error fetching admin summary data:", error);
    return { orders: [], inventory: [], udhar: [] };
  }
}
