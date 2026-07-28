# CoffeeShop POS

A point-of-sale app for coffee shops.

---

## Quick Start (Pre-Built Apps)

### Windows

1. Click **Releases** at the top of this page
2. Find the latest release and click on the `.exe` file
3. Click **Download**
4. When it finishes downloading, click on the file name at the bottom of your browser (or go to your **Downloads** folder and double-click it)
5. A window will pop up asking "Do you want to allow this app to make changes?" — click **Yes**
6. Follow the installer — click **Next** through each screen, then **Install**, then **Finish**
7. The app is now in your **Start Menu** under "Coffee Shop POS". Click it to open.

---

### macOS

1. Click **Releases** at the top of this page
2. Find the latest release and click on the `.dmg` file
3. Click **Download**
4. When it finishes, double-click the file (it's at the bottom of your browser or in your **Downloads** folder)
5. A window will open showing the app icon and a picture of the **Applications** folder
6. Drag the app icon on top of the Applications folder picture
7. Open your **Applications** folder (click the Finder icon in your dock, then click "Applications" on the left)
8. Find "Coffee Shop POS" and double-click it
9. If a message says the app is from an unidentified developer, click **OK**
10. Open **System Settings** (the gear icon), go to **Privacy & Security**, scroll down, and click **Open Anyway** next to the warning about Coffee Shop POS
11. The app will open.

---

### Android Phone

1. On your phone, open the **Chrome** browser (or any browser)
2. Go to `github.com/thecosyplatypus/CoffeeShopPOS/releases`
3. Tap the `.apk` file
4. If it says "File might be harmful", tap **Download anyway**
5. When it finishes, tap **Open** (or swipe down from the top of your screen and tap the download notification)
6. If it says "Install unknown apps", tap **Settings**, then turn on the switch next to your browser, then press the back button
7. Tap **Install**
8. When it says "App installed", tap **Open**
9. The app is now on your home screen for next time.

---

## Build It Yourself (From Source)

Use this if you want to change the code or don't want to download a pre-built app.

### What You Need

You need two things installed on your computer. Here is exactly how to get them:

#### 1. Install Node.js

Node.js lets the app run on your computer.

1. Go to **https://nodejs.org**
2. Click the big green button that says **Download Node.js (LTS)**
3. Open the file that downloaded (double-click it)
4. Click **Next** on every screen, then **Install**, then **Finish**

#### 2. Install Git

Git lets you download the code from GitHub.

**Windows:**
1. Go to **https://git-scm.com/downloads/win**
2. The download starts automatically. Open the file.
3. Click **Next** on every screen. You can leave all the settings as they are. Click **Install**, then **Finish**.

**Mac:**
1. Open the **Terminal** app (press Cmd+Space, type "Terminal", press Enter)
2. Type `git --version` and press Enter
3. If it asks to install developer tools, click **Install** and type your password
4. Wait for it to finish.

---

### Download the Code

1. Open **Terminal** (Mac) or **Command Prompt** (Windows — press the Windows key, type "cmd", press Enter)
2. Type this command and press Enter:

```bash
git clone https://github.com/thecosyplatypus/CoffeeShopPOS.git
```

3. Now type this and press Enter to go into the folder:

```bash
cd CoffeeShopPOS
```

4. Now type this and press Enter. This downloads everything the app needs (takes about 1 minute):

```bash
npm install --legacy-peer-deps
```

---

### Run the App

You have a choice of how to run it. Pick whichever one you want:

---

#### Option A — Run in Your Web Browser

This is the easiest way. No extra steps.

1. In the same Terminal/Command Prompt window, type this and press Enter:

```bash
npm run dev
```

2. It will say something like "Local: http://localhost:5173"
3. Open your web browser (Chrome, Safari, Firefox, Edge — any one)
4. In the address bar at the top, type `localhost:5173` and press Enter
5. The app is now running.

To stop it: go back to the Terminal window and press **Ctrl+C** (hold Ctrl and tap C).

---

#### Option B — Run as a Windows Desktop App

1. In the Terminal/Command Prompt window, type this and press Enter:

```bash
npm run electron:dev
```

2. A new window will open with the app inside it. This is the desktop version.
3. You can close it by clicking the X in the top-right corner.

To stop it: go back to the Terminal window and press **Ctrl+C**.

**To build an installer you can share with others:**

1. Type this and press Enter:

```bash
npm run electron:build:win
```

2. Wait a few minutes. When it's done, open the **release** folder inside the CoffeeShopPOS folder. You'll find a `.exe` file. That's the installer you can send to someone.

---

#### Option C — Run as a macOS Desktop App

1. In the Terminal window, type this and press Enter:

```bash
npm run electron:dev
```

2. A new window will open with the app.
3. Close it by clicking the red dot in the top-left corner.

To stop it: go back to the Terminal window and press **Ctrl+C**.

**To build a .dmg you can share with others:**

1. Type this and press Enter:

```bash
npm run electron:build:mac
```

2. Wait a few minutes. Open the **release** folder. You'll find a `.dmg` file. That's the installer you can send to someone.

---

#### Option D — Run on an Android Phone

You need an extra program called **Android Studio**.

**Install Android Studio:**

1. Go to **https://developer.android.com/studio**
2. Click the big blue **Download Android Studio** button
3. Open the file that downloaded
4. Click **Next** through the installer. When it asks which components to install, leave everything checked and click **Next**. When it asks where to install, leave the default and click **Next**. Click **Install**, then **Finish**.
5. Android Studio will open. It will ask you to download extra stuff — click **Next** through each screen and let it download everything. This takes 5-10 minutes.

**Build the app:**

1. Go back to the Terminal/Command Prompt window (the one where you ran `npm install`)
2. Type this and press Enter:

```bash
npm run build
```

Wait for it to finish (about 30 seconds). It should say "built in" some number of seconds.

3. Type this and press Enter:

```bash
npx cap sync android
```

Wait for it to finish (about 15 seconds).

4. Type this and press Enter:

```bash
npx cap open android
```

Android Studio will open with the project loaded.

5. Wait for Android Studio to finish syncing (a bar at the bottom will say "indexing" — wait until it stops, about 2 minutes).

6. **To run on your phone:**
   - Plug your Android phone into your computer with a USB cable
   - On your phone, go to **Settings > About Phone**
   - Tap **Build Number** 7 times (yes, really — this turns on Developer Mode)
   - Press the back button
   - Go to **Developer Options** and turn on **USB Debugging**
   - A popup will appear on your phone asking "Allow USB debugging?" — tap **Allow**
   - Back in Android Studio, click the dropdown at the top that says "No Devices" and select your phone
   - Click the green triangle **Play** button at the top
   - The app will install and open on your phone.

7. **To build an APK file you can share:**
   - In Android Studio, click **Build** in the menu bar
   - Click **Build Bundle(s) / APK(s)**
   - Click **Build APK(s)**
   - Wait for it to finish (about 1 minute)
   - It will say "APK(s) generated successfully" — click **locate**
   - A folder will open with `app-debug.apk` inside it. That's the file you can send to someone's phone.

---

## Using the App

### First Time Opening the App

1. The app opens to a **Setup** screen
2. Type your name in the first box
3. Type a 4-6 digit PIN (just numbers, like `1234`) in the second box
4. Type the same PIN again in the third box
5. Click **Create Admin Account**
6. The app logs you in automatically. You'll see the **POS** screen with menu items.

### Logging In (After First Time)

1. Type your PIN on the login screen
2. Click **Login**

### Taking an Order

1. Click on a menu item to add it to the cart (the list on the right side)
2. Click the **+** button to add more of the same item, or **−** to remove one
3. To remove an item completely, click the **trash can** icon next to it
4. When you're done, choose how the customer is paying: **Cash**, **Card**, or **Mobile**
5. Click the big **Charge** button at the bottom
6. The sale is recorded. The cart clears and you're ready for the next customer.

### Navigating Between Screens

**On a computer:** Look at the left side of the screen. There's a list of buttons:
- **POS** — take orders
- **Dashboard** — see today's sales
- **Inventory** — manage products and stock
- **Recipes** — manage drink recipes
- **Reports** — see charts and numbers
- **Staff** — add or remove employees
- **Settings** — change store name, currency, tax rate

**On a phone:** Tap the **three horizontal lines** (☰) in the top-left corner. The same list of screens will slide out. Tap the one you want.

### Adding a New Menu Item

1. Go to the **POS** screen
2. Click the **+ Add Item** button (top-right)
3. Type the item name (like "Vanilla Latte")
4. Type the category (like "Coffee")
5. Type the price (like "5.50")
6. Click **Add**

The item now appears in the POS grid.

### Adding a Staff Member

1. Go to the **Staff** screen
2. Click **+ Add Staff**
3. Type the person's name
4. Type a PIN for them (4-6 digits)
5. Choose their role: **Barista** (can take orders), **Manager** (can take orders + view reports), or **Owner** (can do everything)
6. Click **Add**

They can now log in with their PIN.

### Backing Up Your Data

1. Go to **Settings**
2. Click **Export Data**
3. A file will download to your computer — this is a backup of all your data
4. To restore it later, go to Settings and click **Import Data**, then choose that file
