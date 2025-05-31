# Authentication System

This document describes the authentication system implemented for the ADHD Todo app.

## Overview

The authentication system provides secure password-based authentication with the following features:

- **Password hashing**: Using PBKDF2 with SHA-256 (100,000 iterations)
- **Session tokens**: Secure random tokens with expiration
- **Password validation**: Enforces strong password requirements
- **Secure storage**: Uses expo-secure-store for encrypted storage
- **Session management**: Automatic session validation and refresh

## Architecture

### Components

1. **AuthService** (`src/services/AuthService.js`)

   - Main authentication logic
   - Handles login, signup, logout
   - Password validation
   - Session management

2. **CryptoService** (`src/services/CryptoService.js`)

   - Password hashing and verification
   - Salt generation
   - Token generation
   - Uses expo-crypto for cryptographic operations

3. **UserStorageService** (`src/services/UserStorageService.js`)

   - User data persistence
   - Session token storage
   - Current user management

4. **AuthScreen** (`src/screens/AuthScreen.js`)

   - Login/signup UI
   - Password input with show/hide toggle
   - Form validation

5. **ProfileScreen** (`src/screens/ProfileScreen.js`)
   - User profile display
   - Logout functionality
   - Account settings

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Password Storage

Passwords are never stored in plain text. The system uses:

1. **Salt Generation**: Random 16-byte salt for each password
2. **PBKDF2 Hashing**: 100,000 iterations with SHA-256
3. **Secure Storage**: Hash and salt stored using expo-secure-store

### Session Management

- **Token Generation**: 32-byte random tokens
- **Token Expiration**: 30-day default expiration
- **Automatic Validation**: Sessions verified on app startup
- **Secure Logout**: Clears all session data

## API Usage

### Sign Up

```javascript
import AuthService from './services/AuthService';

const result = await AuthService.signUp(
  'user@example.com',
  'SecurePassword123!',
  'User Name',
  USER_ROLE.ADHD_USER,
);

if (result.success) {
  // User created and logged in
  console.log('User:', result.user);
  console.log('Token:', result.token);
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

### Login

```javascript
const result = await AuthService.login('user@example.com', 'SecurePassword123!');

if (result.success) {
  // User logged in
  console.log('User:', result.user);
  console.log('Token:', result.token);
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

### Verify Session

```javascript
const session = await AuthService.verifySession();

if (session.isValid) {
  // Session is valid
  console.log('User:', session.user);
} else {
  // Session expired or invalid
  console.log('Reason:', session.reason);
}
```

### Logout

```javascript
const result = await AuthService.logout();

if (result.success) {
  // User logged out successfully
}
```

### Change Password

```javascript
const result = await AuthService.changePassword('currentPassword', 'newPassword123!');

if (result.success) {
  // Password changed successfully
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

## Migration from Old System

For existing users who don't have passwords:

1. Users will see an error message asking them to reset their password
2. Future implementation will include a password reset flow
3. Admin can manually migrate users using `AuthService.migrateUser()`

## Testing

The authentication system includes comprehensive tests:

- **CryptoService Tests**: Password hashing, token generation
- **AuthService Tests**: All authentication flows
- **AuthScreen Tests**: UI interactions and validation

Run tests with:

```bash
npm test src/services/__tests__/CryptoService.test.js
npm test src/services/__tests__/AuthService.test.js
npm test src/screens/__tests__/AuthScreen.test.js
```

## Security Considerations

1. **Never log passwords**: Even in development
2. **Use HTTPS**: Always use secure connections in production
3. **Token rotation**: Implement token refresh for long sessions
4. **Rate limiting**: Implement login attempt limits (future enhancement)
5. **Two-factor authentication**: Consider adding 2FA (future enhancement)

## Future Enhancements

- Password reset via email
- OAuth integration (Google, Apple)
- Biometric authentication
- Remember me functionality
- Account lockout after failed attempts
- Password strength meter UI
- Two-factor authentication
