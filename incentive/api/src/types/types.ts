export type Permit = {
  owner: string;
  spender: string;
  amount: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
};

export type UseCaseDepositRequest = {
  useCaseId: string;
  from: string;
  to: string;
  amount: string;
  permit: Permit;
};
