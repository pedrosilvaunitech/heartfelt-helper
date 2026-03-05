export interface WebMappingPoint {
  id: string;
  name: string;
  selector: string;
  attribute: 'textContent' | 'value' | 'innerHTML' | 'src' | 'alt';
  description: string;
  sampleValue?: string;
  category: 'supply' | 'status' | 'info' | 'counter' | 'custom';
  alertThreshold?: number;
  alertCondition?: '<' | '>' | '=' | '!=';
}

export interface WebMappingProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  baseUrl: string;
  pages: { url: string; label: string }[];
  mappingPoints: WebMappingPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface SNMPOIDMapping {
  id: string;
  name: string;
  oid: string;
  description: string;
  category: 'supply' | 'status' | 'info' | 'counter' | 'custom';
  valueType: 'percentage' | 'integer' | 'string' | 'boolean';
  alertThreshold?: number;
  alertCondition?: '<' | '>' | '=' | '!=';
}

export interface SNMPProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  snmpVersion: 'v1' | 'v2c' | 'v3';
  community?: string;
  oidMappings: SNMPOIDMapping[];
  createdAt: string;
}

export interface DataSourceConfig {
  printerId: string;
  type: 'snmp' | 'web' | 'hybrid';
  snmpProfileId?: string;
  webProfileId?: string;
}
