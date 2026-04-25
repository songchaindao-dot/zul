# IMan and Cattleya 💕

**A secure, private messaging app built with love**

---

## 🌟 Overview

IMan and Cattleya is a modern, secure messaging application inspired by WhatsApp but built with enhanced privacy, security, and encryption. It's designed for intimate, trusted conversations between people who value their privacy.

**Key Features:**
- 📱 Phone-based authentication (like WhatsApp)
- 🔐 End-to-end encrypted messaging
- 🎙️ Voice notes support
- 📹 Video & audio calls
- 🌐 Real-time message translation
- 🎨 Beautiful dark romantic UI
- 📱 Mobile-first responsive design
- 🛡️ Enterprise-grade security

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Twilio account (for OTP/calls)
- Claude API key (for translation)
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/songchaindao-dot/cinterlingochat.git
cd cinterlingochat
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local
npm start
```

4. **Visit Application**
Open http://localhost:3000

---

## 📋 Project Structure

```
iman-and-cattleya/
├── backend/
│   ├── server.js              # Express backend
│   ├── package.json
│   ├── .env                   # Credentials (don't push)
│   ├── .env.example           # Template
│   └── setup-db.sql           # Database schema
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   └── index.jsx
│   ├── package.json
│   └── .env.local            # Frontend config
├── docs/
│   ├── SETUP_GUIDE.md
│   ├── TESTING_GUIDE.md
│   ├── SECURITY_PRIVACY_POLICY.md
│   └── SECURITY_CHECKLIST.md
└── README.md
```

---

## 🔑 Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Security
JWT_SECRET=your-random-secret-32-chars
ENCRYPTION_KEY=your-32-char-key

# Twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Claude
CLAUDE_API_KEY=your-api-key

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
```

---

## 🗄️ Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project

2. **Run Database Schema**
   - Copy content from `setup-db.sql`
   - Run in Supabase SQL Editor
   - Verify tables created

3. **Create Storage Buckets**
   - `chat_media` (private)
   - `avatars` (public)

4. **Enable RLS**
   - All tables should have Row Level Security enabled
   - Policies should be in place

---

## 🔐 Security Features

### Authentication
- **Phone OTP**: Time-limited, one-time codes
- **JWT Tokens**: Signed, 7-day expiration
- **Rate Limiting**: 5 OTP attempts/hour per IP
- **Secure Sessions**: Token-based authentication

### Data Protection
- **Encryption**: AES-256-CBC for sensitive data
- **Hashing**: SHA-256 for OTP codes
- **Privacy**: Minimal data collection
- **GDPR Compliant**: User data rights implemented

### API Security
- **HTTPS Only**: TLS 1.3 encryption
- **CORS**: Origin whitelist
- **Rate Limiting**: 100 requests/15 mins
- **Input Validation**: Phone, message, name validation
- **Authorization**: User ownership verification

### Infrastructure Security
- **Helmet**: Security headers
- **NoSQL Injection Prevention**: Input sanitization
- **XSS Protection**: Output escaping
- **CSRF Protection**: Token validation

---

## 📱 Features

### Messaging
- Real-time message delivery
- Read receipts (sent/delivered/read)
- Message history
- 5000 character message limit

### Voice Notes
- Record and send audio messages
- Automatic WebM encoding
- Encrypted storage
- Playback controls

### Calls
- Audio calls (via Twilio)
- Video calls (via Twilio Programmable Video)
- Call history
- Duration tracking

### Profiles
- Customizable name and bio
- Auto-generated avatars
- Online/offline status
- Last seen timestamp

### Conversations
- Create private conversations
- View conversation history
- Manage contacts
- Search functionality

---

## 🧪 Testing

Run the comprehensive testing suite:

```bash
# Backend tests
npm test

# Security audit
npm audit

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

See `TESTING_GUIDE.md` for detailed testing procedures.

---

## 🚀 Deployment

### Deploy Backend to Vercel

```bash
cd backend
npm install -g vercel
vercel login
vercel --prod
```

Add environment variables in Vercel:
- SUPABASE_URL
- SUPABASE_KEY
- JWT_SECRET
- ENCRYPTION_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- CLAUDE_API_KEY

### Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

Update `REACT_APP_API_URL` to point to backend deployment.

---

## 📚 Documentation

- **[SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)** - Complete setup instructions
- **[TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)** - Testing procedures
- **[SECURITY_PRIVACY_POLICY.md](./docs/SECURITY_PRIVACY_POLICY.md)** - Privacy policy
- **[SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)** - Pre-deployment checklist

---

## 🤝 API Endpoints

### Authentication
```
POST   /api/auth/send-otp          Send OTP to phone
POST   /api/auth/verify-otp        Verify OTP and login
```

### Users
```
GET    /api/users/me               Get current user
GET    /api/users/:id              Get user by ID
PUT    /api/users/profile          Update profile
DELETE /api/users/account          Delete account
```

### Conversations
```
POST   /api/conversations          Create conversation
GET    /api/conversations          Get all conversations
```

### Messages
```
POST   /api/messages               Send message/voice note
GET    /api/messages/:id           Get messages
PUT    /api/messages/:id/read      Mark as read
DELETE /api/messages/:id           Delete message
```

### Calls
```
POST   /api/calls/token            Get call token
POST   /api/calls/record           Record call
```

### Translation
```
POST   /api/translate              Translate text
```

### Health
```
GET    /api/health                 Health check
```

---

## 🔄 Technology Stack

### Backend
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + OTP
- **SMS**: Twilio
- **Video Calls**: Twilio Programmable Video
- **Translation**: Claude API
- **Hosting**: Vercel

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (realtime)
- **Build**: Vite/Create React App
- **Hosting**: Vercel

### Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics

---

## 🐛 Troubleshooting

### Backend issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+

# Verify Supabase connection
npm run test:db
```

### Frontend issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install

# Run development server in debug mode
DEBUG=* npm start
```

### Deployment issues
See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) troubleshooting section.

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🔒 Security

For security vulnerabilities, please email: **security@iman-and-cattleya.com**

We take security seriously and will respond within 24 hours.

See [SECURITY_PRIVACY_POLICY.md](./docs/SECURITY_PRIVACY_POLICY.md) for full security details.

---

## 💕 About

IMan and Cattleya is a project built with love for secure, private conversations between trusted individuals.

**Created with passion and encrypted with care.**

---

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com)
- Powered by [Vercel](https://vercel.com)
- Calls via [Twilio](https://twilio.com)
- Translation by [Anthropic Claude](https://anthropic.com)

---

## 📞 Support

For support and questions:
- **Email**: support@iman-and-cattleya.com
- **Issues**: GitHub Issues
- **Docs**: See documentation folder

---

**IMan and Cattleya - Secure. Private. Together. 💕**

*Version 1.0.0 | April 2026*
