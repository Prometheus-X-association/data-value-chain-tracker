import express from "express";
import { PingController } from "../controllers/ping";
import { WalletBalanceController } from "../controllers/wallet";
import { TransactionHistoryController } from "../controllers/transaction";
import { AuditLogController } from "../controllers/audit-log";
import { hasError } from "../lib/error";
import { DistributeIncentiveController } from "../controllers/distribute-incentives";
import { DistributeIncentiveRequest } from "../types/types";

const router = express.Router();

router.get("/ping", async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.get("/incentives/balance/:walletId", async (req, res) => {
  const controller = new WalletBalanceController();
  try {
    const response = await controller.getBalance(req.params.walletId);
    return res.send(response);
  } catch (error) {
    var [err, ok] = hasError(error);
    if (ok) {
      return res.status(404).send({ error: err });
    } else {
      return res.status(500).send({ error: "Internal server error" });
    }
  }
});

router.get("/incentives/history/:walletId", async (req, res) => {
  const controller = new TransactionHistoryController();
  try {
    const response = await controller.getHistory(
      req.params.walletId,
      req.query.startDate as string,
      req.query.endDate as string,
    );
    return res.send(response);
  } catch (error) {
    var [err, ok] = hasError(error);
    if (ok) {
      return res.status(404).send({ error: err });
    } else {
      return res.status(500).send({ error: "Internal server error" });
    }
  }
});

router.get("/incentives/audit-log", async (_req, res) => {
  const controller = new AuditLogController();
  try {
    const response = await controller.getAuditLog();
    return res.send(response);
  } catch (error) {
    return res.status(500).send({ error: "Internal server error" });
  }
});

router.post("/incentives/distribute", async (req, res) => {
  const controller = new DistributeIncentiveController();
  const requestBody: DistributeIncentiveRequest = req.body;

  try {
    const response = await controller.distributeIncentive(requestBody);
    return res.send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
