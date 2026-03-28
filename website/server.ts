import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

const LOOKUP_USER_AGENT = "shopos/1.0 barcode-lookup";

type BarcodeLookupResult = {
  barcode: string;
  name: string;
  brand: string;
  quantity: string;
  imageUrl: string;
  unitPrice: number | null;
  currency: string | null;
  priceSource: string | null;
};

async function fetchProductDetails(code: string) {
  const response = await fetch(
    `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(code)}?fields=product_name,product_name_en,product_name_hi,brands,quantity,image_front_url`,
    {
      headers: {
        "User-Agent": LOOKUP_USER_AGENT
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Product lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  const product = payload?.product ?? {};

  return {
    name: String(product.product_name_hi || product.product_name_en || product.product_name || "").trim(),
    brand: String(product.brands || "").trim(),
    quantity: String(product.quantity || "").trim(),
    imageUrl: String(product.image_front_url || "").trim()
  };
}

async function fetchProductPrice(code: string) {
  const response = await fetch(
    `https://prices.openfoodfacts.org/api/v1/prices?product_code=${encodeURIComponent(code)}`,
    {
      headers: {
        "User-Agent": LOOKUP_USER_AGENT
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Price lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const inrPrice =
    items.find((item: any) => String(item?.currency || "").toUpperCase() === "INR" && Number.isFinite(Number(item?.price)))
    || items.find((item: any) => String(item?.location?.osm_address_country_code || "").toUpperCase() === "IN" && Number.isFinite(Number(item?.price)));

  if (!inrPrice) {
    return {
      unitPrice: null,
      currency: null,
      priceSource: null
    };
  }

  return {
    unitPrice: Number(inrPrice.price),
    currency: String(inrPrice.currency || "").toUpperCase() || null,
    priceSource: "Open Prices"
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Demo inventory data
  let inventoryItems = [
    { id: 1, name: 'Dhara Mustard Oil (1L)', sku: 'OIL-DH-1029', category: 'Essentials', stock: 13, maxStock: 100, price: 2275, unitPrice: 175, status: 'error' },
    { id: 2, name: 'Fortune Basmati Rice (5kg)', sku: 'RIC-FO-502', category: 'Grains', stock: 147, maxStock: 200, price: 80850, unitPrice: 550, status: 'tertiary' },
    { id: 3, name: 'Amul Taaza Milk (1L)', sku: 'DAI-AM-100', category: 'Dairy', stock: 88, maxStock: 150, price: 5632, unitPrice: 64, status: 'tertiary' },
    { id: 4, name: "McVitie's Digestive (250g)", sku: 'SNK-MC-250', category: 'Snacks', stock: 3, maxStock: 50, price: 225, unitPrice: 75, status: 'error' },
    { id: 5, name: "atta maggi", sku: 'SKU-6825', category: 'Essentials', stock: 52, maxStock: 100, price: 520, unitPrice: 10, status: 'tertiary' },
  ];

  // Demo orders data
  let orders = [
    { id: '#ORD-18628', name: 'Dhara Mustard Oil (1L)', date: 'Mar 28, 2026', customer: 'https://www.lyshra.com/ (916283285856)', initials: 'HT', status: 'Delivered', amount: '175.00', sColor: 'tertiary' },
    { id: '#ORD-34848', name: 'atta maggi', date: 'Mar 28, 2026', customer: 'Shashank (919779234350)', initials: 'SH', status: 'Paid', amount: '100.00', sColor: 'tertiary' },
    { id: '#ORD-38100', name: 'atta maggi', date: 'Mar 28, 2026', customer: 'Shashank (919779234350)', initials: 'SH', status: 'Paid', amount: '10.00', sColor: 'tertiary' },
    { id: '#ORD-94873', name: 'atta maggi', date: 'Mar 28, 2026', customer: 'Mr. Bhagat Singh', initials: 'MB', status: 'Delivered', amount: '90.00', sColor: 'tertiary' },
    { id: '#ORD-43752', name: 'Amul Taaza Milk (1L)', date: 'Mar 27, 2026', customer: 'Sahil (918437867986)', initials: 'SA', status: 'Delivered', amount: '640.00', sColor: 'tertiary' },
    { id: '#ORD-80228', name: "McVitie's Digestive (250g)", date: 'Mar 27, 2026', customer: 'Phone: +918437867986', initials: 'WA', status: 'Pending', amount: '75.00', sColor: 'secondary' },
    { id: '#ORD-16644', name: 'atta maggi', date: 'Mar 27, 2026', customer: 'Sahil (918437867986)', initials: 'SA', status: 'Delivered', amount: '20.00', sColor: 'tertiary' },
    { id: '#ORD-84916', name: 'atta maggi', date: 'Mar 27, 2026', customer: 'Sahil (918437867986)', initials: 'SA', status: 'Pending', amount: '60.00', sColor: 'secondary' },
  ];

  let udharCustomers = [
    { initials: 'AK', name: 'Anil Kirana Store', lastPayment: '2 days ago', amount: '24,500', bg: 'bg-secondary-fixed', text: 'text-on-secondary-container' },
    { initials: 'RM', name: 'Rajesh Mart', lastPayment: 'Today', amount: '1,12,000', bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant' },
    { initials: 'SG', name: 'Saraswati General', lastPayment: '15 days ago', amount: '8,740', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant' },
    { initials: 'PV', name: 'Pooja Varieties', lastPayment: 'Never', amount: '15,200', bg: 'bg-surface-dim', text: 'text-on-surface' },
  ];

  let transactions = [
    { id: '#TR-88219', entity: 'MegaWholesale Ltd', initials: 'MW', bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed', date: '24 Feb, 2024', status: 'COMPLETED', statusBg: 'bg-tertiary-fixed', statusText: 'text-on-tertiary-fixed-variant', amount: '- ₹42,000.00', amountColor: 'text-error' },
    { id: '#TR-88218', entity: 'Ramesh Kirana Store', initials: 'RK', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed', date: '23 Feb, 2024', status: 'COMPLETED', statusBg: 'bg-tertiary-fixed', statusText: 'text-on-tertiary-fixed-variant', amount: '+ ₹12,400.00', amountColor: 'text-tertiary' },
    { id: '#TR-88215', entity: 'Patel Dairy Products', initials: 'PD', bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed', date: '22 Feb, 2024', status: 'PENDING', statusBg: 'bg-secondary-fixed', statusText: 'text-on-secondary-fixed-variant', amount: '₹8,900.00', amountColor: 'text-on-surface' },
  ];

  let insights = [
    { cat: 'Grains & Pulses', icon: 'grain', current: '₹4,82,000', forecast: '₹5,20,000', conf: 95, status: 'Bullish', sColor: 'tertiary' },
    { cat: 'Edible Oils', icon: 'oil_barrel', current: '₹2,15,000', forecast: '₹2,10,000', conf: 88, status: 'Stable', sColor: 'on-surface-variant' },
    { cat: 'Detergents', icon: 'soap', current: '₹1,12,000', forecast: '₹1,45,000', conf: 82, status: 'Growth', sColor: 'tertiary' },
  ];

  let dashboardData = {
    revenue: '₹42,850',
    revenueGrowth: '+12%',
    pendingUdhar: '₹18,200',
    smartAlert: '"Sugar stock will likely deplete by Wednesday based on current trends."',
    profitOptimizer: '"Bundle pulses and oil for a 15% increase in basket size this weekend."'
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/dashboard", (req, res) => {
    res.json(dashboardData);
  });

  app.get("/api/inventory", (req, res) => {
    res.json(inventoryItems);
  });

  app.get("/api/barcode-lookup", async (req, res) => {
    const code = String(req.query.code || "").trim();

    if (!/^\d{8,14}$/.test(code)) {
      res.status(400).json({ error: "A valid barcode is required." });
      return;
    }

    try {
      const [product, pricing] = await Promise.allSettled([
        fetchProductDetails(code),
        fetchProductPrice(code)
      ]);

      const productValue = product.status === "fulfilled" ? product.value : {
        name: "",
        brand: "",
        quantity: "",
        imageUrl: ""
      };
      const priceValue = pricing.status === "fulfilled" ? pricing.value : {
        unitPrice: null,
        currency: null,
        priceSource: null
      };

      const result: BarcodeLookupResult = {
        barcode: code,
        name: productValue.name,
        brand: productValue.brand,
        quantity: productValue.quantity,
        imageUrl: productValue.imageUrl,
        unitPrice: priceValue.unitPrice,
        currency: priceValue.currency,
        priceSource: priceValue.priceSource
      };

      res.json(result);
    } catch (error) {
      console.error("Barcode lookup failed:", error);
      res.status(502).json({ error: "Unable to fetch product details right now." });
    }
  });

  app.post("/api/inventory", (req, res) => {
    const newItem = {
      id: inventoryItems.length + 1,
      ...req.body,
      status: req.body.stock < 20 ? 'error' : 'tertiary'
    };
    inventoryItems.push(newItem);
    res.status(201).json(newItem);
  });

  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  app.get("/api/udhar", (req, res) => {
    res.json(udharCustomers);
  });

  app.get("/api/finance", (req, res) => {
    res.json(transactions);
  });

  app.get("/api/insights", (req, res) => {
    res.json(insights);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      optimizeDeps: {
        include: ['@zxing/browser', '@zxing/library'],
      },
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
