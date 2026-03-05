import { Printer, Alert, HistoryEntry, SectorStats, Supply } from '@/types/printer';

const sectors = ['Financeiro', 'RH', 'Produção', 'TI', 'Recepção', 'Diretoria', 'Comercial', 'Logística'];
const brands = ['HP', 'Brother', 'Epson', 'Canon', 'Samsung', 'Xerox', 'Ricoh', 'Lexmark', 'Kyocera', 'Sharp', 'Konica Minolta', 'Pantum', 'Zebra', 'Elgin'];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSupplies(brand: string) {
  const isColor = Math.random() > 0.4;
  const supplies: Supply[] = [
    { name: 'Toner Black', level: rand(3, 100), maxCapacity: 100, type: 'toner', color: '#1a1a1a' },
  ];
  if (isColor) {
    supplies.push(
      { name: 'Toner Cyan', level: rand(5, 100), maxCapacity: 100, type: 'toner', color: '#00bcd4' },
      { name: 'Toner Magenta', level: rand(5, 100), maxCapacity: 100, type: 'toner', color: '#e91e63' },
      { name: 'Toner Yellow', level: rand(5, 100), maxCapacity: 100, type: 'toner', color: '#ffc107' },
    );
  }
  supplies.push(
    { name: 'Bandeja 1', level: rand(0, 100), maxCapacity: 100, type: 'paper' },
    { name: 'Bandeja 2', level: rand(10, 100), maxCapacity: 100, type: 'paper' },
    { name: 'Fusor', level: rand(20, 100), maxCapacity: 100, type: 'fuser' },
    { name: 'Roletes', level: rand(30, 100), maxCapacity: 100, type: 'roller' },
    { name: 'Cilindro', level: rand(15, 100), maxCapacity: 100, type: 'drum' },
  );
  return supplies;
}

const models: Record<string, string[]> = {
  HP: ['LaserJet M404', 'LaserJet Pro M428', 'Color LaserJet M454', 'LaserJet Enterprise M507'],
  Brother: ['HL-L8360', 'MFC-L8900', 'HL-L2350', 'DCP-L2550'],
  Epson: ['L4260', 'L6270', 'EcoTank L3250', 'WorkForce Pro WF-C5790'],
  Canon: ['imageCLASS MF445dw', 'imageCLASS LBP226dw', 'MAXIFY GX7010'],
  Samsung: ['ProXpress M4080FX', 'Xpress M2070W'],
  Xerox: ['VersaLink C405', 'Phaser 6510', 'WorkCentre 6515'],
  Ricoh: ['SP C261SFNw', 'IM C300', 'SP 330DN'],
  Lexmark: ['MS431dn', 'CX431adw', 'MB2236adwe'],
  Kyocera: ['ECOSYS P5026cdn', 'ECOSYS M5526cdn', 'TASKalfa 2553ci'],
  Sharp: ['MX-C304W', 'BP-30C25', 'MX-3071'],
  'Konica Minolta': ['bizhub C258', 'bizhub 4050i'],
  Pantum: ['P3300DW', 'M7102DW'],
  Zebra: ['ZT411', 'ZD621'],
  Elgin: ['L42 Pro', 'Bematech LB-1000'],
};

