import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Common printer web pages that contain device info
const INFO_PATHS = [
  // HP
  '/hp/device/InternalPages/Index?id=DeviceStatus',
  '/hp/device/info_device_status.html',
  '/SSI/device_information.htm',
  // Brother
  '/general/information.html',
  '/general/status.html',
  // Ricoh / Konica Minolta
  '/web/guest/en/websys/webArch/getStatus.cgi',
  '/ws/eSCL/ScannerStatus',
  // Samsung / Xerox
  '/sws/app/information/home/home.jsp',
  // Canon
  '/tgi/information.cgi',
  // Generic / Common
  '/DevMgmt/ProductConfigDyn.xml',
  '/DevMgmt/DiscoveryTree.xml',
  '/ipp/print',
  '/',
];

// Regex patterns to extract printer information from HTML/XML
const PATTERNS = {
  serial: [
    /serial\s*(?:number|no\.?|#)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([A-Z0-9]{6,20})/i,
    /serialNumber[">:\s]+([A-Z0-9]{6,20})/i,
    /<dd[^>]*>([A-Z0-9]{6,20})<\/dd>/i,
    /Serial\s*Number\s*<\/dt>\s*<dd[^>]*>\s*([A-Z0-9]{6,20})/i,
    /prt:SerialNumber>([^<]+)</i,
    /SerialNumber>([^<]+)</i,
    /"serialNumber"\s*:\s*"([^"]+)"/i,
  ],
  model: [
    /(?:model|product)\s*(?:name|number)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([A-Za-z0-9\s\-_.]+)/i,
    /modelName[">:\s]+([^<"]+)/i,
    /prt:ModelName>([^<]+)</i,
    /ProductName>([^<]+)</i,
    /"modelName"\s*:\s*"([^"]+)"/i,
    /<title>([^<]*(?:LaserJet|DeskJet|OfficeJet|HL-|MFC-|DCP-|WF-|ET-|EcoTank|PIXMA|imageRUNNER|WorkCentre|Phaser|VersaLink|AltaLink|Aficio|bizhub|TASKalfa|MX-|AR-|C[0-9]{3,4}|B[0-9]{3,4})[^<]*)<\/title>/i,
  ],
  hostname: [
    /hostname\s*[:=<>]\s*(?:<[^>]*>)?\s*([A-Za-z0-9\-_.]+)/i,
    /deviceName[">:\s]+([^<"]+)/i,
    /HostName>([^<]+)</i,
    /"hostName"\s*:\s*"([^"]+)"/i,
  ],
  firmware: [
    /firmware\s*(?:version|rev\.?)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([A-Za-z0-9\.\-_]+)/i,
    /firmwareVersion[">:\s]+([^<"]+)/i,
    /FirmwareVersion>([^<]+)</i,
    /"firmwareVersion"\s*:\s*"([^"]+)"/i,
    /fw[\s_-]*ver(?:sion)?\s*[:=]\s*([A-Za-z0-9\.\-_]+)/i,
  ],
  mac: [
    /(?:mac|ethernet|hardware)\s*(?:address)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2})/i,
    /MACAddress>([^<]+)</i,
    /"macAddress"\s*:\s*"([^"]+)"/i,
  ],
  pageCount: [
    /(?:page|total)\s*(?:count|printed|impressions?)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9,]+)/i,
    /prtMarkerLifeCount[">:\s]+([0-9,]+)/i,
    /TotalImpressions>([^<]+)</i,
    /"pageCount"\s*:\s*"?([0-9,]+)"?/i,
  ],
  brand: [
    /(?:manufacturer|vendor|make)\s*[:=<>]\s*(?:<[^>]*>)?\s*(HP|Hewlett.Packard|Brother|Epson|Canon|Samsung|Xerox|Ricoh|Lexmark|Kyocera|Sharp|Konica.Minolta|Pantum|OKI|Toshiba)/i,
    /<title>[^<]*(HP|Hewlett.Packard|Brother|Epson|Canon|Samsung|Xerox|Ricoh|Lexmark|Kyocera|Sharp|Konica.Minolta|Pantum|OKI|Toshiba)[^<]*<\/title>/i,
  ],
  tonerBlack: [
    /(?:black|preto|bk)\s*(?:toner|cartridge)?\s*(?:level)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9]+)\s*%/i,
  ],
  tonerCyan: [
    /(?:cyan|ciano)\s*(?:toner|cartridge)?\s*(?:level)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9]+)\s*%/i,
  ],
  tonerMagenta: [
    /(?:magenta)\s*(?:toner|cartridge)?\s*(?:level)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9]+)\s*%/i,
  ],
  tonerYellow: [
    /(?:yellow|amarelo)\s*(?:toner|cartridge)?\s*(?:level)?\s*[:=<>]\s*(?:<[^>]*>)?\s*([0-9]+)\s*%/i,
  ],
};

