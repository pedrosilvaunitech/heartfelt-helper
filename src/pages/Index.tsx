import { Printer, Wifi, WifiOff, AlertTriangle, FileText, Wrench } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { usePrinters } from '@/context/PrinterContext';
import { monthlyConsumption, costEstimate } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplyBar } from '@/components/dashboard/SupplyBar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';


const chartConfig = {
  pages: { label: 'Páginas', color: 'hsl(var(--primary))' },
  cost: { label: 'Custo (R$)', color: 'hsl(var(--warning))' },
};

export default function Dashboard() {
  const { printers, alerts } = usePrinters();

  const online = printers.filter(p => p.status === 'online').length;
  const offline = printers.filter(p => p.status === 'offline').length;
  const tonerLow = printers.filter(p => p.supplies.some(s => s.type === 'toner' && s.level < 20)).length;
  const paperLow = printers.filter(p => p.supplies.some(s => s.type === 'paper' && s.level < 15)).length;
  const maintenance = printers.filter(p => p.supplies.some(s => (s.type === 'fuser' || s.type === 'drum') && s.level < 15)).length;
  const recentAlerts = [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  const criticalPrinters = printers.filter(p => p.supplies.some(s => s.type === 'toner' && s.level < 15)).slice(0, 5);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitoramento em tempo real do parque de impressoras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Impressoras" value={printers.length} icon={Printer} />
        <StatCard title="Online" value={online} icon={Wifi} variant="success" />
        <StatCard title="Offline" value={offline} icon={WifiOff} variant="destructive" />
        <StatCard title="Toner Baixo" value={tonerLow} icon={AlertTriangle} variant="warning" />
        <StatCard title="Papel Baixo" value={paperLow} icon={FileText} variant="warning" />
        <StatCard title="Manutenção" value={maintenance} icon={Wrench} variant="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumo Mensal (Páginas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={monthlyConsumption}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pages" fill="var(--color-pages)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Custo Estimado Mensal (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <LineChart data={costEstimate}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={{ fill: 'var(--color-cost)' }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alertas Recentes</CardTitle>
              <Link to="/alerts" className="text-xs text-primary hover:underline">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0 animate-pulse-dot",
                  alert.severity === 'critical' ? 'bg-destructive' : 'bg-warning'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.printerName}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {alert.severity === 'critical' ? 'Crítico' : 'Alerta'}
                </Badge>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Impressoras Críticas</CardTitle>
              <Link to="/printers" className="text-xs text-primary hover:underline">Ver todas</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {criticalPrinters.map((printer, i) => (
              <motion.div
                key={printer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/printers/${printer.id}`} className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{printer.brand} {printer.model}</span>
                    <span className="text-xs text-muted-foreground font-mono">{printer.ip}</span>
                  </div>
                  <div className="space-y-1.5">
                    {printer.supplies.filter(s => s.type === 'toner').map(s => (
                      <SupplyBar key={s.name} label={s.name} level={s.level} color={s.color} />
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
