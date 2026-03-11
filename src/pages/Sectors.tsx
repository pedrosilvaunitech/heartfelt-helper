import { usePrinters } from '@/context/PrinterContext';
import { alerts as mockAlerts } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Printer, Wifi, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sectors() {
  const { printers } = usePrinters();
  const alerts: any[] = []; // TODO: implement alerts from database
  const sectors = ['Financeiro', 'RH', 'Produção', 'TI', 'Recepção', 'Diretoria', 'Comercial', 'Logística'];
  const sectorStats = sectors.map(s => {
    const sectorPrinters = printers.filter(p => p.sector === s);
    return {
      name: s,
      printerCount: sectorPrinters.length,
      online: sectorPrinters.filter(p => p.status === 'online').length,
      alerts: alerts.filter(a => sectorPrinters.some(p => p.id === a.printerId)).length,
      totalPages: sectorPrinters.reduce((sum, p) => sum + p.pageCount, 0),
    };
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setores</h1>
        <p className="text-sm text-muted-foreground mt-1">Agrupamento por departamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sectorStats.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{s.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Printer className="w-3 h-3 text-muted-foreground" />
                    <span>{s.printerCount} impressoras</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wifi className="w-3 h-3 text-success" />
                    <span>{s.online} online</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    <span>{s.alerts} alertas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span>{s.totalPages.toLocaleString()} pgs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
