# Compiling Instructions

To compile and run the LosPapus Lover Launcher for development:

## Prerequisites
- Node.js (v16+ recommended)
- npm

## Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/MilleniumMods/Custom-Launcher.git
   cd Custom-Launcher
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Compile SCSS**:
   Styles are written in SCSS and need to be compiled to CSS.
   ```bash
   npx sass src/scss/main.scss src/css/main.css
   ```
4. **Run the application**:
   ```bash
   npm start
   ```
   Or use the dev script to compile and run:
   ```bash
   npm run dev:start
   ```

## Building for Production
(Instructions to be added once a builder like `electron-builder` is configured).
