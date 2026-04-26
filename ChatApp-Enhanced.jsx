import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, Mic, MicOff, Settings, LogOut, Search, Plus, Heart, Zap, Clock, Check, CheckCheck, X, Loader, Menu, Dot, Eye, EyeOff } from 'lucide-react';

export default function Cattleya() {
  // Authentication States
  const [currentView, setCurrentView] = useState('auth'); // auth, chats, chat, call, about
  const [authStep, setAuthStep] = useState('phone'); // phone, otp
  const [user, setUser] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  
  // Chat States
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  
  // Typing & Presence States
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState('online');
  const [lastSeen, setLastSeen] = useState(null);
  const [recipientStatus, setRecipientStatus] = useState('offline');
  
  // Voice Notes
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Call States
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chats, setChats] = useState([
    { 
      name: 'Cattleya 💕', 
      lastMsg: 'I miss you so much...', 
      time: '2:17 PM', 
      unread: 3,
      status: 'online',
      lastSeen: null,
      avatar: '💜'
    },
  ]);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update online status
  useEffect(() => {
    if (user && currentView === 'chats') {
      setOnlineStatus('online');
      
      // Leave online when closing
      return () => {
        setOnlineStatus('offline');
      };
    }
  }, [user, currentView]);

  // Detect language as user types
  useEffect(() => {
    if (messageInput.trim().length > 3) {
      // Auto-detect language
      detectLanguage(messageInput);
      
      // Show typing indicator
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  }, [messageInput]);

  const detectLanguage = async (text) => {
    try {
      const response = await fetch(`/api/detect-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setDetectedLanguage(data.language || 'en');
    } catch (error) {
      console.error('Language detection error:', error);
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      
      // Send typing indicator to server
      fetch('/api/presence/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: selectedChat?.name,
          isTyping: true 
        }),
      }).catch(console.error);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    fetch('/api/presence/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        conversationId: selectedChat?.name,
        isTyping: false 
      }),
    }).catch(console.error);
  };

  // Start recording voice note
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      alert('Cannot access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendVoiceNote(audioBlob);
      };
      
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const sendVoiceNote = async (audioBlob) => {
    const newMessage = {
      id: messages.length + 1,
      sender: 'you',
      text: null,
      messageType: 'voice',
      voiceUrl: URL.createObjectURL(audioBlob),
      voiceTranscription: 'Transcribing...', // Will be updated
      detectedLanguage: 'auto',
      timestamp: new Date(),
      status: 'sent',
      duration: recordingTime
    };
    
    setMessages([...messages, newMessage]);

    // In production, upload to server and transcribe
    // For now, simulate transcription
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, voiceTranscription: 'Voice note transcribed text' }
            : msg
        )
      );
    }, 2000);
  };

  const translateMessage = async (text, targetLang) => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          targetLanguage: targetLang,
          sourceLanguage: detectedLanguage 
        }),
      });
      const data = await response.json();
      return data.translated || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    handleTypingStop();

    const newMessage = {
      id: messages.length + 1,
      sender: 'you',
      text: messageInput,
      messageType: 'text',
      detectedLanguage,
      timestamp: new Date(),
      status: 'sent',
      translated: null,
      reactions: []
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');

    // Auto-translate if different from user preference
    if (detectedLanguage !== preferredLanguage) {
      const translated = await translateMessage(messageInput, preferredLanguage);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, translated, translatedLanguage: preferredLanguage }
            : msg
        )
      );
    }

    // Simulate reply
    setTimeout(() => {
      const reply = {
        id: messages.length + 2,
        sender: 'them',
        text: 'That\'s sweet! 💕',
        messageType: 'text',
        timestamp: new Date(),
        status: 'read',
        reactions: ['❤️'],
        typing: false
      };
      setMessages(prev => [...prev, reply]);
      setOtherUserTyping(false);
    }, 1500);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authStep === 'phone') {
      if (!phoneInput.trim()) return;
      setIsLoading(true);
      setTimeout(() => {
        setAuthStep('otp');
        setIsLoading(false);
      }, 1000);
    } else {
      if (!otpInput.trim() || !nameInput.trim()) return;
      setIsLoading(true);
      setTimeout(() => {
        setUser({
          id: '1',
          phone: phoneInput,
          name: nameInput,
          avatar: '👤',
          status: 'online'
        });
        setCurrentView('chats');
        setIsLoading(false);
      }, 1000);
    }
  };

  const startCall = (type) => {
    setCallType(type);
    setCallActive(true);
    setCallDuration(0);
  };

  const endCall = () => {
    setCallActive(false);
    setCallType(null);
    setCallDuration(0);
  };

  const logout = () => {
    setUser(null);
    setCurrentView('auth');
    setAuthStep('phone');
    setMessages([]);
  };

  const addReaction = (messageId, emoji) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: msg.reactions?.includes(emoji)
                ? msg.reactions.filter(r => r !== emoji)
                : [...(msg.reactions || []), emoji]
            }
          : msg
      )
    );
  };

  // Auth View
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <div className="mb-4">
              <svg viewBox="0 0 200 200" className="w-24 h-24 mx-auto" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#ec4899',stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#a855f7',stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="flowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#fbbf24',stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#f59e0b',stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="95" fill="url(#bgGradient)" opacity="0.95"/>
                <ellipse cx="70" cy="80" rx="18" ry="35" fill="url(#flowerGradient)" opacity="0.9" transform="rotate(-45 70 80)"/>
                <ellipse cx="130" cy="80" rx="18" ry="35" fill="url(#flowerGradient)" opacity="0.9" transform="rotate(45 130 80)"/>
                <ellipse cx="100" cy="50" rx="18" ry="35" fill="url(#flowerGradient)" opacity="0.95"/>
                <ellipse cx="80" cy="125" rx="16" ry="30" fill="url(#flowerGradient)" opacity="0.85" transform="rotate(-60 80 125)"/>
                <ellipse cx="120" cy="125" rx="16" ry="30" fill="url(#flowerGradient)" opacity="0.85" transform="rotate(60 120 125)"/>
                <circle cx="100" cy="95" r="22" fill="#f59e0b" opacity="0.95"/>
                <circle cx="100" cy="95" r="18" fill="#fbbf24"/>
                <path d="M 100 105 C 95 115, 85 115, 85 105 C 85 100, 88 95, 95 95 C 98 95, 100 97, 100 97 C 100 97, 102 95, 105 95 C 112 95, 115 100, 115 105 C 115 115, 105 115, 100 105 Z" fill="#ec4899" opacity="0.9"/>
                <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="3" opacity="0.3"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Cattleya
            </h1>
            <p className="text-slate-400 text-sm mb-1">Language-free love, translated with care 💕</p>
            <p className="text-slate-500 text-xs">Auto-detect • Auto-translate • Connect</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authStep === 'phone' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-pink-300 text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-pink-500/30 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-pink-300 text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    placeholder="Your beautiful name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-pink-500/30 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-pink-300 text-sm font-medium mb-2">OTP Code</label>
                  <div className="flex gap-2">
                    {[...Array(6)].map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength="1"
                        placeholder="•"
                        value={otpInput[i] || ''}
                        onChange={(e) => {
                          const newOtp = otpInput.split('');
                          newOtp[i] = e.target.value;
                          setOtpInput(newOtp.join(''));
                        }}
                        className="w-12 h-12 bg-slate-800/50 border border-pink-500/30 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-pink-500"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader size={20} className="animate-spin" />}
              {authStep === 'phone' ? 'Send OTP' : 'Complete Setup'}
            </button>
          </form>

          <button
            onClick={() => setCurrentView('about')}
            className="w-full text-pink-400 hover:text-pink-300 text-sm font-medium mt-4 py-2 hover:bg-pink-500/10 rounded transition"
          >
            ℹ️ About Cattleya
          </button>

          <p className="text-center text-slate-500 text-xs mt-8">
            🔒 End-to-end encrypted • 🌐 Auto-translated • 💕 Built with love
          </p>
        </div>
      </div>
    );
  }

  // About View
  if (currentView === 'about') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setCurrentView('auth')}
            className="mb-4 text-slate-400 hover:text-white transition flex items-center gap-2"
          >
            <X size={20} /> Back
          </button>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bgGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#ec4899',stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#a855f7',stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="flowerGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#fbbf24',stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#f59e0b',stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="95" fill="url(#bgGradient2)" opacity="0.95"/>
                <ellipse cx="70" cy="80" rx="18" ry="35" fill="url(#flowerGradient2)" opacity="0.9" transform="rotate(-45 70 80)"/>
                <ellipse cx="130" cy="80" rx="18" ry="35" fill="url(#flowerGradient2)" opacity="0.9" transform="rotate(45 130 80)"/>
                <ellipse cx="100" cy="50" rx="18" ry="35" fill="url(#flowerGradient2)" opacity="0.95"/>
                <ellipse cx="80" cy="125" rx="16" ry="30" fill="url(#flowerGradient2)" opacity="0.85" transform="rotate(-60 80 125)"/>
                <ellipse cx="120" cy="125" rx="16" ry="30" fill="url(#flowerGradient2)" opacity="0.85" transform="rotate(60 120 125)"/>
                <circle cx="100" cy="95" r="22" fill="#f59e0b" opacity="0.95"/>
                <circle cx="100" cy="95" r="18" fill="#fbbf24"/>
                <path d="M 100 105 C 95 115, 85 115, 85 105 C 85 100, 88 95, 95 95 C 98 95, 100 97, 100 97 C 100 97, 102 95, 105 95 C 112 95, 115 100, 115 105 C 115 115, 105 115, 100 105 Z" fill="#ec4899" opacity="0.9"/>
              </svg>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Cattleya
              </h1>
              <p className="text-slate-400 mt-2">Breaking language barriers with love</p>
            </div>

            <div className="space-y-4 text-slate-300">
              <h2 className="text-xl font-bold text-pink-400">💕 A Love Story</h2>
              <div className="bg-slate-800/30 border-l-4 border-pink-500 rounded p-4 italic">
                <p className="mb-3">
                  "This app was inspired by Cattleya, the beautiful woman who I fell for online but we don't speak the same language. I hope it helps you inter-lingo relationships too."
                </p>
                <p className="text-sm text-slate-400">— The Builder, with love 💕</p>
              </div>

              <h2 className="text-xl font-bold text-pink-400 mt-6">🌐 What is Cattleya?</h2>
              <p>
                Cattleya is a secure, private messaging app designed for people who speak different languages. Whether you're connecting with someone across borders or building relationships that transcend language barriers, Cattleya makes it effortless.
              </p>

              <h2 className="text-xl font-bold text-pink-400 mt-6">✨ Key Features</h2>
              <ul className="space-y-2 text-sm">
                <li>🌐 <strong>Auto Language Detection</strong> - Automatically detects what language you're typing</li>
                <li>🔄 <strong>Instant Translation</strong> - Messages auto-translate to the recipient's preferred language</li>
                <li>🎙️ <strong>Voice Notes with Translation</strong> - Record audio and it's transcribed + translated</li>
                <li>💬 <strong>Typing Indicators</strong> - See when the other person is typing</li>
                <li>👤 <strong>Online Status</strong> - Know when they're available, last seen time</li>
                <li>😊 <strong>Message Reactions</strong> - React with emojis to messages</li>
                <li>✅ <strong>Read Receipts</strong> - Know when messages are read</li>
                <li>🔒 <strong>End-to-End Encrypted</strong> - Your conversations stay private</li>
              </ul>

              <h2 className="text-xl font-bold text-pink-400 mt-6">🎯 Who Is It For?</h2>
              <ul className="space-y-2 text-sm">
                <li>💑 Long-distance couples speaking different languages</li>
                <li>🌍 International friends & collaborators</li>
                <li>🗣️ Anyone breaking language barriers to connect</li>
                <li>🚀 People who believe love transcends language</li>
              </ul>

              <h2 className="text-xl font-bold text-pink-400 mt-6">🔐 Privacy & Security</h2>
              <p className="text-sm">
                Cattleya uses enterprise-grade encryption to protect your conversations. Your messages are never stored longer than necessary, and we never share your data. Built with privacy first, always.
              </p>

              <h2 className="text-xl font-bold text-pink-400 mt-6">💡 The Idea</h2>
              <p className="text-sm">
                Love doesn't speak in one language. Cattleya removes the language barrier so you can focus on what matters—connecting with the person you care about. Whether it's "Te amo," "Je t'aime," or "I love you," we help you understand each other.
              </p>
            </div>

            <button
              onClick={() => setCurrentView('auth')}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition"
            >
              Ready to Connect? Let's Go 💕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Call View
  if (callActive) {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center">
        <button onClick={endCall} className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition">
          <X size={24} className="text-white" />
        </button>

        <div className="text-center flex-1 flex flex-col items-center justify-center">
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-4xl animate-pulse">
              💜
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Cattleya</h2>
          <p className="text-lg text-pink-300">{callType === 'video' ? '📹 Video Call' : '☎️ Audio Call'}</p>
          <p className="text-slate-400 mt-2 text-xl font-mono">{formatTime(callDuration)}</p>
        </div>

        <div className="flex gap-6 pb-8 px-4">
          <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-full transition text-white">
            <Mic size={24} />
          </button>
          <button onClick={endCall} className="p-6 bg-red-600 hover:bg-red-700 rounded-full transition text-white transform hover:scale-110">
            <Phone size={28} />
          </button>
          <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-full transition text-white">
            <Video size={24} />
          </button>
        </div>
      </div>
    );
  }

  // Chat View
  if (currentView === 'chats' && !selectedChat) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col">
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-slate-800 px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">💬 Chats</h1>
            <p className="text-slate-400 text-xs">Auto-translating & secure</p>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-white/10 rounded-full transition">
            <Menu size={24} className="text-white" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800">
          <div className="bg-slate-800/50 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-700">
            <Search size={18} className="text-slate-500" />
            <input type="text" placeholder="Search..." className="bg-transparent outline-none flex-1 text-white placeholder-slate-500 text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat, i) => (
            <button
              key={i}
              onClick={() => setSelectedChat(chat)}
              className="w-full px-4 py-4 border-b border-slate-800 hover:bg-slate-900/50 transition flex items-center gap-3 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 relative">
                {chat.avatar}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${chat.status === 'online' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-white group-hover:text-pink-300 transition">{chat.name}</p>
                <p className="text-slate-400 text-sm truncate">{chat.lastMsg}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs">{chat.time}</p>
                {chat.unread > 0 && (
                  <div className="bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-1">
                    {chat.unread}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {menuOpen && (
          <div className="border-t border-slate-800 bg-slate-900/50 p-3">
            <button className="w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition text-sm font-medium">
              ⚙️ Settings
            </button>
            <button onClick={logout} className="w-full text-left px-4 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition text-sm font-medium">
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  // Individual Chat View
  if (currentView === 'chats' && selectedChat) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col">
        {/* Chat Header with Status */}
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSelectedChat(null)}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X size={24} className="text-white" />
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold text-white">{selectedChat.name}</h2>
            <p className={`text-xs flex items-center justify-center gap-1 ${
              recipientStatus === 'online' ? 'text-green-300' : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${recipientStatus === 'online' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              {recipientStatus === 'online' ? 'Online' : `Last seen ${lastSeen || '2 min ago'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => startCall('audio')}
              className="p-2 hover:bg-white/10 rounded-full transition text-pink-400"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => startCall('video')}
              className="p-2 hover:bg-white/10 rounded-full transition text-purple-400"
            >
              <Video size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">💕</div>
              <p className="text-slate-400 font-medium">No messages yet</p>
              <p className="text-slate-600 text-sm">Start your conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'you' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-2xl ${
                    msg.sender === 'you'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  {msg.messageType === 'voice' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/20 rounded-full transition">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path>
                          </svg>
                        </button>
                        <span className="text-xs opacity-75">{msg.duration}s</span>
                      </div>
                      {msg.voiceTranscription && (
                        <div className="text-xs opacity-85 bg-black/20 rounded px-2 py-1">
                          📝 {msg.voiceTranscription}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      {msg.translated && (
                        <div className="text-xs opacity-75 mt-2 border-t border-current pt-1 italic">
                          🌐 {msg.translated}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2 text-xs">
                      {msg.reactions.map((emoji, i) => (
                        <span key={i} className="bg-black/30 rounded-full px-2 py-0.5">
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className={`text-xs mt-2 flex items-center gap-1 ${
                    msg.sender === 'you' ? 'text-pink-100' : 'text-slate-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender === 'you' && (
                      msg.status === 'sent' ? <Check size={12} /> : <CheckCheck size={12} />
                    )}
                  </p>
                </div>

                {/* Reaction Button */}
                {msg.sender !== 'you' && (
                  <button
                    onClick={() => addReaction(msg.id, '❤️')}
                    className="ml-2 opacity-0 hover:opacity-100 transition text-pink-400 hover:scale-125"
                  >
                    ❤️
                  </button>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-900/50 border-t border-slate-800 p-4 space-y-3">
          {isRecording && (
            <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-300 text-sm font-medium">Recording: {recordingTime}s</span>
              <button
                onClick={stopRecording}
                className="ml-auto px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition"
              >
                Stop
              </button>
            </div>
          )}

          {isTyping && (
            <div className="text-xs text-pink-400 px-2">
              ✍️ Auto-detecting: {detectedLanguage.toUpperCase()} → Translating to {preferredLanguage.toUpperCase()}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-3 items-end">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-pink-400" />}
            </button>

            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Message with love..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
            />

            <button
              type="submit"
              className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-full transition text-white"
            >
              <Send size={20} />
            </button>
          </form>

          <div className="text-xs text-slate-500 px-2">
            💬 Language detection active • 🌐 Auto-translate enabled
          </div>
        </div>
      </div>
    );
  }
}
