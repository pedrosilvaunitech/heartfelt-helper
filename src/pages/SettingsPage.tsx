import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Printer, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PrinterTrigger {
  id: string;
  model: string;
  brand: string;
  triggers: { label: string; value: string; condition: string }[];
}

const defaultTriggerTemplate = [
  { label: 'Toner baixo', value: '20', condition: '< %' },
  { label: 'Toner crítico', value: '10', condition: '< %' },
  { label: 'Papel baixo', value: '15', condition: '< %' },
  { label: 'Fusor gasto', value: '90', condition: '> % vida usada' },
  { label: 'Cilindro próximo do fim', value: '90', condition: '> % vida usada' },
  { label: 'Roletes gastos', value: '85', condition: '> % vida usada' },
  { label: 'Offline', value: '5', condition: 'min sem resposta' },
];

const initialPrinterTriggers: PrinterTrigger[] = [
  {
    id: 'global',
    model: 'Padrão Global',
    brand: 'Todos',
    triggers: defaultTriggerTemplate.map(t => ({ ...t })),
  },
  {
    id: 'hp-432',
    model: 'LaserJet 432',
    brand: 'HP',
    triggers: [
      { label: 'Toner baixo', value: '25', condition: '< %' },
      { label: 'Toner crítico', value: '12', condition: '< %' },
      { label: 'Papel baixo', value: '20', condition: '< %' },
      { label: 'Fusor gasto', value: '85', condition: '> % vida usada' },
      { label: 'Cilindro próximo do fim', value: '88', condition: '> % vida usada' },
      { label: 'Roletes gastos', value: '80', condition: '> % vida usada' },
      { label: 'Offline', value: '3', condition: 'min sem resposta' },
      { label: 'Manutenção preventiva', value: '50000', condition: 'páginas' },
    ],
  },
  {
    id: 'hp-4303',
    model: 'LaserJet 4303',
    brand: 'HP',
    triggers: [
      { label: 'Toner baixo', value: '18', condition: '< %' },
      { label: 'Toner crítico', value: '8', condition: '< %' },
      { label: 'Papel baixo', value: '15', condition: '< %' },
      { label: 'Fusor gasto', value: '90', condition: '> % vida usada' },
      { label: 'Cilindro próximo do fim', value: '92', condition: '> % vida usada' },
      { label: 'Roletes gastos', value: '85', condition: '> % vida usada' },
      { label: 'Offline', value: '5', condition: 'min sem resposta' },
      { label: 'Kit de manutenção', value: '200000', condition: 'páginas' },
    ],
  },
];

