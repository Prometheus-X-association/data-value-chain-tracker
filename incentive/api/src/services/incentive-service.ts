import amqp from "amqplib";
import { DistributeIncentiveRequest } from "../types/types";
import crypto from "crypto";

export class IncentiveService {
  private rabbitMQUrl: string;
  private queueName: string;
  private privateKey: string;

  constructor() {
    this.rabbitMQUrl = process.env.RABBITMQ_URL || "amqp://localhost";
    this.queueName = "incentiveQueue";
    this.privateKey = process.env.PRIVATE_KEY || "your-private-key"; // Load your private key securely
  }

  private generateHash(data: DistributeIncentiveRequest): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  private signMessage(hash: string): string {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(hash);
    sign.end();
    return sign.sign(this.privateKey, "hex");
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  public async sendToQueue(data: DistributeIncentiveRequest): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      const nonce = this.generateNonce();
      const hash = this.generateHash(data);
      const signature = this.signMessage(hash);

      const message = {
        ...data,
        metadata: {
          timestamp,
          nonce,
          hash,
          signature,
        },
      };

      const connection = await amqp.connect(this.rabbitMQUrl);
      const channel = await connection.createChannel();

      await channel.assertQueue(this.queueName, { durable: true });
      channel.sendToQueue(
        this.queueName,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
        },
      );

      await channel.close();
      await connection.close();
    } catch (error) {
      console.error("Error sending data to RabbitMQ:", error);
      throw new Error("Failed to send data to RabbitMQ");
    }
  }
}
