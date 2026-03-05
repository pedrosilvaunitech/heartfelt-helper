import { useState, useRef, useEffect } from 'react';
import { useDataSources } from '@/context/DataSourceContext';
import { WebMappingProfile, WebMappingPoint } from '@/types/dataSources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Globe, Crosshair, RefreshCw, X, CheckCircle2, Target } from 'lucide-react';
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

interface WebMapperInlineProps {
  printerIp: string;
  printerBrand: string;
  printerModel: string;
  onClose: () => void;
}

export function WebMapperInline({ printerIp, printerBrand, printerModel, onClose }: WebMapperInlineProps) {
  const { addWebProfile } = useDataSources();
  const [pageHtml, setPageHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [url, setUrl] = useState(`http://${printerIp}`);
  const [profileName, setProfileName] = useState(`${printerBrand} ${printerModel} Web`);
  const [mappingPoints, setMappingPoints] = useState<WebMappingPoint[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [newPointForm, setNewPointForm] = useState<Partial<WebMappingPoint>>({
    name: '', category: 'custom', attribute: 'textContent', description: '',
  });

  const fetchPage = async () => {
    if (!url) { toast({ title: 'Informe a URL', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('printer-proxy', { body: { url } });
      if (error) throw error;
      if (data?.html) {
        setPageHtml(data.html);
        toast({ title: 'Página carregada' });
      } else {
        toast({ title: 'Não foi possível carregar', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const getInjectedHtml = () => {
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

    return `<!DOCTYPE html><html><head><style>* { cursor: ${selectMode ? 'crosshair' : 'default'} !important; }</style></head><body>${pageHtml}${selectModeScript}</body></html>`;
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setSelectedElement({ selector: e.data.selector, tagName: e.data.tagName, textContent: e.data.textContent, boundingRect: e.data.boundingRect });
        setNewPointForm(prev => ({ ...prev, name: '', description: '' }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addMappingPoint = () => {
    if (!selectedElement || !newPointForm.name) { toast({ title: 'Selecione um elemento e dê um nome', variant: 'destructive' }); return; }
    const point: WebMappingPoint = {
      id: `wp-${Date.now()}`, name: newPointForm.name!, selector: selectedElement.selector,
      attribute: newPointForm.attribute || 'textContent', description: newPointForm.description || '',
      sampleValue: selectedElement.textContent, category: newPointForm.category || 'custom',
      alertThreshold: newPointForm.alertThreshold, alertCondition: newPointForm.alertCondition,
    };
    setMappingPoints(prev => [...prev, point]);
    setSelectedElement(null);
    setNewPointForm({ name: '', category: 'custom', attribute: 'textContent', description: '' });
    toast({ title: `Ponto "${point.name}" mapeado` });
  };

  const saveProfile = () => {
    if (!profileName) { toast({ title: 'Informe um nome', variant: 'destructive' }); return; }
    addWebProfile({
      id: `web-${Date.now()}`, name: profileName, brand: printerBrand, model: printerModel,
      baseUrl: url, pages: [], mappingPoints, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    toast({ title: 'Mapeamento web salvo com sucesso' });
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 h-full max-h-[75vh]">
      {/* URL bar */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">URL da Impressora</Label>
          <div className="flex gap-1">
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://192.168.1.100" className="h-8 text-sm font-mono" />
            <Button size="sm" className="h-8 shrink-0" onClick={fetchPage} disabled={loading}>
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nome do Perfil</Label>
          <Input value={profileName} onChange={e => setProfileName(e.target.value)} className="h-8 text-sm w-48" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0 overflow-hidden">
        {/* Preview */}
        <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", pageHtml ? 'bg-success' : 'bg-muted-foreground/30')} />
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[250px]">{url}</span>
            </div>
            <Button size="sm" variant={selectMode ? 'default' : 'outline'} className="h-6 text-[10px]" onClick={() => setSelectMode(!selectMode)} disabled={!pageHtml}>
              <Crosshair className="w-3 h-3 mr-1" /> {selectMode ? 'Selecionando...' : 'Modo Seleção'}
            </Button>
          </div>
          <div className="flex-1 bg-white relative">
            {pageHtml ? (
              <iframe ref={iframeRef} srcDoc={getInjectedHtml()} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" title="Printer Page" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Globe className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-xs">Clique em carregar para visualizar a página da impressora</p>
              </div>
            )}
            {selectMode && pageHtml && (
              <div className="absolute top-2 left-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[10px] flex items-center gap-2 shadow-lg z-10">
                <Target className="w-3 h-3 animate-pulse" /> Clique em um elemento para selecioná-lo
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {selectedElement && (
            <Card className="border-primary/50">
              <CardHeader className="pb-1 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Selecionado</CardTitle>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSelectedElement(null)}><X className="w-3 h-3" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <div className="p-1.5 rounded bg-muted/50 border">
                  <p className="text-[9px] text-muted-foreground font-mono break-all">{selectedElement.selector}</p>
                  <p className="text-[10px] mt-0.5 font-medium truncate">&lt;{selectedElement.tagName.toLowerCase()}&gt; {selectedElement.textContent.substring(0, 50)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px]">Nome *</Label>
                  <Input value={newPointForm.name} onChange={e => setNewPointForm(p => ({ ...p, name: e.target.value }))} placeholder="Nível Toner Preto" className="h-6 text-[10px]" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[9px]">Categoria</Label>
                    <Select value={newPointForm.category} onValueChange={v => setNewPointForm(p => ({ ...p, category: v as any }))}>
                      <SelectTrigger className="h-6 text-[9px]"><SelectValue /></SelectTrigger>
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
                    <Label className="text-[9px]">Extrair</Label>
                    <Select value={newPointForm.attribute} onValueChange={v => setNewPointForm(p => ({ ...p, attribute: v as any }))}>
                      <SelectTrigger className="h-6 text-[9px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="textContent">Texto</SelectItem>
                        <SelectItem value="value">Valor</SelectItem>
                        <SelectItem value="innerHTML">HTML</SelectItem>
                        <SelectItem value="src">URL (src)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[9px]">Limite Alerta</Label>
                    <Input type="number" value={newPointForm.alertThreshold || ''} onChange={e => setNewPointForm(p => ({ ...p, alertThreshold: Number(e.target.value) || undefined }))} className="h-6 text-[10px]" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px]">Condição</Label>
                    <Select value={newPointForm.alertCondition || '<'} onValueChange={v => setNewPointForm(p => ({ ...p, alertCondition: v as any }))}>
                      <SelectTrigger className="h-6 text-[9px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<">{'< menor'}</SelectItem>
                        <SelectItem value=">">{'> maior'}</SelectItem>
                        <SelectItem value="=">{'= igual'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" className="w-full h-6 text-[10px]" onClick={addMappingPoint}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Ponto
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px]">Pontos Mapeados ({mappingPoints.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 pb-3">
              {mappingPoints.length === 0 && (
                <p className="text-[9px] text-muted-foreground text-center py-3">Ative o modo seleção e clique nos elementos</p>
              )}
              {mappingPoints.map((point, idx) => (
                <div key={point.id} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50 border text-[10px]">
                  <div className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{point.name}</p>
                    <p className="text-[8px] text-muted-foreground font-mono truncate">{point.sampleValue}</p>
                  </div>
                  <Badge variant="secondary" className="text-[7px] shrink-0">{categoryLabels[point.category]}</Badge>
                  <Button size="sm" variant="ghost" className="h-4 w-4 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setMappingPoints(prev => prev.filter(p => p.id !== point.id))}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={saveProfile} disabled={mappingPoints.length === 0}>
          Salvar Mapeamento ({mappingPoints.length} pontos)
        </Button>
      </div>
    </div>
  );
}
