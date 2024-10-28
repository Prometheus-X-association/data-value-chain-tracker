export interface Distribution {
  provider: string;
  points: number;
}

export interface DistributeIncentiveRequest {
  distribution: Distribution[];
  contractId: string;
}
