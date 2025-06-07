// ABOUTME: Metro configuration for Expo Router with NativeWind and web support
// Extends default Expo Metro config with NativeWind CSS support and file-based routing

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = withNativeWind(config, { input: './global.css' });
