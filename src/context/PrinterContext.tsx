import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Supply {
  name: string;
  level: number;
  maxCapacity: number;
  type: 'toner' | 'paper' | 'fuser' | 'roller' | 'drum';
  color?: string;
}

export type PrinterStatus = 'online' | 'offline' | 'warning' | 'maintenance' | 'disabled';

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

interface PrinterContextType {
  printers: Printer[];
  loading: boolean;
  addPrinter: (printer: Omit<Printer, 'id'>) => Promise<void>;
  updatePrinter: (id: string, updates: Partial<Printer>) => Promise<void>;
  updatePrinterStatus: (ids: string[], status: PrinterStatus) => Promise<void>;
  removePrinters: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | null>(null);

function mapRow(row: any): Printer {
  return {
    id: row.id,
    ip: row.ip,
    hostname: row.hostname || '',
    brand: row.brand || '',
    model: row.model || '',
    serial: row.serial || '',
    firmware: row.firmware || '',
    mac: row.mac || '',
    location: row.location || '',
    sector: row.sector || '',
    status: row.status as PrinterStatus,
    uptime: row.uptime || '0d 0h 0m',
    pageCount: row.page_count || 0,
    pagesPerDay: row.pages_per_day || 0,
    supplies: (row.supplies as Supply[]) || [],
    lastSeen: row.last_seen || new Date().toISOString(),
    discoveredAt: row.discovered_at || new Date().toISOString(),
  };
}

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPrinters = useCallback(async () => {
    const { data, error } = await supabase
      .from('printers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching printers:', error);
      return;
    }
    setPrinters((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchPrinters();
    else { setPrinters([]); setLoading(false); }
  }, [user, fetchPrinters]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('printers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'printers' }, () => {
        fetchPrinters();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPrinters]);

  const addPrinter = async (printer: Omit<Printer, 'id'>) => {
    const { error } = await supabase.from('printers').insert({
      ip: printer.ip,
      hostname: printer.hostname,
      brand: printer.brand,
      model: printer.model,
      serial: printer.serial,
      firmware: printer.firmware,
      mac: printer.mac,
      location: printer.location,
      sector: printer.sector,
      status: printer.status,
      uptime: printer.uptime,
      page_count: printer.pageCount,
      pages_per_day: printer.pagesPerDay,
      supplies: printer.supplies as any,
      last_seen: printer.lastSeen,
      discovered_at: printer.discoveredAt,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updatePrinter = async (id: string, updates: Partial<Printer>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.ip !== undefined) dbUpdates.ip = updates.ip;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.sector !== undefined) dbUpdates.sector = updates.sector;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.supplies !== undefined) dbUpdates.supplies = updates.supplies;
    if (updates.pageCount !== undefined) dbUpdates.page_count = updates.pageCount;

    const { error } = await supabase.from('printers').update(dbUpdates).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  };

  const updatePrinterStatus = async (ids: string[], status: PrinterStatus) => {
    const { error } = await supabase
      .from('printers')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado', description: `${ids.length} impressora(s) atualizada(s) para "${status}".` });
    }
  };

  const removePrinters = async (ids: string[]) => {
    const { error } = await supabase.from('printers').delete().in('id', ids);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: `${ids.length} impressora(s) removida(s).` });
    }
  };

  return (
    <PrinterContext.Provider value={{ printers, loading, addPrinter, updatePrinter, updatePrinterStatus, removePrinters, refresh: fetchPrinters }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinters() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinters must be used within PrinterProvider');
  return ctx;
}
