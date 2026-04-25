# 🔒 Cinterlingo Chat - Security & Privacy Policy

**Inspired by the passion shared by IMan and Cataleya 💕**

---

## Executive Summary

Cinterlingo Chat is built with **security-first principles** to protect user privacy and data. We implement enterprise-grade security measures to ensure conversations remain private, secure, and confidential.

---

## 1. Data Protection & Privacy

### 1.1 Minimal Data Collection
We follow **data minimization** principles:
- ✅ Phone number (only for authentication)
- ✅ Name (optional, user-provided)
- ✅ Avatar (auto-generated)
- ❌ No email collection
- ❌ No location tracking
- ❌ No device fingerprinting
- ❌ No behavioral analytics

### 1.2 Data Storage
All data is encrypted at rest:
- **Database Encryption**: Supabase provides AES-256 encryption
- **Field-Level Encryption**: Sensitive data encrypted with AES-256-CBC
- **One-Way Hashing**: OTP codes hashed with SHA-256 (never stored in plaintext)
- **Automatic Deletion**: OTP codes deleted after verification

### 1.3 Data Retention
- **Messages**: Retained until user deletes
- **OTP Codes**: Automatically deleted after 10 minutes or verification
- **Session Tokens**: Expire after 7 days
- **Deleted Accounts**: All associated data deleted within 30 days

---

## 2. Authentication & Access Control

### 2.1 Authentication Method
- **Phone-based OTP**: Like WhatsApp, one-time codes sent via SMS
- **No Password Storage**: Phone number is primary identifier
- **JWT Tokens**: Secure, time-limited session tokens
- **Token Expiration**: 7 days maximum validity

### 2.2 Authorization
Every endpoint checks:
- ✅ Valid, non-expired token
- ✅ User is part of conversation
- ✅ User is message owner (for deletions)
- ✅ Request age (prevents token replay attacks)

### 2.3 Rate Limiting
- **OTP Requests**: Maximum 5 attempts per hour per IP
- **General API**: Maximum 100 requests per 15 minutes per IP
- **Message Sending**: No rate limit (user-based, not IP-based)

---

## 3. Data in Transit

### 3.1 Transport Security
- **HTTPS Only**: All communication encrypted with TLS 1.3
- **CORS Protection**: Only authorized domains allowed
- **CSP Headers**: Content Security Policy prevents XSS attacks
- **HSTS**: HTTP Strict Transport Security enforced

### 3.2 API Security
- **Bearer Token Auth**: Standard JWT authentication
- **Signed Requests**: HMAC-SHA256 signatures on sensitive operations
- **Request Validation**: All inputs validated & sanitized
- **NoSQL Injection Prevention**: Input sanitization on all fields

---

## 4. Encryption & Cryptography

### 4.1 Encryption Methods
```
OTP Codes:      SHA-256 Hash
Sensitive Data: AES-256-CBC
Session Tokens: HMAC-SHA256
JWT Tokens:     HS256 (HMAC-SHA256)
```

### 4.2 Key Management
- **Encryption Keys**: Generated from environment variables
- **JWT Secret**: Minimum 32 characters
- **Key Rotation**: Keys rotated every 90 days (recommended)
- **No Key Hardcoding**: All keys in environment variables

---

## 5. File & Media Security

### 5.1 Voice Notes Security
- **Encryption**: Stored in encrypted Supabase storage
- **Access Control**: Only conversation participants can access
- **Size Limit**: Maximum 5MB per file
- **Format Validation**: Only WebM audio allowed
- **Expiration**: Optional auto-delete after 30 days

### 5.2 Avatar Images
- **Auto-Generated**: No user uploads, prevents malware
- **CDN Cached**: Public URLs for performance
- **Size Optimized**: Compressed automatically

---

## 6. Input Validation & Sanitization

### 6.1 Phone Number Validation
```
Format: +1234567890 or 1234567890
Regex: /^\+?[1-9]\d{1,14}$/
Length: 10-15 digits
```

### 6.2 Message Validation
```
Text Messages:  1-5000 characters
Names:          1-100 characters
Bio:            0-500 characters
Status:         online | offline | away
```

