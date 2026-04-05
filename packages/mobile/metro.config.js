const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root for changes in shared packages
config.watchFolders = [workspaceRoot];

// Resolve modules from both the project and workspace root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// The shared package uses .js extensions in imports (ESM TypeScript convention).
// Metro needs to try .ts/.tsx before .js so these resolve to the actual source files.
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Rewrite .js imports to extensionless so Metro tries .ts first
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const withoutExt = moduleName.slice(0, -3);
    return context.resolveRequest(context, withoutExt, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
