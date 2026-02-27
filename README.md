<p align="center">
  <img src="./assets/tt-icon-1024.png" alt="TT App Icon" width="400" />
</p>

https://github.com/user-attachments/assets/120c3b30-60f4-4b24-b4ec-7a927c5d8b40

# TT — 3D Instances (Expo + React Three Fiber)

An Expo (SDK 54) app that renders **interactive 3D planets** using **React Three Fiber** on React Native.  
It supports **orbit controls**, **planet selection + highlight**, **spawn animations**, and **persisted state** (Zustand + AsyncStorage).

---

## ✨ Features

- Generate random 3D planets with:
  - random palette + scale + rotation
  - optional rings
  - optional continents (procedural texture)
  - deterministic spawn distribution (golden spiral) to reduce overlap
- Tap a planet to select it (highlight + subtle scale feedback)
- Camera controls:
  - rotate + pinch-to-zoom (OrbitControls)
- Smooth animations with `@react-spring/three`
- State management with Zustand
- Persisted state via AsyncStorage (planets survive reloads)

---

## 🧱 Tech Stack

- Expo SDK 54 + TypeScript
- `expo-gl`
- `three`
- `@react-three/fiber/native`
- `@react-three/drei/native`
- `r3f-native-orbitcontrols`
- `zustand` (+ `persist` + AsyncStorage)
- `@react-spring/three`

---

## ✅ Requirements

- Node.js (LTS recommended)
- npm

---

## 🚀 Getting Started (from scratch)

### 1) Clone

```bash
# HTTPS
git clone https://github.com/oswaldoAlvarez/TT.git

# OR SSH (recommended if you have SSH keys configured)
git clone git@github.com:oswaldoAlvarez/TT.git

cd TT
```

### 2) Install dependencies

```bash
npm install
```

---

## ▶️ Run with Expo Go (fastest)

### 1) Start Metro

```bash
npx expo start --clear
```

### 2) Open on a device

* Install **Expo Go** from the App Store / Google Play.
* Make sure your computer and phone are on the same Wi-Fi.
* Scan the QR code shown in the terminal/browser.

If your network blocks LAN discovery:

```bash
npx expo start --tunnel
```

---

## 📱 Run on a Physical Device

### Option A — Expo Go (easiest)

Same as “Run with Expo Go”:

```bash
npx expo start --clear
```

---

## 🧰 Useful Commands

```bash
npx expo start
npx expo start --clear
npm run build:dev
npm run build:staging
npm run build:prod
```

---

## 📦 Builds (EAS)

Profiles are defined in `eas.json`:

- `development`: dev client APK (internal)
- `preview`: internal APK (QA/testing)
- `production`: AAB for Play Store

Example:

```bash
eas build --platform android --profile production
```

---

## 🧯 Troubleshooting

### “I don’t see the scene / it’s slow on iOS simulator”

The iOS simulator can be significantly slower for GL rendering than a real device.
Try on a physical device for accurate performance.

### “Expo asks me to pick a simulator/device each time”

That can happen after running `expo run:*` or when multiple simulators/emulators are available.
Launch a simulator/emulator first, then press `i`/`a`, or select the target when prompted.

### “Network QR doesn’t work”

Try:

```bash
npx expo start --tunnel
```
