import { IOpSessionArgs, LOGGER_NAMESPACE, RequiredContext, schema } from '../index'
import { IAgentPlugin } from '@veramo/core'
import { OpSession } from '../session'
import { v4 as uuidv4 } from 'uuid'
import {
  IDidAuthSiopOpAuthenticator,
  IGetSiopSessionArgs,
  IRegisterCustomApprovalForSiopArgs,
  IRemoveCustomApprovalForSiopArgs,
  IRemoveSiopSessionArgs,
  IRequiredContext,
} from '../types/IDidAuthSiopOpAuthenticator'
import { PresentationSignCallback, SupportedVersion, VerifiedAuthorizationRequest } from '@sphereon/did-auth-siop'

import {
  AddIdentityArgs,
  CreateConfigArgs,
  CreateConfigResult,
  GetSiopRequestArgs,
  OnContactIdentityCreatedArgs,
  OnCredentialStoredArgs,
  OnIdentifierCreatedArgs,
  RetrieveContactArgs,
  SendResponseArgs,
  Siopv2AuthorizationRequestData,
  Siopv2HolderEvent,
  Siopv2HolderOptions,
} from '../types/siop-service'
import { Siopv2Machine } from '../machine/Siopv2Machine'
import { Siopv2Machine as Siopv2MachineId, Siopv2MachineInstanceOpts } from '../types/machine'
import { Loggers, LogMethod, W3CVerifiableCredential } from '@sphereon/ssi-types'
import {
  ConnectionType,
  CorrelationIdentifierType,
  CredentialRole,
  Identity,
  IdentityOrigin,
  NonPersistedIdentity,
  Party,
} from '@sphereon/ssi-sdk.data-store'
import { siopSendAuthorizationResponse, translateCorrelationIdToName } from '../services/Siopv2MachineService'

const logger = Loggers.DEFAULT.options(LOGGER_NAMESPACE, { methods: [LogMethod.CONSOLE, LogMethod.DEBUG_PKG] }).get(LOGGER_NAMESPACE)

export class DidAuthSiopOpAuthenticator implements IAgentPlugin {
  readonly schema = schema.IDidAuthSiopOpAuthenticator
  readonly methods: IDidAuthSiopOpAuthenticator = {
    siopGetOPSession: this.siopGetOPSession.bind(this),
    siopRegisterOPSession: this.siopRegisterOPSession.bind(this),
    siopRemoveOPSession: this.siopRemoveOPSession.bind(this),
    siopRegisterOPCustomApproval: this.siopRegisterOPCustomApproval.bind(this),
    siopRemoveOPCustomApproval: this.siopRemoveOPCustomApproval.bind(this),

    siopGetMachineInterpreter: this.siopGetMachineInterpreter.bind(this),
    siopCreateConfig: this.siopCreateConfig.bind(this),
    siopGetSiopRequest: this.siopGetSiopRequest.bind(this),
    siopRetrieveContact: this.siopRetrieveContact.bind(this),
    siopAddIdentity: this.siopAddContactIdentity.bind(this),
    siopSendResponse: this.siopSendResponse.bind(this),
  }

  private readonly sessions: Map<string, OpSession>
  private readonly customApprovals: Record<string, (verifiedAuthorizationRequest: VerifiedAuthorizationRequest, sessionId: string) => Promise<void>>
  private readonly presentationSignCallback?: PresentationSignCallback

  private readonly onContactIdentityCreated?: (args: OnContactIdentityCreatedArgs) => Promise<void>
  private readonly onCredentialStored?: (args: OnCredentialStoredArgs) => Promise<void>
  private readonly onIdentifierCreated?: (args: OnIdentifierCreatedArgs) => Promise<void>

  constructor(
    presentationSignCallback?: PresentationSignCallback,
    customApprovals?: Record<string, (verifiedAuthorizationRequest: VerifiedAuthorizationRequest, sessionId: string) => Promise<void>>,
    options?: Siopv2HolderOptions,
  ) {
    const { onContactIdentityCreated, onCredentialStored, onIdentifierCreated } = options ?? {}
    this.onContactIdentityCreated = onContactIdentityCreated
    this.onCredentialStored = onCredentialStored
    this.onIdentifierCreated = onIdentifierCreated

    this.sessions = new Map<string, OpSession>()
    this.customApprovals = customApprovals || {}
    this.presentationSignCallback = presentationSignCallback
  }

