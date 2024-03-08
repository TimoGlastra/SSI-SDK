import { IAbstractMachineStateStore, StoreMachineStateInfo } from '@sphereon/ssi-sdk.data-store'
import { IAgentPlugin } from '@veramo/core'
import * as console from 'console'
import Debug from 'debug'
import { v4 as uuidv4 } from 'uuid'
import { deserializeMachineState, machineStateToStoreInfo } from '../functions'

import {
  DeleteExpiredStatesArgs,
  DeleteStateResult,
  FindActiveStatesArgs,
  IMachineStatePersistence,
  InitMachineStateArgs,
  MachineStateDeleteArgs,
  MachineStateGetArgs,
  MachineStateInfo,
  MachineStateInit,
  MachineStatePersistArgs,
  MachineStatePersistEvent,
  MachineStatePersistEventType,
  MachineStatePersistOpts,
  RequiredContext,
  schema,
} from '../index'

const debug = Debug('sphereon:ssi-sdk:machine-state:xstate-persistence')

/**
 * This class implements the IMachineStatePersistence interface using a datastore.
 *
 * This allows you to store and retrieve the State of a state machine/application by their types.
 *
 * @beta This API may change without a BREAKING CHANGE notice.
 */
export class MachineStatePersistence implements IAgentPlugin {
  readonly schema = schema.IMachineStatePersistence
  readonly methods: IMachineStatePersistence | {}
  readonly eventTypes: Array<string>
  private readonly _store?: IAbstractMachineStateStore

  get store(): IAbstractMachineStateStore {
    if (!this._store) {
      throw Error('No store available in options')
    }
    return this._store
  }

  constructor(opts: MachineStatePersistOpts) {
    const { store, eventTypes, isRESTClient } = opts
    this.eventTypes = eventTypes
    this.methods = {
      machineStatesFindActive: this.machineStatesFindActive.bind(this),
      machineStatesDeleteExpired: this.machineStatesDeleteExpired.bind(this),
      machineStateInit: this.machineStateInit.bind(this),
      machineStatePersist: this.machineStatePersist.bind(this),
      machineStateGet: this.machineStateGet.bind(this),
      machineStateDelete: this.machineStateDelete.bind(this),
    }
    this._store = store
    if (isRESTClient) {
      // Methods are delegated to the REMOTE Agent. We need the above eventTypes however, to ensure the local eventBus works
      // We do set the store, because we might have some local and some remote methods
      return
    } else if (!store) {
      throw Error('No store available in options')
    }
  }

  public async onEvent(event: MachineStatePersistEvent, context: RequiredContext): Promise<void> {
    debug(`Received machine state persistence event '${event.type}' counter: ${event.data._eventCounter}`)
    if (!this.eventTypes.includes(event.type)) {
      console.log(`event type ${event.type} not registered for agent. Registered: ${JSON.stringify(this.eventTypes)}`)
      return
    }

    // Below we are calling the context of the agent instead of this to make sure the REST client is called when configured
    switch (event.type) {
      case MachineStatePersistEventType.INIT:
        await context.agent.machineStateInit({ ...event.data })
        break
      case MachineStatePersistEventType.EVERY:
        if (event.data.state.done) {
          // TODO: Cleanup on done
        }
        // We are keeping track of the update counter in the events, ensuring we do not process out of order
        await context.agent.machineStatePersist({ ...event.data, updatedCount: event.data._eventCounter ?? event.data.updatedCount })
        break
      default:
        return Promise.reject(Error('Event type not supported'))
    }
  }

  private async machineStateInit(args: InitMachineStateArgs): Promise<MachineStateInit> {
    const { tenantId, machineName, expiresAt } = args
    debug(`machineStateInit for machine name ${machineName} and tenant ${tenantId}`)
    const machineInit: MachineStateInit = {
      machineName,
      tenantId,
      expiresAt,
      instanceId: args.instanceId ?? uuidv4(),
      createdAt: args.createdAt ?? new Date(),
    }
    debug(`machineStateInit result: ${JSON.stringify(machineInit)}`)
    return machineInit
  }
  private async machineStatePersist(args: MachineStatePersistArgs): Promise<MachineStateInfo> {
    const { instanceId, tenantId, machineName, updatedCount } = args
    debug(`machineStatePersist for machine name ${machineName}, updateCount: ${updatedCount}, instance ${instanceId} and tenant ${tenantId}...`)
    const queriedStates = await this.store.findMachineStates({ filter: [{ instanceId, tenantId }] })
    const existingState = queriedStates.length === 1 ? queriedStates[0] : undefined
    const storeInfoArgs = machineStateToStoreInfo(args, existingState)
    const storedState = await this.store.persistMachineState(storeInfoArgs)
    const machineStateInfo = { ...storedState, state: deserializeMachineState(storedState.state) }
    debug(
      `machineStatePersist success for machine name ${machineName}, instance ${instanceId}, update count ${machineStateInfo.updatedCount}, tenant ${tenantId}, last event: ${machineStateInfo.latestEventType}, last state: ${machineStateInfo.latestStateName}`
    )
    return machineStateInfo
  }

  private async machineStatesFindActive(args: FindActiveStatesArgs): Promise<Array<MachineStateInfo>> {
    const { machineName, tenantId } = args
    debug(`machineStateFindActive for machine name ${machineName} and tenant ${tenantId}...`)
    const storedStates = await this.store.findActiveMachineStates(args)
    const machineStateInfos = storedStates.map((storedState: StoreMachineStateInfo) => {
      return { ...storedState, state: deserializeMachineState(storedState.state) }
    })
    debug(`machineStateFindActive returned ${machineStateInfos.length} results for machine name ${machineName} and tenant ${tenantId}`)
    return machineStateInfos
  }

  private async machineStatesDeleteExpired(args: DeleteExpiredStatesArgs): Promise<DeleteStateResult> {
    const { machineName, tenantId } = args
    debug(`machineStatesDeleteExpired for machine name ${machineName} and tenant ${tenantId}...`)
    const deleteResult = await this.store.deleteExpiredMachineStates(args)
    debug(`machineStatesDeleteExpired result for machine name ${machineName} and tenant ${tenantId}: ${deleteResult}`)
    return deleteResult
  }

  private async machineStateGet(args: MachineStateGetArgs, context: RequiredContext): Promise<MachineStateInfo> {
    const { instanceId, tenantId } = args
    debug(`machineStateGet for machine instance ${instanceId} and tenant ${tenantId}...`)
    const storedState = await this.store.getMachineState(args)
    const machineInfo = { ...storedState, state: deserializeMachineState(storedState.state) }
    debug(`machineStateGet result for machine instance ${instanceId} and tenant ${tenantId}: ${machineInfo}`)
    return machineInfo
  }

  private async machineStateDelete(args: MachineStateDeleteArgs, context: RequiredContext): Promise<boolean> {
    const { instanceId, tenantId } = args
    debug(`machineStateDelete for machine instance ${instanceId} and tenant ${tenantId}...`)
    const deleteResult = await this.store.deleteMachineState(args)
    debug(`machineStateDelete result for machine instance ${instanceId} and tenant ${tenantId}: ${deleteResult}`)
    return deleteResult
  }
}