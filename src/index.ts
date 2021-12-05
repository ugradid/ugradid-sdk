import {IStorage} from "./storage";
import {DidMethodKeeper} from "./didMethodKeeper";
import {IDidMethod, IResolver} from "ugradid-lib/js/didMethods/types";
import {Identity} from "ugradid-lib/js/identity/identity";
import {SoftwareKeyProvider} from "ugradid-lib/js/vaultedKeyProvider/softwareKeyProvider";

export interface IUgradidConfig {
    storage: IStorage
    method: IDidMethod
}

export interface UgradidPlugin {
    register(sdk: UgradidSdk): Promise<void>
}

export class UgradidSdk {
    public didMethods: DidMethodKeeper
    public storage: IStorage
    public resolver: IResolver

    constructor(config: IUgradidConfig) {
        this.storage = config.storage;
        this.didMethods = new DidMethodKeeper(config.method)
        this.resolver = { prefix: '', resolve: this.resolve.bind(this) }
    }

    /**
     * Stores a DID Document and its corrosponding Key Provider
     *
     * @param id - Identity being Stored
     * @param skp - Key Provider for the Identity
     * @returns void
     */
    public async storeIdentityData(
        id: Identity,
        skp: SoftwareKeyProvider,
    ): Promise<void> {
        if (id.did !== skp.id) throw new Error('Identity data inconsistent')
        await this.storage.store.encryptedWallet({
            id: skp.id,
            encryptedWallet: skp.encryptedWallet,
            timestamp: Date.now(),
        })
        await this.storage.store.identity(id)
    }

    /**
     * Resolve a DID string such as `did:method:123456789abcdef0` to an Identity,
     * looking through storage cache first, then using the appropriate DIDMethod
     * of the {@link DidMethodKeeper}
     *
     * @param did string the did to resolve
     * @returns the resolved identity
     */
    public async resolve(did: string): Promise<Identity> {
        const cached = await this.storage.get.identity(did)

        if (!cached) {
            const resolved = await this.didMethods
                .getForDid(did)
                .resolver.resolve(did)

            await this.storage.store.identity(resolved).catch(err => {
                console.error('Failed to store Identity after resolving', err)
            })

            return resolved
        }

        return cached
    }
}