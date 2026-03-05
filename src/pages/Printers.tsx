import { useState, useMemo } from 'react';
import { printers } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Wifi, WifiOff, AlertTriangle, Grid3X3, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { SupplyBar } from '@/components/dashboard/SupplyBar';

export default function Printers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const sectors = useMemo(() => [...new Set(printers.map(p => p.sector))], []);

  const filtered = useMemo(() => {
    return printers.filter(p => {
      const matchSearch = !search || 
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.model.toLowerCase().includes(search.toLowerCase()) ||
        p.ip.includes(search) ||
        p.serial.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchSector = sectorFilter === 'all' || p.sector === sectorFilter;
      return matchSearch && matchStatus && matchSector;
    });
  }, [search, statusFilter, sectorFilter]);

  const statusIcon = (status: string) => {
    if (status === 'online') return <Wifi className="w-3.5 h-3.5 text-success" />;
    if (status === 'offline') return <WifiOff className="w-3.5 h-3.5 text-destructive" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impressoras</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} de {printers.length} impressoras</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por marca, modelo, IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="warning">Alerta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-auto">
          <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')}><Grid3X3 className="w-4 h-4" /></Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="icon" onClick={() => setView('table')}><List className="w-4 h-4" /></Button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Link to={`/printers/${p.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{p.brand} {p.model}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.ip}</p>
                      </div>
                      {statusIcon(p.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>{p.location}</p>
                      <p className="font-mono mt-1">{p.pageCount.toLocaleString()} pgs</p>
                    </div>
                    <div className="space-y-1">
                      {p.supplies.filter(s => s.type === 'toner').slice(0, 2).map(s => (
                        <SupplyBar key={s.name} label={s.name} level={s.level} color={s.color} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Toner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const toner = p.supplies.find(s => s.type === 'toner');
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{statusIcon(p.status)}</TableCell>
                    <TableCell>
                      <Link to={`/printers/${p.id}`} className="font-medium hover:text-primary">{p.brand} {p.model}</Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.ip}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{p.sector}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{p.pageCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {toner && (
                        <div className="w-24">
                          <SupplyBar label="" level={toner.level} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