export const printers: Printer[] = Array.from({ length: 84 }, (_, i) => {
  const brand = brands[i % brands.length];
  const modelList = models[brand] || ['Generic Model'];
  const model = modelList[i % modelList.length];
  const sector = sectors[i % sectors.length];
  const isOffline = i % 17 === 0;
  const subnet = i < 42 ? '192.168.1' : '192.168.2';
  const ip = `${subnet}.${10 + i}`;

  return {
    id: `printer-${i + 1}`,
    ip,
    hostname: `${brand.toLowerCase().replace(/\s/g, '')}-${model.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
    brand,
    model,
    serial: `SN${String(rand(100000, 999999))}${String.fromCharCode(65 + (i % 26))}`,
    firmware: `${rand(1, 5)}.${rand(0, 9)}.${rand(0, 99)}`,
    mac: Array.from({ length: 6 }, () => rand(0, 255).toString(16).padStart(2, '0')).join(':').toUpperCase(),
    location: `${sector} - Andar ${rand(1, 5)}, Sala ${rand(100, 500)}`,
    sector,
    status: isOffline ? 'offline' : (i % 7 === 0 ? 'warning' : 'online'),
    uptime: `${rand(1, 365)}d ${rand(0, 23)}h ${rand(0, 59)}m`,
    pageCount: rand(1000, 500000),
    pagesPerDay: rand(10, 800),
    supplies: generateSupplies(brand),
    lastSeen: isOffline ? new Date(Date.now() - rand(300000, 3600000)).toISOString() : new Date().toISOString(),
    discoveredAt: new Date(Date.now() - rand(86400000 * 30, 86400000 * 365)).toISOString(),
  };
});

export const alerts: Alert[] = [];
printers.forEach(p => {
  p.supplies.forEach(s => {
    if (s.type === 'toner' && s.level < 10) {
      alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'toner_critical', severity: 'critical', message: `${s.name} em ${s.level}%`, timestamp: new Date(Date.now() - rand(0, 3600000)).toISOString(), acknowledged: false });
    } else if (s.type === 'toner' && s.level < 20) {
      alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'toner_low', severity: 'warning', message: `${s.name} em ${s.level}%`, timestamp: new Date(Date.now() - rand(0, 7200000)).toISOString(), acknowledged: false });
    }
    if (s.type === 'paper' && s.level < 15) {
      alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'paper_low', severity: 'warning', message: `${s.name} em ${s.level}%`, timestamp: new Date(Date.now() - rand(0, 7200000)).toISOString(), acknowledged: false });
    }
    if (s.type === 'drum' && s.level < 10) {
      alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'drum_end', severity: 'critical', message: `Cilindro em ${s.level}%`, timestamp: new Date(Date.now() - rand(0, 7200000)).toISOString(), acknowledged: false });
    }
    if (s.type === 'fuser' && s.level < 10) {
      alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'fuser_worn', severity: 'warning', message: `Fusor em ${s.level}%`, timestamp: new Date(Date.now() - rand(0, 7200000)).toISOString(), acknowledged: false });
    }
  });
  if (p.status === 'offline') {
    alerts.push({ id: `alert-${alerts.length}`, printerId: p.id, printerName: `${p.brand} ${p.model}`, printerIp: p.ip, printerLocation: p.location, type: 'offline', severity: 'critical', message: 'Impressora offline', timestamp: p.lastSeen, acknowledged: false });
  }
});

export const history: HistoryEntry[] = [
  { id: 'h1', printerId: 'printer-1', printerName: 'HP LaserJet M404', event: 'Troca de toner', details: 'Toner Black substituído', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'h2', printerId: 'printer-3', printerName: 'Epson L4260', event: 'Manutenção', details: 'Limpeza do fusor realizada', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'h3', printerId: 'printer-5', printerName: 'Samsung ProXpress M4080FX', event: 'Erro', details: 'Atolamento de papel resolvido', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: 'h4', printerId: 'printer-2', printerName: 'Brother HL-L8360', event: 'Offline', details: 'Impressora ficou offline por 15 minutos', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'h5', printerId: 'printer-7', printerName: 'Lexmark MS431dn', event: 'Troca de toner', details: 'Toner substituído preventivamente', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
];

export const sectorStats: SectorStats[] = sectors.map(s => {
  const sectorPrinters = printers.filter(p => p.sector === s);
  return {
    name: s,
    printerCount: sectorPrinters.length,
    online: sectorPrinters.filter(p => p.status === 'online').length,
    alerts: alerts.filter(a => sectorPrinters.some(p => p.id === a.printerId)).length,
    totalPages: sectorPrinters.reduce((sum, p) => sum + p.pageCount, 0),
  };
});

export const monthlyConsumption = [
  { month: 'Set', pages: 42300 },
  { month: 'Out', pages: 45100 },
  { month: 'Nov', pages: 38700 },
  { month: 'Dez', pages: 31200 },
  { month: 'Jan', pages: 47800 },
  { month: 'Fev', pages: 51200 },
  { month: 'Mar', pages: 49300 },
];

export const costEstimate = [
  { month: 'Set', cost: 2840 },
  { month: 'Out', cost: 3020 },
  { month: 'Nov', cost: 2610 },
  { month: 'Dez', cost: 2100 },
  { month: 'Jan', cost: 3210 },
  { month: 'Fev', cost: 3440 },
  { month: 'Mar', cost: 3310 },
];
