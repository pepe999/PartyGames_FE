# Frontend - Společenské hry online

## Přehled

Moderní responzivní webová aplikace pro společenské hry s podporou real-time multiplayer her.

## Technologie

- **Framework**: React 18+ (TypeScript)
- **Build tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State management**: Zustand
- **Real-time**: Socket.io-client
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validace
- **HTTP client**: Axios
- **Icons**: Lucide React

## Struktura projektu

```
frontend/
├── public/              # Statické soubory
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── assets/         # Obrázky, fonty
│   ├── components/     # React komponenty
│   │   ├── ui/        # shadcn/ui komponenty
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/    # Layout komponenty
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── game/      # Herní komponenty
│   │   │   ├── GameCard.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   └── ScoreBoard.tsx
│   │   ├── room/      # Lobby komponenty
│   │   │   ├── RoomCode.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   └── TeamSelector.tsx
│   │   └── shared/    # Sdílené komponenty
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/         # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useGame.ts
│   │   └── useRoom.ts
│   ├── lib/           # Utility knihovny
│   │   ├── api.ts    # Axios instance
│   │   ├── socket.ts # Socket.io setup
│   │   └── utils.ts  # Helper funkce
│   ├── pages/         # Stránky (routes)
│   │   ├── Home.tsx
│   │   ├── GameDetail.tsx
│   │   ├── Lobby.tsx
│   │   ├── Game.tsx
│   │   ├── Results.tsx
│   │   ├── Profile.tsx
│   │   └── CreateContent.tsx
│   ├── store/         # Zustand store
│   │   ├── authStore.ts
│   │   ├── gameStore.ts
│   │   └── roomStore.ts
│   ├── types/         # TypeScript typy
│   │   └── index.ts
│   ├── validators/    # Zod schemas
│   │   └── schemas.ts
│   ├── App.tsx        # Hlavní App komponenta
│   ├── main.tsx       # Entry point
│   ├── index.css      # Globální styly
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── readme.md
```

## Instalace

### Předpoklady
- Node.js 20+
- npm nebo yarn

### Kroky

1. **Instalace závislostí**
```bash
cd frontend
npm install
```

2. **Konfigurace prostředí**
```bash
cp .env.example .env
```

Editujte `.env`:
```env
# API
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Environment
VITE_APP_ENV=development
```

3. **Spuštění vývojového serveru**
```bash
npm run dev
```

Aplikace poběží na `http://localhost:5173`

## Skripty

```bash
# Vývoj s hot-reload
npm run dev

# Build pro produkci
npm run build

# Preview produkční build
npm run preview

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Testy
npm test
npm run test:watch
npm run test:coverage
```

## Komponenty

### Layout komponenty

#### Header
```tsx
<Header>
  - Logo
  - Navigation
  - User menu / Login button
</Header>
```

#### Footer
```tsx
<Footer>
  - Links (Pravidla, FAQ, Kontakt)
  - Copyright
</Footer>
```

### Game komponenty

#### GameCard
Karta hry v gridu
```tsx
<GameCard
  game={game}
  onPlay={() => navigate(`/hry/${game.slug}`)}
/>
```

#### GameBoard
Herní plocha s otázkou a odpověďmi
```tsx
<GameBoard
  question={currentQuestion}
  onAnswer={handleAnswer}
  timeLeft={timeLeft}
/>
```

#### ScoreBoard
Zobrazení skóre týmů
```tsx
<ScoreBoard
  teamA={teamAScore}
  teamB={teamBScore}
  round={currentRound}
/>
```

### Room komponenty

#### RoomCode
Zobrazení room code a QR kódu
```tsx
<RoomCode code="ABCD-1234" />
```

#### PlayerList
Seznam hráčů v týmu
```tsx
<PlayerList
  players={players}
  team="A"
  onKick={handleKick}
/>
```

## Pages (Stránky)

### Home (/)
- Hero section
- Filtry her
- Grid GameCard komponent
- Vyhledávání

