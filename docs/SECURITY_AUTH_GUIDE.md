# 🔐 ENHANCED SECURITY AUTHENTICATION GUIDE

## Cattleya - Secure Number Verification & Permission Consent System

---

## 📋 WHAT'S BEING ADDED

### 1. **Secure Number Verification**
- Phone number validation (E.164 format)
- Attempt tracking and rate limiting
- OTP with 10-minute expiration
- One-time use verification
- Replay attack prevention

### 2. **Enhanced Authentication Flow**
- Secure SMS delivery
- Attempt ID tracking
- Verification status tracking
- Expired code handling
- Duplicate verification prevention

### 3. **Permission Consent System**
- Voice recording permission
- Camera access permission
- Contact access permission
- Storage access permission
- Location permission (optional)
- Push notification permission

### 4. **Sensitive Action Policies**
- Delete account confirmation
- Sensitive data access
- Voice call recording
- Video call recording
- Message export

---

## 🔒 BACKEND IMPLEMENTATION

### Enhanced OTP Endpoint
```javascript
POST /api/auth/send-otp
Input: { phoneNumber }
Security:
  ✅ Strict phone validation (E.164 format)
  ✅ Duplicate account check
  ✅ Rate limiting (5 per hour per IP)
  ✅ Unique attempt ID
  ✅ Attempt tracking
  ✅ SMS delivery confirmation
  
Output: { 
  success: true,
  attemptId: "abc123...",
  expiresIn: 600,
  message: "OTP sent..."
}
```

### Enhanced OTP Verification
```javascript
POST /api/auth/verify-otp
Input: { phoneNumber, otp, name, attemptId }
Security:
  ✅ Expiration check
  ✅ Hash comparison (SHA-256)
  ✅ Replay attack prevention
  ✅ One-time use enforcement
  ✅ Attempt ID validation
  ✅ User creation or retrieval
  ✅ JWT token generation
  
Output: {
  success: true,
  token: "jwt...",
  user: { id, name, avatar, status, language }
}
```

### New Permission Endpoint
```javascript
POST /api/permissions/request
Input: {
  userId,
  permissionType: "camera|microphone|storage|contacts|notifications",
  action: "voice_call|video_call|voice_record|file_share"
}
Output: {
  permissionId: "uuid",
  status: "pending|granted|denied",
  requestedAt: timestamp,
  message: "User message about why permission needed"
}
```

### New Sensitive Action Endpoint
```javascript
POST /api/sensitive-actions/request-consent
Input: {
  userId,
  actionType: "delete_account|export_messages|record_call|access_media",
  confirmationCode: "123456"
}
Security:
  ✅ 2FA verification (optional)
  ✅ Time-based confirmation (5 min window)
  ✅ Admin audit logging
  ✅ User confirmation email
  ✅ Reversible for 30 days
  
Output: {
  status: "pending_confirmation|confirmed",
  expiresAt: timestamp,
  canReverseUntil: timestamp
}
```

---

## 📱 FRONTEND IMPLEMENTATION

### Enhanced Login Screen
```jsx
<PhoneNumberInput>
  - E.164 format enforced
  - Live validation
  - Country code picker
  - Secure input (masked)
  - Clear instructions
  
  <SecurityBadge>
    🔒 End-to-end encrypted
    ✓ Verified
  </SecurityBadge>
</PhoneNumberInput>
```

### OTP Verification Screen
```jsx
<OTPVerification>
  - 6 boxes for digits
  - Auto-focus between boxes
  - Expiration timer (10 min)
  - Attempt counter
  - Request new OTP button
  - Clear error messages
  
  <SecurityStatus>
    Status: Verifying...
    Attempt: 1/5
    Code expires in: 9:45
  </SecurityStatus>
</OTPVerification>
```

### Permission Consent Dialog
```jsx
<PermissionConsent>
  <Title>Microphone Access Required</Title>
  <Description>
    Cattleya needs access to your microphone to record voice notes.
    Your audio is encrypted end-to-end and never stored on servers.
  </Description>
  
  <PermissionDetails>
    ✓ Uses microphone for voice recording
    ✓ Audio encrypted with AES-256
    ✓ You can revoke anytime in settings
    ✓ Never shared with third parties
  </PermissionDetails>
  
  <Actions>
    <Button onClick={grantPermission}>Allow Access</Button>
    <Button onClick={denyPermission}>Not Now</Button>
    <Link href="/privacy">Learn More</Link>
  </Actions>
</PermissionConsent>
```