  public async onEvent(event: any, context: RequiredContext): Promise<void> {
    switch (event.type) {
      case Siopv2HolderEvent.CONTACT_IDENTITY_CREATED:
        this.onContactIdentityCreated?.(event.data)
        break
      case Siopv2HolderEvent.CREDENTIAL_STORED:
        this.onCredentialStored?.(event.data)
        break
      case Siopv2HolderEvent.IDENTIFIER_CREATED:
        this.onIdentifierCreated?.(event.data)
        break
      default:
        return Promise.reject(Error(`Event type ${event.type} not supported`))
    }
  }

  private async siopGetOPSession(args: IGetSiopSessionArgs, context: IRequiredContext): Promise<OpSession> {
    // TODO add cleaning up sessions https://sphereon.atlassian.net/browse/MYC-143
    if (!this.sessions.has(args.sessionId)) {
      throw Error(`No session found for id: ${args.sessionId}`)
    }

    return this.sessions.get(args.sessionId)!
  }

  private async siopRegisterOPSession(args: Omit<IOpSessionArgs, 'context'>, context: IRequiredContext): Promise<OpSession> {
    const sessionId = args.sessionId || uuidv4()
    if (this.sessions.has(sessionId)) {
      return Promise.reject(new Error(`Session with id: ${args.sessionId} already present`))
    }
    const opts = { ...args, sessionId, context } as Required<IOpSessionArgs>
    if (!opts.op?.presentationSignCallback) {
      opts.op = { ...opts.op, presentationSignCallback: this.presentationSignCallback }
    }
    const session = await OpSession.init(opts)
    this.sessions.set(sessionId, session)
    return session
  }

  private async siopRemoveOPSession(args: IRemoveSiopSessionArgs, context: IRequiredContext): Promise<boolean> {
    return this.sessions.delete(args.sessionId)
  }

  private async siopRegisterOPCustomApproval(args: IRegisterCustomApprovalForSiopArgs, context: IRequiredContext): Promise<void> {
    if (this.customApprovals[args.key] !== undefined) {
      return Promise.reject(new Error(`Custom approval with key: ${args.key} already present`))
    }

    this.customApprovals[args.key] = args.customApproval
  }

  private async siopRemoveOPCustomApproval(args: IRemoveCustomApprovalForSiopArgs, context: IRequiredContext): Promise<boolean> {
    return delete this.customApprovals[args.key]
  }

  private async siopGetMachineInterpreter(opts: Siopv2MachineInstanceOpts, context: RequiredContext): Promise<Siopv2MachineId> {
    const { stateNavigationListener, url } = opts
    const services = {
      createConfig: (args: CreateConfigArgs) => this.siopCreateConfig(args),
      getSiopRequest: (args: GetSiopRequestArgs) => this.siopGetSiopRequest(args, context),
      retrieveContact: (args: RetrieveContactArgs) => this.siopRetrieveContact(args, context),
      addContactIdentity: (args: AddIdentityArgs) => this.siopAddContactIdentity(args, context),
      sendResponse: (args: SendResponseArgs) => this.siopSendResponse(args, context),
      ...opts?.services,
    }

    const siopv2MachineOpts: Siopv2MachineInstanceOpts = {
      url,
      stateNavigationListener,
      services: {
        ...services,
        ...opts.services,
      },
    }

    return Siopv2Machine.newInstance(siopv2MachineOpts)
  }

  private async siopCreateConfig(args: CreateConfigArgs): Promise<CreateConfigResult> {
    const { url } = args

    if (!url) {
      return Promise.reject(Error('Missing request uri in context'))
    }

    return {
      id: uuidv4(),
      // FIXME: Update these values in SSI-SDK. Only the URI (not a redirectURI) would be available at this point
      sessionId: uuidv4(),
      redirectUrl: url,
    }
  }