export default function SettingsPage() {
  const [printerTriggers, setPrinterTriggers] = useState<PrinterTrigger[]>(initialPrinterTriggers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');

  const updateTriggerValue = (printerId: string, triggerLabel: string, newValue: string) => {
    setPrinterTriggers(prev => prev.map(pt =>
      pt.id === printerId
        ? { ...pt, triggers: pt.triggers.map(t => t.label === triggerLabel ? { ...t, value: newValue } : t) }
        : pt
    ));
  };

  const addTriggerToModel = (printerId: string) => {
    setPrinterTriggers(prev => prev.map(pt =>
      pt.id === printerId
        ? { ...pt, triggers: [...pt.triggers, { label: 'Novo trigger', value: '50', condition: '< %' }] }
        : pt
    ));
  };

  const removeTriggerFromModel = (printerId: string, triggerLabel: string) => {
    setPrinterTriggers(prev => prev.map(pt =>
      pt.id === printerId
        ? { ...pt, triggers: pt.triggers.filter(t => t.label !== triggerLabel) }
        : pt
    ));
  };

  const updateTriggerLabel = (printerId: string, oldLabel: string, newLabel: string) => {
    setPrinterTriggers(prev => prev.map(pt =>
      pt.id === printerId
        ? { ...pt, triggers: pt.triggers.map(t => t.label === oldLabel ? { ...t, label: newLabel } : t) }
        : pt
    ));
  };

  const updateTriggerCondition = (printerId: string, triggerLabel: string, newCondition: string) => {
    setPrinterTriggers(prev => prev.map(pt =>
      pt.id === printerId
        ? { ...pt, triggers: pt.triggers.map(t => t.label === triggerLabel ? { ...t, condition: newCondition } : t) }
        : pt
    ));
  };

  const addPrinterTrigger = () => {
    if (!newBrand.trim() || !newModel.trim()) return;
    const id = `${newBrand.toLowerCase().replace(/\s/g, '-')}-${newModel.toLowerCase().replace(/\s/g, '-')}`;
    setPrinterTriggers(prev => [...prev, {
      id,
      brand: newBrand,
      model: newModel,
      triggers: defaultTriggerTemplate.map(t => ({ ...t })),
    }]);
    setNewBrand('');
    setNewModel('');
    setShowAddForm(false);
    toast({ title: 'Trigger adicionado', description: `Triggers para ${newBrand} ${newModel} criados com valores padrão.` });
  };

  const removePrinterTrigger = (id: string) => {
    if (id === 'global') return;
    setPrinterTriggers(prev => prev.filter(pt => pt.id !== id));
    toast({ title: 'Trigger removido' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações do sistema de monitoramento</p>
      </div>

      {/* Network Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descoberta de Rede</CardTitle>
          <CardDescription>Configuração do scan automático de impressoras</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ranges IP (um por linha)</Label>
            <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] font-mono" defaultValue={"192.168.1.0/24\n192.168.2.0/24\n10.0.0.0/24"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Intervalo de Coleta</Label>
              <Select defaultValue="60">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 segundos</SelectItem>
                  <SelectItem value="60">60 segundos</SelectItem>
                  <SelectItem value="120">2 minutos</SelectItem>
                  <SelectItem value="300">5 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Versão SNMP</Label>
              <Select defaultValue="v3">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">SNMP v1</SelectItem>
                  <SelectItem value="v2c">SNMP v2c</SelectItem>
                  <SelectItem value="v3">SNMP v3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Descoberta automática</p>
              <p className="text-xs text-muted-foreground">Escanear rede periodicamente</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas WhatsApp</CardTitle>
          <CardDescription>Integração com API de notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Notificações WhatsApp</p>
              <p className="text-xs text-muted-foreground">Enviar alertas via WhatsApp</p>
            </div>
            <Switch />
          </div>
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input type="password" placeholder="Token da API (Z-API, Twilio...)" />
          </div>
          <div className="space-y-2">
            <Label>Números para Alertas</Label>
            <Input placeholder="+55 11 99999-9999" />
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" /> Configuração SMTP</CardTitle>
          <CardDescription>Configure o servidor de e-mail para envio de alertas por e-mail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Alertas por E-mail</p>
              <p className="text-xs text-muted-foreground">Enviar notificações via e-mail</p>
            </div>
            <Switch />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Servidor SMTP</Label>
              <Input placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Select defaultValue="587">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="587">587 (TLS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Usuário / E-mail</Label>
              <Input placeholder="alertas@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" placeholder="Senha do SMTP" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail Remetente</Label>
              <Input placeholder="noreply@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Destinatários (separar por vírgula)</Label>
              <Input placeholder="admin@empresa.com, ti@empresa.com" />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Usar TLS/SSL</p>
              <p className="text-xs text-muted-foreground">Conexão criptografada</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button variant="outline" size="sm" onClick={() => toast({ title: 'E-mail de teste enviado', description: 'Verifique sua caixa de entrada.' })}>
            <Mail className="w-3.5 h-3.5 mr-1" /> Enviar E-mail de Teste
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Triggers por Modelo de Impressora</CardTitle>
              <CardDescription>Configure limites de alerta específicos por marca/modelo</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Modelo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <p className="text-sm font-medium">Novo Trigger de Impressora</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input placeholder="Ex: HP, Brother, Epson..." value={newBrand} onChange={e => setNewBrand(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modelo</Label>
                  <Input placeholder="Ex: LaserJet M404" value={newModel} onChange={e => setNewModel(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addPrinterTrigger} disabled={!newBrand.trim() || !newModel.trim()}>Criar Trigger</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {printerTriggers.map(pt => (
            <div key={pt.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{pt.brand} {pt.model}</span>
                  {pt.id === 'global' && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                  {pt.brand === 'HP' && pt.id !== 'global' && <Badge className="text-[10px] bg-info text-info-foreground">HP</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => addTriggerToModel(pt.id)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  {pt.id !== 'global' && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removePrinterTrigger(pt.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {pt.triggers.map((t, idx) => (
                  <div key={`${pt.id}-${idx}`} className="flex items-center gap-2">
                    <Input
                      className="flex-1 text-sm h-8"
                      value={t.label}
                      onChange={e => updateTriggerLabel(pt.id, t.label, e.target.value)}
                    />
                    <Input
                      className="w-20 text-center font-mono h-8"
                      value={t.value}
                      onChange={e => updateTriggerValue(pt.id, t.label, e.target.value)}
                    />
                    <Select value={t.condition} onValueChange={v => updateTriggerCondition(pt.id, t.label, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="< %">{'< %'}</SelectItem>
                        <SelectItem value="> % vida usada">{'> % vida usada'}</SelectItem>
                        <SelectItem value="min sem resposta">min sem resposta</SelectItem>
                        <SelectItem value="páginas">páginas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeTriggerFromModel(pt.id, t.label)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast({ title: 'Configurações salvas', description: 'Todas as configurações foram atualizadas.' })}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
