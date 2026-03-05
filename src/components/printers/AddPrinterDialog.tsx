import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { usePrinters } from '@/context/PrinterContext';
import { Printer, Supply } from '@/types/printer';
import { toast } from '@/hooks/use-toast';

const brands = ['HP', 'Brother', 'Epson', 'Canon', 'Samsung', 'Xerox', 'Ricoh', 'Lexmark', 'Kyocera', 'Sharp', 'Konica Minolta', 'Pantum', 'Zebra', 'Elgin', 'Bematech', 'Tanca'];
const sectors = ['Financeiro', 'RH', 'Produção', 'TI', 'Recepção', 'Diretoria', 'Comercial', 'Logística'];

export function AddPrinterDialog() {
  const { addPrinter } = usePrinters();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ip: '',
    hostname: '',
    brand: '',
    model: '',
    serial: '',
    firmware: '',
    mac: '',
    location: '',
    sector: '',
    isColor: false,
  });

  const update = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.ip || !form.brand || !form.model || !form.sector) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha IP, marca, modelo e setor.', variant: 'destructive' });
      return;
    }

    const supplies: Supply[] = [
      { name: 'Toner Black', level: 100, maxCapacity: 100, type: 'toner', color: '#1a1a1a' },
    ];
    if (form.isColor) {
      supplies.push(
        { name: 'Toner Cyan', level: 100, maxCapacity: 100, type: 'toner', color: '#00bcd4' },
        { name: 'Toner Magenta', level: 100, maxCapacity: 100, type: 'toner', color: '#e91e63' },
        { name: 'Toner Yellow', level: 100, maxCapacity: 100, type: 'toner', color: '#ffc107' },
      );
    }
    supplies.push(
      { name: 'Bandeja 1', level: 100, maxCapacity: 100, type: 'paper' },
      { name: 'Bandeja 2', level: 100, maxCapacity: 100, type: 'paper' },
      { name: 'Fusor', level: 100, maxCapacity: 100, type: 'fuser' },
      { name: 'Roletes', level: 100, maxCapacity: 100, type: 'roller' },
      { name: 'Cilindro', level: 100, maxCapacity: 100, type: 'drum' },
    );

    const printer: Printer = {
      id: `printer-manual-${Date.now()}`,
      ip: form.ip,
      hostname: form.hostname || `${form.brand.toLowerCase()}-${form.model.toLowerCase().replace(/\s/g, '-')}`,
      brand: form.brand,
      model: form.model,
      serial: form.serial || `SN${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      firmware: form.firmware || '1.0.0',
      mac: form.mac || Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase(),
      location: form.location || `${form.sector}`,
      sector: form.sector,
      status: 'online',
      uptime: '0d 0h 0m',
      pageCount: 0,
      pagesPerDay: 0,
      supplies,
      lastSeen: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
    };

    addPrinter(printer);
    toast({ title: 'Impressora adicionada', description: `${form.brand} ${form.model} (${form.ip}) foi adicionada com sucesso.` });
    setForm({ ip: '', hostname: '', brand: '', model: '', serial: '', firmware: '', mac: '', location: '', sector: '', isColor: false });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Adicionar Impressora</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Impressora</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">IP *</Label>
              <Input placeholder="192.168.1.100" value={form.ip} onChange={e => update('ip', e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hostname</Label>
              <Input placeholder="printer-01" value={form.hostname} onChange={e => update('hostname', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Marca *</Label>
              <Select value={form.brand} onValueChange={v => update('brand', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo *</Label>
              <Input placeholder="LaserJet M404" value={form.model} onChange={e => update('model', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Serial</Label>
              <Input placeholder="SN123456A" value={form.serial} onChange={e => update('serial', e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Firmware</Label>
              <Input placeholder="1.0.0" value={form.firmware} onChange={e => update('firmware', e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">MAC</Label>
              <Input placeholder="AA:BB:CC:DD:EE:FF" value={form.mac} onChange={e => update('mac', e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Setor *</Label>
              <Select value={form.sector} onValueChange={v => update('sector', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Localização</Label>
            <Input placeholder="Andar 2, Sala 201" value={form.location} onChange={e => update('location', e.target.value)} />
          </div>

          <div className="flex items-center gap-3 py-1">
            <input type="checkbox" id="isColor" checked={form.isColor} onChange={e => update('isColor', e.target.checked)} className="rounded border-input" />
            <Label htmlFor="isColor" className="text-sm cursor-pointer">Impressora colorida (CMYK)</Label>
          </div>

          <Button className="w-full" onClick={handleSubmit}>Adicionar Impressora</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
