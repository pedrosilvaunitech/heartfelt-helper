export type PrinterStatus = 'online' | 'offline' | 'warning' | 'error';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'toner_low' | 'toner_critical' | 'paper_low' | 'fuser_worn' | 'roller_worn' | 'drum_end' | 'offline' | 'jam' | 'maintenance';
export type UserRole = 'admin' | 'technician' | 'viewer';

export interface Supply {
  name: string;
  level: number;
  maxCapacity: number;
  type: 'toner' | 'paper' | 'fuser' | 'roller' | 'drum';
  color?: string;
}

export interface Printer {
  id: string;
  ip: string;
  hostname: string;
  brand: string;
  model: string;
  serial: string;
  firmware: string;
  mac: string;
  location: string;
  sector: string;
  status: PrinterStatus;
  uptime: string;
  pageCount: number;
  pagesPerDay: number;
  supplies: Supply[];
  lastSeen: string;
  discoveredAt: string;
}

export interface Alert {
  id: string;
  printerId: string;
  printerName: string;
  printerIp: string;
  printerLocation: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface MaintenancePrediction {
  printerId: string;
  supply: string;
  daysRemaining: number;
  estimatedDate: string;
}

export interface HistoryEntry {
  id: string;
  printerId: string;
  printerName: string;
  event: string;
  details: string;
  timestamp: string;
}

export interface SectorStats {
  name: string;
  printerCount: number;
  online: number;
  alerts: number;
  totalPages: number;
}