### Sensitive Action Confirmation
```jsx
<SensitiveActionConfirm>
  <WarningIcon />
  <Title>Delete Account?</Title>
  <Message>
    This action is permanent. All your messages, contacts, and data 
    will be deleted. You can recover your account within 30 days.
  </Message>
  
  <Checklist>
    ☐ I understand my data will be deleted
    ☐ I have exported my data (optional)
    ☐ I want to delete my account
  </Checklist>
  
  <TwoFactorConfirm>
    Enter your 2FA code to confirm:
    <CodeInput placeholder="000000" />
  </TwoFactorConfirm>
  
  <Actions>
    <CancelButton>Cancel</CancelButton>
    <DeleteButton disabled={!allChecked}>Delete Account</DeleteButton>
  </Actions>
  
  <Note>
    You'll receive a confirmation email.
    Your account can be recovered within 30 days.
  </Note>
</SensitiveActionConfirm>
```

---

## 🔐 NUMBER VERIFICATION - TECHNICAL DETAILS

### Input Validation
```javascript
// E.164 Format: +[country][number]
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Examples:
✓ +12025551234    (USA)
✓ +34123456789    (Spain)
✓ +86 10 1234 5678 (China)
✓ +44 20 7946 0958 (UK)

✗ 2025551234      (Missing +)
✗ +1 (202) 555-1234 (Formatted, but valid after cleanup)
```

### Security Measures
```javascript
1. Rate Limiting: 5 OTP requests per hour per IP
2. Brute Force: Max 5 incorrect attempts, then cooldown
3. Expiration: 10 minutes max validity
4. One-Time Use: Cannot reuse same code
5. Attempt Tracking: Log all attempts for audit
6. SMS Validation: Confirm delivery with Twilio
7. Hash Comparison: Never store plain text OTP
8. Replay Prevention: Attempt ID must match
```

### Database Schema
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL, -- SHA-256 hash
  attempt_id TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  expired BOOLEAN DEFAULT FALSE,
  attempts_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  permission_type TEXT NOT NULL, -- camera, microphone, storage, contacts, notifications
  status TEXT DEFAULT 'pending', -- pending, granted, denied
  granted_at TIMESTAMP,
  denied_at TIMESTAMP,
  requested_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sensitive_actions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL, -- delete_account, export_messages, record_call
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  confirmation_code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  can_reverse_until TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📋 PERMISSION CONSENT FLOW

### Voice Recording
```
User clicks microphone icon
    ↓
App checks if permission granted
    ↓
If NOT granted:
  Show: "Microphone Access Required"
  Explain: "To record voice notes..."
  Show: "Your audio is encrypted..."
    ↓
User clicks "Allow"
    ↓
Permission stored in database
    ↓
Recording starts
    ↓
Audio encrypted
    ↓
Sent over HTTPS
    ↓
Stored encrypted
```

### Camera/Video Call
```
User clicks video call button
    ↓
Check: Microphone permission
Check: Camera permission
    ↓
If missing:
  Request: "Microphone Access"
  Request: "Camera Access"
    ↓
User grants both
    ↓
Video call starts
    ↓
Encrypted with Twilio
```

### Message Export
```
User clicks "Export Messages"
    ↓
Show: "Export Sensitive Data?"
    ↓
User confirms checkbox
    ↓
2FA code required
    ↓
Data prepared (encrypted)
    ↓
Confirmation email sent
    ↓
Download link provided (expires in 24h)
    ↓
Data encrypted with AES-256
```

### Account Deletion
```
User clicks "Delete Account"
    ↓
Show: "Permanent Action Warning"
    ↓
User checks understanding
    ↓
2FA code required
    ↓
Email confirmation sent
    ↓
30-day grace period starts
    ↓
Data marked for deletion
    ↓
Reversible for 30 days
    ↓
After 30 days: Permanent deletion
```

---

## 🛡️ 2FA (Two-Factor Authentication)

### Optional 2FA Setup
```javascript
POST /api/auth/setup-2fa
Input: { userId }
Output: {
  qrCode: "data:image/...",
  secret: "JBSWY3DPEBLW64TMMQ======",
  backupCodes: ["XXXX-XXXX", ...]
}

User scans QR with authenticator app
User enters 6-digit code to confirm
```

### Required for Sensitive Actions
```javascript
POST /api/auth/verify-2fa
Input: { userId, code }
Output: { success: true, validFor: 5 }

Code valid for 30 seconds
One-time use only
```

---

## 📧 CONFIRMATION EMAILS

### OTP Sent
```
Subject: Your Cattleya Verification Code

Dear User,

Your verification code is: 123456

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.

Never share your code with anyone. Our staff will never ask for it.

- The Cattleya Team
```

