# CoffeeShop POS

A point-of-sale app for coffee shops. Runs as a web app, desktop app (Windows/macOS), or Android app.

## Download Pre-Built Apps

Go to [Releases](https://github.com/thecosyplatypus/CoffeeShopPOS/releases) and download the file for your platform:

| Platform | File | What to do |
|----------|------|------------|
| **Windows** | `.exe` | Run the installer, launch from Start Menu |
| **macOS** | `.dmg` | Open it, drag the app to Applications, right-click > Open on first launch |
| **Android** | `.apk` | Open on your phone, allow "unknown sources" if prompted |
| **Web** | — | No download needed, run from source (see below) |

---

## Build From Source

### What You Need (all platforms)

1. **[Git](https://git-scm.com/downloads)** — to download the code
2. **[Node.js 20+](https://nodejs.org/)** — the app runs on Node. Download the LTS version.

Verify they're installed by opening a terminal (Command Prompt, PowerShell, or Terminal) and running:

```bash
git --version
node --version
```

Both should print a version number. If not, install them and restart your terminal.

---

### Step 1 — Download the code

```bash
git clone https://github.com/thecosyplatypus/CoffeeShopPOS.git
cd CoffeeShopPOS
```

### Step 2 — Install dependencies

```bash
npm install --legacy-peer-deps
```

This downloads everything the app needs. It takes a minute the first time.

---

## Running on Each Platform

### Run in a Web Browser (Windows, macOS, Linux)

No extra tools needed.

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The app reloads automatically when you change code.

---

### Run as a Windows Desktop App

No extra tools needed (Electron is included in the dependencies).

**Development (with auto-reload):**

```bash
npm run electron:dev
```

**Build an installer (.exe) to share with others:**

```bash
npm run electron:build:win
```

The `.exe` installer will be in the `release/` folder.

---

### Run as a macOS Desktop App

No extra tools needed.

**Development (with auto-reload):**

```bash
npm run electron:dev
```

**Build a .dmg to share with others:**

```bash
npm run electron:build:mac
```

The `.dmg` will be in the `release/` folder.

> **Note:** On first launch, macOS may block the app. Right-click it and select **Open** to bypass Gatekeeper.

---

### Run on Android

**Extra tools needed:**
1. **[Android Studio](https://developer.android.com/studio)** — the official Android development environment
2. **Java 21** — comes bundled with Android Studio

**Steps:**

1. Build the web app:
   ```bash
   npm run build
   ```

2. Copy the built files into the Android project:
   ```bash
   npx cap sync android
   ```

3. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```

4. In Android Studio, wait for the project to sync (this may take a few minutes the first time).

5. **To run on your phone:**
   - Connect your Android phone via USB with developer mode enabled
   - Click the green **Run** button (or press Shift+F10)
   - Select your phone from the device list

6. **To build an APK to share:**
   - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
   - The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

**How to enable developer mode on Android:** Go to **Settings > About Phone** and tap **Build Number** 7 times. Then go to **Settings > Developer Options** and enable **USB Debugging**.

---

## First-Time Setup (in the app)

1. Open the app — you'll see the **Setup** screen
2. Enter your name and create a 4-6 digit PIN
3. Click **Create Admin Account** — a demo menu is loaded automatically
4. Log in with your PIN

---

## Project Structure

```
src/
  components/    Layout, navigation
  pages/         POS, Dashboard, Inventory, Recipes, Reports, Admin, Settings, Login, Setup
  services/      Database, auth, inventory logic, cloud sync
  store/         State management (Zustand)
  db/            SQLite schema
electron/        Desktop app (Electron)
android/         Android app (Capacitor)
```

## License

Private — see repository owner for access.
