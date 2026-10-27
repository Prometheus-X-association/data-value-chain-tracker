export interface Incentive {
  organizationId: string;
  numPoints: number;
  contractId: string;
  dvctId?: string;
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

// One data exchange that ran through a node.
export interface Execution {
  dvctId: string;
  executedAt?: string;
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
  executions?: Execution[];
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
  executions?: Execution[];
  childNode: TreeApiNode[];
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  nodeType: string;
  incentiveTotal: number;
  participantShare: number;
  isRoot: boolean;
  providerId: string;
  consumerIds: string[];
  executionCount: number;
}

export interface FlowEdgeData extends Record<string, unknown> {
  label: string;
}
