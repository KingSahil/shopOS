# KiranaKeeper Website

This folder contains the React and Vite web app for KiranaKeeper. It provides retailer and wholesaler views, authenticates with Firebase Auth, stores app data in Firestore, and is currently deployed to Firebase Hosting.

Live site: [https://kiranakeeper.web.app](https://kiranakeeper.web.app)

## Stack

- React 19
- Vite
- TypeScript
- Firebase Auth
- Firestore
- Tailwind CSS v4 tooling

## What the app does

- Google sign-in for merchants
- seeds a first-time user workspace in Firestore
- renders retailer and wholesaler dashboards
- reads and writes inventory, orders, udhar, dashboard data, insights, and finance data from Firestore
- shares the same Firestore project that the WhatsApp bot writes into

## Important files

- `src/App.tsx`: top-level app flow and in-app view switching
- `src/firebase.ts`: Firebase initialization and Firestore error helpers
- `src/contexts/AuthContext.tsx`: auth state plus first-user Firestore seeding
- `src/views/InventoryView.tsx`: inventory list and add-product flow
- `src/views/OrdersView.tsx`: live orders list, delivered state updates, delete flow, search/filter UI
- `src/views/UdharView.tsx`: udhar list, add-credit flow, payment collection flow
- `src/views/WholesalerView.tsx`: wholesaler shell and analytics-style overview
- `firebase.json`: Firebase Hosting and Firestore rules config
- `.firebaserc`: local Firebase project binding

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` if needed. The current app expects:

- `GEMINI_API_KEY`
- `APP_URL`

3. Start the local dev environment:

```bash
npm run dev
```

## Build

```bash
npm run build
```

The production output is written to `dist/`.

## Firebase deployment

This app is configured for Firebase Hosting.

Current local binding:

- Firebase project: `kiranakeeper`
- Hosting URL: [https://kiranakeeper.web.app](https://kiranakeeper.web.app)

Deploy command:

```bash
firebase deploy --only hosting
```

## Firestore model used by the app

The app seeds and reads data under `users/{uid}`:

- `users/{uid}/inventory`
- `users/{uid}/orders`
- `users/{uid}/udhar`
- `users/{uid}/transactions`
- `users/{uid}/insights`
- `users/{uid}/dashboard/main`
- `users/{uid}/bot/status`

This is also the structure the WhatsApp bot relies on.

## Notes

- The app currently uses local in-app view state rather than a router
- some views contain live Firestore-backed data while also showing stylized static summary blocks
- the production bundle currently includes a large main JS chunk, so performance optimization is a good future task
