const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)
const threeModule = path.resolve(projectRoot, 'node_modules/three/build/three.module.js')

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  three: path.resolve(projectRoot, 'node_modules/three'),
}

const fallbackResolveRequest =
  config.resolver.resolveRequest ||
  ((context, moduleName, platform) => {
    return context.resolveRequest(context, moduleName, platform)
  })

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      type: 'sourceFile',
      filePath: threeModule,
    }
  }

  return fallbackResolveRequest(context, moduleName, platform)
}

module.exports = config
