# CIA Security Quick Reference

## 🔐 Maximum Confidentiality, Integrity, Availability Implementation

### Quick Import Guide

```javascript
// Input Validation & Sanitization
import { 
  sanitizeHtml, validateEmail, validatePassword, 
  validateFormInput, validateFiles 
} from './utils/validation';

// Security Configuration (read-only)
import { 
  SESSION_CONFIG, RATE_LIMITING, FILE_UPLOAD_CONFIG,
  SECURITY_HEADERS, VALIDATION_RULES 
} from './utils/securityConfig';

// Audit Logging
import { 
  logAuthEvent, logLoginAttempt, logComplaintSubmission,
  logFileUpload, logSecurityEvent 
} from './utils/auditLog';

// Session Management
import { sessionManager } from './utils/sessionManager';

// Encryption
import { 
  encryptData, decryptData, hashData, 
  generateSecureToken 
} from './utils/encryption';

// File Upload Security
import { 
  validateFiles, needsVirusScan, 
  createSafeFileFormData 
} from './utils/fileUploadSecurity';

// Secure Logging
import { debug, info, warn, error } from './utils/logger';

// Environment Security
import { initializeSecurityFeatures } from './utils/environmentSecurity';
```

---

## 🛡️ Common Scenarios

### Scenario 1: User Registration with Validation
```javascript
import { validateEmail, validatePassword, validateFormInput } from './utils/validation';
import { register } from './api/auth';
import { logAuthEvent } from './utils/auditLog';

async function handleRegister(email, password, name) {
  // Validate email
  if (!validateEmail(email)) {
    alert('Invalid email format');
    return;
  }

  // Validate password strength
  const pwdCheck = validatePassword(password);
  if (!pwdCheck.isStrong) {
    alert(`Password too weak: ${pwdCheck.feedback.join(', ')}`);
    return;
  }

  // Validate name
  const nameValidation = validateFormInput(name, {
    minLength: 3,
    maxLength: 100
  });
  if (!nameValidation.isValid) {
    alert(nameValidation.errors.join('\n'));
    return;
  }

  // Register with secure auth
  try {
    const result = await register({ email, password, name });
    logAuthEvent('REGISTRATION', true, { email: email.substring(0, 3) });
  } catch (error) {
    logAuthEvent('REGISTRATION', false, { error: error.message });
  }
}
```

### Scenario 2: Secure File Upload
```javascript
import { validateFiles, createSafeFileFormData } from './utils/fileUploadSecurity';
import { logFileUpload } from './utils/auditLog';

async function handleFileUpload(files) {
  // Validate all files
  const validation = validateFiles(files);

  if (!validation.valid) {
    const errors = validation.invalidFiles
      .flatMap(f => f.errors)
      .join('\n');
    alert(`Upload failed:\n${errors}`);
    return;
  }

  // Upload each valid file
  for (const file of validation.validFiles) {
    try {
      const formData = createSafeFileFormData(file, 'evidence');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      logFileUpload(file.name, file.size, file.type, true);
    } catch (error) {
      logFileUpload(file.name, file.size, file.type, false, {
        error: error.message
      });
    }
  }
}
```

### Scenario 3: Form Input with Sanitization
```javascript
import { sanitizeHtml, validateFormInput } from './utils/validation';
import { logValidationFailure } from './utils/auditLog';

function handleFormSubmit(formData) {
  // Validate description
  const descValidation = validateFormInput(formData.description, {
    minLength: 20,
    maxLength: 5000,
    required: true
  });

  if (!descValidation.isValid) {
    descValidation.errors.forEach(error => {
      logValidationFailure('description', error);
    });
    alert(descValidation.errors.join('\n'));
    return;
  }

  // Sanitize all text fields
  const sanitized = {
    name: sanitizeHtml(formData.name),
    description: sanitizeHtml(formData.description),
    department: sanitizeHtml(formData.department)
  };

  // Submit sanitized data
  submitComplaint(sanitized);
}
```

### Scenario 4: Secure Logging (No console.log)
```javascript
import { info, warn, error } from './utils/logger';

// Good - Secure logging
info('User logged in', { userId: user.id });
warn('Multiple failed logins detected', { attempts: 5 });
error('Database connection failed', errorObj); // Auto-sanitized

// Bad - Don't use
console.log('User:', user); // Might expose sensitive data
console.error('Error:', errorObj); // Logged to console
```

