// ABOUTME: Metro configuration for Expo Router with web support
// Extends default Expo Metro config with custom settings for file-based routing

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
