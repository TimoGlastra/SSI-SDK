import { IAgentPlugin } from '@veramo/core'
import {
  DeleteDefinitionItemArgs,
  DeleteDefinitionItemsArgs,
  GetDefinitionItemArgs,
  GetDefinitionItemsArgs,
  HasDefinitionItemArgs,
  HasDefinitionItemsArgs,
  IPDManager,
  PersistDefinitionArgs,
  schema,
} from '../index'
import {
  AbstractPDStore,
  isPresentationDefinitionEqual,
  NonPersistedPresentationDefinitionItem,
  PresentationDefinitionItem,
} from '@sphereon/ssi-sdk.data-store'
import semver from 'semver/preload'

// Exposing the methods here for any REST implementation
export const pdManagerMethods: Array<string> = [
  'pdmHasDefinition',
  'pdmHasGetDefinitions',
  'pdmGetDefinition',
  'pdmGetDefinitions',
  'pdmPersistDefinition',
  'pdmDeleteDefinition',
  'pdmDeleteDefinitions',
]

/**
 * {@inheritDoc IPDManager}
 */
export class PDManager implements IAgentPlugin {
  readonly schema = schema.IPDManager
  readonly methods: IPDManager = {
    pdmPersistDefinition: this.pdmPersistDefinition.bind(this),
    pdmHasDefinition: this.pdmHasDefinition.bind(this),
    pdmHasDefinitions: this.pdmHasDefinitions.bind(this),
    pdmGetDefinition: this.pdmGetDefinition.bind(this),
    pdmGetDefinitions: this.pdmGetDefinitions.bind(this),
    pdmDeleteDefinition: this.pdmDeleteDefinition.bind(this),
    pdmDeleteDefinitions: this.pdmDeleteDefinitions.bind(this),
  }

  private readonly store: AbstractPDStore

  constructor(options: { store: AbstractPDStore }) {
    this.store = options.store
  }

  /** {@inheritDoc IPDManager.pdmHasDefinition} */
  private async pdmHasDefinition(args: HasDefinitionItemArgs): Promise<boolean> {
    const { itemId } = args
    return this.store.hasDefinition({ itemId })
  }

  /** {@inheritDoc IPDManager.pdmHasDefinitions} */
  private async pdmHasDefinitions(args: HasDefinitionItemsArgs): Promise<boolean> {
    const { filter } = args
    return this.store.hasDefinitions({ filter })
  }

  /** {@inheritDoc IPDManager.pdmGetDefinition} */
  private async pdmGetDefinition(args: GetDefinitionItemArgs): Promise<PresentationDefinitionItem> {
    const { itemId } = args
    return this.store.getDefinition({ itemId })
  }

  /** {@inheritDoc IPDManager.pdmGetDefinitions} */
  private async pdmGetDefinitions(args: GetDefinitionItemsArgs): Promise<Array<PresentationDefinitionItem>> {
    const { filter } = args
    return this.store.getDefinitions({ filter })
  }

  /** {@inheritDoc IPDManager.pdmDeleteDefinition} */
  private async pdmDeleteDefinition(args: DeleteDefinitionItemArgs): Promise<boolean> {
    return this.store.deleteDefinition(args).then((value) => true)
  }

  /** {@inheritDoc IPDManager.pdmDeleteDefinitions} */
  private async pdmDeleteDefinitions(args: DeleteDefinitionItemsArgs): Promise<number> {
    return this.store.deleteDefinitions(args)
  }

