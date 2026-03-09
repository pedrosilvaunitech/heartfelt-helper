import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Printer, Alert } from '@/types/printer';
import { printers as initialPrinters, alerts as initialAlerts } from '@/data/mockData';

interface PrinterContextType {
  printers: Printer[];
  alerts: Alert[];
  addPrinter: (printer: Printer) => void;
  updatePrinter: (id: string, updates: Partial<Printer>) => void;
  removePrinter: (id: string) => void;
}

const PrinterContext = createContext<PrinterContextType | null>(null);

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>(initialPrinters);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const addPrinter = (printer: Printer) => {
    setPrinters(prev => [printer, ...prev]);
    // Auto-generate alerts for the new printer
    const newAlerts: Alert[] = [];
    printer.supplies.forEach(s => {
      if (s.type === 'toner' && s.level < 10) {
        newAlerts.push({ id: `alert-new-${Date.now()}-${s.name}`, printerId: printer.id, printerName: `${printer.brand} ${printer.model}`, printerIp: printer.ip, printerLocation: printer.location, type: 'toner_critical', severity: 'critical', message: `${s.name} em ${s.level}%`, timestamp: new Date().toISOString(), acknowledged: false });
      } else if (s.type === 'toner' && s.level < 20) {
        newAlerts.push({ id: `alert-new-${Date.now()}-${s.name}`, printerId: printer.id, printerName: `${printer.brand} ${printer.model}`, printerIp: printer.ip, printerLocation: printer.location, type: 'toner_low', severity: 'warning', message: `${s.name} em ${s.level}%`, timestamp: new Date().toISOString(), acknowledged: false });
      }
    });
    if (printer.status === 'offline') {
      newAlerts.push({ id: `alert-new-${Date.now()}-offline`, printerId: printer.id, printerName: `${printer.brand} ${printer.model}`, printerIp: printer.ip, printerLocation: printer.location, type: 'offline', severity: 'critical', message: 'Impressora offline', timestamp: new Date().toISOString(), acknowledged: false });
    }
    if (newAlerts.length > 0) setAlerts(prev => [...newAlerts, ...prev]);
  };

  const removePrinter = (id: string) => {
    setPrinters(prev => prev.filter(p => p.id !== id));
    setAlerts(prev => prev.filter(a => a.printerId !== id));
  };

  return (
    <PrinterContext.Provider value={{ printers, alerts, addPrinter, removePrinter }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinters() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinters must be used within PrinterProvider');
  return ctx;
}
