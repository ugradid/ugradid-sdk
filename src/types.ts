
/**
 * @category Transports
 */
export interface TransportDesc {
    type: string
    config?: any
}

/**
 * @category Transports
 */
export type TransportMessageHandler = (msg: string) => Promise<void>

/**
 * @category Transports
 */
export interface TransportHandler {
    configure?(...args: any[]): void
    start(d: TransportDesc, cb?: TransportMessageHandler): TransportApi
}

export interface TransportApi {
    desc?: TransportDesc
    send: (token: string) => Promise<void>
    stop?:() => void
    ready?: Promise<void>
    onMessage?: TransportMessageHandler
}