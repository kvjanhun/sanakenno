import { Share } from 'react-native';
import type { ShareService } from '@sanakenno/shared';

export const mobileShare: ShareService = {
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await Share.share({ message: text });
      return true;
    } catch {
      return false;
    }
  },
};