### Delete Account Confirmation
```
Subject: Confirm Account Deletion

Dear User,

You requested to delete your Cattleya account.

Actions:
✓ Click here to confirm deletion: [link expires in 24h]
✗ If this wasn't you, take no action

Your data will be:
- Marked for deletion immediately
- Retained for 30 days (can restore)
- Permanently deleted after 30 days
- NOT sold or shared

Recovery:
You can restore your account within 30 days.

Questions? Contact: support@cattleya.love

- The Cattleya Team
```

### Permission Granted
```
Subject: Microphone Access Granted

Dear User,

We granted microphone access to your Cattleya account.

If this wasn't you:
1. Change your password
2. Review account activity
3. Contact support

Manage permissions anytime in Settings → Privacy & Security

- The Cattleya Team
```

---

## 🔒 SECURITY BEST PRACTICES

### What We Encrypt
✅ All messages (AES-256)
✅ Voice notes (AES-256)
✅ User phone numbers
✅ User data at rest
✅ All transit (HTTPS/TLS 1.3)

### What We Hash
✅ OTP codes (SHA-256)
✅ Passwords (bcrypt, if used)
✅ API keys
✅ Sensitive identifiers

### What We Never Store
❌ Plain text OTP codes
❌ Unencrypted messages
❌ Authentication tokens
❌ Temporary verification codes
❌ User locations
❌ Browsing history

### What We Log
✓ Login attempts (with timestamp, IP)
✓ OTP requests (for rate limiting)
✓ Permission grants/denies
✓ Sensitive actions (with audit trail)
✓ Security events (for monitoring)

❌ Passwords
❌ OTP codes
❌ API keys
❌ Message content
❌ User activity beyond security events

---

## 🎯 PERMISSION TYPES & PROMPTS

### Microphone
**When Needed:** Voice recording, audio calls
**Prompt:** "Cattleya needs microphone access to record voice notes"
**Data:** Audio only (encrypted)
**Risk Level:** Low

### Camera
**When Needed:** Video calls, video recording
**Prompt:** "Cattleya needs camera access for video calls"
**Data:** Video only (encrypted)
**Risk Level:** Low

### Contacts
**When Needed:** Finding friends in contacts
**Prompt:** "Cattleya can help you find friends from your contacts"
**Data:** Contact names & phone numbers
**Risk Level:** Medium
**Promise:** "Contacts never uploaded. Search done locally."

### Storage
**When Needed:** Share files, save attachments
**Prompt:** "Cattleya needs storage access to save media"
**Data:** Access to device storage
**Risk Level:** Medium
**Promise:** "Only access files you choose to share"

### Notifications
**When Needed:** Receive message alerts
**Prompt:** "Receive notifications for new messages"
**Data:** Permission to send notifications
**Risk Level:** Low
**Promise:** "Mutable in app settings"

### Location (Optional)
**When Needed:** Share location in future version
**Prompt:** "Share your location with contacts"
**Data:** GPS coordinates
**Risk Level:** High
**Promise:** "Only shared when you explicitly choose"

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend
- [ ] Update OTP endpoint with validation
- [ ] Add attempt tracking
- [ ] Add permission endpoints
- [ ] Add sensitive action endpoints
- [ ] Add 2FA endpoints
- [ ] Update database schema
- [ ] Add audit logging
- [ ] Add email service integration

### Frontend
- [ ] Update login UI
- [ ] Add phone number input
- [ ] Add OTP verification
- [ ] Add permission dialogs
- [ ] Add 2FA code input
- [ ] Add sensitive action confirmations
- [ ] Add settings for permission management
- [ ] Add audit log viewer

### Security
- [ ] Rate limiting on all auth endpoints
- [ ] Brute force protection
- [ ] HTTPS enforcement
- [ ] CORS validation
- [ ] Input sanitization
- [ ] Output encoding
- [ ] Security headers
- [ ] Audit logging

### Compliance
- [ ] GDPR compliance
- [ ] CCPA compliance
- [ ] PIPEDA compliance
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Data deletion requests

---

## 💡 ADVANCED FEATURES (FUTURE)

### Biometric Authentication
- [ ] Fingerprint login
- [ ] Face recognition
- [ ] Voice recognition

### Advanced 2FA
- [ ] FIDO2/WebAuthn
- [ ] Hardware tokens
- [ ] Backup codes

### Risk Assessment
- [ ] Location-based risk scoring
- [ ] Device fingerprinting
- [ ] Behavioral analysis
- [ ] Anomaly detection

### Advanced Consent
- [ ] Granular permission control
- [ ] Time-based permissions
- [ ] One-time permissions
- [ ] Conditional permissions

---

**Cattleya - Where Security & Trust Are Built In** 🔐💕

EOF
cat /mnt/user-data/outputs/SECURITY_AUTH_GUIDE.md
