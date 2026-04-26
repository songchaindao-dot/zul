# Cinterlingo Chat - Complete Setup Guide 💕

## 📋 Overview
A WhatsApp-style chat app with:
- ✅ Phone number authentication (OTP)
- ✅ Real-time messaging
- ✅ Voice notes support
- ✅ Video & audio calls
- ✅ Dark romantic theme
- ✅ Mobile-first design

---

## 🗄️ Step 1: Setup Supabase Database

### 1. Go to your Supabase Dashboard
https://supabase.com/dashboard/project/pnlpivlsxmdctqhcintb

### 2. Run the SQL Setup
- Go to **SQL Editor** → **New Query**
- Copy the entire content from `setup-db.sql`
- Paste it and run

### 3. Create Storage Buckets
- Go to **Storage**
- Create new bucket: `chat_media` (public)
- Create new bucket: `avatars` (public)

### 4. Enable Row Level Security (RLS)
Already configured in setup-db.sql, but verify:
- Go to **Authentication** → **Policies**
- Ensure all policies are enabled

---

## 🔑 Step 2: Get Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_KEY`

```env
SUPABASE_URL=https://pnlpivlsxmdctqhcintb.supabase.co
SUPABASE_KEY=your-anon-key-here
```

---

## 📱 Step 3: Setup Twilio (for OTP & Video Calls)

### Get Twilio Credentials
1. Go to https://console.twilio.com
2. Create/use account
3. Go to **Account Settings** and copy:
   - Account SID
   - Auth Token
4. Buy a phone number (for SMS OTP)

### For Video Calls
1. Go to **Programmable Video** → **API Keys & Credentials**
2. Create API Key (get SID, Secret)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_API_KEY=SKxxxxxxxxxxxxxx
TWILIO_API_SECRET=your-secret
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🤖 Step 4: Get Claude API Key

1. Go to https://console.anthropic.com
2. Create API key
3. Copy it

```env
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxx
```

---

## 💾 Step 5: Push Code to GitHub

```bash
# Clone your repo
git clone https://github.com/songchaindao-dot/cinterlingochat.git
cd cinterlingochat

# Create backend directory
mkdir backend
mkdir frontend

# Copy server files to backend/
# Copy ChatApp.jsx to frontend/src/

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Setup frontend
cd ../frontend
npm install
# Copy ChatApp.jsx to src/App.jsx

# Commit and push
git add .
git commit -m "feat: add Cinterlingo chat backend and frontend"
git push origin main
```

---

## 🚀 Step 6: Deploy Backend to Vercel

### Option A: Using Vercel CLI
```bash
cd backend
npm i -g vercel
vercel login
vercel --prod
```

### Option B: Connect GitHub to Vercel
1. Go to https://vercel.com
2. Click **New Project**
3. Import from GitHub → Select `cinterlingochat`
4. Set root directory to `/backend`
5. Add environment variables (copy from .env)
6. Click **Deploy**

### Configure Environment Variables in Vercel
- Go to **Settings** → **Environment Variables**
- Add all from your `.env` file:
  - SUPABASE_URL
  - SUPABASE_KEY
  - JWT_SECRET
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_API_KEY
  - TWILIO_API_SECRET
  - TWILIO_PHONE_NUMBER
  - CLAUDE_API_KEY
  - NODE_ENV=production

---

## 🌐 Step 7: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Click **New Project**
3. Import from GitHub → Select `cinterlingochat`
4. Set root directory to `/frontend`
5. Create `.env.local` in frontend:

```env
REACT_APP_API_URL=https://your-backend-domain.vercel.app
REACT_APP_SUPABASE_URL=https://pnlpivlsxmdctqhcintb.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
```

6. Click **Deploy**

---

## 🔗 Step 8: Update Frontend API Calls

In `ChatApp.jsx`, update the API base URL:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Example API call
const sendOTP = async (phone) => {
  const res = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: phone })
  });
  return res.json();
};
```

---

## 📁 Project Structure

```
cinterlingochat/
├── backend/
│   ├── server.js           # Main Express server
│   ├── package.json
│   ├── .env                # Your credentials (don't push)
│   ├── .env.example        # Template
│   ├── setup-db.sql        # Database setup
│   └── vercel.json         # Vercel config
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main ChatApp component
│   │   ├── index.jsx
│   │   └── styles/
│   ├── package.json
│   ├── .env.local         # Frontend env vars
│   └── vercel.json
└── README.md
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID or phone
- `PUT /api/users/profile` - Update profile

### Messages
- `POST /api/messages` - Send message/voice note
- `GET /api/messages/:conversationId` - Get messages
- `PUT /api/messages/:id/read` - Mark as read
- `DELETE /api/messages/:id` - Delete message

### Conversations
- `POST /api/conversations` - Create/get conversation
- `GET /api/conversations` - Get all conversations

### Calls
- `POST /api/calls/token` - Get Twilio video token
- `POST /api/calls/record` - Save call history

### Translation
- `POST /api/translate` - Translate text to another language

---

## 🧪 Testing Locally

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

---

## 🔒 Security Checklist

- [ ] Change JWT_SECRET to random strong key
- [ ] Enable HTTPS on all endpoints
- [ ] Use environment variables for all secrets
- [ ] Enable RLS on Supabase tables
- [ ] Set up CORS properly
- [ ] Use strong OTP expiration (10 mins)
- [ ] Rate limit OTP endpoint
- [ ] Validate all inputs on backend

---

## 📞 Twilio Video Call Integration

The app uses Twilio Programmable Video. Here's how to integrate:

```javascript
import { connect } from 'twilio-video';

const startVideoCall = async () => {
  const response = await fetch('/api/calls/token', {
    method: 'POST',
    body: JSON.stringify({ roomName: conversationId })
  });
  
  const { token } = await response.json();
  
  const room = await connect(token, {
    name: conversationId,
    audio: true,
    video: { width: 640 }
  });
  
  // Add participants logic here
};
```

---

## 🌍 Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations complete
- [ ] Storage buckets created
- [ ] SMS provider configured
- [ ] Video call provider configured
- [ ] Frontend API URL updated
- [ ] CORS configured
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting enabled
- [ ] Error logging setup

---

## 📞 Support & Troubleshooting

**Database connection error?**
- Check SUPABASE_URL and SUPABASE_KEY

**OTP not sending?**
- Verify Twilio credentials
- Check phone number format

**Video calls not working?**
- Verify Twilio API keys
- Check browser permissions

**Frontend can't reach backend?**
- Verify API_URL in .env.local
- Check CORS settings

---

## 💡 Next Steps

1. ✅ Setup Supabase database
2. ✅ Get all credentials
3. ✅ Push to GitHub
4. ✅ Deploy backend to Vercel
5. ✅ Deploy frontend to Vercel
6. ✅ Test end-to-end
7. ✅ Add more features (groups, media, etc.)

---

**Built with love for intimate conversations 💕**
