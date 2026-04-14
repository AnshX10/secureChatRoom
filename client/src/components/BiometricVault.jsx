import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuLock,
  LuLockOpen,
  LuFingerprint,
  LuEye,
  LuTriangleAlert,
  LuCheck,
  LuX,
  LuTimer,
  LuImage,
  LuMic,
  LuFileText,
  LuDownload,
  LuFile,
  LuMaximize2,
} from 'react-icons/lu';
import {
  authenticateBiometric,
  registerBiometric,
  hasBiometricCredential,
  getBiometricCapabilities,
} from '../utils/webauthn';

const BiometricVault = ({
  message,
  username,
  roomId,
  onDecrypted,
  onClose,
  isVisible,
}) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [error, setError] = useState('');
  const [biometricCapabilities, setBiometricCapabilities] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [scanAnimation, setScanAnimation] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imageObjectUrl, setImageObjectUrl] = useState(null);
  const [audioObjectUrl, setAudioObjectUrl] = useState(null);

  const resolveMediaSource = (rawValue) => {
    if (!rawValue) return null;
    if (rawValue instanceof Blob) {
      return URL.createObjectURL(rawValue);
    }
    if (typeof rawValue === 'string' && rawValue.startsWith('data:')) {
      const commaIndex = rawValue.indexOf(',');
      if (commaIndex === -1) return null;
      const header = rawValue.slice(0, commaIndex);
      const payload = rawValue.slice(commaIndex + 1);
      const mimeMatch = header.match(/^data:([^;]+);base64$/i);
      if (!mimeMatch) return null;

      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      return URL.createObjectURL(new Blob([bytes], { type: mimeMatch[1] }));
    }
    return null;
  };

  // Keyboard support for image preview
  useEffect(() => {
    if (!imagePreviewOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setImagePreviewOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [imagePreviewOpen]);

  useEffect(() => {
    const checkCapabilities = async () => {
      const capabilities = await getBiometricCapabilities();
      setBiometricCapabilities(capabilities);
      setHasCredential(hasBiometricCredential(username, roomId));
    };
    
    if (isVisible) {
      checkCapabilities();
    }
  }, [isVisible, username, roomId]);

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsDecrypted(false);
            setImagePreviewOpen(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (!isVisible || !message?.image) {
      setImageObjectUrl(null);
      return;
    }

    const nextUrl = resolveMediaSource(message.image);
    setImageObjectUrl(nextUrl);

    return () => {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [isVisible, message?.image]);

  useEffect(() => {
    if (!isVisible || !message?.audio) {
      setAudioObjectUrl(null);
      return;
    }

    const nextUrl = resolveMediaSource(message.audio);
    setAudioObjectUrl(nextUrl);

    return () => {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [isVisible, message?.audio]);

  const handleBiometricSetup = async () => {
    if (!biometricCapabilities?.supported) {
      setError('Biometric authentication not supported on this device');
      return;
    }

    setIsSettingUp(true);
    setError('');

    try {
      await registerBiometric(username, roomId);
      setHasCredential(true);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!hasCredential) {
      setError('No biometric credential found. Please set up biometric authentication first.');
      return;
    }

    setIsUnlocking(true);
    setError('');
    setScanAnimation(true);

    try {
      const authenticated = await authenticateBiometric(username, roomId);
      
      if (authenticated) {
        // Simulate scanning animation
        setTimeout(() => {
          setScanAnimation(false);
          setIsDecrypted(true);
          setCountdown(10); // 10 second view window
          onDecrypted?.(message);
        }, 1500);
      }
    } catch (err) {
      setScanAnimation(false);
      setError(err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0f0f11] border border-zinc-800/40 max-w-md w-full relative overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)] max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scanning Animation Overlay */}
          {scanAnimation && (
            <div className="absolute inset-0 z-10">
              <div className="scan-overlay">
                <div className="scan-grid" />
                <div className="scan-noise" />
                <div className="scan-line" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <LuFingerprint className="text-white mx-auto mb-3 animate-pulse" size={44} strokeWidth={1.5} />
                    <p className="text-[10px] text-zinc-300 uppercase tracking-[0.35em] font-black">
                      Biometric Scan
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mt-1">
                      Verifying identity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="relative inline-block">
                <div className="p-3 sm:p-4 bg-white/5 rounded-2xl border border-zinc-700/20 mx-auto mb-3 sm:mb-4 inline-flex">
                  <LuLock className="text-white" size={28} strokeWidth={1.5} />
                </div>
                {isDecrypted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-white rounded-full p-1 border-2 border-[#0f0f11]"
                  >
                    <LuCheck className="text-black" size={12} />
                  </motion.div>
                )}
              </div>
              
              <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.1em] sm:tracking-[0.12em] text-white mb-1.5 sm:mb-2">
                {isDecrypted ? 'Vault Unlocked' : 'Biometric Vault'}
              </h2>
              
              <p className="text-zinc-500 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                {isDecrypted 
                  ? `High clearance message decrypted • Auto-lock in ${countdown}s`
                  : (() => {
                      const contentTypes = [];
                      if (message?.content) contentTypes.push('Text');
                      if (message?.image) contentTypes.push('Image');
                      if (message?.file) contentTypes.push('File');
                      if (message?.audio) contentTypes.push('Audio');
                      const typeStr = contentTypes.length > 0 ? ` (${contentTypes.join(', ')})` : '';
                      return `High clearance message requires biometric authentication${typeStr}`;
                    })()
                }
              </p>
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

            {!isDecrypted ? (
              <div className="space-y-3">
                {biometricCapabilities?.supported ? (
                  <>
                    <div className="bg-zinc-900/40 border border-zinc-800/30 p-4 text-center rounded-xl">
                      <LuFingerprint className="text-white mx-auto mb-2" size={28} strokeWidth={1.5} />
                      <p className="text-[10px] text-zinc-300 uppercase tracking-[0.2em] font-bold mb-1">
                        {biometricCapabilities.type}
                      </p>
                      <p className="text-[9px] text-zinc-600">
                        Hardware-level security enabled
                      </p>
                    </div>

                    {hasCredential ? (
                      <button
                        onClick={handleBiometricUnlock}
                        disabled={isUnlocking}
                        className="w-full bg-white hover:bg-zinc-100 text-black py-4 uppercase text-[10px] font-bold tracking-[0.15em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl active:scale-[0.98]"
                      >
                        {isUnlocking ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <LuLockOpen size={16} />
                            Unlock with {biometricCapabilities.type}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleBiometricSetup}
                        disabled={isSettingUp}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 uppercase text-[10px] font-bold tracking-[0.15em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl border border-zinc-700/30 active:scale-[0.98]"
                      >
                        {isSettingUp ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <LuFingerprint size={16} />
                            Set up {biometricCapabilities.type}
                          </>
                        )}
                      </button>
                    )}

                  </>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="bg-zinc-900/40 border border-zinc-700/20 text-zinc-400 px-4 py-3 text-[10px] rounded-xl">
                      <LuTriangleAlert className="inline mr-2" size={13} />
                      Biometric authentication not available on this device
                    </div>

                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em]">
                      Biometric authentication is required to access high clearance messages.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/10 border border-zinc-700/20 text-white px-4 py-3 text-center rounded-xl">
                  <LuCheck className="inline mr-2" size={14} />
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold">
                    Identity Verified • Message Decrypted
                  </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/30 p-3 sm:p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                      Classified Content
                    </span>
                    <div className="flex items-center gap-1.5 text-[8px] text-white font-bold bg-white/10 px-2 py-1 rounded-lg">
                      <LuTimer size={10} />
                      Auto-lock: {countdown}s
                    </div>
                  </div>
                  
                  <div className="text-white text-sm leading-relaxed space-y-4">
                    {/* Text Content */}
                    {message.content && (
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2 flex items-center gap-1.5">
                          <LuFileText size={11} />
                          Message
                        </p>
                        <p className="whitespace-pre-wrap break-words bg-black/30 p-3 border border-zinc-800/30 rounded-lg font-mono text-sm">
                          {message.content}
                        </p>
                      </div>
                    )}

                    {/* Image Content */}
                    {message.image && (
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2 flex items-center gap-1.5">
                          <LuImage size={11} />
                          Classified Image
                        </p>
                        <div className="relative border border-zinc-800/30 bg-black/30 overflow-hidden rounded-xl group">
                          <img 
                            src={imageObjectUrl || message.image} 
                            alt="Classified" 
                            className="max-w-full max-h-48 sm:max-h-64 object-contain w-full cursor-zoom-in"
                            onClick={() => setImagePreviewOpen(true)}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          {/* Zoom hint */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 border border-zinc-700/40">
                              <LuMaximize2 size={16} className="text-white" />
                            </div>
                          </div>
                          <div
                            style={{ display: 'none' }}
                            className="p-4 text-center text-zinc-500 text-xs"
                          >
                            <LuTriangleAlert className="inline mr-2" size={13} />
                            Failed to load classified image
                          </div>
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = imageObjectUrl || message.image;
                                link.download = `classified_hc_image_${Date.now()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="bg-black/80 backdrop-blur-sm hover:bg-white hover:text-black text-white px-3 py-1.5 text-[9px] uppercase tracking-widest border border-zinc-700/30 hover:border-white font-bold transition-all flex items-center gap-1.5 rounded-lg active:scale-95"
                            >
                              <LuDownload size={12} />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Audio Content */}
                    {message.audio && (
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2 flex items-center gap-1.5">
                          <LuMic size={11} />
                          Voice Memo
                        </p>
                        <div className="bg-black/30 p-3 border border-zinc-800/30 rounded-lg space-y-2">
                          <audio 
                            controls 
                            src={audioObjectUrl || message.audio}
                            className="w-full"
                          />
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = audioObjectUrl || message.audio;
                              link.download = `classified_hc_audio_${Date.now()}.wav`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="w-full bg-white/5 hover:bg-white hover:text-black text-zinc-400 py-2 text-[9px] uppercase tracking-widest border border-zinc-700/30 hover:border-white font-bold transition-all flex items-center justify-center gap-1.5 rounded-lg active:scale-95"
                          >
                            <LuDownload size={12} />
                            Download Audio
                          </button>
                        </div>
                      </div>
                    )}

                    {/* File Content */}
                    {message.file && (
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2 flex items-center gap-1.5">
                          <LuFile size={11} />
                          Classified File
                        </p>
                        <div className="bg-black/30 border border-zinc-800/30 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 p-3">
                            <div className="p-2 bg-white/5 rounded-lg border border-zinc-700/30 shrink-0">
                              {message.file.type && (message.file.type.includes('pdf') || message.file.type.includes('text') || message.file.type.includes('document') || message.file.type.includes('word')) ? (
                                <LuFileText size={18} className="text-zinc-300" />
                              ) : (
                                <LuFile size={18} className="text-zinc-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-zinc-200 font-bold truncate">{message.file.name || 'Classified File'}</p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
                                {message.file.size ? (
                                  message.file.size < 1024 ? message.file.size + ' B'
                                  : message.file.size < 1024 * 1024 ? (message.file.size / 1024).toFixed(1) + ' KB'
                                  : (message.file.size / (1024 * 1024)).toFixed(1) + ' MB'
                                ) : 'Unknown size'}
                                {message.file.type ? ` • ${message.file.type.split('/').pop()}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = message.file.data;
                              link.download = message.file.name || `classified_hc_file_${Date.now()}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="w-full bg-white/5 hover:bg-white hover:text-black text-zinc-400 py-2.5 text-[9px] uppercase tracking-widest border-t border-zinc-800/30 hover:border-white font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <LuDownload size={12} />
                            Download File
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Fallback for legacy format */}
                    {!message.content && !message.image && !message.file && !message.audio && typeof message === 'string' && (
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2">
                          Legacy Message
                        </p>
                        <p className="whitespace-pre-wrap break-words bg-black/30 p-3 border border-zinc-800/30 rounded-lg font-mono">
                          {message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsDecrypted(false);
                      setCountdown(0);
                    }}
                    className="flex-1 border border-zinc-800/40 text-zinc-500 py-3 uppercase text-[10px] font-bold tracking-[0.15em] hover:bg-white/5 hover:text-white transition-all rounded-xl active:scale-[0.98]"
                  >
                    Lock Now
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 py-3 uppercase text-[10px] font-bold tracking-[0.15em] transition-all rounded-xl active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {!isDecrypted && (
              <div className="mt-5 pt-4 border-t border-zinc-800/30">
                <button
                  onClick={onClose}
                  className="w-full border border-zinc-800/40 text-zinc-500 py-2.5 uppercase text-[10px] font-bold tracking-[0.15em] hover:bg-white/5 hover:text-white transition-all rounded-xl active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Fullscreen Image Preview */}
        <AnimatePresence>
          {imagePreviewOpen && message?.image && (
            <motion.div
              key="hc-image-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl"
              onClick={() => setImagePreviewOpen(false)}
            >
              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); setImagePreviewOpen(false); }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2 sm:p-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <LuX size={20} />
              </button>

              {/* Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-3 overflow-auto max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] p-2 sm:p-4 md:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={imageObjectUrl || message.image}
                  alt="Full preview"
                  className="rounded-xl border border-zinc-700/30 shadow-2xl shadow-black/60"
                />
                {/* Download */}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = imageObjectUrl || message.image;
                    link.download = `classified_hc_image_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-white/10 hover:bg-white hover:text-black border border-zinc-700/30 hover:border-white text-white px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 rounded-lg active:scale-95"
                >
                  <LuDownload size={12} />
                  Download
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricVault;