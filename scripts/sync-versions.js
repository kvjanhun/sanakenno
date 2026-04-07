#!/usr/bin/env node
/**
 * Sync the version from packages/web/package.json (set by changesets)
 * to root package.json and packages/mobile/app.json.
 *
 * Run automatically as part of `pnpm run version:bump`.
 */
import { readFileSync, writeFileSync } from 'fs';

const webPkg = JSON.parse(readFileSync('packages/web/package.json', 'utf8'));
const version = webPkg.version;

// Sync root package.json
const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
rootPkg.version = version;
writeFileSync('package.json', JSON.stringify(rootPkg, null, 2) + '\n');

// Sync app.json (Expo config)
const appJson = JSON.parse(readFileSync('packages/mobile/app.json', 'utf8'));
appJson.expo.version = version;
writeFileSync(
  'packages/mobile/app.json',
  JSON.stringify(appJson, null, 2) + '\n',
);

console.log(`Synced version ${version} to root package.json and app.json`);
