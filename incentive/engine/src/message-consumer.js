"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = __importDefault(require("amqplib"));
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const accounts_1 = require("viem/accounts");
const crypto_1 = __importStar(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "incentiveQueue";
const PUBLIC_KEY = process.env.PUBLIC_KEY || "";
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BLOCKCHAIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
if (!PUBLIC_KEY || !BLOCKCHAIN_RPC_URL || !PRIVATE_KEY) {
    throw new Error("Missing essential environment variables");
}
const publicClient = (0, viem_1.createPublicClient)({
    chain: chains_1.hardhat,
    transport: (0, viem_1.http)(BLOCKCHAIN_RPC_URL),
});
const account = (0, accounts_1.privateKeyToAccount)(`0x${BLOCKCHAIN_PRIVATE_KEY}`);
const walletClient = (0, viem_1.createWalletClient)({
    account,
    chain: chains_1.hardhat,
    transport: (0, viem_1.http)(BLOCKCHAIN_RPC_URL),
});
function verifyMessage(data) {
    const { metadata } = data, originalData = __rest(data, ["metadata"]);
    const { hash, signature, timestamp, nonce } = metadata;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - timestamp > 300) {
        console.error("Message expired.");
        return false;
    }
    const recalculatedHash = crypto_1.default
        .createHash("sha256")
        .update(JSON.stringify(originalData))
        .digest("hex");
    if (hash !== recalculatedHash) {
        console.error("Hash mismatch.");
        return false;
    }
    /* RSA
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(hash);
    verify.end();
    return verify.verify(PUBLIC_KEY, signature, "hex");
    */
    const expectedSignature = (0, crypto_1.createHmac)("sha256", PRIVATE_KEY)
        .update(hash)
        .digest("base64");
    const expectedBuffer = Buffer.from(expectedSignature, "base64");
    const signatureBuffer = Buffer.from(signature, "base64");
    if (expectedBuffer.length !== signatureBuffer.length ||
        !(0, crypto_1.timingSafeEqual)(expectedBuffer, signatureBuffer)) {
        console.error("Signature mismatch.");
        return false;
    }
    return true;
}
function processMessage(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const { contractId, distribution } = data;
        try {
            for (const { provider, points, public_key } of distribution) {
                const tx = yield walletClient.sendTransaction({
                    to: public_key,
                    value: (0, viem_1.parseEther)(points.toString()),
                    chain: chains_1.hardhat,
                });
                console.log(`Transaction sent to ${provider}:`, tx);
                // Wait for confirmation
                const receipt = yield publicClient.waitForTransactionReceipt({
                    hash: tx,
                });
                console.log(`Transaction confirmed: ${receipt.transactionHash}`);
            }
            console.log("Incentive distribution processed for contract ID:", contractId);
        }
        catch (error) {
            console.error("Failed to process message on the blockchain:", error);
        }
    });
}
function consumeMessages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = yield amqplib_1.default.connect(RABBITMQ_URL);
            const channel = yield connection.createChannel();
            yield channel.assertQueue(QUEUE_NAME, { durable: true });
            console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);
            channel.consume(QUEUE_NAME, (msg) => __awaiter(this, void 0, void 0, function* () {
                if (msg !== null) {
                    const message = JSON.parse(msg.content.toString());
                    console.log("Received message:", message);
                    if (verifyMessage(message)) {
                        yield processMessage(message);
                        // Omit for testing
                        //channel.ack(msg);
                    }
                    else {
                        console.error("Message verification failed.");
                        // Might want a deadletter queue
                        channel.nack(msg, false, false);
                    }
                }
            }));
        }
        catch (error) {
            console.error("Error consuming messages:", error);
        }
    });
}
consumeMessages();
