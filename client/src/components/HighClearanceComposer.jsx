import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuLock,
  LuX,
  LuSend,
  LuImage,
  LuMic,
  LuTriangleAlert,
  LuFingerprint,
  LuKeyRound,
  LuShieldCheck,
  LuShieldAlert,
  LuPaperclip,
  LuFile,
  LuFileText,
} from 'react-icons/lu';
import { getBiometricCapabilities, hasBiometricCredential, registerBiometric } from '../utils/webauthn';

const HighClearanceComposer = ({
  isVisible,
  onClose,
  onSend,
  username,
  roomId,
}) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // { name, size, type, data }
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [biometricCapabilities, setBiometricCapabilities] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const fileAttachInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  React.useEffect(() => {
    const checkCapabilities = async () => {
      const capabilities = await getBiometricCapabilities();
      setBiometricCapabilities(capabilities);
      setHasCredential(hasBiometricCredential(username, roomId));
    };
    
    if (isVisible) {
      checkCapabilities();
    }
  }, [isVisible, username, roomId]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image too large. Maximum size is 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setSelectedImage(base64);
      setImagePreview(base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileAttachSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: event.target.result,
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return LuFile;
    if (fileType.includes('pdf') || fileType.includes('text') || fileType.includes('document') || fileType.includes('word')) return LuFileText;
    return LuFile;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAttachments = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedFile(null);
    setAudioBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fileAttachInputRef.current) {
      fileAttachInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedImage && !selectedFile && !audioBlob) {
      setError('Please enter a message or attach content');
      return;
    }

    // Enforce biometric setup for high-clearance messages
    if (biometricCapabilities?.supported && !hasCredential) {
      setError('Biometric authentication setup is required to send high-clearance messages. Please click "Set Up Now" above.');
      return;
    }

    // If biometrics not supported, warn user about reduced security
    if (!biometricCapabilities?.supported) {
      const confirmed = window.confirm(
        'Biometric authentication is not available on this device. ' +
        'High-clearance messages will use password-only protection. ' +
        'Recipients can access with room password. Continue?'
      );
      if (!confirmed) return;
    }

    let audioData = null;
    if (audioBlob) {
      // Convert audio blob to base64 for transmission
      try {
        const reader = new FileReader();
        audioData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      } catch (err) {
        setError('Failed to process audio recording');
        return;
      }
    }

    const messageData = {
      type: 'high-clearance',
      content: message.trim(),
      image: selectedImage,
      file: selectedFile ? {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        data: selectedFile.data,
      } : null,
      audio: audioData,
      requiresBiometric: biometricCapabilities?.supported && hasCredential,
      timestamp: Date.now(),
    };

    onSend(messageData);
    
    // Reset form
    setMessage('');
    clearAttachments();
    setError('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#0f0f11] border border-zinc-700/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)] scrollbar-micro"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/5 rounded-xl border border-zinc-700/20">
                  <LuLock className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-[0.12em] text-white">
                    High Clearance Message
                  </h2>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                    Biometric Protected • AES-256 Encrypted
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white transition-all hover:bg-white/5 rounded-xl active:scale-90"
              >
                <LuX size={20} />
              </button>
            </div>

            {/* Security Status */}
            <div className={`mb-6 p-4 rounded-xl border ${biometricCapabilities?.supported && !hasCredential ? 'border-red-500/20 bg-red-950/20' : 'border-zinc-700/20 bg-zinc-900/30'}`}>
              <div className="flex items-center gap-2.5 mb-3">
                {biometricCapabilities?.supported && !hasCredential ? (
                  <LuShieldAlert className="text-red-400" size={16} />
                ) : (
                  <LuShieldCheck className="text-white" size={16} />
                )}
                <span className={`text-xs font-bold uppercase tracking-[0.15em] ${biometricCapabilities?.supported && !hasCredential ? 'text-red-300' : 'text-zinc-300'}`}>
                  Security Status {biometricCapabilities?.supported && !hasCredential && '— Setup Required'}
                </span>
              </div>
              
              <div className="space-y-2.5 text-xs">
                {biometricCapabilities?.supported ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LuFingerprint className={hasCredential ? 'text-white' : 'text-red-400'} size={14} />
                      <span className={hasCredential ? 'text-zinc-300' : 'text-red-300'}>
                        {biometricCapabilities.type} Available
                      </span>
                      {hasCredential ? (
                        <span className="text-white font-bold text-[10px]">• Configured</span>
                      ) : (
                        <span className="text-red-400 font-bold text-[10px]">• REQUIRED</span>
                      )}
                    </div>
                    {!hasCredential && (
                      <button
                        onClick={async () => {
                          setError('');
                          try {
                            await registerBiometric(username, roomId);
                            setHasCredential(true);
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-[10px] uppercase font-bold transition-all rounded-lg animate-pulse active:scale-95"
                      >
                        Set Up Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LuTriangleAlert className="text-zinc-400" size={14} />
                    <span className="text-zinc-400 text-[11px]">
                      Biometric authentication not available — password fallback will be used
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <LuKeyRound className="text-zinc-400" size={14} />
                  <span className="text-zinc-400 text-[11px]">AES-256 Encryption Active</span>
                </div>

                {biometricCapabilities?.supported && !hasCredential && (
                  <div className="mt-2 p-3 bg-red-950/40 border border-red-500/15 text-red-200/80 text-[10px] rounded-lg">
                    <LuTriangleAlert className="inline mr-1.5" size={11} />
                    <strong>SECURITY NOTICE:</strong> Biometric authentication must be configured before sending high-clearance messages.
                  </div>
                )}

                {!hasCredential && !biometricCapabilities?.supported && (
                  <div className="mt-2 p-2.5 bg-zinc-900/40 border border-zinc-700/20 text-zinc-400 text-[10px] rounded-lg">
                    <LuTriangleAlert className="inline mr-1.5" size={11} />
                    Without biometric setup, recipients can access this message with room password only.
                  </div>
                )}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/40 border border-red-500/20 text-red-300 px-4 py-3 text-xs uppercase tracking-wider text-center mb-4 rounded-xl"
              >
                <LuTriangleAlert className="inline mr-2" size={13} />
                {error}
              </motion.div>
            )}

            {/* Message Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-[0.15em]">
                  Classified Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your high clearance message..."
                  className="w-full bg-black/40 border border-zinc-800/40 text-white px-4 py-3 outline-none focus:border-zinc-600 resize-none h-32 rounded-xl font-mono text-sm placeholder:text-zinc-700 transition-colors"
                  maxLength={1000}
                />
                <div className="text-right text-[10px] text-zinc-600 mt-1.5 font-mono tabular-nums">
                  {message.length}/1000
                </div>
              </div>

              {/* Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Image Attachment */}
                <div className="border border-zinc-800/40 p-4 rounded-xl bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                      Image
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-zinc-500 hover:text-white transition-all hover:bg-white/5 rounded-lg active:scale-90"
                    >
                      <LuImage size={16} />
                    </button>
                  </div>
                  
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-32 object-cover border border-zinc-800/40 rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 hover:bg-red-500 transition-all rounded-lg active:scale-90"
                      >
                        <LuX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-600 text-[10px] py-4 uppercase tracking-wider">
                      No image selected
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* File Attachment */}
                <div className="border border-zinc-800/40 p-4 rounded-xl bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                      File
                    </span>
                    <button
                      onClick={() => fileAttachInputRef.current?.click()}
                      className="p-2 text-zinc-500 hover:text-white transition-all hover:bg-white/5 rounded-lg active:scale-90"
                    >
                      <LuPaperclip size={16} />
                    </button>
                  </div>
                  
                  {selectedFile ? (
                    <div className="relative">
                      <div className="flex items-center gap-2.5 p-2.5 border border-zinc-800/40 rounded-lg bg-zinc-900/40">
                        <div className="p-1.5 bg-white/5 rounded-lg border border-zinc-700/30 shrink-0">
                          {React.createElement(getFileIcon(selectedFile.type), { size: 16, className: 'text-zinc-300' })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-zinc-200 font-bold truncate">{selectedFile.name}</p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileAttachInputRef.current) fileAttachInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 hover:bg-red-500 transition-all rounded-lg active:scale-90"
                      >
                        <LuX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-600 text-[10px] py-4 uppercase tracking-wider">
                      No file selected
                    </div>
                  )}
                  
                  <input
                    ref={fileAttachInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleFileAttachSelect}
                    className="hidden"
                  />
                </div>

                {/* Voice Memo */}
                <div className="border border-zinc-800/40 p-4 rounded-xl bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                      Voice Memo
                    </span>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-2 transition-all rounded-lg active:scale-90 ${
                        isRecording 
                          ? 'text-red-400 bg-red-500/10 animate-pulse' 
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <LuMic size={16} />
                    </button>
                  </div>
                  
                  {audioBlob ? (
                    <div className="space-y-2">
                      <audio 
                        controls 
                        src={URL.createObjectURL(audioBlob)}
                        className="w-full"
                      />
                      <button
                        onClick={() => setAudioBlob(null)}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-bold"
                      >
                        Remove recording
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-600 text-[10px] py-4 uppercase tracking-wider">
                      {isRecording ? 'Recording...' : 'No voice memo recorded'}
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 border border-zinc-800/40 text-zinc-500 py-3 uppercase text-[10px] font-bold tracking-[0.15em] hover:bg-white/5 hover:text-white transition-all rounded-xl active:scale-[0.98]"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSend}
                  disabled={
                    (!message.trim() && !selectedImage && !selectedFile && !audioBlob) ||
                    (biometricCapabilities?.supported && !hasCredential)
                  }
                  className="flex-1 bg-white hover:bg-zinc-100 text-black py-3 uppercase text-[10px] font-bold tracking-[0.15em] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-white/10 active:scale-[0.98]"
                  title={
                    biometricCapabilities?.supported && !hasCredential
                      ? 'Biometric setup required for high-clearance messages'
                      : 'Send high-clearance message'
                  }
                >
                  <LuSend size={14} />
                  {biometricCapabilities?.supported && !hasCredential
                    ? 'Setup Required'
                    : hasCredential
                      ? 'Send Biometric'
                      : 'Send Encrypted'
                  }
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HighClearanceComposer;