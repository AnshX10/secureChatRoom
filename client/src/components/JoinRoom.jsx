import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuRocket, LuLogIn, LuArrowLeft, LuKeyRound, LuUser, LuScanLine, LuShieldCheck, LuZap, LuCopy, LuLink, LuEye, LuEyeOff } from 'react-icons/lu';
import Logo from './Logo';
import { decryptMagicLinkPayload, encryptMagicLinkPayload } from '../utils/magicLink';

const MIN_ENCRYPTION_KEY_LENGTH = 6;
const MAX_ENCRYPTION_KEY_LENGTH = 64;
const MIN_ROOM_CAPACITY = 2;
const MAX_ROOM_CAPACITY = 50;
const DEFAULT_ROOM_CAPACITY = 50;
const ROOM_ID_BOX_COUNT = 8;

const JoinRoom = ({ joinRoom, createRoom, terminateRoom, isCreatingRoom, isWaitingForFirstAgent, roomId, hostRoomPassword, errorMessage, setErrorMessage, clearError, isWaitingApproval }) => {
  const [view, setView] = useState("menu");
  const [username, setUsername] = useState("");
  const [sharedRoomId, setSharedRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [roomCapacity, setRoomCapacity] = useState(DEFAULT_ROOM_CAPACITY);
  const [magicLinkUrl, setMagicLinkUrl] = useState(""); // Store generated magic link
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);

  // Parse URL hash for Magic Invite Link (encrypted payload)
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const invitePayload = hashParams.get('invite') || queryParams.get('invite');

    if (invitePayload) {
      const data = decryptMagicLinkPayload(invitePayload);
      if (data) {
        setSharedRoomId(data.room.toUpperCase());
        setRoomPassword(data.key);
        setIsMagicLink(true);
        setView("join");

        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Update local state when waiting for first agent
  useEffect(() => {
    if (isWaitingForFirstAgent) {
      setSharedRoomId(roomId || "");
      setView("waiting");

      // Generate magic link with room ID and password
      const passwordForInvite = roomPassword || hostRoomPassword;
      if (roomId && passwordForInvite) {
        const encrypted = encryptMagicLinkPayload(roomId, passwordForInvite);
        const magicUrl = `${window.location.origin}/chatroom#invite=${encrypted}`;
        setMagicLinkUrl(magicUrl);
      }
    }
  }, [isWaitingForFirstAgent, roomId, roomPassword, hostRoomPassword]);

  const handleBackToMenu = () => {
    clearError?.();
    setUsername("");
    setSharedRoomId("");
    setRoomPassword("");
    setRoomName("");
    setRequireApproval(false);
    setRoomCapacity(DEFAULT_ROOM_CAPACITY);
    setMagicLinkUrl("");
    setShowEncryptionKey(false);
    setIsMagicLink(false);
    setView("menu");
  };

  useEffect(() => {
    if (!isWaitingForFirstAgent && view === "waiting") {
      handleBackToMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaitingForFirstAgent, view]);

  const validateEncryptionKey = (key) => {
    const len = (key || "").length;
    if (len < MIN_ENCRYPTION_KEY_LENGTH || len > MAX_ENCRYPTION_KEY_LENGTH) {
      setErrorMessage?.(`Encryption key must be between ${MIN_ENCRYPTION_KEY_LENGTH} and ${MAX_ENCRYPTION_KEY_LENGTH} characters.`);
      return false;
    }
    return true;
  };

  const handleJoin = () => {
    if (!username || !sharedRoomId || !roomPassword) return;
    if (!validateEncryptionKey(roomPassword)) return;
    joinRoom(username, sharedRoomId, roomPassword);
  };

  const handleCreate = () => {
    if (!username || !roomPassword || !roomName) return;
    if (!validateEncryptionKey(roomPassword)) return;
    const normalizedCapacity = Math.max(
      MIN_ROOM_CAPACITY,
      Math.min(MAX_ROOM_CAPACITY, parseInt(roomCapacity, 10) || DEFAULT_ROOM_CAPACITY),
    );
    createRoom(username, roomPassword, roomName, requireApproval, normalizedCapacity);
  };

  const variants = {
    initial: { opacity: 0, x: 20, filter: "blur(10px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -20, filter: "blur(10px)" },
  };

  const roomIdDisplay = (sharedRoomId || "").toUpperCase().slice(0, ROOM_ID_BOX_COUNT);

  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [copiedMagicLink, setCopiedMagicLink] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(sharedRoomId);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
  };

  const copyMagicLink = () => {
    navigator.clipboard.writeText(magicLinkUrl);
    setCopiedMagicLink(true);
    setTimeout(() => setCopiedMagicLink(false), 2000);
  };

  const isWaiting = view === "waiting";

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-zinc-700 selection:text-white">

      {/* Background Grid Noise */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className={`text-center ${isWaiting ? "mb-6" : "mb-8 sm:mb-12"}`}>
          <div className={`flex justify-center ${isWaiting ? "mb-3" : "mb-3 sm:mb-4"}`}>
            <div className="p-3 bg-white/5 rounded-2xl border border-zinc-700/20">
              <Logo variant="shield" className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">GHOST TUNNEL</span>
          </h1>
          {!isWaiting && (
            <p className="text-zinc-600 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.35em] font-medium">End-to-End Encrypted Signal</p>
          )}
          {isWaiting && (
            <p className="text-zinc-500 text-xs tracking-widest uppercase">End-to-End Encrypted</p>
          )}
        </div>

        <div className="bg-[#0f0f11] border border-zinc-800/40 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.6)] relative overflow-hidden p-5 sm:p-7 md:p-8">
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
              </motion.div>
            )}

            {/* === CREATE === */}
            {view === "create" && (
              <motion.div key="create" variants={variants} initial="initial" animate="animate" exit="exit" className="relative z-10">
                <div className="flex items-center gap-3 sm:gap-3.5 mb-6 sm:mb-8">
                  <button onClick={handleBackToMenu} disabled={isCreatingRoom} className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"><LuArrowLeft size={20} /></button>
                  <h2 className="text-base sm:text-lg font-bold uppercase tracking-[0.15em]">Init Host</h2>
                </div>

                <div className="space-y-5">
                  <div className={`bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${isCreatingRoom ? 'opacity-50 pointer-events-none' : 'focus-within:border-zinc-600'}`}>
                    <LuUser className="text-zinc-600 shrink-0" size={16} />
                    <input type="text" placeholder="CODENAME" className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm" onChange={(e) => setUsername(e.target.value)} disabled={isCreatingRoom} />
                  </div>

                  <div className={`bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${isCreatingRoom ? 'opacity-50 pointer-events-none' : 'focus-within:border-zinc-600'}`}>
                    <LuZap className="text-zinc-600 shrink-0" size={16} />
                    <input type="text" placeholder="ROOM NAME" className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase text-sm" onChange={(e) => setRoomName(e.target.value)} maxLength={32} disabled={isCreatingRoom} />
                  </div>

                  <div className={`bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${isCreatingRoom ? 'opacity-50 pointer-events-none' : 'focus-within:border-zinc-600'}`}>
                    <LuKeyRound className="text-zinc-600 shrink-0" size={16} />
                    <input type={showEncryptionKey ? "text" : "password"} placeholder={`ENCRYPTION KEY (${MIN_ENCRYPTION_KEY_LENGTH}-${MAX_ENCRYPTION_KEY_LENGTH} chars)`} className="bg-transparent w-full outline-none placeholder:text-zinc-700 text-sm font-mono" onChange={(e) => setRoomPassword(e.target.value)} maxLength={MAX_ENCRYPTION_KEY_LENGTH} disabled={isCreatingRoom} />
                    <button type="button" onClick={() => setShowEncryptionKey(!showEncryptionKey)} className="text-zinc-500 hover:text-white transition-colors p-1" tabIndex="-1">
                      {showEncryptionKey ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                    </button>
                  </div>

                  <div className={`bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${isCreatingRoom ? 'opacity-50 pointer-events-none' : 'focus-within:border-zinc-600'}`}>
                    <LuUser className="text-zinc-600 shrink-0" size={16} />
                    <input
                      type="number"
                      min={MIN_ROOM_CAPACITY}
                      max={MAX_ROOM_CAPACITY}
                      placeholder="ROOM CAPACITY"
                      className="bg-transparent w-full outline-none placeholder:text-zinc-700 text-sm"
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(e.target.value)}
                      disabled={isCreatingRoom}
                    />
                    <span className="text-[9px] uppercase tracking-wider text-zinc-600">
                      max {MAX_ROOM_CAPACITY}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between gap-3 pt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400 ${isCreatingRoom ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium">Require Host Approval</span>
                      <span className="text-[8px] text-zinc-600 normal-case tracking-normal">New agents must be accepted by you</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireApproval((v) => !v)}
                      disabled={isCreatingRoom}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${requireApproval
                        ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                        : "bg-zinc-800 border border-zinc-700/50"
                        }`}
                    >
                      <span
                        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-black transition-transform duration-200 shadow-sm ${requireApproval ? "translate-x-[22px]" : "translate-x-[3px]"
                          }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isCreatingRoom || !username || !roomName || roomPassword.length < MIN_ENCRYPTION_KEY_LENGTH}
                    className={`w-full mt-5 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 font-bold py-4 uppercase tracking-[0.15em] text-sm rounded-xl transition-all active:scale-[0.98] ${(isCreatingRoom || !username || !roomName || roomPassword.length < MIN_ENCRYPTION_KEY_LENGTH)
                      ? "opacity-50 cursor-not-allowed"
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
                    onClick={handleBackToMenu}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
                  >
                    <LuArrowLeft size={20} />
                  </button>
                  <h2 className="text-lg font-bold uppercase tracking-[0.15em]">
                    {isMagicLink ? "Magic Link" : "Uplink"}
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
                      <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
                          <LuScanLine className="text-zinc-600 shrink-0" size={14} /> ROOM ID
                        </p>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={ROOM_ID_BOX_COUNT}
                            onChange={(e) => setSharedRoomId(e.target.value.toUpperCase())}
                            value={sharedRoomId}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                            aria-label="Room ID"
                          />
                          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                            {Array.from({ length: ROOM_ID_BOX_COUNT }).map((_, index) => {
                              const char = roomIdDisplay[index] || "";
                              return (
                                <div
                                  key={`join-room-id-box-${index}`}
                                  className="h-10 w-9 sm:h-11 sm:w-10 rounded-lg border border-zinc-700/60 bg-black/45 flex items-center justify-center text-[15px] sm:text-base font-black tracking-widest font-mono text-zinc-100"
                                >
                                  {char || "•"}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-zinc-600 transition-colors">
                        <LuKeyRound className="text-zinc-600 shrink-0" size={16} />
                        <input
                          type={showEncryptionKey ? "text" : "password"}
                          placeholder={`ENCRYPTION KEY (${MIN_ENCRYPTION_KEY_LENGTH}-${MAX_ENCRYPTION_KEY_LENGTH} chars)`}
                          className="bg-transparent w-full outline-none placeholder:text-zinc-700 text-sm font-mono"
                          onChange={(e) => setRoomPassword(e.target.value)}
                          value={roomPassword}
                          maxLength={MAX_ENCRYPTION_KEY_LENGTH}
                        />
                        <button type="button" onClick={() => setShowEncryptionKey(!showEncryptionKey)} className="text-zinc-500 hover:text-white transition-colors p-1" tabIndex="-1">
                          {showEncryptionKey ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                        </button>
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
                    disabled={isWaitingApproval || !username || (!isMagicLink && (!sharedRoomId || !roomPassword))}
                  >
                    {isWaitingApproval ? "Waiting For Host..." : "Connect"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* === WAITING FOR AGENTS === */}
            {view === "waiting" && (
              <motion.div key="waiting" variants={variants} initial="initial" animate="animate" exit="exit" className="relative z-10 space-y-5">

                {/* Status row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Room is live</h2>
                    <p className="text-zinc-500 text-sm mt-0.5">Waiting for agents to join</p>
                  </div>
                  <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }} />
                    <span className="absolute inline-flex h-7 w-7 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                  </div>
                </div>

                <div className="h-px bg-zinc-800/60" />

                {/* Room ID card */}
                <button
                  onClick={copyRoomId}
                  className="w-full text-left group bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-zinc-700 rounded-2xl p-4 transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <LuScanLine size={13} className="text-zinc-400" />
                      </div>
                      <span className="text-sm font-semibold text-white tracking-wide">Room ID</span>
                    </div>
                    <span className={`text-xs flex items-center gap-1.5 transition-colors ${copiedRoomId ? "text-green-400" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                      <LuCopy size={11} />
                      {copiedRoomId ? "Copied!" : "Click to copy"}
                    </span>
                  </div>

                  <div className="grid grid-cols-8 gap-2 mb-3">
                    {Array.from({ length: ROOM_ID_BOX_COUNT }).map((_, index) => {
                      const char = roomIdDisplay[index] || "";
                      return (
                        <div
                          key={`waiting-room-id-box-${index}`}
                          className="h-10 rounded-xl border border-zinc-700/60 bg-black/50 flex items-center justify-center text-base font-black font-mono text-white"
                        >
                          {char || <span className="text-zinc-700">·</span>}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Share this code with agents. They'll also need the encryption key you set when creating the room.
                  </p>
                </button>

                {/* Magic Link card */}
                {magicLinkUrl && (
                  <button
                    onClick={copyMagicLink}
                    className="w-full text-left group bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-zinc-700 rounded-2xl p-4 transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-800 rounded-lg">
                          <LuLink size={13} className="text-zinc-400" />
                        </div>
                        <span className="text-sm font-semibold text-white tracking-wide">Magic Link</span>
                      </div>
                      <span className={`text-xs flex items-center gap-1.5 transition-colors ${copiedMagicLink ? "text-green-400" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                        <LuCopy size={11} />
                        {copiedMagicLink ? "Copied!" : "Click to copy"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      One-tap invite link — bundles the room ID and encryption key together. No manual entry needed on the agent's side.
                    </p>
                  </button>
                )}

                {/* Footer note */}
                <p className="text-center text-xs text-zinc-600">
                  The room activates as soon as the first agent joins.
                </p>

                {/* Terminate */}
                <button
                  onClick={() => {
                    if (terminateRoom) terminateRoom();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-900/30 bg-red-950/20 text-red-500 text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                >
                  Terminate Room
                </button>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;