  private async siopGetSiopRequest(args: GetSiopRequestArgs, context: RequiredContext): Promise<Siopv2AuthorizationRequestData> {
    const { agent } = context
    const { didAuthConfig } = args

    if (args.url === undefined) {
      return Promise.reject(Error('Missing request uri in context'))
    }

    if (didAuthConfig === undefined) {
      return Promise.reject(Error('Missing config in context'))
    }
    const { sessionId, redirectUrl } = didAuthConfig

    const session: OpSession = await agent
      .siopGetOPSession({ sessionId })
      .catch(async () => await agent.siopRegisterSession({ requestJwtOrUri: redirectUrl, sessionId }))

    logger.debug(`session: ${JSON.stringify(session.id, null, 2)}`)
    const verifiedAuthorizationRequest = await session.getAuthorizationRequest()
    logger.debug('Request: ' + JSON.stringify(verifiedAuthorizationRequest, null, 2))
    const name = verifiedAuthorizationRequest.registrationMetadataPayload?.client_name
    const url =
      verifiedAuthorizationRequest.responseURI ??
      (args.url.includes('request_uri')
        ? decodeURIComponent(args.url.split('?request_uri=')[1].trim())
        : verifiedAuthorizationRequest.issuer ?? verifiedAuthorizationRequest.registrationMetadataPayload?.client_id)
    const uri: URL | undefined = url.includes('://') ? new URL(url) : undefined
    const correlationIdName = uri
      ? translateCorrelationIdToName(uri.hostname, context)
      : verifiedAuthorizationRequest.issuer
        ? translateCorrelationIdToName(verifiedAuthorizationRequest.issuer.split('://')[1], context)
        : name
    const correlationId: string = uri?.hostname ?? correlationIdName
    const clientId: string | undefined = await verifiedAuthorizationRequest.authorizationRequest.getMergedProperty<string>('client_id')

    return {
      issuer: verifiedAuthorizationRequest.issuer,
      correlationId,
      registrationMetadataPayload: verifiedAuthorizationRequest.registrationMetadataPayload,
      uri,
      name,
      clientId,
      presentationDefinitions:
        (await verifiedAuthorizationRequest.authorizationRequest.containsResponseType('vp_token')) ||
        (verifiedAuthorizationRequest.versions.every((version) => version <= SupportedVersion.JWT_VC_PRESENTATION_PROFILE_v1) &&
          verifiedAuthorizationRequest.presentationDefinitions &&
          verifiedAuthorizationRequest.presentationDefinitions.length > 0)
          ? verifiedAuthorizationRequest.presentationDefinitions
          : undefined,
    }
  }

  private async siopRetrieveContact(args: RetrieveContactArgs, context: RequiredContext): Promise<Party | undefined> {
    const { authorizationRequestData } = args
    const { agent } = context

    if (authorizationRequestData === undefined) {
      return Promise.reject(Error('Missing authorization request data in context'))
    }

    return agent
      .getContacts({
        filter: [
          {
            identities: {
              identifier: {
                correlationId: authorizationRequestData.correlationId,
              },
            },
          },
        ],
      })
      .then((contacts: Array<Party>): Party | undefined => (contacts.length === 1 ? contacts[0] : undefined))
  }

  private async siopAddContactIdentity(args: AddIdentityArgs, context: RequiredContext): Promise<void> {
    const { agent } = context
    const { contact, authorizationRequestData } = args

    if (contact === undefined) {
      return Promise.reject(Error('Missing contact in context'))
    }

    if (authorizationRequestData === undefined) {
      return Promise.reject(Error('Missing authorization request data in context'))
    }

    // TODO: Makes sense to move these types of common queries/retrievals to the SIOP auth request object
    const clientId: string | undefined = authorizationRequestData.clientId ?? authorizationRequestData.issuer
    const correlationId: string | undefined = clientId
      ? clientId.startsWith('did:')
        ? clientId
        : `${new URL(clientId).protocol}//${new URL(clientId).hostname}`
      : undefined

    if (correlationId) {
      const identity: NonPersistedIdentity = {
        alias: correlationId,
        origin: IdentityOrigin.EXTERNAL,
        roles: [CredentialRole.ISSUER],
        identifier: {
          type: CorrelationIdentifierType.DID,
          correlationId,
        },
      }
      const addedIdentity: Identity = await agent.cmAddIdentity({ contactId: contact.id, identity })
      await context.agent.emit(Siopv2HolderEvent.CONTACT_IDENTITY_CREATED, {
        contactId: contact.id,
        identity: addedIdentity,
      })
      logger.info(`Contact identity created: ${JSON.stringify(addedIdentity)}`)
    }
  }

  private async siopSendResponse(args: SendResponseArgs, context: RequiredContext): Promise<Response> {
    const { didAuthConfig, authorizationRequestData, selectedCredentials } = args

    if (didAuthConfig === undefined) {
      return Promise.reject(Error('Missing config in context'))
    }

    if (authorizationRequestData === undefined) {
      return Promise.reject(Error('Missing authorization request data in context'))
    }

    return await siopSendAuthorizationResponse(
      ConnectionType.SIOPv2_OpenID4VP,
      {
        sessionId: didAuthConfig.sessionId,
        ...(authorizationRequestData.presentationDefinitions !== undefined && {
          verifiableCredentialsWithDefinition: [
            {
              definition: authorizationRequestData.presentationDefinitions[0], // TODO BEFORE PR 0 check, check siop only
              credentials: selectedCredentials as Array<W3CVerifiableCredential>,
            },
          ],
        }),
      },
      context,
    )
  }
}
