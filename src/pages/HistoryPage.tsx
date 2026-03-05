import { history } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const eventColors: Record<string, string> = {
  'Troca de toner': 'bg-primary',
  'Erro': 'bg-destructive',
  'Offline': 'bg-warning',
  'Manutenção': 'bg-info',
};

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de eventos e manutenções</p>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {history.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-10">
              <div className={`absolute left-[11px] top-4 w-2.5 h-2.5 rounded-full ${eventColors[h.event] || 'bg-muted-foreground'}`} />
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{h.event}</Badge>
                      <span className="text-sm font-medium">{h.printerName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{h.details}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
