import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IoMdLock,
  IoMdFingerPrint,
  IoMdCheckmark,
  IoMdWarning,
  IoMdEye,
} from 'react-icons/io';
import {
  getBiometricCapabilities,
  registerBiometric,
  authenticateBiometric,
  hasBiometricCredential,
  isWebAuthnSupported,
} from '../utils/webauthn';

const BiometricDemo = () => {
  const [capabilities, setCapabilities] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [demoMessage, setDemoMessage] = useState('');

  const demoUsername = 'demo_user';
  const demoRoomId = 'demo_room_123';

  useEffect(() => {
    const checkCapabilities = async () => {
      const caps = await getBiometricCapabilities();
      setCapabilities(caps);
      setHasCredential(hasBiometricCredential(demoUsername, demoRoomId));
    };
    
    checkCapabilities();
  }, []);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError('');
    
    try {
      await registerBiometric(demoUsername, demoRoomId);
      setHasCredential(true);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError('');
    
    try {
      const success = await authenticateBiometric(demoUsername, demoRoomId);
      if (success) {
        setIsAuthenticated(true);
        setDemoMessage('🔓 CLASSIFIED: This is a high-clearance message that required biometric authentication to view. Your identity has been verified using hardware-level security.');
        
        // Auto-lock after 10 seconds
        setTimeout(() => {
          setIsAuthenticated(false);
          setDemoMessage('');
        }, 10000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                // Clean URL and trigger route change without reload
                window.history.replaceState(null, '', window.location.pathname);
                // Trigger hashchange event to update route
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className="px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition text-sm uppercase tracking-wide"
            >
              ← Back to Chat
            </button>
            <div></div>
          </div>
          
          <IoMdLock className="text-amber-400 mx-auto mb-4" size={80} />
          <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-4">
            Biometric Intel Demo
          </h1>
          <p className="text-zinc-400 text-lg uppercase tracking-wide">
            WebAuthn Hardware-Level Security for High-Clearance Messages
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Capabilities Panel */}
          <div className="border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <IoMdFingerPrint /> System Capabilities
            </h2>
            
            {capabilities ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700">
                  <span className="text-sm text-zinc-300">WebAuthn Support</span>
                  <div className="flex items-center gap-2">
                    {capabilities.supported ? (
                      <IoMdCheckmark className="text-green-400" />
                    ) : (
                      <IoMdWarning className="text-red-400" />
                    )}
                    <span className={capabilities.supported ? 'text-green-400' : 'text-red-400'}>
                      {capabilities.supported ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700">
                  <span className="text-sm text-zinc-300">Platform Authenticator</span>
                  <div className="flex items-center gap-2">
                    {capabilities.available ? (
                      <IoMdCheckmark className="text-green-400" />
                    ) : (
                      <IoMdWarning className="text-amber-400" />
                    )}
                    <span className={capabilities.available ? 'text-green-400' : 'text-amber-400'}>
                      {capabilities.available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700">
                  <span className="text-sm text-zinc-300">Biometric Type</span>
                  <span className="text-blue-400 font-bold">
                    {capabilities.type}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700">
                  <span className="text-sm text-zinc-300">Credential Status</span>
                  <div className="flex items-center gap-2">
                    {hasCredential ? (
                      <IoMdCheckmark className="text-green-400" />
                    ) : (
                      <IoMdLock className="text-zinc-500" />
                    )}
                    <span className={hasCredential ? 'text-green-400' : 'text-zinc-500'}>
                      {hasCredential ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-8">
                Loading capabilities...
              </div>
            )}
          </div>

          {/* Demo Panel */}
          <div className="border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <IoMdLock /> Security Demo
            </h2>

            {error && (
              <div className="bg-red-950 border border-red-700 text-red-200 px-4 py-3 text-sm mb-4">
                <IoMdWarning className="inline mr-2" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!capabilities?.supported ? (
                <div className="text-center py-8">
                  <IoMdWarning className="text-amber-400 mx-auto mb-4" size={48} />
                  <p className="text-amber-400 text-sm uppercase tracking-wide">
                    WebAuthn not supported on this device
                  </p>
                </div>
              ) : !capabilities?.available ? (
                <div className="text-center py-8">
                  <IoMdWarning className="text-amber-400 mx-auto mb-4" size={48} />
                  <p className="text-amber-400 text-sm uppercase tracking-wide">
                    Platform authenticator not available
                  </p>
                  <p className="text-zinc-500 text-xs mt-2">
                    Try on a device with Face ID, Touch ID, or Windows Hello
                  </p>
                </div>
              ) : !hasCredential ? (
                <div className="text-center">
                  <IoMdFingerPrint className="text-blue-400 mx-auto mb-4" size={64} />
                  <p className="text-zinc-300 text-sm mb-4 uppercase tracking-wide">
                    Set up biometric authentication to secure high-clearance messages
                  </p>
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 uppercase text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRegistering ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <IoMdFingerPrint size={20} />
                        Set up {capabilities.type}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center">
                      <div className="border-2 border-amber-600 bg-amber-950/20 p-6 mb-4">
                        <IoMdLock className="text-amber-400 mx-auto mb-2" size={48} />
                        <p className="text-amber-200 text-sm uppercase tracking-wide font-bold">
                          High Clearance Message
                        </p>
                        <p className="text-amber-400/80 text-xs mt-1">
                          Biometric authentication required
                        </p>
                      </div>
                      
                      <button
                        onClick={handleAuthenticate}
                        disabled={isAuthenticating}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-black py-4 uppercase text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAuthenticating ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <IoMdEye size={20} />
                            Unlock with {capabilities.type}
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border-2 border-green-600 bg-green-950/20 p-6"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <IoMdCheckmark className="text-green-400" size={24} />
                        <span className="text-green-200 font-bold uppercase tracking-wide">
                          Identity Verified
                        </span>
                      </div>
                      
                      <div className="bg-zinc-900 border border-zinc-700 p-4 mb-4">
                        <p className="text-white text-sm leading-relaxed">
                          {demoMessage}
                        </p>
                      </div>
                      
                      <p className="text-green-400/80 text-xs text-center">
                        Message will auto-lock in a few seconds...
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Explanation */}
        <div className="mt-12 border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide text-center">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoMdFingerPrint className="text-white" size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase">
                Hardware Security
              </h3>
              <p className="text-zinc-400 text-sm">
                Uses your device's secure enclave (Face ID, Touch ID, Windows Hello) for authentication
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoMdLock className="text-black" size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase">
                AES-256 Encryption
              </h3>
              <p className="text-zinc-400 text-sm">
                High-clearance messages are encrypted with military-grade AES-256 encryption
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoMdLock className="text-white" size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase">
                Zero Trust
              </h3>
              <p className="text-zinc-400 text-sm">
                Even if your device is unlocked, biometric verification is required for sensitive content
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricDemo;