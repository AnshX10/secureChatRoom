import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuRocket, LuLogIn, LuArrowLeft, LuKeyRound, LuUser, LuScanLine, LuFingerprint, LuShieldCheck, LuZap } from 'react-icons/lu';
import Logo from './Logo';
import { decryptMagicLinkPayload } from '../utils/magicLink';

const MIN_ENCRYPTION_KEY_LENGTH = 6;
const MAX_ENCRYPTION_KEY_LENGTH = 64;

const JoinRoom = ({ joinRoom, createRoom, isCreatingRoom, errorMessage, setErrorMessage, clearError, isWaitingApproval }) => {
  const [view, setView] = useState("menu"); 
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  // Parse URL hash for Magic Invite Link (encrypted payload)
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove the #
    if (hash) {
      const params = new URLSearchParams(hash);
      const invitePayload = params.get('invite');
      
      if (invitePayload) {
        const data = decryptMagicLinkPayload(invitePayload);
        if (data) {
          // Auto-fill from decrypted magic link
          setRoomId(data.room.toUpperCase());
          setRoomPassword(data.key);
          setIsMagicLink(true);
          setView("join");
          
          // Clear hash from URL for security/privacy
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);

  const validateEncryptionKey = (key) => {
    const len = (key || "").length;
    if (len < MIN_ENCRYPTION_KEY_LENGTH || len > MAX_ENCRYPTION_KEY_LENGTH) {
      setErrorMessage?.(`Encryption key must be between ${MIN_ENCRYPTION_KEY_LENGTH} and ${MAX_ENCRYPTION_KEY_LENGTH} characters.`);
      return false;
    }
    return true;
  };

  const handleJoin = () => {
    if (!username || !roomId || !roomPassword) return;
    if (!validateEncryptionKey(roomPassword)) return;
    joinRoom(username, roomId, roomPassword);
  };

  const handleCreate = () => {
    if (!username || !roomPassword || !roomName) return;
    if (!validateEncryptionKey(roomPassword)) return;
    createRoom(username, roomPassword, roomName, requireApproval);
  };

  const variants = {
    initial: { opacity: 0, x: 20, filter: "blur(10px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -20, filter: "blur(10px)" },
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-zinc-700 selection:text-white">
      
      {/* Background Grid Noise */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-zinc-700/20">
              <Logo variant="shield" className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">CHATROOM</span>
          </h1>
          <p className="text-zinc-600 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.35em] font-medium">End-to-End Encrypted Signal</p>
        </div>

        <div className="bg-[#0f0f11] border border-zinc-800/40 p-5 sm:p-7 md:p-8 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.01]" />
          {/* Error banner – show at top for menu/create; join view shows error inline above Connect */}
          {errorMessage && view !== "join" && (
            <div className="mb-6 bg-red-950/50 border border-red-500/20 text-red-300 px-4 py-3 flex items-start justify-between gap-3 rounded-xl relative z-10">
              <p className="text-xs uppercase tracking-wider flex-1">{errorMessage}</p>
              <button
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-white shrink-0 uppercase text-[10px] tracking-wider font-bold"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            
            {/* === MAIN MENU === */}
            {view === "menu" && (
              <motion.div
                key="menu"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-3 relative z-10"
              >
                <button
                  onClick={() => { clearError?.(); setView("create"); }}
                  className="w-full group bg-gradient-to-r from-white to-zinc-100 text-zinc-900 p-4 sm:p-5 md:p-6 rounded-xl hover:shadow-lg hover:shadow-white/10 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <div className="text-left">
                    <span className="block font-bold text-base sm:text-lg tracking-wide">CREATE FREQUENCY</span>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Start a new host</span>
                  </div>
                  <div className="p-2 bg-zinc-900/10 rounded-xl">
                    <LuRocket className="text-xl text-zinc-700" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    clearError?.();
                    setIsMagicLink(false);
                    setView("join");
                  }}
                  className="w-full group bg-zinc-900/50 text-white border border-zinc-800/40 hover:border-zinc-700 p-4 sm:p-5 md:p-6 rounded-xl transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <div className="text-left">
                    <span className="block font-bold text-base sm:text-lg tracking-wide">JOIN FREQUENCY</span>
                    <span className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Connect to a room</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl">
                    <LuLogIn className="text-xl text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    window.location.hash = '#demo';
                  }}
                  className="w-full group bg-zinc-900/50 text-white border border-zinc-800/40 hover:border-zinc-700 p-4 sm:p-5 md:p-6 rounded-xl transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <div className="text-left">
                    <span className="block font-bold text-base sm:text-lg tracking-wide">BIOMETRIC DEMO</span>
                    <span className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Security test</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl">
                    <LuFingerprint className="text-xl text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                </button>
              </motion.div>
            )}

            {/* === CREATE === */}
            {view === "create" && (
              <motion.div key="create" variants={variants} initial="initial" animate="animate" exit="exit" className="relative z-10">
                <div className="flex items-center gap-3 sm:gap-3.5 mb-6 sm:mb-8">
                  <button onClick={() => { clearError?.(); setView("menu"); }} className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"><LuArrowLeft size={20} /></button>
                  <h2 className="text-base sm:text-lg font-bold uppercase tracking-[0.15em]">Init Host</h2>
                </div>

                <div className="space-y-5">
                  <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                    <LuUser className="text-zinc-600 shrink-0" size={16} />
                    <input type="text" placeholder="CODENAME" className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm" onChange={(e) => setUsername(e.target.value)} />
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                    <LuZap className="text-zinc-600 shrink-0" size={16} />
                    <input type="text" placeholder="ROOM NAME" className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm" onChange={(e) => setRoomName(e.target.value)} maxLength={32} />
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                    <LuKeyRound className="text-zinc-600 shrink-0" size={16} />
                    <input type="text" placeholder={`ENCRYPTION KEY (${MIN_ENCRYPTION_KEY_LENGTH}-${MAX_ENCRYPTION_KEY_LENGTH} chars)`} className="bg-transparent w-full outline-none placeholder:text-zinc-700 text-sm font-mono" onChange={(e) => setRoomPassword(e.target.value)} maxLength={MAX_ENCRYPTION_KEY_LENGTH} />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium">Require Host Approval</span>
                      <span className="text-[8px] text-zinc-600 normal-case tracking-normal">New agents must be accepted by you</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireApproval((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                        requireApproval
                          ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                          : "bg-zinc-800 border border-zinc-700/50"
                      }`}
                    >
                      <span
                        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-black transition-transform duration-200 shadow-sm ${
                          requireApproval ? "translate-x-[22px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isCreatingRoom}
                    className={`w-full mt-5 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 font-bold py-4 uppercase tracking-[0.15em] text-sm rounded-xl transition-all active:scale-[0.98] ${
                      isCreatingRoom
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:shadow-lg hover:shadow-white/10"
                    }`}
                  >
                    {isCreatingRoom ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Establishing Link...</span>
                      </div>
                    ) : (
                      "Establish Link"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* === JOIN === */}
            {view === "join" && (
              <motion.div key="join" variants={variants} initial="initial" animate="animate" exit="exit" className="relative z-10">
                <div className="flex items-center gap-3.5 mb-8">
                  <button 
                    onClick={() => {
                      clearError?.();
                      setIsMagicLink(false);
                      setRoomId("");
                      setRoomPassword("");
                      setView("menu");
                    }} 
                    className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
                  >
                    <LuArrowLeft size={20} />
                  </button>
                  <h2 className="text-lg font-bold uppercase tracking-[0.15em]">
                    {isMagicLink ? "Magic Link Detected" : "Uplink"}
                  </h2>
                </div>

                <div className="space-y-5">
                  {/* Magic Link Info Banner */}
                  {isMagicLink && (
                    <div className="bg-white/5 border border-zinc-700/20 p-4 mb-1 rounded-xl">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2">
                        <LuShieldCheck size={12} /> Room credentials pre-filled via magic link
                      </p>
                    </div>
                  )}

                  <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                    <LuUser className="text-zinc-600 shrink-0" size={16} />
                    <input 
                      type="text" 
                      placeholder="CODENAME" 
                      className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm" 
                      onChange={(e) => setUsername(e.target.value)}
                      value={username}
                      autoFocus={isMagicLink}
                    />
                  </div>

                  {/* Only show Room ID and Encryption Key if NOT from magic link */}
                  {!isMagicLink && (
                    <>
                      <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                        <LuScanLine className="text-zinc-600 shrink-0" size={16} />
                        <input 
                          type="text" 
                          placeholder="ROOM ID" 
                          className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm font-mono" 
                          maxLength={8} 
                          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                          value={roomId}
                        />
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                        <LuKeyRound className="text-zinc-600 shrink-0" size={16} />
                        <input 
                          type="text" 
                          placeholder={`ENCRYPTION KEY (${MIN_ENCRYPTION_KEY_LENGTH}-${MAX_ENCRYPTION_KEY_LENGTH} chars)`} 
                          className="bg-transparent w-full outline-none placeholder:text-zinc-700 text-sm font-mono" 
                          onChange={(e) => setRoomPassword(e.target.value)}
                          value={roomPassword}
                          maxLength={MAX_ENCRYPTION_KEY_LENGTH}
                        />
                      </div>
                    </>
                  )}

                  {/* Inline notice while waiting for host approval */}
                  {isWaitingApproval && (
                    <div className="bg-zinc-900/40 border border-zinc-800/30 px-4 py-3 text-[10px] text-zinc-400 uppercase tracking-[0.2em] text-center rounded-xl">
                      Wait — host must accept your join request. Keep this window open.
                    </div>
                  )}

                  {/* Error when joining */}
                  {errorMessage && view === "join" && (
                    <div className="bg-red-950/50 border border-red-500/20 text-red-300 px-4 py-3 flex items-start justify-between gap-3 rounded-xl">
                      <p className="text-xs uppercase tracking-wider flex-1">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={clearError}
                        className="text-red-400 hover:text-white shrink-0 uppercase text-[10px] tracking-wider font-bold"
                        aria-label="Dismiss"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleJoin} 
                    className="w-full mt-5 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 font-bold py-4 uppercase tracking-[0.15em] text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-white/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    disabled={isWaitingApproval || !username || (!isMagicLink && (!roomId || !roomPassword))}
                  >
                    {isWaitingApproval ? "Waiting For Host..." : "Connect"}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;