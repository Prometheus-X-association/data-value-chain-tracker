import Joi from "joi";
import { Request, Response } from "express";
import { ethers } from "ethers";
import { IncentiveService, RequestError } from "../services/IncentiveService";
import { UseCaseDepositRequest } from "../types/types";

const address = Joi.string().custom((value, helpers) =>
  ethers.isAddress(value) && value !== ethers.ZeroAddress ? value : helpers.error("any.invalid")
);
const bytes32 = Joi.string().pattern(/^0x[0-9a-fA-F]{64}$/);

const depositSchema = Joi.object<UseCaseDepositRequest>({
  useCaseId: Joi.string().trim().min(1).max(256).required(),
  from: address.required(),
  to: address.required(),
  amount: Joi.string()
    .pattern(/^\d+(\.\d{1,18})?$/)
    .required(),
  permit: Joi.object({
    owner: address.required(),
    spender: address.required(),
    amount: Joi.string().pattern(/^\d+$/).required(),
    deadline: Joi.number().integer().positive().required(),
    v: Joi.number().integer().valid(27, 28).required(),
    r: bytes32.required(),
    s: bytes32.required(),
  }).required(),
});

export class IncentiveController {
  constructor(private incentiveService: IncentiveService) {}

  public distributeIncentive = async (req: Request, res: Response): Promise<void> => {
    const { value, error } = depositSchema.validate(req.body, { abortEarly: true });

    if (error) {
      res.status(400).json({ success: false, error: `Invalid request body: ${error.message}` });
      return;
    }
    if (Number(value.amount) <= 0) {
      res.status(400).json({ success: false, error: "Invalid request body: amount must be positive" });
      return;
    }

    try {
      const transactionHash = await this.incentiveService.depositRewardsWithPermit(value);
      res.status(200).json({ success: true, data: { transactionHash, useCaseId: value.useCaseId } });
    } catch (err) {
      if (err instanceof RequestError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      const failure = err as { code?: string; reason?: string | null; data?: string };
      console.error("Incentive deposit failed:", (err as Error)?.message);

      // A revert is a definitive answer from the contract: report it as such (not retryable).
      if (failure?.code === "CALL_EXCEPTION") {
        const detail = failure.reason || (failure.data ? `error ${String(failure.data).slice(0, 10)}` : "reverted");
        res.status(422).json({ success: false, error: `Transaction rejected by the contract: ${detail}` });
        return;
      }

      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };
}
