import { IIdentifier, TKeyType } from '@veramo/core'
import { _ExtendedIKey } from '@veramo/utils'
import { RequiredContext } from '../siop-service'

export const DID_PREFIX = 'did'

export enum SupportedDidMethodEnum {
  DID_ETHR = 'ethr',
  DID_KEY = 'key',
  DID_LTO = 'lto',
  DID_ION = 'ion',
  DID_FACTOM = 'factom',
  DID_JWK = 'jwk',
}

export enum IdentifierAliasEnum {
  PRIMARY = 'primary',
}

export type GetOrCreatePrimaryIdentifierArgs = {
  context: RequiredContext
  opts?: CreateOrGetIdentifierOpts
}

export type CreateOrGetIdentifierOpts = {
  method: SupportedDidMethodEnum
  createOpts?: CreateIdentifierCreateOpts
}

export enum KeyManagementSystemEnum {
  LOCAL = 'local',
}
export type CreateIdentifierCreateOpts = {
  kms?: KeyManagementSystemEnum
  alias?: string
  options?: IdentifierProviderOpts
}

export type IdentifierProviderOpts = {
  type?: TKeyType
  use?: string
  [x: string]: any
}

export type KeyOpts = {
  didMethod: SupportedDidMethodEnum
  keyType: TKeyType
  codecName?: string
  kid?: string
  identifier: IIdentifier
}

export type GetIdentifierArgs = {
  keyOpts: KeyOpts // TODO was IssuanceOpts, check if ok like this
  context: RequiredContext
}

export type IdentifierWithKey = {
  identifier: IIdentifier
  key: _ExtendedIKey
  kid: string
}

export type GetAuthenticationKeyArgs = {
  identifier: IIdentifier
  context: RequiredContext
}

export type CreateIdentifierArgs = {
  context: RequiredContext
  opts?: CreateIdentifierOpts
}

export type CreateIdentifierOpts = {
  method: SupportedDidMethodEnum
  createOpts?: CreateIdentifierCreateOpts
}
