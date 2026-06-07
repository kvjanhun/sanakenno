import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { ShareService } from '@sanakenno/shared';

export const mobileShare: ShareService = {
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      return false;
    }
  },

  async share(text: string): Promise<'share' | 'clipboard' | 'none'> {
    try {
      await Share.share({ message: text });
      return 'share';
    } catch {
      return 'none';
    }
  },
};
