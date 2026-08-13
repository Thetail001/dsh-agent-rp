import type { IncomingMessage, ServerResponse } from 'node:http'

/** HTTP route registry shared by the public and current DSH Web hosts. */
export interface AgentRpHttpServer {
  register(route: {
    readonly kind: 'exact' | 'prefix'
    readonly path: string
    readonly handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}
