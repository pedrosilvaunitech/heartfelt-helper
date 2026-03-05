import { usePrinters } from '@/context/PrinterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

interface Prediction {
  printerId: string;
  printerName: string;
  ip: string;
  sector: string;
  supply: string;
  level: number;
  daysRemaining: number;
}

export default function Maintenance() {
  const { printers } = usePrinters();
  const predictions: Prediction[] = [];

  printers.forEach(p => {
    p.supplies.forEach(s => {
      if (s.type === 'toner' || s.type === 'fuser' || s.type === 'drum' || s.type === 'roller') {
        const consumePerDay = p.pagesPerDay / (s.maxCapacity * 10);
        const daysRemaining = Math.max(0, Math.round(s.level / Math.max(consumePerDay, 0.1)));
        if (daysRemaining < 60) {
          predictions.push({
            printerId: p.id,
            printerName: `${p.brand} ${p.model}`,
            ip: p.ip,
            sector: p.sector,
            supply: s.name,
            level: s.level,
            daysRemaining,
          });
        }
      }
    });
  });

  predictions.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manutenção Preventiva</h1>
        <p className="text-sm text-muted-foreground mt-1">{predictions.length} itens requerem atenção nos próximos 60 dias</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Urgência</TableHead>
              <TableHead>Impressora</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Suprimento</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Dias Restantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {predictions.map((pred, i) => (
              <TableRow key={`${pred.printerId}-${pred.supply}`}>
                <TableCell>
                  <Badge variant={pred.daysRemaining < 7 ? 'destructive' : pred.daysRemaining < 30 ? 'secondary' : 'outline'}>
                    {pred.daysRemaining < 7 ? 'Urgente' : pred.daysRemaining < 30 ? 'Atenção' : 'Planejado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/printers/${pred.printerId}`} className="text-sm font-medium hover:text-primary">{pred.printerName}</Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{pred.ip}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{pred.sector}</Badge></TableCell>
                <TableCell className="text-sm">{pred.supply}</TableCell>
                <TableCell className="font-mono text-sm">{pred.level}%</TableCell>
                <TableCell className="font-mono text-sm font-semibold">{pred.daysRemaining}d</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
