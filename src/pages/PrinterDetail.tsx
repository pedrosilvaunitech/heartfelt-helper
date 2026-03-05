import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePrinters } from '@/context/PrinterContext';
import { useDataSources } from '@/context/DataSourceContext';
import { history } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupplyBar } from '@/components/dashboard/SupplyBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WebMapperInline } from '@/components/datasources/WebMapperInline';
import { ArrowLeft, Wifi, WifiOff, Clock, Hash, Server, MapPin, Cpu, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PrinterDetail() {
  const { printers, alerts } = usePrinters();
  const { id } = useParams();
  const [showWebMapper, setShowWebMapper] = useState(false);
  const printer = printers.find(p => p.id === id);

  if (!printer) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <p className="text-muted-foreground">Impressora não encontrada</p>
        <Button asChild variant="outline"><Link to="/printers">Voltar</Link></Button>
      </div>
    );
  }

  const printerAlerts = alerts.filter(a => a.printerId === printer.id);
  const printerHistory = history.filter(h => h.printerId === printer.id);

  const pagesPerDay = printer.pagesPerDay;
  const predictions = printer.supplies
    .filter(s => s.type === 'toner' || s.type === 'fuser' || s.type === 'drum')
    .map(s => {
      const consumePerDay = pagesPerDay / (s.maxCapacity * 10);
      const daysRemaining = Math.max(0, Math.round(s.level / Math.max(consumePerDay, 0.1)));
      return { name: s.name, daysRemaining };
    });

  const infoItems = [
    { icon: Wifi, label: 'IP', value: printer.ip },
    { icon: Server, label: 'MAC', value: printer.mac },
    { icon: Hash, label: 'Serial', value: printer.serial },
    { icon: Cpu, label: 'Firmware', value: printer.firmware },
    { icon: Clock, label: 'Uptime', value: printer.uptime },
    { icon: MapPin, label: 'Local', value: printer.location },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon"><Link to="/printers"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{printer.brand} {printer.model}</h1>
          <p className="text-sm text-muted-foreground font-mono">{printer.ip} — {printer.sector}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowWebMapper(true)}>
            <Globe className="w-3.5 h-3.5 mr-1" /> Mapear via Web
          </Button>
          <Badge className={cn(printer.status === 'online' ? 'bg-success text-success-foreground' : printer.status === 'offline' ? 'bg-destructive' : 'bg-warning text-warning-foreground')}>
            {printer.status === 'online' ? '🟢 Online' : printer.status === 'offline' ? '🔴 Offline' : '🟡 Alerta'}
          </Badge>
        </div>
      </div>

      <Dialog open={showWebMapper} onOpenChange={setShowWebMapper}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Mapear Dados via Web — {printer.brand} {printer.model}
            </DialogTitle>
          </DialogHeader>
          <WebMapperInline printerIp={printer.ip} printerBrand={printer.brand} printerModel={printer.model} onClose={() => setShowWebMapper(false)} />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {infoItems.map(item => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-xs font-mono font-medium truncate">{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Suprimentos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {printer.supplies.map(s => (
              <SupplyBar key={s.name} label={s.name} level={s.level} color={s.color} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Previsão de Manutenção</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {predictions.map(p => (
              <div key={p.name} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm">{p.name}</span>
                <Badge variant={p.daysRemaining < 7 ? 'destructive' : p.daysRemaining < 30 ? 'secondary' : 'outline'}>
                  {p.daysRemaining} dias
                </Badge>
              </div>
            ))}
            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
              <span className="text-sm">Contador de Páginas</span>
              <span className="font-mono text-sm font-semibold">{printer.pageCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
              <span className="text-sm">Páginas/Dia</span>
              <span className="font-mono text-sm font-semibold">{printer.pagesPerDay}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas Ativos ({printerAlerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {printerAlerts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>}
            {printerAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className={cn("w-2 h-2 rounded-full", a.severity === 'critical' ? 'bg-destructive' : 'bg-warning')} />
                <span className="text-sm flex-1">{a.message}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {printerHistory.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro</p>}
            {printerHistory.map(h => (
              <div key={h.id} className="p-2 rounded-lg bg-muted/50">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{h.event}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(h.timestamp).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{h.details}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
