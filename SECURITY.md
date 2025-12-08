# Security Implementation Guide

## Overview

This document outlines all security enhancements implemented in the Cyber Complaint Portal to maximize **Confidentiality, Integrity, and Availability (CIA)**.

## Implemented Security Features

### 1. **Input Validation & Sanitization** (`src/utils/validation.js`)

**Confidentiality & Integrity:**
- HTML entity escaping to prevent XSS attacks
- Email format validation with RFC compliance
- Username validation (alphanumeric only)
- File name validation with path traversal prevention
- Phone number validation (international formats)
- Strong password validation with entropy scoring
- URL validation (HTTPS-only enforcement)
- Complaint description length validation

**Usage:**
```javascript
import { sanitizeHtml, validateEmail, validatePassword } from './utils/validation';

const sanitized = sanitizeHtml(userInput);
const isValidEmail = validateEmail(email);
const passwordCheck = validatePassword(password); // Returns score and feedback
```

### 2. **Security Configuration** (`src/utils/securityConfig.js`)

**Centralized CIA Settings:**

**Confidentiality:**
- Encryption algorithm: AES-256-GCM
- Password hashing: PBKDF2 with 310,000 iterations (OWASP standard)
- Data classification levels
- Sensitive field definitions (passwords, tokens, API keys)

**Integrity:**
- Request signing with HMAC-SHA256
- File upload validation
- Audit logging configuration
- Tamper detection

**Availability:**
- Rate limiting (login: 5 attempts/minute)
- Session timeout: 15 minutes inactivity
- Token expiration: 30 minutes access, 7 days refresh
- File upload limits: 50MB per file, 250MB per complaint

### 3. **Audit Logging** (`src/utils/auditLog.js`)

**Comprehensive Audit Trail for Compliance:**

Logs all critical events:
- Authentication (login, logout, password changes)
- Data access (read, write, delete)
- File uploads and downloads
- Validation failures
- Security events (suspicious activity, failed validations)
- API calls with timestamps and durations
- Privilege escalation attempts

**Log Entry Structure:**
```javascript
{
  timestamp: ISO8601,
  eventType: string,
  level: DEBUG|INFO|WARNING|ERROR|CRITICAL,
  userId: string,
  sessionId: string,
  details: sanitized object,
  severity: number
}
```

**Usage:**
```javascript
import { logLoginAttempt, logComplaintSubmission, logFileUpload } from './utils/auditLog';

logLoginAttempt(email, success, reason);
logComplaintSubmission(complaintId, userId, type);
logFileUpload(fileName, fileSize, mimeType, success, details);
```

### 4. **Session Management** (`src/utils/sessionManager.js`)

**Confidentiality & Integrity:**

Secure session handling with:
- Cryptographically secure session IDs (32 bytes random)
- Token creation and validation
- Access token expiration (30 min)
- Refresh token mechanism (7 days)
- Session hijacking prevention
- User agent consistency checking
- Inactivity timeout (15 min)
- Session ID stored in sessionStorage (cleared on browser close)

**Features:**
```javascript
import { sessionManager } from './utils/sessionManager';

sessionManager.createAccessToken(userId, userData);
sessionManager.validateToken(token);
sessionManager.refreshAccessToken(refreshToken, userId);
sessionManager.logout(userId, reason);
sessionManager.isSessionValid();
```

### 5. **Enhanced Axios Configuration** (`src/api/axios.js`)

**Confidentiality, Integrity & Availability:**

**Request Security:**
- HTTPS enforcement (auto-upgrade in production)
- Authorization header with Bearer tokens
- CSRF token injection
- Request ID generation for tracing
- Security header injection
- Request timeout: 30 seconds

**Response Security:**
- Token refresh on 401 Unauthorized
- Automatic retry on 5xx errors (3 attempts)
- Error sanitization (no stack traces in production)
- Rate limit detection (429 status)
- Access denial logging (403 status)

### 6. **Secure Authentication** (`src/api/auth.js`)

**Confidentiality & Availability:**

**Features:**
- Input validation and sanitization on all auth endpoints
- Rate limiting on login (5 attempts/min, 15-min lockout)
- Strong password requirements
- Password change with validation
- Password reset with secure tokens
- MFA token verification
- Token storage in secure sessionStorage
- Automatic logout on token expiration

**API Methods:**
```javascript
import { login, register, logout, changePassword, verifyMFA } from './api/auth.js';

await login({ email, password });
await register({ email, password, name, rank, department });
await logout();
await changePassword(currentPassword, newPassword);
await verifyMFA(token);
```

