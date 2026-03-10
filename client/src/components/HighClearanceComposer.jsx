import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMdLock,
  IoMdClose,
  IoMdSend,
  IoMdImage,
  IoMdMic,
  IoMdWarning,
  IoMdFingerPrint,
  IoMdKey,
} from 'react-icons/io';
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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [biometricCapabilities, setBiometricCapabilities] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
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
    setAudioBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedImage && !audioBlob) {
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
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-zinc-950 border-2 border-amber-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IoMdLock className="text-amber-400" size={32} />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">
                    High Clearance Message
                  </h2>
                  <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                    Biometric Protected • AES-256 Encrypted
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white transition border border-zinc-700 hover:border-white"
              >
                <IoMdClose size={24} />
              </button>
            </div>

            {/* Security Status */}
            <div className={`mb-6 p-4 border ${biometricCapabilities?.supported && !hasCredential ? 'border-red-600/70 bg-red-950/30' : 'border-amber-600/50 bg-amber-950/20'}`}>
              <div className="flex items-center gap-3 mb-2">
                <IoMdLock className={biometricCapabilities?.supported && !hasCredential ? 'text-red-400' : 'text-amber-400'} size={20} />
                <span className={`text-sm font-bold uppercase tracking-wide ${biometricCapabilities?.supported && !hasCredential ? 'text-red-200' : 'text-amber-200'}`}>
                  Security Status {biometricCapabilities?.supported && !hasCredential && '- SETUP REQUIRED'}
                </span>
              </div>
              
              <div className="space-y-2 text-xs">
                {biometricCapabilities?.supported ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IoMdFingerPrint className={hasCredential ? 'text-green-400' : 'text-red-400'} size={16} />
                      <span className={hasCredential ? 'text-green-300' : 'text-red-300'}>
                        {biometricCapabilities.type} Available
                      </span>
                      {hasCredential ? (
                        <span className="text-green-400 font-bold">• Configured</span>
                      ) : (
                        <span className="text-red-400 font-bold">• REQUIRED</span>
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
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase font-bold transition animate-pulse"
                      >
                        Set Up Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IoMdWarning className="text-amber-400" size={16} />
                    <span className="text-amber-300">
                      Biometric authentication not available - password fallback will be used
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <IoMdKey className="text-blue-400" size={16} />
                  <span className="text-blue-300">AES-256 Encryption Active</span>
                </div>

                {biometricCapabilities?.supported && !hasCredential && (
                  <div className="mt-2 p-3 bg-red-950/70 border border-red-700 text-red-200 text-xs">
                    <IoMdWarning className="inline mr-1" />
                    <strong>SECURITY NOTICE:</strong> Biometric authentication must be configured before sending high-clearance messages. This ensures only authorized personnel can access classified content.
                  </div>
                )}

                {!hasCredential && !biometricCapabilities?.supported && (
                  <div className="mt-2 p-2 bg-amber-950/50 border border-amber-700 text-amber-200 text-xs">
                    <IoMdWarning className="inline mr-1" />
                    Without biometric setup, recipients can access this message with room password only.
                  </div>
                )}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950 border border-red-700 text-red-200 px-4 py-3 text-sm uppercase tracking-wide text-center mb-4"
              >
                <IoMdWarning className="inline mr-2" />
                {error}
              </motion.div>
            )}

            {/* Message Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2 uppercase tracking-wide">
                  Classified Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your high clearance message..."
                  className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 outline-none focus:border-amber-500 resize-none h-32"
                  maxLength={1000}
                />
                <div className="text-right text-xs text-zinc-500 mt-1">
                  {message.length}/1000
                </div>
              </div>

              {/* Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Attachment */}
                <div className="border border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
                      Image Attachment
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-zinc-400 hover:text-white transition border border-zinc-700 hover:border-white"
                    >
                      <IoMdImage size={20} />
                    </button>
                  </div>
                  
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-32 object-cover border border-zinc-600"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 hover:bg-red-500 transition"
                      >
                        <IoMdClose size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 text-xs py-4">
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

                {/* Voice Memo */}
                <div className="border border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
                      Voice Memo
                    </span>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-2 transition border ${
                        isRecording 
                          ? 'text-red-400 border-red-600 animate-pulse' 
                          : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-white'
                      }`}
                    >
                      <IoMdMic size={20} />
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
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Remove recording
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 text-xs py-4">
                      {isRecording ? 'Recording...' : 'No voice memo recorded'}
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 border border-zinc-700 text-zinc-400 py-3 uppercase text-sm font-bold hover:bg-zinc-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSend}
                  disabled={
                    (!message.trim() && !selectedImage && !audioBlob) ||
                    (biometricCapabilities?.supported && !hasCredential)
                  }
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-black py-3 uppercase text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={
                    biometricCapabilities?.supported && !hasCredential
                      ? 'Biometric setup required for high-clearance messages'
                      : 'Send high-clearance message'
                  }
                >
                  <IoMdSend size={20} />
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