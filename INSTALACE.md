# Instalační návod - Frontend

Tento dokument popisuje instalaci a konfiguraci frontend aplikace pro Společenské hry online.

## Obsah

1. [Lokální instalace](#lokální-instalace)
2. [Produkční build](#produkční-build)
3. [Řešení problémů](#řešení-problémů)

## Lokální instalace

### Předpoklady

Před instalací se ujistěte, že máte nainstalováno:

- **Node.js** verze 20.x nebo vyšší
- **npm** (součástí Node.js)
- Běžící **backend API** na `http://localhost:3000`

### Instalace Node.js

**macOS:**
```bash
# Pomocí nvm (doporučeno)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # nebo ~/.zshrc
nvm install 20
nvm use 20
nvm alias default 20
```

**Windows:**
- Stáhněte instalátor z [nodejs.org](https://nodejs.org/)

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Krok 1: Instalace závislostí

```bash
cd PartyGames_FE
npm install
```

### Krok 2: Konfigurace prostředí

Vytvořte soubor `.env` (pokud neexistuje):

```bash
cp .env.example .env
```

Upravte `.env` soubor:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000

# Google OAuth - Použijte stejný Client ID jako v backendu
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

**DŮLEŽITÉ:** `VITE_GOOGLE_CLIENT_ID` musí být stejný jako `GOOGLE_CLIENT_ID` v backendu!

### Krok 3: Spuštění vývojového serveru

```bash
npm run dev
```

Aplikace bude dostupná na `http://localhost:5173`

### Ověření instalace

1. Otevřete prohlížeč a přejděte na `http://localhost:5173`
2. Měli byste vidět úvodní stránku s tlačítkem "Přihlásit se přes Google"
3. Zkontrolujte konzoli prohlížeče - neměly by být žádné chyby
4. Zkuste se přihlásit (backend musí běžet!)

## Produkční build

### Příprava

1. Vytvořte `.env.production`:

```env
VITE_API_URL=https://vase-domena.cz/api
VITE_WS_URL=https://vase-domena.cz
VITE_GOOGLE_CLIENT_ID=your-production-google-client-id
```

### Build

```bash
npm run build
```

Výsledek bude ve složce `dist/`

### Preview produkčního buildu

```bash
npm run preview
```

### Deployment na server

#### 1. Zkopírování souborů

```bash
# SCP
scp -r dist/* user@server:/var/www/gamesapp/frontend/

# Nebo rsync
rsync -avz dist/ user@server:/var/www/gamesapp/frontend/
```

#### 2. Nginx konfigurace

Frontend je již nakonfigurován v Nginx (viz backend INSTALACE.md), ale ujistěte se, že konfigurace obsahuje:

```nginx
server {
    listen 80;
    server_name vase-domena.cz;

    root /var/www/gamesapp/frontend;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3000;
        # ... další konfigurace
    }
}
```

## Vývoj

### Spuštění vývojového serveru

```bash
npm run dev
```

### Linting

```bash
npm run lint
```

### Type checking

```bash
npx tsc --noEmit
```

## Struktura projektu

```
PartyGames_FE/
├── public/              # Statické soubory
├── src/
│   ├── components/      # React komponenty
│   │   ├── common/     # Sdílené komponenty (Button, Card, Input, Loading)
│   │   ├── games/      # Herní komponenty
│   │   └── layout/     # Layout komponenty
│   ├── pages/          # Stránky
│   │   ├── Home.tsx
│   │   ├── CreateRoom.tsx
│   │   ├── Room.tsx
│   │   └── Game.tsx
│   ├── context/        # React Context (AuthContext)
│   ├── services/       # API a Socket.io služby
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript definice
│   ├── utils/          # Pomocné funkce
│   ├── App.tsx         # Hlavní App komponenta
│   ├── main.tsx        # Entry point
│   └── index.css       # Globální styly + Tailwind
├── .env                # Lokální konfigurace
├── .env.example        # Příklad konfigurace
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── INSTALACE.md
```

## Řešení problémů

### Frontend se nespustí

**Problém:** `npm run dev` selhává

**Řešení:**
```bash
# Smažte node_modules a reinstalujte
rm -rf node_modules package-lock.json
npm install

# Zkontrolujte verzi Node.js
node --version  # Mělo by být v20.x.x

# Vymažte Vite cache
rm -rf node_modules/.vite
```

### API requesty selhávají (CORS)

**Problém:** Browser konzole ukazuje CORS chyby

**Řešení:**
1. Zkontrolujte, že backend běží na `http://localhost:3000`
2. Ověřte `FRONTEND_URL` v backend `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```
3. Restartujte backend

### Google OAuth nefunguje

**Problém:** Přihlášení přes Google selhává

**Řešení:**
1. Zkontrolujte, že `VITE_GOOGLE_CLIENT_ID` je správně nastavený v `.env`
2. Ověřte v Google Cloud Console:
   - Authorized redirect URIs obsahuje: `http://localhost:3000/api/auth/google/callback`
3. Zkontrolujte backend logy

### WebSocket se nepřipojuje

**Problém:** Real-time funkce nefungují

**Řešení:**
```bash
# Zkontrolujte browser konzoli
# Mělo by být: "Socket connected"

# Ověřte VITE_WS_URL v .env
# Zkontrolujte že backend WebSocket běží
```

### Styling nefunguje (Tailwind)

**Problém:** CSS styly se nenačítají

**Řešení:**
```bash
# Ujistěte se že index.css obsahuje Tailwind direktivy
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

# Restartujte dev server
npm run dev
```

### Build selhává

**Problém:** `npm run build` hlásí chyby

**Řešení:**
```bash
# TypeScript chyby
npx tsc --noEmit

# ESLint warnings
npm run lint

# Vymažte dist a zkuste znovu
rm -rf dist
npm run build
```

## Environment Variables

### Development (.env)
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-dev-client-id
```

### Production (.env.production)
```env
VITE_API_URL=https://vase-domena.cz/api
VITE_WS_URL=https://vase-domena.cz
VITE_GOOGLE_CLIENT_ID=your-prod-client-id
```

## Dostupné scripty

```bash
# Spustit vývojový server
npm run dev

# Build pro produkci
npm run build

# Preview produkčního buildu
npm run preview

# Linting
npm run lint
```

## Aktualizace aplikace

```bash
# Pull nové změny
git pull origin main

# Nainstalujte nové závislosti (pokud byly přidány)
npm install

# Restartujte dev server
npm run dev
```

## Podpora

Pro další pomoc kontaktujte:
- GitHub Issues: `<URL_REPOSITORY>`
- Email: `your-email@example.com`

## Changelog

### Verze 1.0 (Prosinec 2024)
-初ní release
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS
- Google OAuth přihlášení
- Real-time WebSocket komunikace
- Podpora pro Alias, Activity, Charades
