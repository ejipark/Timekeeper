# Timekeeper

## Tech-Stack
* Frontend: Vite v8 + React v19 + Mantine v8
* Hosting: Cloudflare Pages
* Backend: Cloudflare Workers
* Database: Supabase (PostgreSQL)

## Table of Contents
* [Installation](#installation)
* [Frontend Setup](#frontend-setup)
* [Backend Setup](#backend-setup)
* [CloudFlare Page Setup](#cloudflare-page-setup)
* [CloudFlare Worker Setup](#cloudflare-worker-setup)
* [Database Setup](#database-setup)

## Installation

1. Initialize root workspace
```
npm init -y
```

2. Replace `package.json`
```
{
  "name": "timekeeper",
  "private": true,
  "workspaces": [
    "frontend",
    "worker"
  ]
}
```

3. Initialize git
> Really needed?
```
git init
echo "node_modules" >> .gitignore
echo ".env.local" >> .gitignore
echo "dist" >> .gitignore
```

4. Scaffold the front-end
```
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

5. Install front-end packages
```
npm install @mantine/core@8 @mantine/hooks@8 @mantine/dates@8 @mantine/notifications@8
npm install --save-dev postcss postcss-preset-mantine postcss-simple-vars
npm install @tabler/icons-react
```

## Frontend Setup

1. Create `frontend/postcss.config.cjs`
```
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

2. Replace `frontend/src/main.tsx`
```
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>
);
```

3. Replace `frontend/src/App.tsx`
```
import { Button, Stack, Text } from '@mantine/core';

export default function App() {
  return (
    <Stack align="center" mt="xl">
      <Text size="xl" fw={700}>Timekeeper ⏱</Text>
      <Button>Clock In</Button>
    </Stack>
  );
}
```

4. Create `frontend/public/manifest.webmanifest`
{
  "name": "Timekeeper",
  "short_name": "Timekeeper",
  "description": "Employee clock-in and shift management",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#228be6",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}

5. Create `frontend/public/sw.js`
> Minimal service worker
```
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
```

6. Add below to `frontend/index.html` inside `<head>`
> Link manifest
```
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#228be6" />

// Add below to frontend/src/main.tsx before <createRoot>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

7. Create `frontend/src/lib/api.ts`
```
const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

```

8. Create `frontend/src/lib/api.ts`
```
const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

```

9. Create `frontend/.env.local`
```
VITE_WORKER_URL=http://localhost:8787
```

## Backend Setup

