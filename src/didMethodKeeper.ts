import { IDidMethod } from 'ugradid-lib/js/didMethods/types'

export class DidMethodKeeper {
    methods: {[k: string]: IDidMethod} = {}

    constructor(didMethod: IDidMethod) {
        this.methods[didMethod.prefix] = didMethod
    }

    register(methodName: string, implementation: IDidMethod) {
        if (this.methods[methodName]) {
            throw new Error('DID method "' + methodName + '" already registered')
        }

        this.methods[methodName] = implementation
    }

    get(methodName: string) {
        const method = this.methods[methodName]
        if (!method) {
            throw new Error('no did method "' + methodName + '" registered!')
        }
        return method
    }

    getForDid(did: string) {
        const withoutPrefix = did.substring(4)

        if (!withoutPrefix || !did.startsWith('did:')) {
            throw new Error('DID method resolving. Could not parse DID: "' + did + '"!')
        }

        for (const [key, value] of Object.entries(this.methods)) {
            if (withoutPrefix.startsWith(key)) {
                return value
            }
        }

        throw new Error('DID method resolving. DID method for DID "' + did + '" is not registered!')
    }
}