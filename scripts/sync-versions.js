#!/usr/bin/env node
/**
 * Sync the version from packages/web/package.json (set by changesets)
 * to root package.json and packages/shared/package.json.
 *
 * Mobile has its own independent version — see packages/mobile/package.json.
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

// Sync shared package.json
const sharedPkg = JSON.parse(
  readFileSync('packages/shared/package.json', 'utf8'),
);
sharedPkg.version = version;
writeFileSync(
  'packages/shared/package.json',
  JSON.stringify(sharedPkg, null, 2) + '\n',
);

console.log(
  `Synced version ${version} to root and shared package.json (mobile is independent)`,
);