  /** {@inheritDoc IPDManager.pdmPersistDefinition} */
  private async pdmPersistDefinition(args: PersistDefinitionArgs): Promise<PresentationDefinitionItem> {
    const { definitionItem, opts } = args
    const { versionControlMode } = opts ?? { versionControlMode: 'AutoIncrementMajor' }
    const { version, tenantId } = definitionItem
    const definitionId = definitionItem.definitionId ?? definitionItem.definitionPayload.id

    let { id } = definitionItem
    if (id !== undefined && versionControlMode !== 'Overwrite') {
      id = undefined
    }

    const nonPersistedDefinitionItem: NonPersistedPresentationDefinitionItem = {
      ...definitionItem,
      definitionId: definitionId,
      version: definitionItem.version ?? '1',
    }

    const existing = await this.store.getDefinitions({ filter: [{ id, definitionId, tenantId, version }] })
    const existingItem = existing[0]
    let latestVersionItem: PresentationDefinitionItem | undefined = existingItem

    if (existingItem && version) {
      const latest = await this.store.getDefinitions({ filter: [{ id, definitionId, tenantId }] })
      latestVersionItem = latest[0] ?? existingItem
    }

    const isPayloadModified = !existingItem || !isPresentationDefinitionEqual(existingItem, definitionItem)
    if (!isPayloadModified) return existingItem

    switch (versionControlMode) {
      case 'Overwrite':
        return this.handleOverwriteMode(existingItem, nonPersistedDefinitionItem, version)
      case 'OverwriteLatest':
        return this.handleOverwriteLatestMode(latestVersionItem, nonPersistedDefinitionItem)
      case 'Manual':
        return this.handleManualMode(existingItem, nonPersistedDefinitionItem, tenantId, version)
      case 'AutoIncrementMajor':
        return this.handleAutoIncrementMode(latestVersionItem, nonPersistedDefinitionItem, 'major')
      case 'AutoIncrementMinor':
        return this.handleAutoIncrementMode(latestVersionItem, nonPersistedDefinitionItem, 'minor')
      default:
        throw new Error(`Unknown version control mode: ${versionControlMode}`)
    }
  }

  private async handleOverwriteMode(
    existingItem: PresentationDefinitionItem | undefined,
    definitionItem: NonPersistedPresentationDefinitionItem,
    version: string | undefined,
  ): Promise<PresentationDefinitionItem> {
    if (existingItem) {
      existingItem.definitionId = definitionItem.definitionId
      existingItem.version = version ?? existingItem.version ?? '1'
      existingItem.tenantId = definitionItem.tenantId
      existingItem.name = definitionItem.name
      existingItem.purpose = definitionItem.purpose
      existingItem.definitionPayload = definitionItem.definitionPayload

      return await this.store.updateDefinition(existingItem)
    } else {
      return await this.store.addDefinition(definitionItem)
    }
  }

  private async handleOverwriteLatestMode(
    latestVersionItem: PresentationDefinitionItem | undefined,
    definitionItem: NonPersistedPresentationDefinitionItem,
  ): Promise<PresentationDefinitionItem> {
    if (latestVersionItem) {
      latestVersionItem.definitionId = definitionItem.definitionId
      latestVersionItem.tenantId = definitionItem.tenantId
      latestVersionItem.name = definitionItem.name
      latestVersionItem.purpose = definitionItem.purpose
      latestVersionItem.definitionPayload = definitionItem.definitionPayload

      return await this.store.updateDefinition(latestVersionItem)
    } else {
      return await this.store.addDefinition(definitionItem)
    }
  }

  private async handleManualMode(
    existingItem: PresentationDefinitionItem | undefined,
    definitionItem: NonPersistedPresentationDefinitionItem,
    tenantId: string | undefined,
    version: string | undefined,
  ): Promise<PresentationDefinitionItem> {
    if (existingItem && !isPresentationDefinitionEqual(existingItem, definitionItem)) {
      throw Error(
        `Cannot update definition ${definitionItem.definitionId} for tenant ${tenantId} version ${version} because definition exists and manual version control is enabled.`,
      )
    } else {
      return await this.store.addDefinition(definitionItem)
    }
  }

  private async handleAutoIncrementMode(
    latestVersionItem: PresentationDefinitionItem | undefined,
    definitionItem: NonPersistedPresentationDefinitionItem,
    releaseType: 'major' | 'minor',
  ): Promise<PresentationDefinitionItem> {
    const currentVersion = latestVersionItem?.version ?? definitionItem.version ?? '1'
    const newVersion = latestVersionItem ? semver.inc(currentVersion, releaseType) : currentVersion
    if (!newVersion) {
      throw Error(`Could not increment ${releaseType} version on ${currentVersion}`)
    }
    definitionItem.version = newVersion
    return await this.store.addDefinition(definitionItem)
  }
}
