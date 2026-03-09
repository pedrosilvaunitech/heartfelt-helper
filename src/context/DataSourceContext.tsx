import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { WebMappingProfile, SNMPProfile } from '@/types/dataSources';

// Default SNMP profiles
const defaultSNMPProfiles: SNMPProfile[] = [
  {
    id: 'snmp-universal',
    name: 'Perfil Universal (RFC 3805)',
    brand: 'Universal',
    model: 'Todos',
    snmpVersion: 'v2c',
    community: 'public',
    oidMappings: [
      { id: 'oid-1', name: 'Descrição do Sistema', oid: '1.3.6.1.2.1.1.1.0', description: 'sysDescr', category: 'info', valueType: 'string' },
      { id: 'oid-2', name: 'Nome do Dispositivo', oid: '1.3.6.1.2.1.25.3.2.1.3', description: 'hrDeviceDescr', category: 'info', valueType: 'string' },
      { id: 'oid-3', name: 'Nível do Toner', oid: '1.3.6.1.2.1.43.11.1.1.9', description: 'prtMarkerSuppliesLevel', category: 'supply', valueType: 'percentage', alertThreshold: 20, alertCondition: '<' },
      { id: 'oid-4', name: 'Capacidade Máxima Toner', oid: '1.3.6.1.2.1.43.11.1.1.8', description: 'prtMarkerSuppliesMaxCapacity', category: 'supply', valueType: 'integer' },
      { id: 'oid-5', name: 'Nível do Papel', oid: '1.3.6.1.2.1.43.8.2.1.10', description: 'prtInputCurrentLevel', category: 'supply', valueType: 'percentage', alertThreshold: 15, alertCondition: '<' },
      { id: 'oid-6', name: 'Contador de Páginas', oid: '1.3.6.1.2.1.43.10.2.1.4', description: 'prtMarkerLifeCount', category: 'counter', valueType: 'integer' },
      { id: 'oid-7', name: 'Status do Dispositivo', oid: '1.3.6.1.2.1.25.3.5.1.1', description: 'hrPrinterStatus', category: 'status', valueType: 'integer' },
      { id: 'oid-8', name: 'Serial Number', oid: '1.3.6.1.2.1.43.5.1.1.17', description: 'prtGeneralSerialNumber', category: 'info', valueType: 'string' },
      { id: 'oid-9', name: 'Uptime', oid: '1.3.6.1.2.1.1.3.0', description: 'sysUpTime', category: 'info', valueType: 'integer' },
    ],
    createdAt: new Date().toISOString(),
  },
];

export interface DataSourceExport {
  version: string;
  exportDate: string;
  description?: string;
  snmpProfiles: SNMPProfile[];
  webProfiles: WebMappingProfile[];
}

interface DataSourceContextType {
  snmpProfiles: SNMPProfile[];
  webProfiles: WebMappingProfile[];
  addSNMPProfile: (profile: SNMPProfile) => void;
  updateSNMPProfile: (id: string, profile: Partial<SNMPProfile>) => void;
  removeSNMPProfile: (id: string) => void;
  addWebProfile: (profile: WebMappingProfile) => void;
  updateWebProfile: (id: string, profile: Partial<WebMappingProfile>) => void;
  removeWebProfile: (id: string) => void;
  importProfiles: (data: DataSourceExport) => { snmpAdded: number; webAdded: number; snmpSkipped: number; webSkipped: number };
  exportProfiles: () => DataSourceExport;
}

const DataSourceContext = createContext<DataSourceContextType | null>(null);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [snmpProfiles, setSNMPProfiles] = useState<SNMPProfile[]>(defaultSNMPProfiles);
  const [webProfiles, setWebProfiles] = useState<WebMappingProfile[]>([]);

  const addSNMPProfile = (profile: SNMPProfile) => setSNMPProfiles(prev => [...prev, profile]);
  const updateSNMPProfile = (id: string, updates: Partial<SNMPProfile>) => setSNMPProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const removeSNMPProfile = (id: string) => setSNMPProfiles(prev => prev.filter(p => p.id !== id));
  const addWebProfile = (profile: WebMappingProfile) => setWebProfiles(prev => [...prev, profile]);
  const updateWebProfile = (id: string, updates: Partial<WebMappingProfile>) => setWebProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const removeWebProfile = (id: string) => setWebProfiles(prev => prev.filter(p => p.id !== id));

  const importProfiles = useCallback((data: DataSourceExport) => {
    let snmpAdded = 0, webAdded = 0, snmpSkipped = 0, webSkipped = 0;

    if (data.snmpProfiles) {
      data.snmpProfiles.forEach(profile => {
        setSNMPProfiles(prev => {
          if (prev.some(p => p.id === profile.id)) {
            snmpSkipped++;
            return prev;
          }
          snmpAdded++;
          return [...prev, profile];
        });
      });
    }

    if (data.webProfiles) {
      data.webProfiles.forEach(profile => {
        setWebProfiles(prev => {
          if (prev.some(p => p.id === profile.id)) {
            webSkipped++;
            return prev;
          }
          webAdded++;
          return [...prev, profile];
        });
      });
    }

    return { snmpAdded, webAdded, snmpSkipped, webSkipped };
  }, []);

  const exportProfiles = useCallback((): DataSourceExport => {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      description: 'PrintGuard - Exportação de fontes de dados',
      snmpProfiles,
      webProfiles,
    };
  }, [snmpProfiles, webProfiles]);

  return (
    <DataSourceContext.Provider value={{
      snmpProfiles, webProfiles,
      addSNMPProfile, updateSNMPProfile, removeSNMPProfile,
      addWebProfile, updateWebProfile, removeWebProfile,
      importProfiles, exportProfiles,
    }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSources() {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSources must be used within DataSourceProvider');
  return ctx;
}
