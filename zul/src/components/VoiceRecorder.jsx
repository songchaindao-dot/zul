import { useState, useRef } from 'react';

export default function VoiceRecorder({ conversationId, myLanguage, authToken, onMessageSent }) {
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState('idle'); // idle | recording | uploading

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const startTimeRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      finalTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = myLanguage || 'en-US';

        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setInterimTranscript(finalTranscriptRef.current + interim);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        alert('Voice transcription works best in Chrome or Safari. Audio sent without text.');
      }

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setRecording(true);
      setStatus('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    const duration_ms = Date.now() - startTimeRef.current;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const finalTranscript = finalTranscriptRef.current.trim();

      setRecording(false);
      setStatus('uploading');
      setInterimTranscript('');

      try {
        const urlRes = await fetch('/api/voice/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ filename: `recording-${Date.now()}.webm` }),
        });
        const { upload_url, storage_path } = await urlRes.json();

        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/webm' },
          body: audioBlob,
        });

        const finalizeBody = {
          conversation_id: conversationId,
          storage_path,
          duration_ms,
          original_language: myLanguage,
        };
        if (finalTranscript) finalizeBody.transcript = finalTranscript;

        const finalizeRes = await fetch('/api/voice/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(finalizeBody),
        });

        const message = await finalizeRes.json();
        if (onMessageSent) onMessageSent(message);
      } catch (err) {
        console.error('Failed to send voice message:', err);
      }

      setStatus('idle');
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="voice-recorder">
      {status === 'recording' && interimTranscript && (
        <div className="live-transcript">{interimTranscript}</div>
      )}
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={status === 'uploading'}
        className={`record-btn ${recording ? 'recording' : ''}`}
      >
        {status === 'uploading' ? 'Sending…' : recording ? 'Stop' : 'Record'}
      </button>
    </div>
  );
}
