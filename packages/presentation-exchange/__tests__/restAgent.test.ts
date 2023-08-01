import 'cross-fetch/polyfill'
// @ts-ignore
import express from 'express'
import { createAgent, IAgent, IAgentOptions, IDataStore } from '@veramo/core'
import { AgentRestClient } from '@veramo/remote-client'
import { Server } from 'http'
import { AgentRouter, RequestWithAgentRouter } from '@veramo/remote-server'
import { createObjects, getConfig } from '@sphereon/ssi-sdk.agent-config'
import { IPresentationExchange, PresentationExchange } from '../src'
import { Resolver } from 'did-resolver'
import { getDidKeyResolver } from '@veramo/did-provider-key'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import presentationExchangeAgentLogic from './shared/presentationExchangeAgentLogic'
import { describe } from 'vitest'

const port = 3002
const basePath = '/agent'
let serverAgent: IAgent
let restServer: Server

const getAgent = (options?: IAgentOptions) =>
  createAgent<IPresentationExchange & IDataStore>({
    ...options,
    plugins: [
      new PresentationExchange(),
      new DIDResolverPlugin({
        resolver: new Resolver({
          ...getDidKeyResolver(),
        }),
      }),
      new AgentRestClient({
        url: 'http://localhost:' + port + basePath,
        enabledMethods: serverAgent.availableMethods(),
        schema: serverAgent.getSchema(),
      }),
    ],
  })

const setup = async (): Promise<boolean> => {
  const config = await getConfig('packages/presentation-exchange/agent.yml')
  // config.agent.$args[0].plugins[1].$args[0] = presentationSignCallback
  const { agent } = await createObjects(config, { agent: '/agent' })
  // agent.registerCustomApprovalForSiop({ key: 'success', customApproval: () => Promise.resolve() })
  // agent.registerCustomApprovalForSiop({ key: 'failure', customApproval: () => Promise.reject(new Error('denied')) })
  serverAgent = agent

  const agentRouter = AgentRouter({
    exposedMethods: serverAgent.availableMethods(),
  })

  const requestWithAgent = RequestWithAgentRouter({
    agent: serverAgent,
  })

  return new Promise((resolve) => {
    const app = express()
    app.use(basePath, requestWithAgent, agentRouter)
    restServer = app.listen(port, () => {
      resolve(true)
    })
  })
}

const tearDown = async (): Promise<void> => {
  restServer.close()
}

const testContext = {
  getAgent,
  setup,
  tearDown,
  isRestTest: true,
}

describe('REST integration tests', () => {
  presentationExchangeAgentLogic(testContext)
})