### 6.3 NoSQL Injection Prevention
- Express Mongo Sanitize middleware
- Parameter binding via Supabase ORM
- No raw SQL queries

---

## 7. User Privileges & Access Control

### 7.1 User Data Access
Users can:
- ✅ View their own profile
- ✅ View public info of users they're chatting with
- ✅ Access messages in their conversations only
- ✅ Delete own messages (within 1 hour)
- ✅ Update own profile
- ✅ Delete their account

Users cannot:
- ❌ Access other users' conversations
- ❌ Delete messages from others
- ❌ View sensitive data (phone numbers, etc.)
- ❌ Access messages they're not part of

### 7.2 Account Deletion
To delete account, user must:
1. Send `DELETE_MY_ACCOUNT` confirmation code
2. All personal data deleted permanently
3. All conversations & messages removed
4. Irreversible action

---

## 8. Logging & Monitoring

### 8.1 Logs Collected
- Request method, path, status code
- Response time (for performance)
- Error messages (for debugging)
- Timestamp of all events

### 8.1 Logs NOT Collected
- ❌ Request body content
- ❌ Message contents
- ❌ Phone numbers
- ❌ User identifiable information
- ❌ Personal data

### 8.2 Log Retention
- Development: 7 days
- Production: 30 days
- Automatic purging after retention period

---

## 9. Security Headers

All responses include:
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 10. Third-Party Services

### 10.1 Supabase (Database)
- SOC 2 Type II certified
- GDPR compliant
- End-to-end encryption support
- Row-level security policies

### 10.2 Twilio (SMS/Video)
- SOC 2 Type II certified
- GDPR compliant
- PCI DSS level 1
- Encrypted communication

### 10.3 Vercel (Hosting)
- SOC 2 Type II certified
- GDPR compliant
- DDoS protection
- Automatic SSL/TLS

### 10.4 Claude API (Translation)
- No data stored on Claude servers
- No conversation history kept
- GDPR compliant
- Zero knowledge architecture

---

## 11. Compliance & Standards

### 11.1 Security Standards
- ✅ OWASP Top 10 mitigation
- ✅ CWE Top 25 protection
- ✅ NIST Cybersecurity Framework
- ✅ ISO 27001 principles

### 11.2 Privacy Regulations
- ✅ GDPR compliant (EU users)
- ✅ CCPA compliant (California users)
- ✅ PIPEDA compliant (Canadian users)
- ✅ Data residency support

---

## 12. Incident Response

### 12.1 Security Incident Policy
If a security breach occurs:
1. Immediate investigation
2. User notification within 24 hours
3. Third-party audit
4. Public disclosure if required

### 12.2 Responsible Disclosure
Found a security vulnerability? 
- Email: security@cinterlingochat.com
- We will:
  - Acknowledge within 24 hours
  - Fix within 7 days
  - Credit in security advisory
  - Offer bug bounty (if eligible)

---

## 13. User Responsibilities

Users must:
- ✅ Keep login information confidential
- ✅ Use strong, unique phone numbers
- ✅ Log out on shared devices
- ✅ Report suspicious activity
- ✅ Comply with terms of service

---

## 14. Regular Security Audits

We conduct:
- **Monthly**: Automated security scans
- **Quarterly**: Penetration testing
- **Annually**: Third-party security audit
- **Continuous**: Dependency vulnerability checks

---

## 15. Updates & Patches

- **Critical**: Applied within 24 hours
- **High**: Applied within 7 days
- **Medium**: Applied within 30 days
- **Low**: Applied in next release

---

## 16. Contact & Support

**Security Inquiries**: security@cinterlingochat.com  
**Privacy Questions**: privacy@cinterlingochat.com  
**General Support**: support@cinterlingochat.com

---

## 17. Policy Changes

This policy may be updated periodically. 
- Users notified of material changes
- Continued use = acceptance
- Archive of previous versions maintained

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 24, 2026 | Initial security & privacy policy |

---

**Last Updated**: April 24, 2026  
**Next Review**: July 24, 2026

---

## ❤️ Built with Love

Cinterlingo Chat is created with passion for privacy, security, and the beautiful connections between people. 

**Inspired by IMan and Cataleya** 💕

---

**Your privacy is not a feature. It's a promise.** 🔒
