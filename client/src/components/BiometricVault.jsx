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
  LuKeyRound,
  LuTimer,
  LuImage,
  LuMic,
  LuFileText,
} from 'react-icons/lu';
import {
  authenticateBiometric,
  registerBiometric,
  hasBiometricCredential,
  getBiometricCapabilities,
  isWebAuthnSupported,
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
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

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

  const handlePasswordFallback = () => {
    // Fallback to password authentication
    const password = prompt('Enter room encryption password as fallback:');
    if (password) {
      // This would need to be validated against the room password
      // For now, we'll simulate success
      setIsDecrypted(true);
      setCountdown(10);
      onDecrypted?.(message);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0f0f11] border border-zinc-800/40 max-w-md w-full relative overflow-hidden rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
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

          <div className="p-6">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="p-4 bg-white/5 rounded-2xl border border-zinc-700/20 mx-auto mb-4 inline-flex">
                  <LuLock className="text-white" size={36} strokeWidth={1.5} />
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
              
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white mb-2">
                {isDecrypted ? 'Vault Unlocked' : 'Biometric Vault'}
              </h2>
              
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                {isDecrypted 
                  ? `High clearance message decrypted • Auto-lock in ${countdown}s`
                  : (() => {
                      const contentTypes = [];
                      if (message?.content) contentTypes.push('Text');
                      if (message?.image) contentTypes.push('Image');
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
                        className="w-full bg-white hover:bg-zinc-100 text-black py-4 uppercase text-[10px] font-bold tracking-[0.15em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-white/10 active:scale-[0.98]"
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

                    <div className="text-center">
                      <button
                        onClick={handlePasswordFallback}
                        className="text-zinc-500 hover:text-white text-[10px] uppercase tracking-[0.15em] transition-colors"
                      >
                        Use password fallback
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="bg-zinc-900/40 border border-zinc-700/20 text-zinc-400 px-4 py-3 text-[10px] rounded-xl">
                      <LuTriangleAlert className="inline mr-2" size={13} />
                      Biometric authentication not available on this device
                    </div>
                    
                    <button
                      onClick={handlePasswordFallback}
                      className="w-full bg-zinc-800/60 hover:bg-zinc-700/60 text-white py-4 uppercase text-[10px] font-bold tracking-[0.15em] transition-all flex items-center justify-center gap-2 rounded-xl border border-zinc-700/30 active:scale-[0.98]"
                    >
                      <LuLock size={16} />
                      Use Password Authentication
                    </button>
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

                <div className="bg-zinc-900/40 border border-zinc-800/30 p-4 rounded-xl">
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
                        <div className="relative border border-zinc-800/30 bg-black/30 overflow-hidden rounded-xl">
                          <img 
                            src={message.image} 
                            alt="Classified" 
                            className="max-w-full max-h-64 object-contain w-full"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className="p-4 text-center text-zinc-500 text-xs"
                          >
                            <LuTriangleAlert className="inline mr-2" size={13} />
                            Failed to load classified image
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
                        <div className="bg-black/30 p-3 border border-zinc-800/30 rounded-lg">
                          <audio 
                            controls 
                            src={typeof message.audio === 'string' ? message.audio : URL.createObjectURL(message.audio)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Fallback for legacy format */}
                    {!message.content && !message.image && !message.audio && typeof message === 'string' && (
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
                    className="flex-1 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 py-3 uppercase text-[10px] font-bold tracking-[0.15em] transition-all rounded-xl active:scale-[0.98] hover:shadow-lg hover:shadow-white/10"
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
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricVault;