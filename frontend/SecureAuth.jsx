// ============ ENHANCED SECURE AUTHENTICATION COMPONENT ============

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Lock, Shield, AlertCircle, CheckCircle, Phone, Loader } from 'lucide-react';

export function SecureAuthenticationUI() {
  // Auth States
  const [currentStep, setCurrentStep] = useState('phone'); // phone, otp, permissions, 2fa
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [attemptId, setAttemptId] = useState(null);
  const [otpExpires, setOtpExpires] = useState(null);
  const [otpTimer, setOtpTimer] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  // Permission States
  const [permissions, setPermissions] = useState({
    microphone: { granted: false, requested: false },
    camera: { granted: false, requested: false },
    notifications: { granted: false, requested: false },
  });
  
  const [activePermissionPrompt, setActivePermissionPrompt] = useState(null);
  
  // 2FA States
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFARequired, setTwoFARequired] = useState(false);

  const otpInputRefs = useRef([]);

  // OTP Timer
  useEffect(() => {
    if (otpExpires) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((otpExpires - now) / 1000));
        setOtpTimer(remaining);
        
        if (remaining === 0) {
          setError('OTP expired. Please request a new one.');
          setCurrentStep('phone');
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [otpExpires]);

  // Format phone number
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    let formatted = '+';
    
    if (digits.startsWith('1')) {
      formatted += digits.substring(0, 1) + ' (' + digits.substring(1, 4) + ') ' + 
                   digits.substring(4, 7) + '-' + digits.substring(7, 11);
    } else {
      formatted += digits.substring(0, 2) + ' ' + digits.substring(2);
    }
    
    setPhoneInput(value);
    setPhoneFormatted(formatted);
  };

  // Validate phone number
  const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Send OTP
  const sendOTP = async () => {
    if (!isValidPhone(phoneInput)) {
      setError('Please enter a valid international phone number (e.g., +1 (202) 555-1234)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneInput })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error);
        return;
      }

      setAttemptId(data.attemptId);
      setOtpExpires(new Date(Date.now() + data.expiresIn * 1000));
      setCurrentStep('otp');
      setSuccess('Verification code sent! Check your phone.');
      
      // Auto-focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (attempts >= 5) {
      setError('Too many failed attempts. Please try again later.');
      setLocked(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneInput,
          otp: otpCode,
          name: 'User',
          attemptId: attemptId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setAttempts(prev => prev + 1);
        setError(data.message || data.error);
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        return;
      }

      setSuccess('Verified! Proceeding to permissions...');
      
      // Check if 2FA needed
      if (data.requires2FA) {
        setTwoFARequired(true);
        setCurrentStep('2fa');
      } else {
        // Move to permissions
        setCurrentStep('permissions');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Request Permission
  const requestPermission = async (type) => {
    setIsLoading(true);
    
    try {
      let promiseChain = Promise.resolve(true);

      if (type === 'microphone') {
        promiseChain = navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            return true;
          })
          .catch(err => {
            setError(`Microphone access denied: ${err.message}`);
            return false;
          });
      } else if (type === 'camera') {
        promiseChain = navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            return true;
          })
          .catch(err => {
            setError(`Camera access denied: ${err.message}`);
            return false;
          });
      } else if (type === 'notifications') {
        promiseChain = Notification.requestPermission()
          .then(permission => permission === 'granted');
      }

      const granted = await promiseChain;

      if (granted) {
        setPermissions(prev => ({
          ...prev,
          [type]: { ...prev[type], granted: true, requested: true }
        }));

        // Log permission to backend
        try {
          await fetch('/api/permissions/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissionType: type })
          });
        } catch (err) {
          console.error('Failed to log permission:', err);
        }
      }

      setActivePermissionPrompt(null);
    } finally {
      setIsLoading(false);
    }
  };

  // PHONE INPUT VIEW
  if (currentStep === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full">
                <Lock className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Cattleya</h1>
            <p className="text-slate-400 text-sm">Secure login with phone verification</p>
          </div>

          {/* Security Note */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <Shield size={20} className="text-green-400 flex-shrink-0" />
              <div className="text-sm text-green-300">
                <p className="font-medium">🔒 Your number is secure</p>
                <p className="text-xs opacity-75">We'll send a code to verify. Never shared.</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <div className="text-sm text-red-300">{error}</div>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <div className="text-sm text-green-300">{success}</div>
              </div>
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-pink-300 text-sm font-medium mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 text-slate-500" size={20} />
                <input
                  type="tel"
                  placeholder="+1 (202) 555-1234"
                  value={phoneInput}
                  onChange={(e) => formatPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-pink-500/30 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Enter your phone number with country code (e.g., +1 for USA)
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={sendOTP}
              disabled={isLoading || !isValidPhone(phoneInput)}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Send Verification Code
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 space-y-2">
            <p className="text-center text-slate-500 text-xs">
              🔐 End-to-end encrypted • 🛡️ 256-bit security
            </p>
            <p className="text-center text-slate-600 text-xs">
              Your number is never shared. Only used for verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OTP VERIFICATION VIEW
  if (currentStep === 'otp') {
    const minutes = Math.floor(otpTimer / 60);
    const seconds = otpTimer % 60;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full">
                <Shield size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Verify Code</h1>
            <p className="text-slate-400 text-sm">Enter the 6-digit code sent to</p>
            <p className="text-slate-300 font-medium">{phoneFormatted}</p>
          </div>

          {/* Timer */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-purple-300">
              Code expires in: <span className="font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </p>
            {otpTimer < 60 && (
              <p className="text-xs text-orange-300 mt-2">⏰ Code expiring soon!</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <div className="text-sm text-red-300">{error}</div>
              </div>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-6">
            <div className="flex gap-3 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpInputRefs.current[i] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-14 h-14 bg-slate-800 border-2 border-slate-700 rounded-lg text-center text-2xl font-bold text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition"
                  placeholder="-"
                  disabled={isLoading || locked}
                />
              ))}
            </div>

            {/* Attempt Counter */}
            <div className="text-center text-sm">
              <p className="text-slate-400">
                {attempts > 0 && <span className="text-orange-300">Attempt {attempts}/5 • </span>}
                <button
                  onClick={() => setCurrentStep('phone')}
                  className="text-pink-400 hover:text-pink-300 transition"
                >
                  Request new code
                </button>
              </p>
            </div>

            {/* Verify Button */}
            <button
              onClick={verifyOTP}
              disabled={isLoading || locked || otp.join('').length !== 6}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Verifying...
                </>
              ) : locked ? (
                <>
                  <AlertCircle size={20} />
                  Too Many Attempts
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Verify Code
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-slate-500 text-xs space-y-1">
            <p>🔒 This code is one-time use only</p>
            <p>Never share your code with anyone</p>
          </div>
        </div>
      </div>
    );
  }

  // PERMISSIONS VIEW
  if (currentStep === 'permissions') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Almost There!</h1>
            <p className="text-slate-400 text-sm">Cattleya needs a few permissions</p>
          </div>

          {/* Permissions List */}
          <div className="space-y-4">
            {/* Microphone */}
            <PermissionCard
              icon="🎤"
              title="Microphone"
              description="Record voice notes and make audio calls"
              granted={permissions.microphone.granted}
              onRequest={() => requestPermission('microphone')}
              isLoading={isLoading && activePermissionPrompt === 'microphone'}
            />

            {/* Camera */}
            <PermissionCard
              icon="📹"
              title="Camera"
              description="Make video calls with your loved one"
              granted={permissions.camera.granted}
              onRequest={() => requestPermission('camera')}
              isLoading={isLoading && activePermissionPrompt === 'camera'}
            />

            {/* Notifications */}
            <PermissionCard
              icon="🔔"
              title="Notifications"
              description="Get alerts for new messages"
              granted={permissions.notifications.granted}
              onRequest={() => requestPermission('notifications')}
              isLoading={isLoading && activePermissionPrompt === 'notifications'}
            />
          </div>

          {/* Privacy Note */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-6">
            <p className="text-xs text-blue-300">
              ✓ All audio is encrypted with AES-256<br />
              ✓ You can change these anytime in Settings<br />
              ✓ We never share your permissions with third parties
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => setCurrentStep('chat')}
            className="w-full py-3 mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition transform hover:scale-105"
          >
            Continue to Cattleya
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Permission Card Component
function PermissionCard({ icon, title, description, granted, onRequest, isLoading }) {
  return (
    <div className={`p-4 rounded-lg border-2 transition ${
      granted 
        ? 'bg-green-900/20 border-green-500/30' 
        : 'bg-slate-800/30 border-slate-700/30'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div>
          {granted ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/40 text-green-300 rounded text-xs font-medium">
              <CheckCircle size={14} />
              Granted
            </span>
          ) : (
            <button
              onClick={onRequest}
              disabled={isLoading}
              className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded text-sm font-medium transition disabled:bg-slate-600 disabled:opacity-50"
            >
              {isLoading ? 'Requesting...' : 'Allow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SecureAuthenticationUI;
