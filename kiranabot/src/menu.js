import { fetchMenuFromFirebase, getLastFirebaseAuthFailureReason } from './firebase_client.js';

export const menu = {};

function replaceMenuContents(nextMenu) {
  Object.keys(menu).forEach((key) => {
    delete menu[key];
  });

  Object.assign(menu, nextMenu);
}

export async function refreshMenuFromFirebase() {
  try {
    const fbMenu = await fetchMenuFromFirebase();
    if (fbMenu && Object.keys(fbMenu).length > 0) {
      replaceMenuContents(fbMenu);
      console.log(`✅ Loaded ${Object.keys(menu).length} items from Firebase:`, Object.values(menu).map(i => i.description).join(', '));
      return menu;
    }

    const authFailureReason = getLastFirebaseAuthFailureReason();
    if (authFailureReason) {
      console.warn(`WhatsApp menu sync failed because Firebase auth is not working (${authFailureReason}).`);
    } else {
      console.warn("No Firebase inventory items were returned for WhatsApp menu sync.");
    }
    return menu;
  } catch (e) {
    console.error("Failed to fetch menu from Firebase. Preserving current synced menu.", e);
    return menu;
  }
}

export function formatMenuMessage() {
  let msg = '🌟 *OUR CATALOG* 🌟\n';
  msg += '━━━━━━━━━━━━━━━━\n\n';

  const items = Object.values(menu);
  if (items.length === 0) {
    return `🌟 *OUR CATALOG* 🌟\n━━━━━━━━━━━━━━━━\n\n⚠️ Inventory is not synced right now.\nPlease try again in a moment.\n\n━━━━━━━━━━━━━━━━\n`;
  }
  const availableItems = [];
  const outOfStockItems = [];

  items.forEach((element) => {
    const stock = Math.max(0, Number(element?.stock) || 0);
    const price = Number(element?.price) || 0;
    const description = element?.description || 'Unnamed Item';
    const itemBlock = `📦 *${description}*\n💰 Price: ₹${price}\n📊 Left in stock: ${stock}`;

    if (stock > 0) {
      availableItems.push(itemBlock);
      return;
    }

    outOfStockItems.push(itemBlock);
  });

  msg += '*Available Items*\n\n';
  msg += availableItems.length > 0
    ? `${availableItems.join('\n\n')}\n\n`
    : '_No items are currently in stock._\n\n';

  msg += '🚫 *Out of Stock Items*\n\n';
  msg += outOfStockItems.length > 0
    ? `${outOfStockItems.join('\n\n')}\n\n`
    : '_No items are currently out of stock._\n\n';

  msg += '━━━━━━━━━━━━━━━━\n';
  return msg;
}

try {
  await refreshMenuFromFirebase();
} catch (e) {
  console.error("Initial menu refresh failed.", e);
}
