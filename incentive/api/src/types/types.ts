export interface IncentiveRequest {
  clientId: string;
  useCaseId: string;
  recipient: string;
  eventName: string;
  amount: string;
  factor: string; // Between 0.0 and 1.0. Might come from oracle in the future
  nonce: number;
  timestamp: number;
  signature: string;
}

export interface IncentivePayload {
  useCaseId: string;
  recipient: string;
  eventName: string;
  factor: string;
  nonce: number;
  timestamp: number;
  clientId: string;
}

export interface KeyPair {
  clientId: string;
  publicKey: string;
  permissions: IncentivePermission[];
  createdAt: Date;
  lastUsed?: Date;
}

export enum IncentivePermission {
  DISTRIBUTE = "distribute",
  // We can add more permissions later
}
