import { useState, useRef, useEffect } from 'react';
import { useDataSources } from '@/context/DataSourceContext';
import { WebMappingProfile, WebMappingPoint } from '@/types/dataSources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, Globe, MousePointer2, Eye, RefreshCw, X, CheckCircle2,
  Target, Crosshair, Lock, Unlock, ArrowRight, Save, Pencil, Monitor
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const categoryLabels: Record<string, string> = {
  supply: 'Suprimento', status: 'Status', info: 'Informação', counter: 'Contador', custom: 'Personalizado',
};

interface SelectedElement {
  selector: string;
  tagName: string;
  textContent: string;
  boundingRect: { x: number; y: number; width: number; height: number };
}

export default function WebMapperPage() {
  const { webProfiles, addWebProfile, updateWebProfile, removeWebProfile } = useDataSources();

  // Wizard state
  const [step, setStep] = useState<'list' | 'config' | 'mapper'>('list');
  const [protocol, setProtocol] = useState<'http' | 'https'>('http');
  const [printerIp, setPrinterIp] = useState('');
  const [profileName, setProfileName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Mapper state
  const [pageHtml, setPageHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [mappingPoints, setMappingPoints] = useState<WebMappingPoint[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [navigateUrl, setNavigateUrl] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [newPointForm, setNewPointForm] = useState<Partial<WebMappingPoint>>({
    name: '', category: 'custom', attribute: 'textContent', description: '',
  });

  const fullUrl = `${protocol}://${printerIp}`;

  const startNewMapping = () => {
    setEditingProfileId(null);
    setProtocol('http');
    setPrinterIp('');
    setProfileName('');
    setBrand('');
    setModel('');
    setMappingPoints([]);
    setPageHtml('');
    setStep('config');
  };

  const editMapping = (profile: WebMappingProfile) => {
    setEditingProfileId(profile.id);
    const url = new URL(profile.baseUrl);
    setProtocol(url.protocol === 'https:' ? 'https' : 'http');
    setPrinterIp(url.host);
    setProfileName(profile.name);
    setBrand(profile.brand);
    setModel(profile.model);
    setMappingPoints(profile.mappingPoints);
    setCurrentUrl(profile.baseUrl);
    setNavigateUrl(profile.baseUrl);
    setStep('mapper');
  };

  const goToMapper = () => {
    if (!printerIp) {
      toast({ title: 'Informe o IP da impressora', variant: 'destructive' });
      return;
    }
    if (!profileName) {
      toast({ title: 'Informe um nome para o mapeamento', variant: 'destructive' });
      return;
    }
    setCurrentUrl(fullUrl);
    setNavigateUrl(fullUrl);
    setStep('mapper');
  };

  const fetchPage = async (url?: string) => {
    const targetUrl = url || navigateUrl || currentUrl;
    if (!targetUrl) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('printer-proxy', { body: { url: targetUrl } });
      if (error) throw error;
      if (data?.html) {
        setPageHtml(data.html);
        setCurrentUrl(targetUrl);
        toast({ title: 'Página carregada' });
      } else {
        toast({ title: 'Não foi possível carregar a página', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const getInjectedHtml = () => {
    const highlightStyles = mappingPoints.map(p =>
      `${p.selector} { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; }`
    ).join('\n');

    const selectModeScript = selectMode ? `
      <script>
        let lastHighlighted = null;
        document.addEventListener('mouseover', function(e) {
          if (lastHighlighted) { lastHighlighted.style.outline = ''; lastHighlighted.style.outlineOffset = ''; }
          e.target.style.outline = '3px solid #ef4444';
          e.target.style.outlineOffset = '2px';
          lastHighlighted = e.target;
          e.stopPropagation();
        }, true);
        document.addEventListener('mouseout', function(e) {
          if (lastHighlighted) { lastHighlighted.style.outline = ''; lastHighlighted.style.outlineOffset = ''; }
        }, true);
        document.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          const el = e.target;
          const path = [];
          let current = el;
          while (current && current !== document.body && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();
            if (current.id) { selector = '#' + current.id; path.unshift(selector); break; }
            else if (current.className && typeof current.className === 'string') {
              const classes = current.className.trim().split(/\\s+/).filter(c => !c.startsWith('pg-')).slice(0, 2).join('.');
              if (classes) selector += '.' + classes;
            }
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
              if (siblings.length > 1) { selector += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')'; }
            }
            path.unshift(selector);
            current = current.parentElement;
          }
          const rect = el.getBoundingClientRect();
          window.parent.postMessage({
            type: 'element-selected',
            selector: path.join(' > '),
            tagName: el.tagName,
            textContent: (el.textContent || '').trim().substring(0, 200),
            boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          }, '*');
        }, true);
      </script>
    ` : '';

    return `<!DOCTYPE html><html><head><style>* { cursor: ${selectMode ? 'crosshair' : 'default'} !important; } ${highlightStyles}</style></head><body>${pageHtml}${selectModeScript}</body></html>`;
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setSelectedElement({
          selector: e.data.selector, tagName: e.data.tagName,
          textContent: e.data.textContent, boundingRect: e.data.boundingRect,
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
      id: `wp-${Date.now()}`, name: newPointForm.name!, selector: selectedElement.selector,
      attribute: newPointForm.attribute || 'textContent', description: newPointForm.description || '',
      sampleValue: selectedElement.textContent, category: newPointForm.category || 'custom',
      alertThreshold: newPointForm.alertThreshold, alertCondition: newPointForm.alertCondition,
    };
    setMappingPoints(prev => [...prev, point]);
    setSelectedElement(null);
    setNewPointForm({ name: '', category: 'custom', attribute: 'textContent', description: '' });
    toast({ title: `Ponto "${point.name}" mapeado com sucesso` });
  };

  const saveProfile = () => {
    if (mappingPoints.length === 0) {
      toast({ title: 'Adicione pelo menos um ponto de mapeamento', variant: 'destructive' });
      return;
    }
    const baseUrl = `${protocol}://${printerIp}`;
    if (editingProfileId) {
      updateWebProfile(editingProfileId, {
        name: profileName, brand, model, baseUrl,
        mappingPoints, updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Mapeamento atualizado com sucesso' });
    } else {
      addWebProfile({
        id: `web-${Date.now()}`, name: profileName, brand, model, baseUrl,
        pages: [], mappingPoints,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Mapeamento criado com sucesso' });
    }
    setStep('list');
  };

  // --- LIST VIEW ---
  if (step === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MousePointer2 className="w-6 h-6" /> Mapeamento Web
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mapeie visualmente os dados da interface web das impressoras via HTTP/HTTPS
            </p>
          </div>
          <Button onClick={startNewMapping}>
            <Plus className="w-4 h-4 mr-2" /> Novo Mapeamento
          </Button>
        </div>

        {webProfiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Monitor className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Nenhum mapeamento configurado</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Crie um mapeamento web para capturar dados diretamente da interface web da sua impressora.
                Basta informar o IP, navegar até os dados e clicar para mapear.
              </p>
              <Button className="mt-6" onClick={startNewMapping}>
                <MousePointer2 className="w-4 h-4 mr-2" /> Criar Primeiro Mapeamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {webProfiles.map(profile => (
              <Card key={profile.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{profile.name}</CardTitle>
                        <CardDescription className="font-mono text-xs">{profile.baseUrl}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{profile.brand}</Badge>
                      {profile.model && <Badge variant="outline">{profile.model}</Badge>}
                      <Badge>{profile.mappingPoints.length} pontos</Badge>
                      <Button size="sm" variant="outline" onClick={() => editMapping(profile)}>
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                        removeWebProfile(profile.id);
                        toast({ title: 'Mapeamento removido' });
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs">Seletor CSS</TableHead>
                        <TableHead className="text-xs">Valor Exemplo</TableHead>
                        <TableHead className="text-xs">Alerta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.mappingPoints.map((point, idx) => (
                        <TableRow key={point.id}>
                          <TableCell className="text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{point.name}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{categoryLabels[point.category]}</Badge></TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate">{point.selector}</TableCell>
                          <TableCell className="text-xs font-mono">{point.sampleValue || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {point.alertThreshold !== undefined ? `${point.alertCondition} ${point.alertThreshold}` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- CONFIG STEP ---
  if (step === 'config') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointer2 className="w-6 h-6" /> Novo Mapeamento Web
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure os dados da impressora para iniciar o mapeamento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Protocolo de Conexão</CardTitle>
            <CardDescription>Selecione como acessar a interface da impressora</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setProtocol('http')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                  protocol === 'http'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Unlock className={cn("w-6 h-6", protocol === 'http' ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="font-semibold text-sm">HTTP</p>
                  <p className="text-xs text-muted-foreground">Conexão padrão (porta 80)</p>
                </div>
              </button>
              <button
                onClick={() => setProtocol('https')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                  protocol === 'https'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Lock className={cn("w-6 h-6", protocol === 'https' ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="font-semibold text-sm">HTTPS</p>
                  <p className="text-xs text-muted-foreground">Conexão segura (porta 443)</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Dados da Impressora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>IP da Impressora *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md">{protocol}://</span>
                <Input
                  value={printerIp}
                  onChange={e => setPrinterIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="font-mono"
                />
              </div>
              {printerIp && (
                <p className="text-xs text-muted-foreground font-mono">URL final: {fullUrl}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nome do Mapeamento *</Label>
              <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ex: HP LaserJet 402 - Sala TI" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: HP, Brother, Epson..." />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: LaserJet Pro M402" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('list')}>Voltar</Button>
          <Button onClick={goToMapper}>
            Abrir Página da Impressora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // --- MAPPER STEP ---
  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MousePointer2 className="w-5 h-5" /> Mapeando: {profileName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Navegue pela página e clique nos elementos para mapear os dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep('list')}>Cancelar</Button>
          <Button size="sm" onClick={saveProfile} disabled={mappingPoints.length === 0}>
            <Save className="w-4 h-4 mr-1" /> Salvar ({mappingPoints.length} pontos)
          </Button>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex gap-2 items-center shrink-0">
        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1.5 rounded">{protocol}://</span>
        <Input
          value={navigateUrl.replace(`${protocol}://`, '')}
          onChange={e => setNavigateUrl(`${protocol}://${e.target.value}`)}
          className="h-8 text-sm font-mono flex-1"
          placeholder="192.168.1.100/pagina"
          onKeyDown={e => e.key === 'Enter' && fetchPage()}
        />
        <Button size="sm" className="h-8" onClick={() => fetchPage()} disabled={loading}>
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          <span className="ml-1">Carregar</span>
        </Button>
        <Button
          size="sm"
          variant={selectMode ? 'default' : 'outline'}
          className="h-8"
          onClick={() => setSelectMode(!selectMode)}
          disabled={!pageHtml}
        >
          <Crosshair className="w-3.5 h-3.5 mr-1" />
          {selectMode ? 'Selecionando...' : 'Modo Seleção'}
        </Button>
      </div>

      {/* Main area */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Web page preview */}
        <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b shrink-0">
            <div className={cn("w-2 h-2 rounded-full", pageHtml ? 'bg-green-500' : 'bg-muted-foreground/30')} />
            <span className="text-[10px] text-muted-foreground font-mono truncate">{currentUrl || 'Nenhuma página carregada'}</span>
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
                <Globe className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">Clique em "Carregar" para abrir a página da impressora</p>
                <p className="text-xs mt-1">URL: {navigateUrl || fullUrl}</p>
              </div>
            )}
            {selectMode && pageHtml && (
              <div className="absolute top-2 left-2 right-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs flex items-center gap-2 shadow-lg z-10">
                <Target className="w-4 h-4 animate-pulse" />
                <span className="font-medium">Modo Seleção Ativo</span>
                <span className="opacity-75">— Clique em qualquer elemento da página para capturá-lo</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <ScrollArea className="h-full">
          <div className="space-y-3 pr-2">
            {/* Selected element form */}
            {selectedElement && (
              <Card className="border-primary/50 shadow-md">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Elemento Selecionado
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSelectedElement(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <div className="p-2 rounded bg-muted/50 border">
                    <p className="text-[9px] text-muted-foreground font-mono break-all">{selectedElement.selector}</p>
                    <p className="text-xs mt-1 font-medium truncate">
                      &lt;{selectedElement.tagName.toLowerCase()}&gt; {selectedElement.textContent.substring(0, 80)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nome do dado *</Label>
                    <Input value={newPointForm.name} onChange={e => setNewPointForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Nível Toner Preto" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Descrição</Label>
                    <Input value={newPointForm.description} onChange={e => setNewPointForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição opcional" className="h-7 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
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
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Extrair</Label>
                      <Select value={newPointForm.attribute} onValueChange={v => setNewPointForm(p => ({ ...p, attribute: v as any }))}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="textContent">Texto</SelectItem>
                          <SelectItem value="value">Valor (input)</SelectItem>
                          <SelectItem value="innerHTML">HTML</SelectItem>
                          <SelectItem value="src">URL (src)</SelectItem>
                          <SelectItem value="alt">Alt text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Limite Alerta</Label>
                      <Input type="number" value={newPointForm.alertThreshold || ''} onChange={e => setNewPointForm(p => ({ ...p, alertThreshold: Number(e.target.value) || undefined }))} className="h-7 text-xs" placeholder="20" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Condição</Label>
                      <Select value={newPointForm.alertCondition || '<'} onValueChange={v => setNewPointForm(p => ({ ...p, alertCondition: v as any }))}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<">{'< menor'}</SelectItem>
                          <SelectItem value=">">{'> maior'}</SelectItem>
                          <SelectItem value="=">{'= igual'}</SelectItem>
                          <SelectItem value="!=">{'!= diferente'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs" onClick={addMappingPoint}>
                    <Plus className="w-3 h-3 mr-1" /> Mapear Este Dado
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mapped points */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1">
                  Dados Mapeados ({mappingPoints.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-3 pb-3">
                {mappingPoints.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-[10px]">Ative o modo seleção e clique nos dados que deseja monitorar</p>
                  </div>
                )}
                {mappingPoints.map((point, idx) => (
                  <div key={point.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 border text-xs">
                    <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{point.name}</p>
                      <p className="text-[9px] text-muted-foreground font-mono truncate">{point.sampleValue || point.selector}</p>
                    </div>
                    <Badge variant="secondary" className="text-[8px] shrink-0">{categoryLabels[point.category]}</Badge>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setMappingPoints(prev => prev.filter(p => p.id !== point.id))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Instructions */}
            {!selectedElement && mappingPoints.length === 0 && pageHtml && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <h4 className="text-xs font-semibold mb-2">Como mapear dados:</h4>
                  <ol className="text-[10px] text-muted-foreground space-y-1 text-left">
                    <li>1. Clique em <strong>"Modo Seleção"</strong> na barra acima</li>
                    <li>2. Passe o mouse sobre a informação desejada (ela ficará destacada em vermelho)</li>
                    <li>3. Clique no elemento para selecioná-lo</li>
                    <li>4. Dê um nome e configure a categoria</li>
                    <li>5. Clique em "Mapear Este Dado"</li>
                    <li>6. Repita para todos os dados desejados</li>
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
