// ABOUTME: Babel configuration specifically for Jest tests
// Removes NativeWind transformations to avoid mock issues

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
