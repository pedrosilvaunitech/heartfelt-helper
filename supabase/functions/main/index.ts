import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((_req: Request) => {
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      service: 'PrintGuard Edge Functions',
      available: ['printer-info', 'printer-proxy'],
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      } 
    }
  );
});
