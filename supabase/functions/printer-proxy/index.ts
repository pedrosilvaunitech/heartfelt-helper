import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, method = 'GET', selector } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the printer's web page
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'PrintGuard/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      let html = await response.text();
      
      // Rewrite relative URLs to absolute
      const baseUrl = new URL(url);
      const base = `${baseUrl.protocol}//${baseUrl.host}`;
      
      // Fix relative src and href attributes
      html = html.replace(/(src|href)=["'](?!https?:\/\/|data:|#|javascript:)([^"']*?)["']/gi, (match, attr, path) => {
        if (path.startsWith('/')) {
          return `${attr}="${base}${path}"`;
        }
        const dir = url.substring(0, url.lastIndexOf('/') + 1);
        return `${attr}="${dir}${path}"`;
      });

      return new Response(
        JSON.stringify({ html, contentType: 'text/html', url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // For non-HTML content, return as base64
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      return new Response(
        JSON.stringify({ data: base64, contentType, url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Failed to fetch printer page: ${message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
