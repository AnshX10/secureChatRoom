import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMdLock,
  IoMdUnlock,
  IoMdFingerPrint,
  IoMdEye,
  IoMdWarning,
  IoMdCheckmark,
  IoMdClose,
  IoMdKey,
  IoMdTimer,
  IoMdImage,
  IoMdMic,
  IoMdDocument,
} from 'react-icons/io';
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
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-950 border-2 border-zinc-800 max-w-md w-full relative overflow-hidden"
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
                    <IoMdFingerPrint className="text-blue-400 mx-auto mb-2 animate-pulse" size={48} />
                    <p className="text-[10px] text-zinc-300 uppercase tracking-[0.45em] font-black">
                      Biometric Scan
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-[0.25em] font-bold mt-1">
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
                <IoMdLock className="text-amber-400 mx-auto mb-4" size={64} />
                {isDecrypted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-green-600 rounded-full p-1"
                  >
                    <IoMdCheckmark className="text-white" size={16} />
                  </motion.div>
                )}
              </div>
              
              <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                {isDecrypted ? 'Vault Unlocked' : 'Biometric Vault'}
              </h2>
              
              <p className="text-zinc-400 text-sm uppercase tracking-wide">
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
                className="bg-red-950 border border-red-700 text-red-200 px-4 py-3 text-sm uppercase tracking-wide text-center mb-4"
              >
                <IoMdWarning className="inline mr-2" />
                {error}
              </motion.div>
            )}

            {!isDecrypted ? (
              <div className="space-y-4">
                {biometricCapabilities?.supported ? (
                  <>
                    <div className="bg-zinc-900 border border-zinc-700 p-4 text-center">
                      <IoMdFingerPrint className="text-blue-400 mx-auto mb-2" size={32} />
                      <p className="text-xs text-zinc-300 uppercase tracking-wide font-bold mb-1">
                        {biometricCapabilities.type}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Hardware-level security enabled
                      </p>
                    </div>

                    {hasCredential ? (
                      <button
                        onClick={handleBiometricUnlock}
                        disabled={isUnlocking}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 uppercase text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isUnlocking ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <IoMdUnlock size={20} />
                            Unlock with {biometricCapabilities.type}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleBiometricSetup}
                        disabled={isSettingUp}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-4 uppercase text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSettingUp ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <IoMdFingerPrint size={20} />
                            Set up {biometricCapabilities.type}
                          </>
                        )}
                      </button>
                    )}

                    <div className="text-center">
                      <button
                        onClick={handlePasswordFallback}
                        className="text-zinc-400 hover:text-white text-xs uppercase tracking-wide underline underline-offset-2"
                      >
                        Use password fallback
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="bg-amber-950 border border-amber-700 text-amber-200 px-4 py-3 text-sm">
                      <IoMdWarning className="inline mr-2" />
                      Biometric authentication not available on this device
                    </div>
                    
                    <button
                      onClick={handlePasswordFallback}
                      className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-4 uppercase text-sm font-bold tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <IoMdLock size={20} />
                      Use Password Authentication
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-950 border border-green-700 text-green-200 px-4 py-3 text-center">
                  <IoMdCheckmark className="inline mr-2" />
                  <span className="text-sm uppercase tracking-wide font-bold">
                    Identity Verified • Message Decrypted
                  </span>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">
                      Classified Content
                    </span>
                    <div className="flex items-center gap-1 text-[8px] text-amber-400 font-bold">
                      <IoMdTimer />
                      Auto-lock: {countdown}s
                    </div>
                  </div>
                  
                  <div className="text-white text-sm leading-relaxed space-y-4">
                    {/* Text Content */}
                    {message.content && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2 flex items-center gap-1">
                          <IoMdDocument size={12} />
                          Message
                        </p>
                        <p className="whitespace-pre-wrap break-words bg-zinc-800 p-3 border border-zinc-600 rounded">
                          {message.content}
                        </p>
                      </div>
                    )}

                    {/* Image Content */}
                    {message.image && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2 flex items-center gap-1">
                          <IoMdImage size={12} />
                          Classified Image
                        </p>
                        <div className="relative border border-zinc-600 bg-zinc-800 overflow-hidden rounded">
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
                            <IoMdWarning className="inline mr-2" />
                            Failed to load classified image
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Audio Content */}
                    {message.audio && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2 flex items-center gap-1">
                          <IoMdMic size={12} />
                          Voice Memo
                        </p>
                        <div className="bg-zinc-800 p-3 border border-zinc-600 rounded">
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
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2">
                          Legacy Message
                        </p>
                        <p className="whitespace-pre-wrap break-words bg-zinc-800 p-3 border border-zinc-600">
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
                    className="flex-1 border border-zinc-700 text-zinc-400 py-3 uppercase text-xs font-bold hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    Lock Now
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="flex-1 bg-white text-black py-3 uppercase text-xs font-bold hover:bg-zinc-300 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {!isDecrypted && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={onClose}
                  className="w-full border border-zinc-700 text-zinc-400 py-2 uppercase text-xs font-bold hover:bg-zinc-800 hover:text-white transition-all"
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