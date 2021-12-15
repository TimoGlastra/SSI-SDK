import { IPluginMethodMap } from '@veramo/core';

export interface IMnemonicInfoGenerator extends IPluginMethodMap {
  generateMnemonic(args: IMnemonicGeneratorArgs): Promise<IMnemonicInfoResult>;
  verifyMnemonic(args: IMnemonicVerificationArgs): Promise<IMnemonicInfoResult>;
  verifyPartialMnemonic(args: IPartialMnemonicVerificationArgs): Promise<IMnemonicInfoResult>;
  generateSeed(args: ISeedGeneratorArgs): Promise<IMnemonicInfoResult>;
  saveMnemonicInfo(args: IMnemonicInfoStoreArgs): Promise<IMnemonicInfoResult>;
  getMnemonicInfo(args: IMnemonicInfoStoreArgs): Promise<IMnemonicInfoResult>;
  deleteMnemonicInfo(args: IMnemonicInfoStoreArgs): Promise<DeleteResult>;
}

/**
 * @param { 128 | 160 | 192 | 224 | 256 } bits - Affects the number of words in the mnemonic,
 * which is 12, 15, 18, 21 and 24 respectively.
 * @param { string } id - Optional user defined id for the mnemonic
 * @param { boolean } persist - Whether the mnemonic should be persisted into the database
 */
export interface IMnemonicGeneratorArgs {
  bits: 128 | 160 | 192 | 224 | 256;
  id?: string;
  persist?: boolean;
}

/**
 * @param { string } id - Optional user defined id for the mnemonic
 * @param { string } hash - Optional sha256 hash of the mnemonic
 * @param { string[] } wordList - List containing all the words of the mnemonic in order.
 */
export interface IMnemonicVerificationArgs {
  id?: string;
  hash?: string;
  wordList: string[];
}

/**
 * @param { string } id - Optional user defined id for the mnemonic
 * @param { string } hash - Optional sha256 hash of the mnemonic
 * @param { number, string][] } indexedWordList - List partially containing the words
 * with their indexes corresponding the position in which they appear in the mnemonic.
 * It must be in the same order as in the mnemonic.
 */
export interface IPartialMnemonicVerificationArgs {
  id?: string;
  hash?: string;
  indexedWordList: [number, string][];
}

/**
 * @param { string[] } mnemonic - Array representation of the mnemonic string
 */
export interface ISeedGeneratorArgs {
  mnemonic: string[];
}
/**
 * @param { string } id - Optional user defined id for the mnemonic
 * @param { string } hash - Optional sha256 hash of the mnemonic
 * @param { string[] } mnemonic - Array representation of the mnemonic string
 */
export interface IMnemonicInfoStoreArgs {
  id?: string;
  hash?: string;
  mnemonic?: string[];
}

export interface DeleteResult {
  raw: unknown;
  affected?: number | null;
}

export interface IMnemonicInfoResult extends IMnemonicInfoStoreArgs {
  succeeded?: boolean;
  seed?: string;
}