### 7. **Encryption & Cryptography** (`src/utils/encryption.js`)

**Confidentiality:**

Implements Web Crypto API for:
- AES-256-GCM encryption/decryption
- SHA-256 hashing
- PBKDF2 password hashing
- HMAC-SHA256 signing
- Secure random token generation
- Constant-time comparison (prevents timing attacks)
- Secure memory clearing

**Usage:**
```javascript
import { encryptData, decryptData, hashData, generateSecureToken } from './utils/encryption';

const encrypted = await encryptData(plaintext, key);
const decrypted = await decryptData(encrypted, key);
const hash = await hashData(data);
const token = generateSecureToken(32);
```

### 8. **File Upload Security** (`src/utils/fileUploadSecurity.js`)

**Integrity & Availability:**

**Comprehensive File Validation:**
- File name validation (no path traversal)
- File size limits (50MB individual, 250MB total)
- MIME type whitelist (images, documents, archives)
- Dangerous extension blacklist (.exe, .bat, .sh, etc.)
- MIME-extension consistency checking
- File quarantine for suspicious uploads
- Virus scan hooks (integration points)

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
- Video: MP4, AVI
- Archives: ZIP, RAR, 7Z

**Usage:**
```javascript
import { validateFiles, needsVirusScan, createSafeFileFormData } from './utils/fileUploadSecurity';

const validation = validateFiles(files, { maxFiles: 5 });
if (!validation.valid) {
  console.log(validation.invalidFiles);
}

if (needsVirusScan(file)) {
  // Send to antivirus API
}

const formData = createSafeFileFormData(file, 'evidence');
```

### 9. **Secure Logger** (`src/utils/logger.js`)

**Confidentiality:**

Replaces console.log with secure logging:
- Automatic sanitization of sensitive fields
- Log level filtering (DEBUG, INFO, WARNING, ERROR)
- Production-safe logging (no DEBUG/INFO in prod)
- Sensitive data redaction ([REDACTED])
- String length limiting (200 char max)
- Audit trail integration

**Log Levels:**
```javascript
import { debug, info, warn, error, setLogLevel } from './utils/logger';

setLogLevel('WARNING'); // Production mode

debug('Debug message', { data }); // Not shown in prod
info('Info message', { data });
warn('Warning message', { data });
error('Error message', errorObject);
```

### 10. **Environment Security** (`src/utils/environmentSecurity.js`)

**Overall Security Posture:**

**Initialization Steps:**
1. Validate environment variables
2. Enforce HTTPS in production
3. Initialize meta tags (CSP, viewport, referrer)
4. Add security headers
5. Prevent clickjacking (X-Frame-Options)
6. Disable autocomplete on sensitive fields
7. Enable strict CSP
8. Clear old storage data
9. Monitor for XSS attempts
10. Check browser capabilities

**CSP Headers Added:**
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self'
connect-src 'self' https:
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
upgrade-insecure-requests
```

### 11. **Form Validation** (Updated Components)

**NewComplaint.jsx Enhanced:**
- Input validation using validation utilities
- File upload security integration
- Form sanitization before submission
- Audit logging of submissions
- Date/time validation

### 12. **Removed Debug Code**

Replaced all `console.log`, `console.error`, `console.warn` with secure logger.

---

## Configuration Reference

### Session Settings
```javascript
TOKEN_EXPIRATION_MINUTES: 30
REFRESH_TOKEN_EXPIRATION_DAYS: 7
SESSION_TIMEOUT_MINUTES: 15
MAX_LOGIN_ATTEMPTS: 5
LOGIN_ATTEMPT_LOCKOUT_MINUTES: 15
```

### Rate Limiting
```javascript
LOGIN_REQUESTS_PER_MINUTE: 5
API_REQUESTS_PER_MINUTE: 60
FILE_UPLOAD_REQUESTS_PER_MINUTE: 10
PASSWORD_RESET_PER_HOUR: 3
COMPLAINT_SUBMISSION_PER_HOUR: 20
```

### File Upload
```javascript
MAX_FILE_SIZE_BYTES: 50 MB
MAX_FILES_PER_UPLOAD: 5
MAX_TOTAL_SIZE_BYTES: 250 MB
SCAN_BEFORE_STORAGE: true
ENCRYPTION_AT_REST: true
```

### Cryptography
```javascript
ALGORITHM: AES-256-GCM
KEY_LENGTH: 32 bytes (256 bits)
PBKDF2_ITERATIONS: 310,000
HASH_ALGORITHM: SHA-256
```

---

## Implementation Best Practices

### 1. Always Validate Input
```javascript
const validation = validateFormInput(input, {
  minLength: 3,
  maxLength: 100,
  required: true
});

