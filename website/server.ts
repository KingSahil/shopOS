import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Demo inventory data
  let inventoryItems = [
    { id: 1, name: 'Dhara Mustard Oil (1L)', sku: 'OIL-DH-1029', category: 'Essentials', stock: 14, maxStock: 100, price: 2450, unitPrice: 175, status: 'error' },
    { id: 2, name: 'Fortune Basmati Rice (5kg)', sku: 'RIC-FO-502', category: 'Grains', stock: 142, maxStock: 200, price: 78100, unitPrice: 550, status: 'tertiary' },
    { id: 3, name: 'Amul Taaza Milk (1L)', sku: 'DAI-AM-100', category: 'Dairy', stock: 88, maxStock: 150, price: 5632, unitPrice: 64, status: 'tertiary' },
    { id: 4, name: "McVitie's Digestive (250g)", sku: 'SNK-MC-250', category: 'Snacks', stock: 3, maxStock: 50, price: 225, unitPrice: 75, status: 'error' },
  ];

  let orders = [
    { id: '#ORD-88219', name: 'Premium Tea Batch', date: 'Oct 24, 2023', customer: 'Amit Kirana', initials: 'AK', status: 'Delivered', amount: '12,450.00', sColor: 'tertiary' },
    { id: '#ORD-88220', name: 'Bulk Flour Supply', date: 'Oct 25, 2023', customer: 'Raja Stores', initials: 'RS', status: 'Pending', amount: '45,200.00', sColor: 'secondary' },
    { id: '#ORD-88221', name: 'Dairy Products', date: 'Oct 25, 2023', customer: 'Mehra Kirana', initials: 'MK', status: 'Cancelled', amount: '3,150.00', sColor: 'error' },
    { id: '#ORD-88222', name: 'Edible Oils Cargo', date: 'Oct 26, 2023', customer: 'Hira Sweets', initials: 'HS', status: 'Delivered', amount: '89,000.00', sColor: 'tertiary' },
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
