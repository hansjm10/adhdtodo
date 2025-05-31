# Fix for React 19 Test Compatibility

Based on the GitHub issue [#1769](https://github.com/callstack/react-native-testing-library/issues/1769), the test failures are caused by using React 19.1.0 with React Native Testing Library.

## Quick Fix

The solution is to downgrade to React 19.0.0:

```bash
# Install exact versions (no ^ prefix)
npm install --save-exact react@19.0.0
npm install --save-exact --save-dev react-test-renderer@19.0.0

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

## Important Notes

1. **Use exact versions** - Do NOT use `^19.0.0` as it may install 19.1.0
2. **Both packages must match** - React and react-test-renderer must be the same version
3. **This is temporary** - Until React Native Testing Library v14 is released with proper React 19 support

## Alternative: Use the prepared package.json

```bash
# Backup current package.json
cp package.json package.json.backup

# Use the React 19.0.0 compatible version
cp package.react19.0.json package.json

# Install dependencies
rm -rf node_modules package-lock.json
npm install
```

## Verification

After installation, verify versions:

```bash
npm list react react-test-renderer --depth=0
```

Should show:

```
├── react@19.0.0
└── react-test-renderer@19.0.0
```

## Related Issues

- [Cannot install the library with React 19.0.0](https://github.com/callstack/react-native-testing-library/issues/1769)
- [RFC: React 19 support](https://github.com/callstack/react-native-testing-library/issues/1593)
