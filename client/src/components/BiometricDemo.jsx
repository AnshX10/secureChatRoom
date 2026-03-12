import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LuLock,
  LuFingerprint,
  LuCheck,
  LuTriangleAlert,
  LuEye,
  LuArrowLeft,
  LuShieldCheck,
  LuKeyRound,
} from 'react-icons/lu';
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
    <div className="min-h-screen bg-[#09090b] text-white font-sans p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                // Clean URL and trigger route change without reload
                window.history.replaceState(null, '', window.location.pathname);
                // Trigger hashchange event to update route
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              <LuArrowLeft size={16} /> Back to Chat
            </button>
            <div></div>
          </div>
          
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-5">
            <LuLock className="text-white" size={40} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Biometric Intel Demo
          </h1>
          <p className="text-zinc-500 text-base">
            WebAuthn Hardware-Level Security for High-Clearance Messages
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Capabilities Panel */}
          <div className="rounded-2xl border border-zinc-800/40 bg-[#0f0f11]/80 backdrop-blur-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2.5">
              <LuFingerprint className="text-white" size={20} /> System Capabilities
            </h2>
            
            {capabilities ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/30">
                  <span className="text-sm text-zinc-400">WebAuthn Support</span>
                  <div className="flex items-center gap-2">
                    {capabilities.supported ? (
                      <LuCheck className="text-white" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-red-400" size={16} />
                    )}
                    <span className={`text-sm font-medium ${capabilities.supported ? 'text-white' : 'text-red-400'}`}>
                      {capabilities.supported ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/30">
                  <span className="text-sm text-zinc-400">Platform Authenticator</span>
                  <div className="flex items-center gap-2">
                    {capabilities.available ? (
                      <LuCheck className="text-white" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-zinc-500" size={16} />
                    )}
                    <span className={`text-sm font-medium ${capabilities.available ? 'text-white' : 'text-zinc-500'}`}>
                      {capabilities.available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/30">
                  <span className="text-sm text-zinc-400">Biometric Type</span>
                  <span className="text-white font-semibold text-sm">
                    {capabilities.type}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/30">
                  <span className="text-sm text-zinc-400">Credential Status</span>
                  <div className="flex items-center gap-2">
                    {hasCredential ? (
                      <LuCheck className="text-white" size={16} />
                    ) : (
                      <LuLock className="text-zinc-500" size={16} />
                    )}
                    <span className={`text-sm font-medium ${hasCredential ? 'text-white' : 'text-zinc-500'}`}>
                      {hasCredential ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-white mx-auto mb-3" />
                Loading capabilities...
              </div>
            )}
          </div>

          {/* Demo Panel */}
          <div className="rounded-2xl border border-zinc-800/40 bg-[#0f0f11]/80 backdrop-blur-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2.5">
              <LuShieldCheck className="text-white" size={20} /> Security Demo
            </h2>

            {error && (
              <div className="rounded-xl bg-red-950/40 border border-red-800/30 text-red-300 px-4 py-3 text-sm mb-4 flex items-center gap-2">
                <LuTriangleAlert className="shrink-0" size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!capabilities?.supported ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800/40 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                    <LuTriangleAlert className="text-zinc-400" size={28} />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">
                    WebAuthn not supported on this device
                  </p>
                </div>
              ) : !capabilities?.available ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800/40 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                    <LuTriangleAlert className="text-zinc-400" size={28} />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">
                    Platform authenticator not available
                  </p>
                  <p className="text-zinc-500 text-xs mt-2">
                    Try on a device with Face ID, Touch ID, or Windows Hello
                  </p>
                </div>
              ) : !hasCredential ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                    <LuFingerprint className="text-white" size={32} />
                  </div>
                  <p className="text-zinc-400 text-sm mb-5">
                    Set up biometric authentication to secure high-clearance messages
                  </p>
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="w-full bg-white hover:bg-zinc-100 text-black py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                  >
                    {isRegistering ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <LuFingerprint size={18} />
                        Set up {capabilities.type}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center">
                      <div className="rounded-xl border border-zinc-700/20 bg-zinc-900/40 p-6 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-3">
                          <LuLock className="text-white" size={24} />
                        </div>
                        <p className="text-white text-sm font-semibold">
                          High Clearance Message
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">
                          Biometric authentication required
                        </p>
                      </div>
                      
                      <button
                        onClick={handleAuthenticate}
                        disabled={isAuthenticating}
                        className="w-full bg-white hover:bg-zinc-100 text-black py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                      >
                        {isAuthenticating ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <LuEye size={18} />
                            Unlock with {capabilities.type}
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-zinc-700/20 bg-white/5 p-6"
                    >
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <LuCheck className="text-white" size={18} />
                        </div>
                        <span className="text-white font-semibold">
                          Identity Verified
                        </span>
                      </div>
                      
                      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/30 p-4 mb-4">
                        <p className="text-white text-sm leading-relaxed font-mono">
                          {demoMessage}
                        </p>
                      </div>
                      
                      <p className="text-zinc-500 text-xs text-center">
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
        <div className="mt-12 rounded-2xl border border-zinc-800/40 bg-[#0f0f11]/80 backdrop-blur-xl p-8">
          <h2 className="text-xl font-semibold text-white mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/20">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                <LuFingerprint className="text-white" size={26} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Hardware Security
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Uses your device's secure enclave (Face ID, Touch ID, Windows Hello) for authentication
              </p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/20">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                <LuKeyRound className="text-white" size={26} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                AES-256 Encryption
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                High-clearance messages are encrypted with military-grade AES-256 encryption
              </p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/20">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-zinc-700/20 flex items-center justify-center mx-auto mb-4">
                <LuShieldCheck className="text-white" size={26} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Zero Trust
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
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