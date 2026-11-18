// Metro configuration. The app shares modules with the web dashboard instead of copying them (sharing.config.js):
// `@dashboard/*` resolves into src/MuxCloud.Dashboard/src, which is watched. Bare imports made from shared files
// resolve as if they were made from this project, so the dashboard's own node_modules never produce a second copy
// of anything.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { sharedRoots } = require('./sharing.config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders || []), sharedRoots.dashboardSrc];

const aliases = {
  '@/': path.join(projectRoot, 'src') + path.sep,
  '@dashboard/': sharedRoots.dashboardSrc + path.sep,
};
const projectOrigin = path.join(projectRoot, 'package.json');

const upstreamResolve = config.resolver.resolveRequest;
const resolve = (context, moduleName, platform) =>
  upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [prefix, target] of Object.entries(aliases)) {
    if (moduleName.startsWith(prefix)) {
      return context.resolveRequest(context, target + moduleName.slice(prefix.length), platform);
    }
  }
  const fromShared = context.originModulePath.startsWith(sharedRoots.dashboardSrc + path.sep);
  if (fromShared && !moduleName.startsWith('.') && !path.isAbsolute(moduleName)) {
    return resolve({ ...context, originModulePath: projectOrigin }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
