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
* [Supabase Setup](#supabase-setup)
* [CloudFlare Setup](#cloudflare-setup)
* [Resend Setup](#resend-setup)

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
npm install postcss postcss-preset-mantine postcss-simple-vars --save-dev
npm install @tabler/icons-react
```

6. Scaffold the back-end
```
cd ..
npm create cloudflare@latest -- worker
cd worker
```

7. Install back-end packages
```
npm install resend
npm install @supabase/supabase-js
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
> Wire Mantine into app
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

3. Replace `frontend/src/App.tsx` (TBD)
> Temporary page for smoke test
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
```

7. Add below to `frontend/src/main.tsx` before `createRoot()`
> Register the service worker
```
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

8. Create `frontend/src/lib/api.ts`
> Create Worker API client
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
1. Create `worker/.dev.vars` (TBD)
> Create Worker env file
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RESEND_API_KEY=your_resend_api_key_here
```

2. Create `worker/src/types/env.d.ts`
> Define the Worker environment types
```
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
}
```

3. Create `worker/src/lib/supabase.ts`
> Create the Supabase client for the Worker
```
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
```

4. Replace `worker/src/index.ts`
> Setup a basic Worker router
```
import { createSupabaseClient } from './lib/supabase';

export default {
  // Handles HTTP requests from the frontend
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = createSupabaseClient(env);

    // CORS headers — needed so the frontend can call the Worker
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },

  // Handles scheduled cron jobs (pay report emails)
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const supabase = createSupabaseClient(env);
    console.log('Cron triggered:', event.cron);
    // Pay report logic will go here later
  },
};
```

5. Add below to `worker/wrangler.jsonc` below `$schema` (TBD)
> Temporary scheduler
```
"triggers": {
    "crons": [
        "0 9 * * 5"  // Every Friday at 9am UTC — pay report day
    ]
},
```

## Supabase Setup

### SECRET KEY
1. Go to supabase.com -> "New Project"
2. Fill in the details (no need to check anything)
3. Go to "Setting" -> "API Keys"
4. Copy the "Secret" key that starts with `sb_secret_...`
5. Paste the secret key into `worker/.dev.vars` for `SUPABASE_SERVICE_ROLE_KEY`

### PUBLIC URL
1. Click on "Connect" at the top of the page
2. Copy the "Project URL" that ends with `...supabase.co`
7. Paste the URL into `worker/.dev.vars` for `SUPABASE_URL`

## Resend Setup
1. Go to resend.com -> "API Keys"
2. "Create API Key" and name it `timekeeper-dev`
3. Set permission to "Sending access" (since it's dev)
4. Click "Add" and copy the key
5. Paste the key into `worker/.dev.vars` for `RESEND_API_KEY`

## CloudFlare Setup

### Pages (front-end)
1. Go to dash.cloudflare.com and click "Workers & Pages"
2. Click "Create" -> "Connect to Git"
3. Select your Github repo and begin setup:
- Root directory: frontend
- Build command: npm run build
- Build output directory: dist
4. Click "Save and Deploy"

### Worker (back-end)
> Wrangler deploys directly by reading `worker/wrangler.jsonc`
1. Deploy Worker via terminal
```
cd worker
npm wrangler deploy
```
2. When done, copy the Worker URL that ends with `...workers.dev`
3. Copy the URL and create environment variable for Pages project
- VITE_WORKER_URL: your_worker_url
4. Add environment variables to Worker via terminal
```
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put RESEND_API_KEY
```
5. Redeploy Pages

## Database Design
