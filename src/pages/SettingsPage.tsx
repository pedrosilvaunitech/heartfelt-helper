import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações do sistema de monitoramento</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triggers de Alerta</CardTitle>
          <CardDescription>Limites para geração automática de alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Toner baixo', defaultValue: '20' },
            { label: 'Toner crítico', defaultValue: '10' },
            { label: 'Papel baixo', defaultValue: '15' },
            { label: 'Fusor gasto', defaultValue: '90' },
            { label: 'Cilindro próximo do fim', defaultValue: '90' },
          ].map(t => (
            <div key={t.label} className="flex items-center justify-between">
              <Label className="text-sm">{t.label}</Label>
              <div className="flex items-center gap-2">
                <Input className="w-20 text-center font-mono" defaultValue={t.defaultValue} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Salvar Configurações</Button>
      </div>
    </div>
  );
}
