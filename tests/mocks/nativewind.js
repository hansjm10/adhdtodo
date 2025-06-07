// ABOUTME: Mock for NativeWind v4 to enable Jest testing
// Provides minimal implementation of NativeWind utilities for testing

const React = require('react');

// Mock styled function
const styled = (Component, _options) => {
  const StyledComponent = React.forwardRef((props, ref) => {
    const { className: _className, tw: _tw, style, ...rest } = props;

    // In tests, we don't process Tailwind classes
    // Just pass through regular styles
    return React.createElement(Component, {
      ...rest,
      style,
      ref,
    });
  });

  StyledComponent.displayName = `Styled(${Component.displayName || Component.name || 'Component'})`;

  return StyledComponent;
};

// Mock useColorScheme hook
const useColorScheme = () => {
  return { colorScheme: 'light' };
};

// Mock className utilities
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Mock CSS variable functions
const vars = (obj) => obj;

// Export all mocked utilities
module.exports = {
  styled,
  useColorScheme,
  cn,
  vars,
  // Re-export common utilities that might be used
  default: {
    styled,
    useColorScheme,
    cn,
    vars,
  },
};
