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

export type Permit = {
  owner: string;
  spender: string;
  amount: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
};

export type TransferRequest = {
  from: string;
  to: string;
  amount: string;
};

export type UseCaseDepositRequest = TransferRequest & {
  useCaseId: string;
  permit?: Permit;
};

export type TokenRewardRequest = TransferRequest & {
  incentiveType: string;
  permit?: Permit;
};

export type IncentiveRequest = UseCaseDepositRequest | TokenRewardRequest;
