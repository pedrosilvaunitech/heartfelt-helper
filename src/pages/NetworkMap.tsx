import { printers } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function NetworkMap() {
  const subnets = [...new Set(printers.map(p => p.ip.split('.').slice(0, 3).join('.')))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapa de Rede</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualização das impressoras por sub-rede</p>
      </div>

      {subnets.map(subnet => {
        const subnetPrinters = printers.filter(p => p.ip.startsWith(subnet));
        return (
          <Card key={subnet}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono">{subnet}.0/24</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                {subnetPrinters.map((p, i) => {
                  const lastOctet = p.ip.split('.')[3];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.01 }}
                    >
                      <Link
                        to={`/printers/${p.id}`}
                        className={cn(
                          "w-full aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-mono transition-all hover:scale-110 hover:shadow-lg border",
                          p.status === 'online' && 'bg-success/10 border-success/30 text-success',
                          p.status === 'offline' && 'bg-destructive/10 border-destructive/30 text-destructive',
                          p.status === 'warning' && 'bg-warning/10 border-warning/30 text-warning',
                        )}
                        title={`${p.brand} ${p.model}\n${p.ip}\n${p.sector}`}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full mb-1",
                          p.status === 'online' && 'bg-success',
                          p.status === 'offline' && 'bg-destructive',
                          p.status === 'warning' && 'bg-warning',
                        )} />
                        <span>.{lastOctet}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Online ({subnetPrinters.filter(p => p.status === 'online').length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Alerta ({subnetPrinters.filter(p => p.status === 'warning').length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Offline ({subnetPrinters.filter(p => p.status === 'offline').length})</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
