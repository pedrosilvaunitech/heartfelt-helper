import { useState, useMemo } from 'react';
import { usePrinters } from '@/context/PrinterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Alerts() {
  const alerts: any[] = []; // TODO: implement alerts from database
  const [severityFilter, setSeverityFilter] = useState('all');
  const [alertState, setAlertState] = useState(alerts);

  const filtered = useMemo(() => {
    return alertState
      .filter(a => severityFilter === 'all' || a.severity === severityFilter)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [severityFilter, alertState]);

  const acknowledge = (id: string) => {
    setAlertState(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.filter(a => !a.acknowledged).length} alertas pendentes</p>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Alerta</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((alert, i) => (
          <motion.div key={alert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <Card className={cn(alert.acknowledged && 'opacity-50')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                  "w-3 h-3 rounded-full shrink-0",
                  alert.severity === 'critical' ? 'bg-destructive animate-pulse-dot' : 'bg-warning'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/printers/${alert.printerId}`} className="text-sm font-semibold hover:text-primary">{alert.printerName}</Link>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {alert.severity === 'critical' ? 'Crítico' : 'Alerta'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-mono">{alert.printerIp}</span>
                    <span>{alert.printerLocation}</span>
                    <span>{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <Button variant="ghost" size="sm" onClick={() => acknowledge(alert.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Reconhecer
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
