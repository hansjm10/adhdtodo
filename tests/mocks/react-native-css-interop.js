// ABOUTME: Mock for react-native-css-interop to fix NativeWind Jest issues
// Provides minimal implementation to prevent test errors

const React = require('react');

// Mock the cssInterop function
const cssInterop = (Component, _mapping) => {
  // Return a wrapper component that strips className and applies style
  const InteropComponent = React.forwardRef((props, ref) => {
    const { className: _className, style, ...rest } = props;

    // In tests, we don't need to process className
    // Just pass through the style prop
    return React.createElement(Component, {
      ...rest,
      style,
      ref,
    });
  });

  InteropComponent.displayName = `cssInterop(${Component.displayName || Component.name || 'Component'})`;

  return InteropComponent;
};

// Mock the remapProps function
const remapProps = (Component, _mapping) => {
  return Component;
};

// Export the mocked functions
module.exports = {
  cssInterop,
  remapProps,
  default: {
    cssInterop,
    remapProps,
  },
};
