import { useState } from 'react';
import { useDataSources } from '@/context/DataSourceContext';
import { SNMPProfile, SNMPOIDMapping } from '@/types/dataSources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Copy, Server } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const categoryLabels = { supply: 'Suprimento', status: 'Status', info: 'Informação', counter: 'Contador', custom: 'Personalizado' };
const categoryColors = { supply: 'bg-warning/10 text-warning', status: 'bg-info/10 text-info', info: 'bg-primary/10 text-primary', counter: 'bg-success/10 text-success', custom: 'bg-muted text-muted-foreground' };

export function SNMPProfileManager() {
  const { snmpProfiles, addSNMPProfile, removeSNMPProfile, updateSNMPProfile } = useDataSources();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewOID, setShowNewOID] = useState<string | null>(null);
  const [newOID, setNewOID] = useState<Partial<SNMPOIDMapping>>({ name: '', oid: '', description: '', category: 'custom', valueType: 'string' });
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', brand: '', model: '', snmpVersion: 'v2c' as const, community: 'public' });

  const handleAddProfile = () => {
    if (!newProfile.name || !newProfile.brand) return;
    addSNMPProfile({
      id: `snmp-${Date.now()}`,
      ...newProfile,
      oidMappings: [],
      createdAt: new Date().toISOString(),
    });
    setNewProfile({ name: '', brand: '', model: '', snmpVersion: 'v2c', community: 'public' });
    setShowNewProfile(false);
    toast({ title: 'Perfil SNMP criado' });
  };

  const handleAddOID = (profileId: string) => {
    if (!newOID.name || !newOID.oid) return;
    const profile = snmpProfiles.find(p => p.id === profileId);
    if (!profile) return;
    updateSNMPProfile(profileId, {
      oidMappings: [...profile.oidMappings, { ...newOID, id: `oid-${Date.now()}` } as SNMPOIDMapping],
    });
    setNewOID({ name: '', oid: '', description: '', category: 'custom', valueType: 'string' });
    setShowNewOID(null);
    toast({ title: 'OID adicionado' });
  };

  const removeOID = (profileId: string, oidId: string) => {
    const profile = snmpProfiles.find(p => p.id === profileId);
    if (!profile) return;
    updateSNMPProfile(profileId, {
      oidMappings: profile.oidMappings.filter(o => o.id !== oidId),
    });
  };

  const duplicateProfile = (profile: SNMPProfile) => {
    addSNMPProfile({
      ...profile,
      id: `snmp-${Date.now()}`,
      name: `${profile.name} (Cópia)`,
      createdAt: new Date().toISOString(),
    });
    toast({ title: 'Perfil duplicado' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Perfis SNMP</h3>
          <p className="text-sm text-muted-foreground">Configure OIDs por marca/modelo para coleta via SNMP</p>
        </div>
        <Button onClick={() => setShowNewProfile(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Perfil
        </Button>
      </div>

      {showNewProfile && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Novo Perfil SNMP</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={newProfile.name} onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))} placeholder="HP LaserJet Custom" /></div>
              <div className="space-y-1"><Label className="text-xs">Marca *</Label><Input value={newProfile.brand} onChange={e => setNewProfile(p => ({ ...p, brand: e.target.value }))} placeholder="HP" /></div>
              <div className="space-y-1"><Label className="text-xs">Modelo</Label><Input value={newProfile.model} onChange={e => setNewProfile(p => ({ ...p, model: e.target.value }))} placeholder="LaserJet 432" /></div>
              <div className="space-y-1"><Label className="text-xs">Community</Label><Input value={newProfile.community} onChange={e => setNewProfile(p => ({ ...p, community: e.target.value }))} placeholder="public" className="font-mono" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddProfile}>Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewProfile(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {snmpProfiles.map(profile => (
        <Card key={profile.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">{profile.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{profile.brand}</Badge>
                {profile.model && <Badge variant="outline" className="text-[10px]">{profile.model}</Badge>}
                <Badge variant="outline" className="text-[10px] font-mono">{profile.snmpVersion}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => duplicateProfile(profile)}><Copy className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewOID(showNewOID === profile.id ? null : profile.id)}><Plus className="w-3 h-3" /></Button>
                {profile.id !== 'snmp-universal' && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeSNMPProfile(profile.id)}><Trash2 className="w-3 h-3" /></Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {showNewOID === profile.id && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <p className="text-xs font-medium">Adicionar OID</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome (ex: Toner Black)" value={newOID.name} onChange={e => setNewOID(o => ({ ...o, name: e.target.value }))} className="text-sm h-8" />
                  <Input placeholder="OID (ex: 1.3.6.1.2.1...)" value={newOID.oid} onChange={e => setNewOID(o => ({ ...o, oid: e.target.value }))} className="text-sm h-8 font-mono" />
                  <Input placeholder="Descrição" value={newOID.description} onChange={e => setNewOID(o => ({ ...o, description: e.target.value }))} className="text-sm h-8" />
                  <Select value={newOID.category} onValueChange={v => setNewOID(o => ({ ...o, category: v as any }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supply">Suprimento</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="info">Informação</SelectItem>
                      <SelectItem value="counter">Contador</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={newOID.valueType} onValueChange={v => setNewOID(o => ({ ...o, valueType: v as any }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual</SelectItem>
                      <SelectItem value="integer">Inteiro</SelectItem>
                      <SelectItem value="string">Texto</SelectItem>
                      <SelectItem value="boolean">Booleano</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Limite alerta" type="number" value={newOID.alertThreshold || ''} onChange={e => setNewOID(o => ({ ...o, alertThreshold: Number(e.target.value) }))} className="text-sm h-8" />
                  <Select value={newOID.alertCondition || '<'} onValueChange={v => setNewOID(o => ({ ...o, alertCondition: v as any }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">{'< menor que'}</SelectItem>
                      <SelectItem value=">">{'> maior que'}</SelectItem>
                      <SelectItem value="=">{'= igual a'}</SelectItem>
                      <SelectItem value="!=">{'!= diferente de'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAddOID(profile.id)}>Adicionar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewOID(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">OID</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Alerta</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.oidMappings.map(oid => (
                  <TableRow key={oid.id}>
                    <TableCell className="text-xs font-medium">{oid.name}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">{oid.oid}</TableCell>
                    <TableCell><Badge className={cn("text-[10px]", categoryColors[oid.category])}>{categoryLabels[oid.category]}</Badge></TableCell>
                    <TableCell className="text-xs">{oid.valueType}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {oid.alertThreshold !== undefined ? `${oid.alertCondition} ${oid.alertThreshold}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeOID(profile.id, oid.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
