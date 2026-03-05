import { useState, createContext, useContext, ReactNode } from 'react';
import { WebMappingProfile, SNMPProfile, WebMappingPoint, SNMPOIDMapping } from '@/types/dataSources';

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
  {
    id: 'snmp-hp',
    name: 'HP LaserJet Series',
    brand: 'HP',
    model: 'LaserJet',
    snmpVersion: 'v2c',
    community: 'public',
    oidMappings: [
      { id: 'hp-1', name: 'Toner Black Level', oid: '1.3.6.1.2.1.43.11.1.1.9.1.1', description: 'Black toner remaining', category: 'supply', valueType: 'percentage', alertThreshold: 20, alertCondition: '<' },
      { id: 'hp-2', name: 'Toner Cyan Level', oid: '1.3.6.1.2.1.43.11.1.1.9.1.2', description: 'Cyan toner remaining', category: 'supply', valueType: 'percentage', alertThreshold: 20, alertCondition: '<' },
      { id: 'hp-3', name: 'Toner Magenta Level', oid: '1.3.6.1.2.1.43.11.1.1.9.1.3', description: 'Magenta toner remaining', category: 'supply', valueType: 'percentage', alertThreshold: 20, alertCondition: '<' },
      { id: 'hp-4', name: 'Toner Yellow Level', oid: '1.3.6.1.2.1.43.11.1.1.9.1.4', description: 'Yellow toner remaining', category: 'supply', valueType: 'percentage', alertThreshold: 20, alertCondition: '<' },
      { id: 'hp-5', name: 'Total Pages Printed', oid: '1.3.6.1.2.1.43.10.2.1.4.1.1', description: 'Lifetime page count', category: 'counter', valueType: 'integer' },
      { id: 'hp-6', name: 'Printer Status', oid: '1.3.6.1.4.1.11.2.3.9.1.1.3.0', description: 'HP specific status', category: 'status', valueType: 'integer' },
      { id: 'hp-7', name: 'Fuser Kit Life', oid: '1.3.6.1.2.1.43.11.1.1.9.1.5', description: 'Fuser remaining life', category: 'supply', valueType: 'percentage', alertThreshold: 10, alertCondition: '<' },
      { id: 'hp-8', name: 'Maintenance Kit', oid: '1.3.6.1.2.1.43.11.1.1.9.1.6', description: 'Maintenance kit remaining', category: 'supply', valueType: 'percentage', alertThreshold: 10, alertCondition: '<' },
      { id: 'hp-9', name: 'Paper Tray 1', oid: '1.3.6.1.2.1.43.8.2.1.10.1.1', description: 'Tray 1 level', category: 'supply', valueType: 'percentage', alertThreshold: 15, alertCondition: '<' },
      { id: 'hp-10', name: 'Paper Tray 2', oid: '1.3.6.1.2.1.43.8.2.1.10.1.2', description: 'Tray 2 level', category: 'supply', valueType: 'percentage', alertThreshold: 15, alertCondition: '<' },
    ],
    createdAt: new Date().toISOString(),
  },
];

interface DataSourceContextType {
  snmpProfiles: SNMPProfile[];
  webProfiles: WebMappingProfile[];
  addSNMPProfile: (profile: SNMPProfile) => void;
  updateSNMPProfile: (id: string, profile: Partial<SNMPProfile>) => void;
  removeSNMPProfile: (id: string) => void;
  addWebProfile: (profile: WebMappingProfile) => void;
  updateWebProfile: (id: string, profile: Partial<WebMappingProfile>) => void;
  removeWebProfile: (id: string) => void;
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

  return (
    <DataSourceContext.Provider value={{
      snmpProfiles, webProfiles,
      addSNMPProfile, updateSNMPProfile, removeSNMPProfile,
      addWebProfile, updateWebProfile, removeWebProfile,
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