### Scenario 5: Session Management
```javascript
import { sessionManager } from './utils/sessionManager';

// Create session after login
const { token, expiresAt } = sessionManager.createAccessToken(
  userId, 
  { email: user.email, rank: user.rank }
);

// Validate token on API calls
const validation = sessionManager.validateToken(token);
if (!validation.valid) {
  // Token expired or invalid
  window.location.href = '/login';
}

// Check session status
const isValid = sessionManager.isSessionValid();
const info = sessionManager.getSessionInfo();
console.log(`Token expires in ${info.remainingMinutes} minutes`);

// Logout
sessionManager.logout(userId, 'User initiated');
```

---

## ⚙️ Configuration Cheat Sheet

### Sensitive Fields (Auto-Redacted)
```javascript
password, token, secret, apiKey, privateKey,
ssn, bankAccount, creditCard, pin, otp
```

### Rate Limits
```
Login: 5 attempts/min → 15-min lockout
API: 60 requests/min
File Upload: 10 requests/min
Password Reset: 3/hour
```

### Encryption
```
Algorithm: AES-256-GCM
Password Hash: PBKDF2 (310k iterations)
Hash: SHA-256
Token: 32 bytes random
```

### File Upload
```
Max Size: 50 MB per file
Total Max: 250 MB per complaint
Max Files: 5
Allowed: images, docs, videos, archives
Blocked: .exe, .bat, .sh, .dll, etc.
```

### Session
```
Access Token: 30 minutes
Refresh Token: 7 days
Session Timeout: 15 minutes inactivity
Storage: sessionStorage (auto-clear on close)
```

---

## 🔍 Validation Rules

### Email
```javascript
validateEmail('user@example.com') // true
validateEmail('invalid') // false
validateEmail('a@b.c') // true
```

### Password
```javascript
validatePassword('Simple1!')
// Returns: { isStrong: false, score: 3, feedback: [...] }

validatePassword('SecureP@ss123!')
// Returns: { isStrong: true, score: 6, feedback: [] }
```

### Form Input
```javascript
validateFormInput('John Doe', {
  minLength: 3,
  maxLength: 100,
  required: true
})
// Returns: { isValid: true, sanitized: 'John Doe', errors: [] }
```

### Files
```javascript
validateFiles(fileList, {
  maxFiles: 5,
  maxTotalSize: 250 * 1024 * 1024
})
// Returns: { valid: bool, validFiles: [], invalidFiles: [], errors: [] }
```

---

## 📊 Audit Logging Events

### Authentication
- `logLoginAttempt(email, success, reason)`
- `logPasswordChange(success, details)`
- `logAuthEvent('LOGIN', true, {})`

### Data Operations
- `logDataAccess(dataType, accessType, resourceId, allowed)`
- `logComplaintSubmission(id, userId, type)`
- `logFileUpload(name, size, type, success)`

### Security
- `logValidationFailure(field, reason, input)`
- `logSecurityEvent(eventName, severity, details)`
- `logSuspiciousActivity(activity, threshold, details)`

### Export
```javascript
import { exportLogs, getAuditSummary } from './utils/auditLog';

const logs = exportLogs({ level: 'ERROR' });
const summary = getAuditSummary();
// { totalLogs, logsLastHour, logsLastDay, criticalCount, ... }
```

---

## ✅ Pre-Deployment Checklist

- [ ] All `.console.log()` calls removed (use logger instead)
- [ ] All user inputs validated
- [ ] All HTML output sanitized
- [ ] Files validated before upload
- [ ] Passwords hashed (backend)
- [ ] Tokens in sessionStorage only
- [ ] HTTPS in production
- [ ] CSP headers set
- [ ] Audit logging enabled
- [ ] Rate limiting active
- [ ] Error messages don't expose details
- [ ] Sensitive data never logged
- [ ] Sessions timeout configured
- [ ] File types restricted
- [ ] Environment validated

---

## 🚨 Security Incident Response

### Step 1: Identify
```javascript
import { getLogsByLevel, getLogsByType } from './utils/auditLog';

const errors = getLogsByLevel('ERROR');
const securityEvents = getLogsByType('SECURITY_EVENT');
```

### Step 2: Contain
```javascript
sessionManager.logout(userId, 'Security incident');
```