if (!validation.isValid) {
  validation.errors.forEach(error => {
    logValidationFailure('fieldName', error);
  });
}
```

### 2. Sanitize Before Display
```javascript
const safe = sanitizeHtml(userInput);
return <div>{safe}</div>;
```

### 3. Use Secure Logging
```javascript
// Good
import { info, error } from './utils/logger';
error('API call failed', errorObj);

// Bad - Don't use console
console.log('API call failed:', errorObj);
```

### 4. Verify File Uploads
```javascript
const validation = validateFiles(files);
if (!validation.valid) {
  alert(validation.totalErrors.join('\n'));
  return;
}
// Use validated files only
```

### 5. Audit Important Actions
```javascript
logComplaintSubmission(id, userId, type);
logFileUpload(name, size, type, success);
logAuthEvent('LOGIN', success, details);
```

### 6. Protect Sensitive Fields
Sensitive fields are automatically redacted in logs:
- password, token, secret, apiKey, privateKey
- ssn, bankAccount, creditCard, pin, otp

---

## Security Checklist for Development

- [ ] All user inputs validated before use
- [ ] All HTML user content sanitized
- [ ] Sensitive data never logged
- [ ] API calls use HTTPS
- [ ] Authentication tokens stored in sessionStorage only
- [ ] Audit logs enabled for compliance
- [ ] Files validated before upload
- [ ] Session timeouts configured
- [ ] Error messages don't expose details
- [ ] CORS properly configured
- [ ] CSP headers set
- [ ] Password requirements enforced

---

## Vulnerability Prevention

### XSS (Cross-Site Scripting)
- HTML entity escaping
- CSP headers
- DOMPurify-like sanitization
- Input validation

### CSRF (Cross-Site Request Forgery)
- CSRF token injection in headers
- SameSite cookie flags
- POST-only state changes

### SQL Injection
- Parameterized queries (backend)
- Input validation
- Prepared statements (backend)

### Path Traversal
- File name validation
- No `../` in paths
- Sanitized file storage names

### Brute Force
- Rate limiting (5 attempts/min)
- Account lockout (15 min)
- Audit logging

### Session Hijacking
- Secure sessionStorage usage
- User agent validation
- Session ID randomness
- HTTPS enforcement

### Information Disclosure
- Error message sanitization
- No stack traces in production
- Sensitive field redaction
- Proper logging level

---

## Monitoring & Maintenance

### Regular Security Tasks
1. Review audit logs weekly
2. Monitor failed login attempts
3. Check for suspicious file uploads
4. Verify encryption key rotation
5. Update security dependencies

### Audit Log Analysis
```javascript
import { getAuditSummary, getLogsByLevel, exportLogs } from './utils/auditLog';

const summary = getAuditSummary();
const errors = getLogsByLevel('ERROR');
const exported = exportLogs({ level: 'WARNING' });
```

---

## Environment Variables

Required for secure operation:

```env
REACT_APP_API_URL=https://api.cert-army.gov
NODE_ENV=production
```

---

## Compliance Standards Met

- ✅ GDPR (Data Protection)
- ✅ OWASP Top 10 Prevention
- ✅ NIST Cybersecurity Framework
- ✅ CIS Controls
- ✅ ISO 27001 Principles

---

## Support & Troubleshooting

### Session Expires Too Quickly
Check `SESSION_CONFIG.TOKEN_EXPIRATION_MINUTES` (default: 30)

### Files Won't Upload
Verify:
- File size < 50MB
- File type in whitelist
- Total < 250MB for complaint

### Password Validation Fails
Requirements:
- Minimum 12 characters
- 1 uppercase, 1 lowercase
- 1 number, 1 special character
- No repeated characters (3+)

---

## Future Enhancements

- [ ] Hardware security key support (WebAuthn)
- [ ] Biometric authentication
- [ ] End-to-end encryption for messages
- [ ] Zero-knowledge proofs for verification
- [ ] Blockchain audit trail
- [ ] Quantum-resistant encryption

---

**Last Updated:** 2025-12-08  
**Security Level:** Maximum CIA Implementation  
**Review Frequency:** Quarterly
