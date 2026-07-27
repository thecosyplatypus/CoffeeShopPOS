# CoffeeShop POS

A full-featured point-of-sale application for coffee shops, built with React, TypeScript, and SQLite. Runs as a web app, Electron desktop app, or Capacitor mobile app.

## Features

- **Point of Sale** — Category browsing, cart management, discount codes, tax calculation, cash/card/mobile payment
- **Inventory Management** — Product tracking, stock adjustments with reason logging, cost/margin analysis
- **Recipes** — Ingredient tracking with waste percentages, cost-per-serving calculations
- **Reports** — Sales analytics, expense tracking, menu engineering matrix (Star/Workhorse/Puzzle/Dog), trend charts, CSV export
- **Staff Management** — PIN-based login, role-based access (Barista, Manager, Owner)
- **Dashboard** — Best sellers, peak hours, employee sales, payment breakdowns, stock alerts
- **Settings** — Store config, currency, tax rate, data export/import, reset
- **Cloud Sync** — Configurable REST API sync with retry logic and auto-sync
- **Offline-First** — SQLite via WebAssembly, works entirely offline

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand, Recharts
- **Database:** SQLite via sql.js (WASM)
- **Desktop:** Electron 43
- **Mobile:** Capacitor 6 (iOS/Android)
- **Build:** Vite 8

## Getting Started

```bash
npm install
npm run dev
```

### Desktop (Electron)

```bash
npm run electron:dev
```

### Build

```bash
# Web
npm run build

# Desktop (Windows)
npm run electron:build:win

# Desktop (macOS)
npm run electron:build:mac

# Desktop (Linux)
npm run electron:build:linux
```

### Mobile (Capacitor)

```bash
npm run build
npm run capacitor:sync
npm run capacitor:open:ios
npm run capacitor:open:android
```

## Project Structure

```
src/
├── components/    # Layout shell
├── pages/         # POS, Dashboard, Inventory, Recipes, Reports, Admin, Settings, Login, Setup
├── services/      # Database, auth, inventory logic, cloud sync
├── store/         # Zustand state management
├── types/         # TypeScript interfaces
├── utils/         # Formatters
└── db/            # SQLite schema
electron/          # Electron main/preload processes
capacitor/         # Capacitor configuration
public/            # WASM binaries for SQLite
```
