export interface IncentivePayload {
  useCaseId: string;
  recipient: string;
  eventName: string;
  amount: string;
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
export type PermitSignature = {
  v: number;
  r: string;
  s: string;
  deadline: number;
  value: string;
};

export type BasePermitRequest = PermitSignature & {
  owner: string;
  amount: string;
};

export type UseCaseDepositRequest = BasePermitRequest & {
  useCaseId: string;
};

export type TokenRewardRequest = BasePermitRequest & {
  incentiveType: string;
  recipient: string;
};

export type IncentiveRequest = UseCaseDepositRequest | TokenRewardRequest;