function extractField(html: string, patterns: RegExp[]): string | null {
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ip, protocol = 'http' } = await req.json();

    if (!ip) {
      return new Response(
        JSON.stringify({ error: 'IP is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `${protocol}://${ip}`;
    const allHtml: string[] = [];
    const fetchedPages: string[] = [];

    // Try fetching multiple pages to gather as much info as possible
    for (const path of INFO_PATHS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${baseUrl}${path}`, {
          headers: {
            'User-Agent': 'PrintGuard/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const text = await response.text();
          if (text.length > 50) {
            allHtml.push(text);
            fetchedPages.push(path);
          }
        }
      } catch {
        // Skip unreachable pages
      }

      // Stop after getting enough data (3 successful pages)
      if (fetchedPages.length >= 3) break;
    }

    if (allHtml.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível acessar a impressora. Verifique o IP e se ela está ligada.',
          ip,
          pagesChecked: INFO_PATHS.length,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const combinedHtml = allHtml.join('\n');

    // Extract all fields
    const info: Record<string, string | number | null> = {
      serial: extractField(combinedHtml, PATTERNS.serial),
      model: extractField(combinedHtml, PATTERNS.model),
      hostname: extractField(combinedHtml, PATTERNS.hostname),
      firmware: extractField(combinedHtml, PATTERNS.firmware),
      mac: extractField(combinedHtml, PATTERNS.mac),
      brand: extractField(combinedHtml, PATTERNS.brand),
      pageCount: null,
      tonerBlack: null,
      tonerCyan: null,
      tonerMagenta: null,
      tonerYellow: null,
    };

    // Parse numeric fields
    const pageCountStr = extractField(combinedHtml, PATTERNS.pageCount);
    if (pageCountStr) info.pageCount = parseInt(pageCountStr.replace(/,/g, ''), 10);

    const tonerBlackStr = extractField(combinedHtml, PATTERNS.tonerBlack);
    if (tonerBlackStr) info.tonerBlack = parseInt(tonerBlackStr, 10);

    const tonerCyanStr = extractField(combinedHtml, PATTERNS.tonerCyan);
    if (tonerCyanStr) info.tonerCyan = parseInt(tonerCyanStr, 10);

    const tonerMagentaStr = extractField(combinedHtml, PATTERNS.tonerMagenta);
    if (tonerMagentaStr) info.tonerMagenta = parseInt(tonerMagentaStr, 10);

    const tonerYellowStr = extractField(combinedHtml, PATTERNS.tonerYellow);
    if (tonerYellowStr) info.tonerYellow = parseInt(tonerYellowStr, 10);

    // Normalize brand
    if (info.brand) {
      const brandMap: Record<string, string> = {
        'hewlett': 'HP', 'hewlett-packard': 'HP', 'hp': 'HP',
        'brother': 'Brother', 'epson': 'Epson', 'canon': 'Canon',
        'samsung': 'Samsung', 'xerox': 'Xerox', 'ricoh': 'Ricoh',
        'lexmark': 'Lexmark', 'kyocera': 'Kyocera', 'sharp': 'Sharp',
        'konica': 'Konica Minolta', 'pantum': 'Pantum', 'oki': 'OKI',
        'toshiba': 'Toshiba',
      };
      const lower = (info.brand as string).toLowerCase();
      for (const [key, value] of Object.entries(brandMap)) {
        if (lower.includes(key)) {
          info.brand = value;
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ip,
        protocol,
        pagesFound: fetchedPages.length,
        pagesChecked: INFO_PATHS.length,
        fetchedPages,
        info,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Falha ao consultar impressora: ${message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
