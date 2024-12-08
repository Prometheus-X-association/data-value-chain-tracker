import { IKeyStorage } from "../interfaces/IKeyStorage";
import { KeyPair, IncentivePermission } from "../types/types";
import crypto from "crypto";

export class KeyManagementService {
  constructor(private storage: IKeyStorage) {}

  public async generateKeyPair(
    clientId: string,
    permissions: IncentivePermission[]
  ): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    await this.storage.save({
      clientId,
      publicKey,
      permissions,
      createdAt: new Date(),
    });

    return { privateKey, publicKey };
  }

  public async validatePermission(
    clientId: string,
    permission: IncentivePermission
  ): Promise<boolean> {
    const keyPair = await this.storage.get(clientId);
    if (!keyPair) return false;

    return keyPair.permissions.includes(permission);
  }

  public async getPublicKey(clientId: string): Promise<string | null> {
    const keyPair = await this.storage.get(clientId);
    return keyPair?.publicKey || null;
  }

  public async revokeAccess(clientId: string): Promise<boolean> {
    return this.storage.delete(clientId);
  }

  public async listClients(): Promise<KeyPair[]> {
    return this.storage.list();
  }
}
