# Fix Babel Preset Error

## The Problem
The error "Cannot find module 'babel-preset-expo'" means the Babel preset package is missing.

## ✅ Quick Fix

### Option 1: Automatic

**Double-click this file:**
```
FIX_BABEL_ERROR.bat
```

This will:
1. Delete node_modules
2. Delete package-lock.json
3. Reinstall all packages including babel-preset-expo
4. Takes 2-3 minutes

---

### Option 2: Manual

```bash
cd mobile-app

# Delete old files
rmdir /s /q node_modules
del package-lock.json
rmdir /s /q .expo

# Install all packages
npm install

# Explicitly install babel preset
npm install --save-dev babel-preset-expo@~12.0.0
```

---

## After the Fix

Start the app:
```bash
npx expo start --tunnel
```

Or double-click: `START_MOBILE_TUNNEL.bat`

---

## What I Fixed

I updated `package.json` to include:
```json
"devDependencies": {
  "@babel/core": "^7.25.0",
  "babel-preset-expo": "~12.0.0"
}
```

The `babel-preset-expo` package was missing from devDependencies.

---

## If Still Getting Errors

### Clear Everything and Reinstall:

```bash
cd mobile-app

# Delete all caches
rmdir /s /q node_modules
rmdir /s /q .expo
rmdir /s /q node_modules\.cache
del package-lock.json
del yarn.lock

# Reinstall from scratch
npm install

# Start fresh
npx expo start --clear --tunnel
```

---

**Just run `FIX_BABEL_ERROR.bat` to fix this!** 🚀
