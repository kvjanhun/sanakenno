import * as ExpoCrypto from 'expo-crypto';
import type { CryptoService } from '@sanakenno/shared';

export const mobileCrypto: CryptoService = {
  async hashSHA256(input: string): Promise<string> {
    return ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      input,
    );
  },

  randomUUID(): string {
    return ExpoCrypto.randomUUID();
  },
};
