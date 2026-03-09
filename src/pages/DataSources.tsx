import { useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SNMPProfileManager } from '@/components/datasources/SNMPProfileManager';
import { WebMapperManager } from '@/components/datasources/WebMapperManager';
import { Server, Globe, Upload, Download } from 'lucide-react';
import { useDataSources, DataSourceExport } from '@/context/DataSourceContext';
import { useToast } from '@/hooks/use-toast';

export default function DataSources() {
  const { importProfiles, exportProfiles } = useDataSources();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportProfiles();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printguard-datasources-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportação concluída', description: `${data.snmpProfiles.length} perfis SNMP e ${data.webProfiles.length} perfis Web exportados.` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as DataSourceExport;
        
        if (!data.snmpProfiles && !data.webProfiles) {
          toast({ title: 'Arquivo inválido', description: 'O arquivo não contém perfis SNMP ou Web válidos.', variant: 'destructive' });
          return;
        }

        const result = importProfiles(data);
        toast({
          title: 'Importação concluída',
          description: `SNMP: ${result.snmpAdded} adicionados, ${result.snmpSkipped} já existentes. Web: ${result.webAdded} adicionados, ${result.webSkipped} já existentes.`,
        });
      } catch {
        toast({ title: 'Erro na importação', description: 'O arquivo não é um JSON válido.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadDefault = async () => {
    try {
      const basePath = import.meta.env.VITE_BASE_PATH || '';
      const res = await fetch(`${basePath}/printguard-datasources.json`);
      const data = await res.json() as DataSourceExport;
      const result = importProfiles(data);
      toast({
        title: 'Perfis padrão carregados',
        description: `${result.snmpAdded} perfis SNMP adicionados, ${result.snmpSkipped} já existentes.`,
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o arquivo padrão.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fontes de Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure como os dados são coletados de cada impressora (SNMP ou Web)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadDefault}>
            <Download className="w-4 h-4 mr-2" /> Carregar Padrões
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Importar JSON
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Exportar JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <Tabs defaultValue="snmp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="snmp" className="gap-2">
            <Server className="w-3.5 h-3.5" /> SNMP (OIDs)
          </TabsTrigger>
          <TabsTrigger value="web" className="gap-2">
            <Globe className="w-3.5 h-3.5" /> Mapeamento Web (HTTP)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snmp">
          <SNMPProfileManager />
        </TabsContent>

        <TabsContent value="web">
          <WebMapperManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
