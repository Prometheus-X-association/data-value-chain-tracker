export interface Distribution {
  provider: string;
  public_key: string;
  points: number;
}

export interface DistributeIncentiveRequest {
  distribution: Distribution[];
  contractId: string;
}
