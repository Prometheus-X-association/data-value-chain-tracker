import { KeyPair } from "@/types/types";
import { IKeyStorage } from "../interfaces/IKeyStorage";
import fs from "fs/promises";
import path from "path";

export class FileKeyStorage implements IKeyStorage {
  private storagePath: string;
  private readonly fileName = "keypairs.json";

  constructor(storagePath: string = "storage") {
    this.storagePath = storagePath;
  }

  private async ensureStorageExists(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create storage directory: ${error}`);
    }
  }

  private get filePath(): string {
    return path.join(this.storagePath, this.fileName);
  }

  private async readStorage(): Promise<Record<string, KeyPair>> {
    try {
      await this.ensureStorageExists();
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  private async writeStorage(data: Record<string, KeyPair>): Promise<void> {
    await this.ensureStorageExists();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async save(keyPair: KeyPair): Promise<void> {
    const storage = await this.readStorage();
    storage[keyPair.clientId] = keyPair;
    await this.writeStorage(storage);
  }

  async get(clientId: string): Promise<KeyPair | null> {
    const storage = await this.readStorage();
    return storage[clientId] || null;
  }

  async list(): Promise<KeyPair[]> {
    const storage = await this.readStorage();
    return Object.values(storage);
  }

  async delete(clientId: string): Promise<boolean> {
    const storage = await this.readStorage();
    if (!storage[clientId]) return false;

    delete storage[clientId];
    await this.writeStorage(storage);
    return true;
  }
}
