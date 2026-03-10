import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const functionHandlers: Record<string, (req: Request) => Promise<Response>> = {};

// Dynamically import function handlers
async function loadHandler(name: string): Promise<(req: Request) => Promise<Response>> {
  if (!functionHandlers[name]) {
    try {
      const mod = await import(`../${name}/index.ts`);
      // The function modules use serve() which registers a handler.
      // We need a different approach for the main router.
    } catch {
      // ignore
    }
  }
  return functionHandlers[name];
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // The path will be like /printer-info or /printer-proxy
  const functionName = pathParts[0];

  if (!functionName) {
    return new Response(JSON.stringify({ error: 'Function name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward to the appropriate function by making a local request
  // The edge runtime handles routing when using --main-service
  // We just need to proxy to the correct function path
  const functionUrl = `http://localhost:9000/${functionName}`;
  
  try {
    const response = await fetch(functionUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });
    
    return new Response(await response.text(), {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Function '${functionName}' not available: ${error.message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