### GameDetail (/hry/:slug)
- Detail hry
- Pravidla
- Tlačítko "Vytvořit místnost"

### Lobby (/mistnost/:roomCode)
- Room code + QR
- Nastavení hry (host)
- Týmy s hráči
- Tlačítko "Začít hru"

### Game (/hra/:roomCode)
- Herní plocha (závisí na typu hry)
- Skóre
- Časovač
- Otázky/úkoly

### Results (/vysledky/:roomCode)
- Finální skóre
- Statistiky
- CTA tlačítka (Hrát znovu, Nová hra)

### Profile (/profil)
- Uživatelské info
- Statistiky
- Historie her
- Oblíbené hry
- Můj obsah

### CreateContent (/vytvorit-obsah)
- Výběr typu obsahu
- Formulář
- Preview

## State Management (Zustand)

### Auth Store
```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}
```

### Game Store
```typescript
interface GameStore {
  games: Game[];
  currentGame: Game | null;
  filters: GameFilters;
  fetchGames: () => Promise<void>;
  setFilters: (filters: GameFilters) => void;
}
```

### Room Store
```typescript
interface RoomStore {
  room: GameRoom | null;
  players: RoomPlayer[];
  currentPlayer: RoomPlayer | null;
  gameState: GameState | null;
  joinRoom: (code: string, name: string) => Promise<void>;
  leaveRoom: () => void;
}
```

## Custom Hooks

### useAuth
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### useSocket
```typescript
const { socket, connected, emit, on, off } = useSocket();

// Použití
useEffect(() => {
  on('room-updated', handleRoomUpdate);
  return () => off('room-updated', handleRoomUpdate);
}, []);
```

### useGame
```typescript
const {
  currentQuestion,
  timeLeft,
  scores,
  submitAnswer,
  nextQuestion
} = useGame(roomCode);
```

### useRoom
```typescript
const {
  room,
  players,
  joinRoom,
  changeTeam,
  startGame
} = useRoom(roomCode);
```

## API Integrace

### API Client setup
```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// JWT token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Použití
```typescript
// services/gameService.ts
import api from '@/lib/api';

export const fetchGames = async (filters?: GameFilters) => {
  const { data } = await api.get('/api/games', { params: filters });
  return data;
};

export const createRoom = async (gameId: string, settings: object) => {
  const { data } = await api.post('/api/rooms', { gameId, settings });
  return data;
};
```

## WebSocket Integrace

### Socket setup
```typescript
// lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL, {
  auth: {
    token: localStorage.getItem('token'),
  },
  autoConnect: false,
});

export default socket;
```

### Použití v komponentě
```typescript
import socket from '@/lib/socket';

useEffect(() => {
  socket.connect();

  socket.emit('join-room', {
    roomCode,
    playerName,
    team: 'A'
  });

  socket.on('room-updated', (data) => {
    setRoom(data.room);
    setPlayers(data.players);
  });

  return () => {
    socket.disconnect();
  };
}, []);
```

## Routing

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hry/:slug" element={<GameDetail />} />
        <Route path="/mistnost/:roomCode" element={<Lobby />} />
        <Route path="/hra/:roomCode" element={<Game />} />
        <Route path="/vysledky/:roomCode" element={<Results />} />
        <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/vytvorit-obsah" element={<ProtectedRoute><CreateContent /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Styling

### Tailwind CSS
Utility-first CSS framework

```tsx
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Začít hrát
</button>
```

### shadcn/ui
Předpřipravené komponenty

```bash
# Přidání komponenty
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

### Custom theme
```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        teamA: '#3B82F6',
        teamB: '#EF4444',
      },
    },
  },
};
```

## Google OAuth

### Setup
```tsx
// components/GoogleLogin.tsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function GoogleLoginButton() {
  const { login } = useAuth();

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={(response) => login(response.credential)}
        onError={() => console.error('Login failed')}
      />
    </GoogleOAuthProvider>
  );
}
```

