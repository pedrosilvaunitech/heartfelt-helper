import { useState, useRef, useCallback, useEffect } from 'react';
import { useDataSources } from '@/context/DataSourceContext';
import { WebMappingProfile, WebMappingPoint } from '@/types/dataSources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Globe, MousePointer2, Eye, RefreshCw, X, CheckCircle2, Target, Crosshair } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const categoryLabels = { supply: 'Suprimento', status: 'Status', info: 'Informação', counter: 'Contador', custom: 'Personalizado' };

interface SelectedElement {
  selector: string;
  tagName: string;
  textContent: string;
  boundingRect: { x: number; y: number; width: number; height: number };
}

export function WebMapperManager() {
  const { webProfiles, addWebProfile, updateWebProfile, removeWebProfile } = useDataSources();
  const [showMapper, setShowMapper] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Partial<WebMappingProfile>>({
    name: '', brand: '', model: '', baseUrl: '', pages: [], mappingPoints: [],
  });
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const openMapper = (profile?: WebMappingProfile) => {
    if (profile) {
      setCurrentProfile(profile);
      setEditingProfileId(profile.id);
    } else {
      setCurrentProfile({ name: '', brand: '', model: '', baseUrl: '', pages: [], mappingPoints: [] });
      setEditingProfileId(null);
    }
    setShowMapper(true);
  };

  const saveProfile = () => {
    if (!currentProfile.name || !currentProfile.brand || !currentProfile.baseUrl) {
      toast({ title: 'Preencha nome, marca e URL base', variant: 'destructive' });
      return;
    }
    if (editingProfileId) {
      updateWebProfile(editingProfileId, { ...currentProfile, updatedAt: new Date().toISOString() });
      toast({ title: 'Perfil atualizado' });
    } else {
      addWebProfile({
        ...currentProfile as WebMappingProfile,
        id: `web-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Perfil de mapeamento web criado' });
    }
    setShowMapper(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mapeamento Web (HTTP)</h3>
          <p className="text-sm text-muted-foreground">Capture dados da interface web da impressora quando SNMP não está disponível</p>
        </div>
        <Button onClick={() => openMapper()} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Mapeamento
        </Button>
      </div>

      {webProfiles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Globe className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum mapeamento web configurado</p>
            <p className="text-xs text-muted-foreground mt-1">Abra a página web da impressora e selecione visualmente os dados a monitorar</p>
            <Button className="mt-4" size="sm" onClick={() => openMapper()}>
              <MousePointer2 className="w-4 h-4 mr-1" /> Criar Mapeamento
            </Button>
          </CardContent>
        </Card>
      )}

      {webProfiles.map(profile => (
        <Card key={profile.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-info" />
                <CardTitle className="text-sm">{profile.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{profile.brand}</Badge>
                {profile.model && <Badge variant="outline" className="text-[10px]">{profile.model}</Badge>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openMapper(profile)}><Eye className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeWebProfile(profile.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
            <CardDescription className="font-mono text-[10px]">{profile.baseUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Seletor CSS</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Valor Exemplo</TableHead>
                  <TableHead className="text-xs">Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.mappingPoints.map(point => (
                  <TableRow key={point.id}>
                    <TableCell className="text-xs font-medium">{point.name}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate">{point.selector}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{categoryLabels[point.category]}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{point.sampleValue || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {point.alertThreshold !== undefined ? `${point.alertCondition} ${point.alertThreshold}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {profile.mappingPoints.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground">Nenhum ponto mapeado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showMapper} onOpenChange={setShowMapper}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MousePointer2 className="w-5 h-5" />
              {editingProfileId ? 'Editar Mapeamento Web' : 'Novo Mapeamento Web'}
            </DialogTitle>
          </DialogHeader>
          <WebMapperDialog
            profile={currentProfile}
            setProfile={setCurrentProfile}
            onSave={saveProfile}
            onCancel={() => setShowMapper(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebMapperDialog({
  profile,
  setProfile,
  onSave,
  onCancel,
}: {
  profile: Partial<WebMappingProfile>;
  setProfile: (p: Partial<WebMappingProfile>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [pageHtml, setPageHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [hoveredSelector, setHoveredSelector] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [newPointForm, setNewPointForm] = useState<Partial<WebMappingPoint>>({
    name: '', category: 'custom', attribute: 'textContent', description: '',
  });

  const fetchPage = async () => {
    if (!profile.baseUrl) {
      toast({ title: 'Informe a URL base', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('printer-proxy', {
        body: { url: profile.baseUrl },
      });
      if (error) throw error;
      if (data?.html) {
        setPageHtml(data.html);
        toast({ title: 'Página carregada com sucesso' });
      } else {
        toast({ title: 'Não foi possível carregar a página', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar página', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const getInjectedHtml = () => {
    const highlightStyles = profile.mappingPoints?.map(p => 
      `[data-pg-selector="${p.id}"], ${p.selector} { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; position: relative !important; }`
    ).join('\n') || '';

    const selectModeScript = selectMode ? `
      <script>
        let lastHighlighted = null;
        document.addEventListener('mouseover', function(e) {
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.outlineOffset = '';
          }
          e.target.style.outline = '3px solid #ef4444';
          e.target.style.outlineOffset = '2px';
          lastHighlighted = e.target;
          e.stopPropagation();
        }, true);
        document.addEventListener('mouseout', function(e) {
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.outlineOffset = '';
          }
        }, true);
        document.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const el = e.target;
          const path = [];
          let current = el;
          while (current && current !== document.body && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
              selector = '#' + current.id;
              path.unshift(selector);
              break;
            } else if (current.className && typeof current.className === 'string') {
              const classes = current.className.trim().split(/\\s+/).filter(c => !c.startsWith('pg-')).slice(0, 2).join('.');
              if (classes) selector += '.' + classes;
            }
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
              if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += ':nth-of-type(' + index + ')';
              }
            }
            path.unshift(selector);
            current = current.parentElement;
          }
          const fullSelector = path.join(' > ');
          const rect = el.getBoundingClientRect();
          window.parent.postMessage({
            type: 'element-selected',
            selector: fullSelector,
            tagName: el.tagName,
            textContent: (el.textContent || '').trim().substring(0, 200),
            boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          }, '*');
        }, true);
      </script>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { cursor: ${selectMode ? 'crosshair' : 'default'} !important; }
          ${highlightStyles}
          .pg-highlight-mapped {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
        </style>
      </head>
      <body>
        ${pageHtml}
        ${selectModeScript}
      </body>
      </html>
    `;
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setSelectedElement({
          selector: e.data.selector,
          tagName: e.data.tagName,
          textContent: e.data.textContent,
          boundingRect: e.data.boundingRect,
        });
        setNewPointForm(prev => ({ ...prev, name: '', description: '' }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addMappingPoint = () => {
    if (!selectedElement || !newPointForm.name) {
      toast({ title: 'Selecione um elemento e dê um nome', variant: 'destructive' });
      return;
    }
    const point: WebMappingPoint = {
      id: `wp-${Date.now()}`,
      name: newPointForm.name!,
      selector: selectedElement.selector,
      attribute: newPointForm.attribute || 'textContent',
      description: newPointForm.description || '',
      sampleValue: selectedElement.textContent,
      category: newPointForm.category || 'custom',
      alertThreshold: newPointForm.alertThreshold,
      alertCondition: newPointForm.alertCondition,
    };
    setProfile({
      ...profile,
      mappingPoints: [...(profile.mappingPoints || []), point],
    });
    setSelectedElement(null);
    setNewPointForm({ name: '', category: 'custom', attribute: 'textContent', description: '' });
    toast({ title: `Ponto "${point.name}" mapeado` });
  };

  const removeMappingPoint = (id: string) => {
    setProfile({
      ...profile,
      mappingPoints: (profile.mappingPoints || []).filter(p => p.id !== id),
    });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      {/* Profile Info */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="HP 432 Web" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Marca *</Label>
          <Input value={profile.brand} onChange={e => setProfile({ ...profile, brand: e.target.value })} placeholder="HP" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modelo</Label>
          <Input value={profile.model} onChange={e => setProfile({ ...profile, model: e.target.value })} placeholder="LaserJet 432" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL Base *</Label>
          <div className="flex gap-1">
            <Input value={profile.baseUrl} onChange={e => setProfile({ ...profile, baseUrl: e.target.value })} placeholder="http://192.168.1.100" className="h-8 text-sm font-mono" />
            <Button size="sm" className="h-8 shrink-0" onClick={fetchPage} disabled={loading}>
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Web page preview */}
        <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", pageHtml ? 'bg-success' : 'bg-muted-foreground/30')} />
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">{profile.baseUrl || 'Nenhuma URL carregada'}</span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={selectMode ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setSelectMode(!selectMode)}
                disabled={!pageHtml}
              >
                <Crosshair className="w-3 h-3 mr-1" />
                {selectMode ? 'Selecionando...' : 'Modo Seleção'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={fetchPage} disabled={loading}>
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-white relative">
            {pageHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={getInjectedHtml()}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title="Printer Web Page"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Globe className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Insira a URL da impressora e clique em carregar</p>
                <p className="text-xs mt-1">A página da impressora será exibida aqui</p>
              </div>
            )}

            {selectMode && pageHtml && (
              <div className="absolute top-2 left-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg z-10">
                <Target className="w-3 h-3 animate-pulse" />
                <span>Clique em um elemento da página para selecioná-lo como ponto de dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - selection & mapped points */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          {/* Selected element config */}
          {selectedElement && (
            <Card className="border-primary/50 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" /> Elemento Selecionado
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSelectedElement(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-2 rounded bg-muted/50 border">
                  <p className="text-[10px] text-muted-foreground font-mono break-all">{selectedElement.selector}</p>
                  <p className="text-xs mt-1 font-medium truncate">&lt;{selectedElement.tagName.toLowerCase()}&gt; {selectedElement.textContent.substring(0, 60)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Nome do Trigger *</Label>
                  <Input value={newPointForm.name} onChange={e => setNewPointForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Nível Toner Preto" className="h-7 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Descrição</Label>
                  <Input value={newPointForm.description} onChange={e => setNewPointForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição do dado" className="h-7 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Categoria</Label>
                    <Select value={newPointForm.category} onValueChange={v => setNewPointForm(p => ({ ...p, category: v as any }))}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supply">Suprimento</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="counter">Contador</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Extrair</Label>
                    <Select value={newPointForm.attribute} onValueChange={v => setNewPointForm(p => ({ ...p, attribute: v as any }))}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="textContent">Texto</SelectItem>
                        <SelectItem value="value">Valor (input)</SelectItem>
                        <SelectItem value="innerHTML">HTML Interno</SelectItem>
                        <SelectItem value="src">URL (src)</SelectItem>
                        <SelectItem value="alt">Alt text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Limite Alerta</Label>
                    <Input type="number" value={newPointForm.alertThreshold || ''} onChange={e => setNewPointForm(p => ({ ...p, alertThreshold: Number(e.target.value) || undefined }))} className="h-7 text-xs" placeholder="20" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Condição</Label>
                    <Select value={newPointForm.alertCondition || '<'} onValueChange={v => setNewPointForm(p => ({ ...p, alertCondition: v as any }))}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<">{'< menor'}</SelectItem>
                        <SelectItem value=">">{'> maior'}</SelectItem>
                        <SelectItem value="=">{'= igual'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" className="w-full h-7 text-xs" onClick={addMappingPoint}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Ponto de Dados
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mapped points list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Pontos Mapeados ({(profile.mappingPoints || []).length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(profile.mappingPoints || []).length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  Ative o modo seleção e clique nos elementos da página
                </p>
              )}
              {(profile.mappingPoints || []).map((point, idx) => (
                <div key={point.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 border text-xs">
                  <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{point.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{point.selector}</p>
                  </div>
                  <Badge variant="secondary" className="text-[8px] shrink-0">{categoryLabels[point.category]}</Badge>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMappingPoint(point.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSave}>Salvar Mapeamento</Button>
      </div>
    </div>
  );
}
