import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf-8'),
);

/** @type {import('expo/config').ExpoConfig} */
export default ({ config }) => ({
  ...config,
  version,
});
