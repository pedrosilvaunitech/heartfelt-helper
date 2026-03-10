import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Import function handlers
import { default as printerInfoHandler } from "../printer-info/index.ts";
import { default as printerProxyHandler } from "../printer-proxy/index.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const functionName = pathParts[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check / root
  if (!functionName) {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'PrintGuard Edge Functions', functions: ['printer-info', 'printer-proxy'] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: `Function '${functionName}' not found` }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
