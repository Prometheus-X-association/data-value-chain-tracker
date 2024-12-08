export interface IncentiveRequest {
  clientId: string;
  recipient: string;
  amount: string;
  nonce: number; // Prevent replay attacks
  timestamp: number;
  signature: string;
}

export interface IncentivePayload {
  recipient: string;
  amount: string;
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
