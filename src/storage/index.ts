import {Identity} from "ugradid-lib/js/identity/identity";

export interface EncryptedWalletAttributes {
    id: string
    encryptedWallet: string
    timestamp: number
}

export interface IStorageStore {
    encryptedWallet(args: EncryptedWalletAttributes): Promise<void>
    identity(identity: Identity): Promise<void>
}

export interface IStorageGet {
    encryptedWallet(id?: string): Promise<EncryptedWalletAttributes | null>
    identity(did: string): Promise<Identity | undefined>
}

export interface IStorage {
    store: IStorageStore
    get: IStorageGet
}

export interface IPasswordStore {
    getPassword: () => Promise<string>
}