## Form Handling

### React Hook Form + Zod
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const questionSchema = z.object({
  question: z.string().min(10, 'Otázka musí mít alespoň 10 znaků'),
  answers: z.array(z.string()).length(4),
  correctAnswer: z.number().min(0).max(3),
  explanation: z.string().optional(),
});

function CreateQuestionForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(questionSchema),
  });

  const onSubmit = async (data) => {
    await createQuestion(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('question')} />
      {errors.question && <span>{errors.question.message}</span>}
      {/* ... */}
    </form>
  );
}
```

## Responsive Design

### Breakpoints (Tailwind)
```
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
```

### Použití
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 sloupec, Tablet: 2 sloupce, Desktop: 3 sloupce */}
</div>
```

## Optimalizace

### Code Splitting
```tsx
import { lazy, Suspense } from 'react';

const Profile = lazy(() => import('./pages/Profile'));

<Suspense fallback={<Loading />}>
  <Profile />
</Suspense>
```

### Image Optimization
- Používejte WebP formát
- Lazy loading: `loading="lazy"`
- Responsive images

### Performance
- React.memo pro drahé komponenty
- useMemo pro výpočty
- useCallback pro callback funkce
- Virtual scrolling pro dlouhé seznamy

## Testing

### Vitest + React Testing Library
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameCard from './GameCard';

describe('GameCard', () => {
  it('renders game name', () => {
    const game = { name: 'Máme rádi Česko', /* ... */ };
    render(<GameCard game={game} />);
    expect(screen.getByText('Máme rádi Česko')).toBeInTheDocument();
  });
});
```

## Build & Deployment

### Production Build
```bash
npm run build
```

Output v `dist/` složce

### Preview
```bash
npm run preview
```

### Deploy na server
```bash
# Build
npm run build

# Kopírování na server
scp -r dist/* user@server:/var/www/games-app/frontend/dist/

# Nebo s rsync
rsync -avz dist/ user@server:/var/www/games-app/frontend/dist/
```

### Nginx konfigurace
```nginx
server {
    listen 80;
    server_name vasedomena.cz;

    root /var/www/games-app/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Environment Variables

### Development (.env.development)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-dev-client-id
```

### Production (.env.production)
```env
VITE_API_URL=https://api.vasedomena.cz
VITE_WS_URL=https://api.vasedomena.cz
VITE_GOOGLE_CLIENT_ID=your-prod-client-id
```

## Accessibility

### Best Practices
- Sémantické HTML elementy
- ARIA labels kde potřeba
- Keyboard navigation
- Focus management
- Alt text pro obrázky
- Dostatečný kontrast barev (WCAG AA)

```tsx
<button
  aria-label="Začít hru"
  onClick={startGame}
  className="focus:ring-2 focus:ring-blue-500"
>
  Start
</button>
```

## Error Handling

### Error Boundary
```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Něco se pokazilo</div>;
    }
    return this.props.children;
  }
}
```

### Toast notifikace
```bash
npm install sonner
```

```tsx
import { toast } from 'sonner';

toast.success('Hra byla vytvořena!');
toast.error('Nepodařilo se připojit do místnosti');
```

## Troubleshooting

### Build chyby
- Zkontrolujte TypeScript errors: `npm run type-check`
- Vymažte cache: `rm -rf node_modules/.vite`

### Socket se nepřipojuje
- Zkontrolujte VITE_WS_URL
- Ověřte CORS na backendu
- Zkontrolujte JWT token

### Styling nefunguje
- Zkontrolujte Tailwind config
- Ujistěte se, že je importován index.css

## Další kroky

Po nastavení frontendu:
1. Připojte k běžícímu backendu
2. Nastavte Google OAuth credentials
3. Implementujte jednotlivé hry
4. Otestujte responzivitu
5. Build a deploy

## Kontakt

Pro otázky ohledně frontendu kontaktujte tech lead projektu.
