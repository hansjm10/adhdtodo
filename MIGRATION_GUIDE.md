# Migration Guide

## Migrating from AsyncStorage to SecureStorageService

As of PR #18, we've replaced AsyncStorage with expo-secure-store for enhanced security. All sensitive data including user profiles, authentication tokens, and task data are now encrypted at rest.

### What Changed

- `AsyncStorage` has been replaced with `SecureStorageService`
- All data is now encrypted using the device's secure keychain/keystore
- The API remains compatible, so no code changes are needed for consumers

### Important Notes

1. **Data Loss**: When users update to this version, their existing data stored in AsyncStorage will not be automatically migrated. Users will need to:

   - Re-authenticate (login again)
   - Re-create any saved tasks
   - Re-establish partnerships

2. **Size Limitations**: expo-secure-store has a 2KB limit per item. Large data structures are automatically validated and will throw an error if they exceed this limit.

3. **Platform Support**: expo-secure-store is supported on iOS and Android. Web support requires a different storage solution.

### For Developers

If you're working with storage in the codebase:

1. Always use `SecureStorageService` instead of `AsyncStorage`
2. Be aware of the 2KB size limit when storing data
3. Handle errors appropriately as storage operations may fail due to size limits
4. All storage keys must be non-empty strings

Example:

```javascript
// Old way (don't use)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('key', JSON.stringify(data));

// New way (use this)
import SecureStorageService from './services/SecureStorageService';
await SecureStorageService.setItem('key', data); // Automatically stringifies
```
