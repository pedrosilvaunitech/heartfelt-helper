import { useState, useMemo } from 'react';
import { usePrinters, PrinterStatus } from '@/context/PrinterContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Wifi, WifiOff, AlertTriangle, Grid3X3, List, Trash2, Settings2, Wrench, Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { SupplyBar } from '@/components/dashboard/SupplyBar';
import { AddPrinterDialog } from '@/components/printers/AddPrinterDialog';
import { toast } from '@/hooks/use-toast';

const STATUS_OPTIONS: { value: PrinterStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'online', label: 'Ativo', icon: <Wifi className="w-3.5 h-3.5 text-success" /> },
  { value: 'offline', label: 'Offline', icon: <WifiOff className="w-3.5 h-3.5 text-destructive" /> },
  { value: 'warning', label: 'Alerta', icon: <AlertTriangle className="w-3.5 h-3.5 text-warning" /> },
  { value: 'maintenance', label: 'Manutenção', icon: <Wrench className="w-3.5 h-3.5 text-orange-500" /> },
  { value: 'disabled', label: 'Desativado', icon: <PowerOff className="w-3.5 h-3.5 text-muted-foreground" /> },
];

export default function Printers() {
  const { printers, loading, updatePrinterStatus, removePrinters } = usePrinters();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sectors = useMemo(() => [...new Set(printers.map(p => p.sector).filter(Boolean))], [printers]);

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
  }, [printers, search, statusFilter, sectorFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleStatusChange = async (status: PrinterStatus) => {
    if (selected.size === 0) {
      toast({ title: 'Selecione impressoras', description: 'Marque as impressoras que deseja alterar.', variant: 'destructive' });
      return;
    }
    await updatePrinterStatus([...selected], status);
    setSelected(new Set());
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    await removePrinters([...selected]);
    setSelected(new Set());
  };

  const statusIcon = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt?.icon || <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const statusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt?.label || status;
  };

  const statusBadgeVariant = (status: string) => {
    if (status === 'online') return 'default';
    if (status === 'offline') return 'destructive';
    if (status === 'maintenance') return 'outline';
    if (status === 'disabled') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Impressoras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} de {printers.length} impressoras
            {selected.size > 0 && <span className="ml-2 text-primary font-medium">• {selected.size} selecionada(s)</span>}
          </p>
        </div>
        <AddPrinterDialog />
      </div>

      {/* Action bar when items selected */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <span className="text-sm font-medium mr-2">{selected.size} selecionada(s):</span>
          <Select onValueChange={(v) => handleStatusChange(v as PrinterStatus)}>
            <SelectTrigger className="w-[180px] h-8">
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Alterar status..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">{opt.icon} {opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir ({selected.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir impressoras?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {selected.size} impressora(s)? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por marca, modelo, IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando impressoras...</div>
      ) : printers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Power className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma impressora cadastrada</h3>
            <p className="text-sm text-muted-foreground mt-1">Adicione a primeira impressora para começar o monitoramento.</p>
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className={cn(
                "hover:shadow-md transition-all cursor-pointer relative",
                selected.has(p.id) && "ring-2 ring-primary border-primary"
              )}>
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggleSelect(p.id)}
                  />
                </div>
                <Link to={`/printers/${p.id}`}>
                  <CardContent className="p-4 pl-10 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{p.brand} {p.model}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.ip}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(p.status) as any} className="text-[10px]">
                        {statusIcon(p.status)}
                        <span className="ml-1">{statusLabel(p.status)}</span>
                      </Badge>
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
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
                  <TableRow key={p.id} className={cn("cursor-pointer hover:bg-muted/50", selected.has(p.id) && "bg-primary/5")}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(p.status) as any} className="text-[10px] gap-1">
                        {statusIcon(p.status)}
                        {statusLabel(p.status)}
                      </Badge>
                    </TableCell>
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma impressora encontrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
