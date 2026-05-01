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
