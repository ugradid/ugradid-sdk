import {UgradidSdk} from "./index";
import {IDidMethod} from "ugradid-lib/js/didMethods/types";
import {IPasswordStore} from "./storage";
import {IdentityWallet} from "ugradid-lib/js/identityWallet/identityWallet";
import {ErrorCode, SDKError} from "./errors";
import {SoftwareKeyProvider} from "ugradid-lib/js/vaultedKeyProvider/softwareKeyProvider";
import {createIdentityFromKeyProvider, authAsIdentityFromKeyProvider} from "ugradid-lib/js/didMethods/utils";
import {walletUtils} from "./walletUtils";

export interface AgentConfig {
    sdk: UgradidSdk
    didMethod: IDidMethod
    passwordStore: IPasswordStore
}
``
export class Agent {
    public sdk: UgradidSdk
    public passwordStore: IPasswordStore
    private _didMethod: IDidMethod
    private _identityWallet!: IdentityWallet
    private _keyProvider!: SoftwareKeyProvider

    constructor(config: AgentConfig) {
        this.passwordStore = config.passwordStore
        this._didMethod = config.didMethod
        this.sdk = config.sdk
    }

    /**
     * The DID method that this Agent was constructed with, or otherwise the SDK's
     * default DID method
     */
    public get didMethod() {
        return this._didMethod
    }

    /**
     * The Agent's IdentityWallet instance.
     *
     * @throws SDKError(ErrorCode.NoWallet) if there is none
     */
    public get identityWallet(): IdentityWallet {
        if (this._identityWallet) return this._identityWallet
        throw new SDKError(ErrorCode.NoWallet)
    }

    /**
     * Shortcut for {@link identityWallet}
     */
    public get idw(): IdentityWallet {
        return this.identityWallet
    }

    /**
     * The Agent's KeyProvider instance.
     *
     * @throws SDKError(ErrorCode.NoKeyProvider) if there is none
     */
    public get keyProvider(): SoftwareKeyProvider {
        if (this._keyProvider) return this._keyProvider
        throw new SDKError(ErrorCode.NoKeyProvider)
    }

    /**
     * Create and store new Identity using the Agent's {@link didMethod}
     *
     * @returns the newly created {@link IdentityWallet}
     *
     * @category Identity Management
     */
    public async createNewIdentity(): Promise<IdentityWallet> {
        const pass = await this.passwordStore.getPassword()
        this._keyProvider = await SoftwareKeyProvider.newEmptyWallet(
            walletUtils,
            '',
            pass,
        )
        this._identityWallet = await createIdentityFromKeyProvider(
            this._keyProvider,
            pass,
            this.didMethod.registrar,
        )

        await this.sdk.storeIdentityData(
            this._identityWallet.identity,
            this._keyProvider,
        )

        // This sets the didMethod so that it doesn't return a different value if
        // the SDK default is changed in runtime
        this._didMethod = this.didMethod

        return this._identityWallet
    }

    /**
     * Load an Identity from storage, given its DID.
     *
     * If no DID is specified, the first Identity found in storage will be loaded.
     *
     * @param did - DID of Identity to be loaded from DB
     * @returns An IdentityWallet corrosponding to the given DID
     *
     * @category Identity Management
     */
    public async loadIdentity(did?: string): Promise<IdentityWallet> {
        const encryptedWalletInfo = await this.sdk.storage.get.encryptedWallet(did)
        if (!encryptedWalletInfo) {
            throw new SDKError(ErrorCode.NoWallet)
        }

        let encryptionPass: string
        try {
            encryptionPass = await this.passwordStore.getPassword()
        } catch (e: any) {
            // This may fail if the application was uninstalled and reinstalled, as
            // the android keystore is cleared on uninstall, but the database may
            // still remain, due to having been auto backed up!
            throw new SDKError(ErrorCode.NoPassword, e)
        }

        this._keyProvider = new SoftwareKeyProvider(
            walletUtils,
            Buffer.from(encryptedWalletInfo.encryptedWallet, 'base64'),
            encryptedWalletInfo.id,
        )

        const identityWallet = await authAsIdentityFromKeyProvider(
            this._keyProvider,
            encryptionPass,
            this.sdk.resolver,
        )

        await this.sdk.storage.store.identity(identityWallet.identity)

        // This sets the didMethod so that it doesn't return a different value if
        // the SDK default is changed in runtime
        this._didMethod = this.didMethod

        return (this._identityWallet = identityWallet)
    }
}