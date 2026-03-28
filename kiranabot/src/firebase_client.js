import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, collectionGroup, query, where, updateDoc, deleteDoc, doc, setDoc, runTransaction, getDoc } from 'firebase/firestore';

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
let authAttempted = false;
let resolvedStoreUserId = null;
let lastAuthFailureReason = null;

async function authenticateFirebase() {
  if (isAuthenticated) return true;
  if (authAttempted) return false;
  authAttempted = true;
  const email = String(process.env.FIREBASE_EMAIL || '').trim();
  const password = String(process.env.FIREBASE_PASSWORD || '').trim();
  
  if (!email || !password) {
    console.error("Firebase email or password missing in .env. Cannot sync orders to website.");
    lastAuthFailureReason = 'missing-credentials';
    return false;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    isAuthenticated = true;
    authAttempted = false;
    lastAuthFailureReason = null;
    console.log("Logged into Firebase successfully.");
    return true;
  } catch (error) {
    console.error("Firebase authentication failed:", error);
    lastAuthFailureReason = error?.code || 'auth-failed';
    return false;
  }
}

export function getLastFirebaseAuthFailureReason() {
  return lastAuthFailureReason;
}

export async function resolveStoreUserId() {
  if (resolvedStoreUserId) {
    return resolvedStoreUserId;
  }

  const isReady = await authenticateFirebase();
  if (!isReady) {
    return null;
  }

  if (auth.currentUser?.uid) {
    resolvedStoreUserId = auth.currentUser.uid;
    return resolvedStoreUserId;
  }
  const inventoryGroupRef = collectionGroup(db, 'inventory');
  const inventorySnap = await getDocs(inventoryGroupRef);

  if (inventorySnap.empty) {
    return null;
  }

  resolvedStoreUserId = inventorySnap.docs[0].ref.path.split('/')[1];
  return resolvedStoreUserId;
}

function normalizeStockValue(value) {
  return Math.max(0, Number(value) || 0);
}

export async function validateInventoryAvailability(items) {
  try {
    const userId = await resolveStoreUserId();

    if (!userId) {
      return {
        ok: false,
        code: 'inventory_missing',
        message: 'Inventory is not available right now.'
      };
    }

    for (const item of items) {
      if (!item?.id) {
        return {
          ok: false,
          code: 'item_missing',
          message: `"${item?.description || 'This item'}" is not available in the inventory right now.`
        };
      }

      const itemRef = doc(db, `users/${userId}/inventory/${item.id}`);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        return {
          ok: false,
          code: 'item_missing',
          message: `"${item.description}" is not available in the inventory right now.`
        };
      }

      const inventoryItem = itemSnap.data();
      const availableStock = normalizeStockValue(inventoryItem.stock);
      const requestedQuantity = Math.max(1, Number(item.quantity) || 1);

      if (requestedQuantity > availableStock) {
        return {
          ok: false,
          code: 'insufficient_stock',
          message: `Only ${availableStock} units of ${inventoryItem.name || item.description} are left in inventory. Please reduce the quantity.`
        };
      }
    }

    return { ok: true, userId };
  } catch (error) {
    console.error('Error validating inventory availability:', error);
    return {
      ok: false,
      code: 'inventory_check_failed',
      message: 'Could not check inventory right now. Please try again.'
    };
  }
}

export async function saveOrderToFirebase({ phone, items, totalAmount, customerName, paymentStatus = 'Pending' }) {
  try {
    const userId = await resolveStoreUserId();

    if (!userId) {
        console.error("No inventory found. Ensure the catalog is synced before placing orders.");
        return {
          ok: false,
          code: 'inventory_missing',
          message: 'Inventory is not available right now.'
        };
    }

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
    
    await runTransaction(db, async (transaction) => {
      for (const item of items) {
        if (!item.id) {
          throw new Error(`"${item.description || 'This item'}" is not available in the inventory right now.`);
        }

        const itemRef = doc(db, `users/${userId}/inventory/${item.id}`);
        const inventorySnap = await transaction.get(itemRef);

        if (!inventorySnap.exists()) {
          throw new Error(`"${item.description}" is not available in the inventory right now.`);
        }

        const inventoryItem = inventorySnap.data();
        const availableStock = normalizeStockValue(inventoryItem.stock);
        const requestedQuantity = Math.max(1, Number(item.quantity) || 1);

        if (requestedQuantity > availableStock) {
          throw new Error(`Only ${availableStock} units of ${inventoryItem.name || item.description} are left in inventory. Please reduce the quantity.`);
        }

        const newStock = Math.max(0, availableStock - requestedQuantity);
        transaction.update(itemRef, {
          stock: newStock,
          status: newStock < 20 ? 'error' : 'tertiary'
        });
      }

      transaction.set(doc(ordersRef), orderDoc);
    });

    console.log("Order successfully saved to Firebase and inventory updated.");

    return { ok: true };
  } catch (error) {
    console.error("Error saving order to Firebase:", error);
    return {
      ok: false,
      code: 'order_save_failed',
      message: error instanceof Error ? error.message : 'Failed to save order.'
    };
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
    
    const userId = await resolveStoreUserId();
    
    if (!userId) {
      console.error("❌ No inventory found. Cannot resolve merchant ID.");
      return false;
    }
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
    const userId = await resolveStoreUserId();
    
    if (!userId) return false;
    
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
    const userId = await resolveStoreUserId();
    if (!userId) {
      return null;
    }

    const inventoryRef = collection(db, `users/${userId}/inventory`);
    const snapshot = await getDocs(inventoryRef);
    
    const menuObj = {};
    const groupedItems = new Map();
    let index = 1;
    
    snapshot.forEach((inventoryDoc) => {
      const data = inventoryDoc.data();
      const name = (data.name || '').trim();
      const normalizedName = name.toLowerCase();
      
      if (!name) {
        return;
      }

      const safeStock = normalizeStockValue(data.stock);
      const existingItem = groupedItems.get(normalizedName);

      if (!existingItem) {
        groupedItems.set(normalizedName, {
          description: name,
          price: Number(data.unitPrice) || 0,
          id: inventoryDoc.id,
          sku: data.sku || '',
          stock: safeStock,
        });
        return;
      }

      groupedItems.set(normalizedName, {
        ...existingItem,
        price: Number(data.unitPrice) || existingItem.price || 0,
        sku: data.sku || existingItem.sku || '',
        stock: existingItem.stock + safeStock,
      });
    });

    groupedItems.forEach((item) => {
      menuObj[index] = item;
      index += 1;
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
    const userId = await resolveStoreUserId();
    
    if (!userId) {
      const authFailureReason = getLastFirebaseAuthFailureReason();
      if (authFailureReason) {
        console.warn(`Bot status sync skipped because Firebase auth failed (${authFailureReason}).`);
      } else {
        console.warn("No inventory found to resolve userId for bot status.");
      }
      return;
    }
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
    const userId = await resolveStoreUserId();
    
    if (!userId) {
      return { orders: [], inventory: [], udhar: [] };
    }
    
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
