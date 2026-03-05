import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SNMPProfileManager } from '@/components/datasources/SNMPProfileManager';
import { WebMapperManager } from '@/components/datasources/WebMapperManager';
import { Server, Globe } from 'lucide-react';

export default function DataSources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fontes de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure como os dados são coletados de cada impressora (SNMP ou Web)</p>
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
