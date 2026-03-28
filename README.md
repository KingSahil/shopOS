# KiranaKeeper

KiranaKeeper is split into two working parts:

- [website](C:/projects/kiranaKeeper/website): the Firebase-backed retailer and wholesaler web app
- [kiranabot](C:/projects/kiranaKeeper/kiranabot): the WhatsApp ordering and admin assistant

## Current status

- The web app is deployed on Firebase Hosting at [https://kiranakeeper.web.app](https://kiranakeeper.web.app)
- The WhatsApp bot is a separate always-on Node service and should be hosted on Railway, a VPS, or another persistent runtime

## How the pieces connect

- the website stores merchant data in Firestore under `users/{uid}/...`
- the bot reads inventory from Firestore to build its menu
- when the bot confirms an order, it writes into the same Firestore data model the website reads
- the bot also updates `users/{uid}/bot/status` so the website can show connection state

## Repository layout

- [website](C:/projects/kiranaKeeper/website)
  - React 19 + Vite frontend
  - Firebase Auth + Firestore
  - deployed static hosting on Firebase Hosting

- [kiranabot](C:/projects/kiranaKeeper/kiranabot)
  - Node.js + Baileys + SQLite
  - optional Groq natural-language processing
  - Firestore sync for orders, inventory, udhaar, and bot status

## Getting started

### Website

See [website/README.md](C:/projects/kiranaKeeper/website/README.md)

### WhatsApp bot

See [kiranabot/README.md](C:/projects/kiranaKeeper/kiranabot/README.md)

## Documentation

- repo overview: [README.md](C:/projects/kiranaKeeper/README.md)
- website docs: [website/README.md](C:/projects/kiranaKeeper/website/README.md)
- bot docs: [kiranabot/DOCUMENTATION_MAP.md](C:/projects/kiranaKeeper/kiranabot/DOCUMENTATION_MAP.md)
