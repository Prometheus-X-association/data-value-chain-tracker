import { KeyPair } from "../types/types";

export interface IKeyStorage {
  save(keyPair: KeyPair): Promise<void>;
  get(clientId: string): Promise<KeyPair | null>;
  list(): Promise<KeyPair[]>;
  delete(clientId: string): Promise<boolean>;
}