### Step 3: Investigate
```javascript
const summary = getAuditSummary();
const logs = exportLogs({ userId, startDate, endDate });
```

### Step 4: Respond
```javascript
logSecurityEvent('INCIDENT_RESPONSE', 'HIGH', {
  incident: 'description',
  actions_taken: [...]
});
```

---

## 🔐 Password Requirements

✅ **Required:**
- 12+ characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number
- 1 special character
- No repeated characters (3+)

❌ **Rejected:**
- Same as username
- Common patterns (123456, password, qwerty)
- Only numbers or letters
- Too short or too long

---

## 🌐 HTTPS & API Configuration

### Environment Variable
```env
REACT_APP_API_URL=https://api.cert-army.gov/v1
```

### Auto-Enforced
- HTTP → HTTPS in production
- CSRF token injection
- Security header injection
- Request timeout: 30 seconds
- Auto-retry on server error (3x)

---

## 📱 Browser Security Features

✅ **Enabled:**
- CSP headers (no unsafe inline)
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Strict-Transport-Security (HSTS)
- Referrer-Policy (strict)
- XSS Protection monitoring

❌ **Disabled:**
- Inline event handlers
- Autocomplete on password fields
- Form submission without action
- Inline scripts

---

## 🎯 Performance & Security Balance

| Feature | Performance Impact | Security Benefit |
|---------|-------------------|------------------|
| Input Validation | <1ms per field | Prevents XSS, injection |
| Encryption | 5-10ms per operation | Protects sensitive data |
| Audit Logging | <2ms per log | Compliance, forensics |
| Rate Limiting | <1ms per request | Prevents brute force |
| File Validation | 10-50ms per file | Prevents malware |

---

## 🔄 Update Sensitive Items

### Password Policy
Change in `securityConfig.js`:
```javascript
SESSION_CONFIG.PASSWORD_MIN_LENGTH = 12;
SESSION_CONFIG.PASSWORD_MAX_LENGTH = 128;
SESSION_CONFIG.PASSWORD_EXPIRATION_DAYS = 90;
```

### Rate Limits
Change in `securityConfig.js`:
```javascript
RATE_LIMITING.LOGIN_REQUESTS_PER_MINUTE = 5;
SESSION_CONFIG.SESSION_TIMEOUT_MINUTES = 15;
```

### Encryption Key
Generate new in `securityConfig.js`:
```javascript
const key = await generateEncryptionKey();
// Store securely on backend
```

---

## 🚀 Production Deployment Checklist

1. **Environment**
   - [ ] NODE_ENV=production
   - [ ] REACT_APP_API_URL=https://...
   - [ ] No debug flags enabled
   - [ ] HTTPS certificate valid

2. **Security**
   - [ ] CSP headers configured
   - [ ] Rate limiting enabled
   - [ ] Audit logging active
   - [ ] Session timeout set

3. **Data**
   - [ ] Database encryption enabled
   - [ ] Backups configured
   - [ ] GDPR compliance verified
   - [ ] Data retention policy set

4. **Monitoring**
   - [ ] Error tracking enabled
   - [ ] Security alerts configured
   - [ ] Log aggregation set up
   - [ ] Performance monitoring on

5. **Testing**
   - [ ] Security tests passed
   - [ ] Penetration testing done
   - [ ] Load testing completed
   - [ ] Failover tested

---

## 📚 Additional Resources

- Read: `SECURITY.md` - Comprehensive security guide
- Read: `SECURITY_SUMMARY.md` - Implementation details
- Check: `src/utils/securityConfig.js` - All configuration
- Reference: Individual module files for examples

---

## 🎓 Key Principles

1. **Never Trust User Input** - Always validate and sanitize
2. **Fail Securely** - Errors don't expose information
3. **Defense in Depth** - Multiple security layers
4. **Principle of Least Privilege** - Only needed access
5. **Audit Everything** - Track all significant actions
6. **Keep It Simple** - Complex = hard to secure
7. **Regular Updates** - Stay current with patches

---

## 📞 Support

**Security Issue?**
1. Do NOT post publicly
2. Email: security@cert-army.gov
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Security impact assessment
   - Proposed fix (optional)

---

**Last Updated:** December 8, 2025  
**Security Level:** 🔒🔒🔒 Maximum (CIA)  
**Review:** Quarterly  
**Questions?** See SECURITY.md or SECURITY_SUMMARY.md
