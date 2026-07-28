# CoffeeShop POS

A full-featured point-of-sale application for coffee shops, built with React, TypeScript, and SQLite. Runs as a web app, Electron desktop app (Windows/macOS/Linux), or Capacitor mobile app (Android/iOS).

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
- **Mobile:** Capacitor 8 (Android)
- **Build:** Vite 8

---

## Download & Install

### Android

**Option A — Pre-built APK (recommended)**
1. Download the latest `.apk` or `.aab` from the [Releases](https://github.com/anomalyco/CoffeeShopPOS/releases) page
2. On your Android device, open the downloaded file
3. If prompted, allow installation from unknown sources
4. Open the app and complete the first-time setup

**Option B — Build from source**
```bash
# Prerequisites: Node.js 18+, Android Studio, Android SDK
npm install
npm run build
npx cap sync android
npx cap open android
```
Then in Android Studio, build an APK or AAB (`Build > Build Bundle(s) / APK(s)`).

---

### macOS

**Option A — Pre-built DMG (recommended)**
1. Download the latest `.dmg` from the [Releases](https://github.com/anomalyco/CoffeeShopPOS/releases) page
2. Open the DMG and drag the app to your Applications folder
3. On first launch, right-click the app and select **Open** (Gatekeeper warning)

**Option B — Build from source**
```bash
npm install
npm run electron:build:mac
```
The DMG will be in the `release/` folder.

---

### Windows

**Option A — Pre-built installer (recommended)**
1. Download the latest `.exe` or `.msi` from the [Releases](https://github.com/anomalyco/CoffeeShopPOS/releases) page
2. Run the installer
3. Launch from the Start Menu or desktop shortcut

**Option B — Build from source**
```bash
npm install
npm run electron:build:win
```
The installer will be in the `release/` folder.

---

### Web Browser (any platform)

```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Usage

### First-Time Setup
1. Launch the app — the **Setup** screen appears
2. Enter your name and create a 4-6 digit PIN (numbers only)
3. Tap **Create Admin Account** — the demo menu is seeded automatically
4. Log in with your PIN

### Navigation
- **Desktop**: Use the side panel on the left to switch between POS, Dashboard, Inventory, Reports, Recipes, Admin, and Settings
- **Mobile**: Tap the hamburger icon (☰) in the top-left corner to open the navigation drawer

### Taking an Order (POS)
1. Tap menu items to add them to the cart
2. Adjust quantities with +/− buttons
3. Select a payment method (Cash / Card / Mobile)
4. Optionally enter a discount code
5. Tap **Charge** to complete the sale

### Managing Staff
- Go to **Admin** to add, remove, or change staff roles
- Staff log in with their own PIN

---

## Development

```bash
# Install dependencies
npm install

# Run in browser (hot reload)
npm run dev

# Desktop (Electron with hot reload)
npm run electron:dev

# Build for production
npm run build
```

### Platform Build Commands

| Platform | Command | Output |
|----------|---------|--------|
| Web | `npm run build` | `dist/` |
| Windows (desktop) | `npm run electron:build:win` | `release/*.exe` |
| macOS (desktop) | `npm run electron:build:mac` | `release/*.dmg` |
| Linux (desktop) | `npm run electron:build:linux` | `release/*.AppImage` |
| Android | `npm run build && npx cap sync android` | `android/app/build/` |

---

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
