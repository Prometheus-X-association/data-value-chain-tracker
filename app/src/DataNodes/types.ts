export interface Incentive {
  organizationId: string;
  numPoints: number;
  contractId: string;
}

export interface NodeLink {
  nodeId: string;
  '@nodeUrl'?: string;
}

export interface NodeMetadata {
  dvctId?: string;
  usecaseContractId?: string;
  dataProviderId?: string;
  dataConsumerId?: string;
  incentiveReceivedFrom?: Incentive[];
}

export interface ApiNode {
  nodeId: string;
  rawNodeId?: string;
  canonicalKey?: string;
  nodeType?: string;
  dataId?: string;
  participantId?: string;
  participantShare?: number;
  participantSourceId?: string;
  usecaseContractTitle?: string;
  nodeMetadata: NodeMetadata;
  prevNode: NodeLink[];
  childNode: NodeLink[];
}

export interface TreeApiNode {
  nodeId: string;
  rawNodeId?: string;
  canonicalKey?: string;
  nodeType?: string;
  dataId?: string;
  participantId?: string;
  participantShare?: number;
  participantSourceId?: string;
  usecaseContractTitle?: string;
  nodeMetadata: NodeMetadata;
  childNode: TreeApiNode[];
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  nodeType: string;
  incentiveTotal: number;
  participantShare: number;
  providerId: string;
  consumerId: string;
}

export interface FlowEdgeData extends Record<string, unknown> {
  label: string;
}
