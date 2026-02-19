import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMdSend, IoMdPeople, IoMdLock, IoMdCopy,
  IoMdMore, IoMdTrash, IoMdCreate, IoMdClose, IoMdExit,
  IoMdTimer, IoMdPulse, IoMdRemoveCircle, IoMdTime, IoMdWarning, IoMdReturnLeft,
  IoMdStar, IoMdStarOutline, IoMdPin, IoMdStats, IoMdCheckmark
} from 'react-icons/io';
import Logo from './Logo';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// --- SUB-COMPONENT: Decrypting Text Effect (Glitchy HUD Style) ---
const DecryptingName = ({ name }) => {
  const [displayValue, setDisplayValue] = useState(name);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayValue(prev =>
        prev.split("").map((letter, index) => {
          if (index < iteration) return name[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      if (iteration >= name.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);
    return () => clearInterval(interval);
  }, [name]);
  return <span>{displayValue}</span>;
};

const ChatRoom = ({ socket, username, roomId, roomPassword, isHost, leaveRoom, createdAt, initialUsers }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [users, setUsers] = useState(initialUsers || []);
  const [showUsers, setShowUsers] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const [selfDestructTime, setSelfDestructTime] = useState(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");

  // --- NEW: Security State ---
  const [isSecurityBreach, setIsSecurityBreach] = useState(false);

  const typingTimeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimeoutRef = useRef(null);

  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

  // --- NEW: Local Star / Pin state (per room, per device) ---
  const [starredMessageIds, setStarredMessageIds] = useState(() => new Set());
  const [pinnedMessageId, setPinnedMessageId] = useState(null);

  // --- NEW: Poll UI state ---
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollAnswers, setPollAnswers] = useState(["", "", ""]);
  const [pollDurationMs, setPollDurationMs] = useState(60 * 60 * 1000); // 1 hour
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // --- NEW: Bulk select/delete state ---
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(() => new Set());

  const timerOptions = [
    { label: "OFF", value: 0 },
    { label: "10s", value: 10000 },
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
    { label: "10m", value: 600000 },
  ];

  // --- NEW: SCREENSHOT & SECURITY PROTECTION LOGIC ---
  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e) => e.preventDefault();

    // 2. Detect Keyboard Screenshots (PrintScreen, Ctrl+P, Mac Cmd+Shift)
    const handleKeyDown = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.shiftKey) // Mac Screenshot combo attempt
      ) {
        setIsSecurityBreach(true);
        // Clear clipboard content to prevent pasting the screenshot
        navigator.clipboard.writeText('CLASSIFIED DATA - SCREENSHOT ATTEMPT BLOCKED');

        // Keep black screen for 2s to ruin the screenshot timing
        setTimeout(() => setIsSecurityBreach(false), 2000);
      }
    };

    // 3. Blur Detection (Anti-Snipping Tool / Task Switcher)
    // When user clicks away (blur), screen goes black.
    const handleBlur = () => {
      setIsSecurityBreach(true);
    };

    const handleFocus = () => {
      setIsSecurityBreach(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const startReplying = (msg) => {
    setReplyingTo(msg);
    setEditingMessageId(null);
    setActiveMenuId(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Sync Initial Users
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  // Timer Logic
  useEffect(() => {
    if (!createdAt) return;
    const interval = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - createdAt) / 1000);
      const hrs = Math.floor(secondsPassed / 3600).toString().padStart(2, '0');
      const mins = Math.floor((secondsPassed % 3600) / 60).toString().padStart(2, '0');
      const secs = (secondsPassed % 60).toString().padStart(2, '0');
      setSessionDuration(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Encryption Logic
  const encrypt = (text) => CryptoJS.AES.encrypt(text, roomPassword).toString();
  const decrypt = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, roomPassword);
      return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ DECRYPT FAIL";
    } catch { return "🚫 ERROR"; }
  };

  const storageKeyStarred = `secureChatRoom:${roomId}:starredMessageIds`;
  const storageKeyPinned = `secureChatRoom:${roomId}:pinnedMessageId`;

  useEffect(() => {
    try {
      const rawStarred = JSON.parse(localStorage.getItem(storageKeyStarred) || "[]");
      setStarredMessageIds(new Set(Array.isArray(rawStarred) ? rawStarred : []));
      const rawPinned = localStorage.getItem(storageKeyPinned);
      setPinnedMessageId(rawPinned || null);
    } catch {
      setStarredMessageIds(new Set());
      setPinnedMessageId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyStarred, JSON.stringify(Array.from(starredMessageIds)));
    } catch { /* ignore */ }
  }, [storageKeyStarred, starredMessageIds]);

  useEffect(() => {
    try {
      if (pinnedMessageId) localStorage.setItem(storageKeyPinned, pinnedMessageId);
      else localStorage.removeItem(storageKeyPinned);
    } catch { /* ignore */ }
  }, [storageKeyPinned, pinnedMessageId]);

  const jumpToMessage = (messageId) => {
    if (!messageId) return;
    const el = messageRefs.current?.[messageId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightMessageId(messageId);

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightMessageId(null), 2600);
  };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const toggleStarMessage = (messageId) => {
    if (!messageId) return;
    setStarredMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
    setActiveMenuId(null);
  };

  const togglePinMessage = (messageId) => {
    if (!messageId) return;
    setPinnedMessageId((prev) => (prev === messageId ? null : messageId));
    setActiveMenuId(null);
  };

  const getReplyPreviewText = (msg) => {
    if (!msg) return "";
    if (msg.poll) return `[POLL] ${decrypt(msg.poll.question)}`;
    if (msg.system) return msg.message || "";
    return msg.message || "";
  };

  const formatTimeLeft = (expiresAt) => {
    if (!expiresAt) return "";
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) return "ended";
    const mins = Math.ceil(msLeft / (60 * 1000));
    if (mins < 60) return `${mins}m left`;
    const hrs = Math.ceil(mins / 60);
    if (hrs < 24) return `${hrs}h left`;
    const days = Math.ceil(hrs / 24);
    return `${days}d left`;
  };

  const togglePollModal = () => {
    if (editingMessageId) return;
    setShowPollModal((v) => !v);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  };

  const toggleSelectMode = () => {
    setShowTimerMenu(false);
    setShowPollModal(false);
    setActiveMenuId(null);
    setEditingMessageId(null);
    setCurrentMessage("");
    setReplyingTo(null);
    setIsSelectMode((v) => {
      if (v) setSelectedMessageIds(new Set());
      return !v;
    });
  };

  const toggleSelectMessage = (messageId) => {
    if (!messageId) return;
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  useEffect(() => {
    // Prune selections when list changes
    const present = new Set(messageList.map((m) => m?.id).filter(Boolean));
    setSelectedMessageIds((prev) => {
      const next = new Set([...prev].filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [messageList]);

  const resetPollDraft = () => {
    setPollQuestion("");
    setPollAnswers(["", "", ""]);
    setPollDurationMs(60 * 60 * 1000);
    setPollAllowMultiple(false);
  };

  const postPoll = async () => {
    const q = pollQuestion.trim();
    const answers = pollAnswers.map((a) => a.trim()).filter(Boolean);
    if (!q || answers.length < 2) return;

    const messageId = uuidv4();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    const poll = {
      question: encrypt(q),
      options: answers.map((text) => ({ id: uuidv4(), text: encrypt(text), votes: [] })),
      allowMultiple: !!pollAllowMultiple,
      createdAt: now,
      expiresAt: now + pollDurationMs
    };

    const messageData = {
      id: messageId,
      roomId,
      username,
      message: "",
      time,
      edited: false,
      deleted: false,
      timer: 0,
      replyTo: null,
      type: "poll",
      poll
    };

    await socket.emit("send_message", messageData);
    setMessageList((list) => [...list, { ...messageData, own: true }]);
    setShowPollModal(false);
    resetPollDraft();
  };

  const applyPollVoteUpdate = ({ messageId, optionId, action, username: voter }) => {
    if (!messageId || !optionId || !voter) return;
    setMessageList((list) => list.map((m) => {
      if (m?.id !== messageId || !m.poll || m.deleted) return m;
      const poll = m.poll;
      const isEnded = poll.expiresAt && poll.expiresAt <= Date.now();
      if (isEnded) return m;

      const nextOptions = (poll.options || []).map((opt) => {
        if (opt.id !== optionId) return opt;
        const existing = Array.isArray(opt.votes) ? opt.votes : [];
        const has = existing.includes(voter);
        if (action === "remove") return { ...opt, votes: existing.filter((u) => u !== voter) };
        if (!has) return { ...opt, votes: [...existing, voter] };
        return opt;
      });
      return { ...m, poll: { ...poll, options: nextOptions } };
    }));
  };

  const voteOnPoll = (msg, optionId) => {
    if (!msg?.poll || !optionId || msg.deleted) return;
    const poll = msg.poll;
    const isEnded = poll.expiresAt && poll.expiresAt <= Date.now();
    if (isEnded) return;

    const options = poll.options || [];
    const option = options.find((o) => o.id === optionId);
    if (!option) return;

    const myVotesForOption = Array.isArray(option.votes) ? option.votes.includes(username) : false;
    const action = myVotesForOption ? "remove" : "add";

    // If single-choice poll and we're adding, remove our vote from any other option first.
    if (!poll.allowMultiple && action === "add") {
      options.forEach((o) => {
        if (o.id !== optionId && Array.isArray(o.votes) && o.votes.includes(username)) {
          applyPollVoteUpdate({ messageId: msg.id, optionId: o.id, action: "remove", username });
          socket.emit("poll_vote", { roomId, messageId: msg.id, optionId: o.id, action: "remove", username });
        }
      });
    }

    applyPollVoteUpdate({ messageId: msg.id, optionId, action, username });
    socket.emit("poll_vote", { roomId, messageId: msg.id, optionId, action, username });
  };

  const clearMyPollVotes = (msg) => {
    if (!msg?.poll || msg.deleted) return;
    const options = msg.poll.options || [];
    options.forEach((o) => {
      if (Array.isArray(o.votes) && o.votes.includes(username)) {
        applyPollVoteUpdate({ messageId: msg.id, optionId: o.id, action: "remove", username });
        socket.emit("poll_vote", { roomId, messageId: msg.id, optionId: o.id, action: "remove", username });
      }
    });
  };

  const selectedMessages = messageList.filter((m) => m?.id && selectedMessageIds.has(m.id) && !m.system);
  const selectedCount = selectedMessages.length;
  const selectionAllOwn = selectedCount > 0 && selectedMessages.every((m) => !!m.own);
  const selectionHasOthers = selectedCount > 0 && selectedMessages.some((m) => !m.own);

  const bulkLocalDelete = () => {
    if (selectedCount === 0) return;
    setMessageList((list) => list.filter((m) => !selectedMessageIds.has(m?.id)));
    setSelectedMessageIds(new Set());
  };

  const bulkGlobalDelete = () => {
    if (selectedCount === 0) return;
    if (!selectionAllOwn) return; // rule: only your messages can be globally deleted in bulk
    selectedMessages.forEach((m) => {
      socket.emit("delete_message", { roomId, messageId: m.id });
    });
    setSelectedMessageIds(new Set());
  };

  // Typing & Input Logic
  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    if (!isLocalTyping) {
      setIsLocalTyping(true);
      socket.emit("typing_status", { roomId, username, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsLocalTyping(false);
      socket.emit("typing_status", { roomId, username, isTyping: false });
    }, 2000);
  };

  const kickAgent = (userId, agentName) => {
    if (window.confirm(`TERMINATE AGENT ${agentName.toUpperCase()}?`)) {
      socket.emit("kick_user", { roomId, userId });
    }
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setCurrentMessage(msg.message || "");
    setActiveMenuId(null);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;
    setIsLocalTyping(false);
    socket.emit("typing_status", { roomId, username, isTyping: false });

    if (editingMessageId) {
      const encrypted = encrypt(currentMessage);
      socket.emit("edit_message", { roomId, messageId: editingMessageId, newEncryptedMessage: encrypted });
      setMessageList((list) => list.map(msg => msg.id === editingMessageId ? { ...msg, message: currentMessage, edited: true } : msg));
      setEditingMessageId(null);
      setCurrentMessage("");
    } else {
      const messageId = uuidv4();
      const encrypted = encrypt(currentMessage);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Create reply metadata if replyingTo is active
      const replyData = replyingTo ? {
        messageId: replyingTo.id,
        username: replyingTo.username,
        message: encrypt(getReplyPreviewText(replyingTo)) // Encrypt quoted text (supports polls)
      } : null;

      const messageData = {
        id: messageId,
        roomId,
        username,
        message: encrypted,
        time,
        edited: false,
        deleted: false,
        timer: selfDestructTime,
        replyTo: replyData // <--- Add this
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, { ...messageData, message: currentMessage, own: true }]);
      setCurrentMessage("");
      setReplyingTo(null);
    }
  };

  // Socket Listeners
  useEffect(() => {
    socket.on("receive_message", (data) => {
      if (data.system) setMessageList((l) => [...l, data]);
      else if (data.type === "poll" || data.poll) setMessageList((l) => [...l, { ...data, own: false }]);
      else setMessageList((l) => [...l, { ...data, message: decrypt(data.message), own: false }]);
    });
    socket.on("poll_vote_update", (payload) => applyPollVoteUpdate(payload));
    socket.on("user_typing", ({ username: typingUser, isTyping }) => {
      setTypingUsers((prev) => isTyping ? [...new Set([...prev, typingUser])] : prev.filter((u) => u !== typingUser));
    });
    socket.on("message_deleted", (deletedId) => {
      setMessageList((list) => list.map((msg) => (
        msg.id === deletedId
          ? {
            ...msg,
            deleted: true,
            message: "[ DATA EXPUNGED ]",
            edited: false,
            // ensure special message types (e.g., polls) don't keep rendering
            poll: null,
            type: undefined,
            replyTo: null
          }
          : msg
      )));
    });
    socket.on("message_updated", ({ messageId, newEncryptedMessage }) => {
      setMessageList((list) => list.map((msg) => msg.id === messageId ? { ...msg, message: decrypt(newEncryptedMessage), edited: true } : msg));
    });
    socket.on("update_users", (userList) => setUsers(userList));
    socket.on("kicked", () => { leaveRoom(); });

    return () => {
      socket.off("receive_message"); socket.off("update_users"); socket.off("user_typing");
      socket.off("message_deleted"); socket.off("message_updated"); socket.off("kicked");
      socket.off("poll_vote_update");
    };
  }, [socket, roomPassword]);

  useEffect(() => {
    setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  }, [messageList, typingUsers]);

  useEffect(() => {
    const fn = () => { setActiveMenuId(null); setShowTimerMenu(false); };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full bg-black text-white font-mono selection:bg-white selection:text-black overflow-hidden relative">

      {/* --- NEW: SECURITY CSS INJECTION (Prevents Printing) --- */}
      <style>{`
        @media print { body { display: none !important; } }

        /* Highlight target message with a clean flash/glow */
        .highlight-flash {
          animation: highlight-flash 0.9s ease-out 0s 2;
          will-change: transform, box-shadow, filter;
        }
        @keyframes highlight-flash {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(251, 191, 36, 0);
            filter: brightness(1);
          }
          25% {
            transform: scale(1.01);
            box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.9), 0 0 22px rgba(251, 191, 36, 0.25);
            filter: brightness(1.08);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(251, 191, 36, 0);
            filter: brightness(1);
          }
        }
      `}</style>

      {/* --- NEW: SECURITY BREACH OVERLAY (The Black Screen) --- */}
      <AnimatePresence>
        {isSecurityBreach && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center select-none"
          >
            <div className="text-red-600 font-mono font-bold text-xl uppercase tracking-widest animate-pulse flex flex-col items-center gap-4 text-center p-6 border-2 border-red-900 bg-black">
              <IoMdWarning size={64} />
              <div>
                <h1 className="text-2xl mb-2">Security Protocol Engaged</h1>
                <p className="text-xs text-zinc-500">
                  Screenshot / Recording / Focus Loss Detected
                </p>
                <p className="text-[10px] text-zinc-700 mt-2">Display Obscured</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE BACKDROP */}
      <AnimatePresence>
        {showUsers && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowUsers(false)}
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <AnimatePresence>
        {(showUsers || window.innerWidth > 768) && (
          <motion.div
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:relative z-50 w-[85%] sm:w-72 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2 text-white">
                <IoMdLock /> CLASSIFIED
              </h2>
              <button onClick={() => setShowUsers(false)} className="md:hidden p-2 text-zinc-500 hover:text-white transition">
                <IoMdClose size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="border border-zinc-800 p-4 mb-6">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-[0.2em]">Operation ID</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold tracking-widest text-white">{roomId}</span>
                  <button onClick={() => { navigator.clipboard.writeText(roomId); }} className="p-2 hover:bg-white hover:text-black transition text-zinc-400"><IoMdCopy /></button>
                </div>
              </div>

              <h3 className="text-[10px] uppercase font-bold text-zinc-500 mb-4 tracking-widest">Agents Active ({users.length})</h3>

              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="flex items-center justify-between p-2 border border-zinc-800 bg-zinc-900 shadow-inner">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center font-bold text-xs text-white">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-xs uppercase tracking-wide truncate">
                        {username} <span className="text-zinc-600 ml-1">(YOU)</span>
                        {isHost && <span className="ml-2 text-[8px] px-1.5 py-0.5 border border-zinc-700 text-zinc-500 font-black tracking-widest leading-none shrink-0">HOST</span>}
                      </span>
                    </div>
                  </div>
                ) : (
                  users.map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-transparent hover:bg-zinc-900 group transition-colors">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 flex-shrink-0 flex items-center justify-center font-bold text-xs text-zinc-400">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="text-xs uppercase tracking-wide truncate flex items-center">
                          {user.username}
                          {user.username === username && <span className="text-zinc-600 ml-1 text-[10px] shrink-0">(YOU)</span>}
                          {user.isHost && <span className="ml-2 text-[8px] px-1.5 py-0.5 border border-zinc-700 text-zinc-500 font-black tracking-widest leading-none shrink-0">HOST</span>}
                        </span>
                      </div>
                      {isHost && user.id !== socket.id && (
                        <button onClick={() => kickAgent(user.id, user.username)} className="text-red-900 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                          <IoMdRemoveCircle size={20} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
              <button onClick={leaveRoom} className="w-full border border-zinc-800 text-zinc-500 py-3 uppercase text-xs font-bold hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                <IoMdExit size={16} /> ABORT MISSION
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">

        {/* HUD HEADER */}
        <header className="h-20 sm:h-24 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-30 bg-black flex-shrink-0 relative">
          <div className="flex items-center gap-3 min-w-0 z-10">
            <Logo variant="shield" className="w-8 h-8 sm:w-9 sm:h-9 text-white shrink-0" />
            <button onClick={() => setShowUsers(true)} className="md:hidden text-2xl text-zinc-500 hover:text-white transition p-2 -ml-2">
              <IoMdPeople />
            </button>
            <div className="hidden sm:block truncate">
              <h1 className="font-bold uppercase tracking-[0.2em] text-[13px] text-zinc-400 truncate">Secure Link Active</h1>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></span> ID: {roomId}
              </p>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-[0.4em] font-black mb-1 flex items-center gap-1">
                <IoMdTime className="text-zinc-500 animate-pulse" /> Mission Duration
              </span>
              <h1 className="text-lg sm:text-3xl font-black tracking-[0.1em] text-white leading-none font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] tabular-nums">
                {sessionDuration}
              </h1>
            </div>
          </div>

          <div className="z-10 min-w-[80px] flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectMode}
              className={`text-[8px] sm:text-[10px] border px-3 py-2 uppercase transition-all shrink-0 font-bold flex items-center gap-2 ${isSelectMode
                  ? "bg-white text-black border-white"
                  : "border-zinc-800 text-zinc-500 hover:bg-white hover:text-black hover:border-white"
                }`}
              title="Select multiple messages"
            >
              Select
            </button>
            {isHost ? (
              <button onClick={() => socket.emit("close_room", { roomId })} className="text-[8px] sm:text-[10px] border border-red-900/50 text-red-700 px-3 py-2 uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shrink-0 font-bold">Terminate</button>
            ) : null}
          </div>
        </header>

        {/* MESSAGES */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 sm:space-y-6 scrollbar-hide">
          {/* PINNED MESSAGE BAR */}
          {pinnedMessageId && (() => {
            const pinnedMsg = messageList.find((m) => m?.id === pinnedMessageId);
            if (!pinnedMsg) return null;
            const preview = pinnedMsg.deleted
              ? "[ DATA EXPUNGED ]"
              : pinnedMsg.system
                ? pinnedMsg.message
                : (pinnedMsg.message || "");
            const who = pinnedMsg.system ? "SYSTEM" : (pinnedMsg.username || "UNKNOWN");
            return (
              <div className="sticky top-0 z-20">
                <div className="mb-3 border border-zinc-800 bg-black/85 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.65)]">
                  <div className="px-3 py-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => jumpToMessage(pinnedMessageId)}
                      className="min-w-0 flex items-center gap-2 text-left hover:bg-white/5 transition px-2 py-1 -mx-2"
                      title="Jump to pinned message"
                    >
                      <IoMdPin className="text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-black text-zinc-500 truncate">
                          Pinned • {who}
                        </p>
                        <p className="text-[10px] text-zinc-300 truncate max-w-[80vw]">
                          {preview}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinnedMessageId(null)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition border border-zinc-800"
                      title="Unpin"
                    >
                      <IoMdClose size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {messageList.map((msg) => (
            <motion.div
              ref={(el) => {
                if (!el || !msg?.id) return;
                messageRefs.current[msg.id] = el;
              }}
              data-message-id={msg?.id}
              layout
              key={msg.id || Math.random()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex group relative ${msg.system ? "justify-center" : msg.own ? "justify-end" : "justify-start"}`}
            >
              {msg.system ? (
                <span className="text-[8px] sm:text-[9px] border border-zinc-900 text-zinc-600 px-3 py-1 uppercase tracking-[0.2em]">{msg.message}</span>
              ) : (
                <div className="flex flex-col max-w-[90%] sm:max-w-[75%] md:max-w-[60%] relative">
                  {isSelectMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSelectMessage(msg.id); }}
                      className={`absolute -top-2 ${msg.own ? "left-0" : "right-0"} z-40 w-7 h-7 border border-zinc-700 bg-black flex items-center justify-center hover:border-white transition`}
                      title={selectedMessageIds.has(msg.id) ? "Unselect" : "Select"}
                    >
                      <span className={`w-4 h-4 border ${selectedMessageIds.has(msg.id) ? "bg-indigo-600 border-indigo-600" : "border-zinc-600"} flex items-center justify-center`}>
                        {selectedMessageIds.has(msg.id) && <IoMdCheckmark className="text-white" />}
                      </span>
                    </button>
                  )}
                  <div className={`p-3 sm:p-4 relative border transition-all ${msg.deleted
                      ? "bg-transparent border-zinc-900 text-zinc-700 italic"
                      : msg.poll
                        ? "bg-zinc-950 text-zinc-200 border-zinc-800"
                        : msg.own
                          ? "bg-white text-black border-white shadow-[3px_3px_0px_rgba(255,255,255,0.05)]"
                          : "bg-zinc-950 text-zinc-300 border-zinc-900"
                    } ${highlightMessageId === msg.id ? "highlight-flash" : ""}`}>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      {!msg.own && !msg.deleted && <p className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">{msg.username}</p>}
                      <div className="flex items-center gap-2 ml-auto shrink-0">
                        {pinnedMessageId === msg.id && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[8px] opacity-70 font-bold">
                            <IoMdPin className="text-amber-400" /> PINNED
                          </span>
                        )}
                        {starredMessageIds.has(msg.id) && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[8px] opacity-70 font-bold">
                            <IoMdStar className="text-amber-400" /> STAR
                          </span>
                        )}
                        {msg.timer > 0 && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[8px] opacity-60 font-bold">
                            <IoMdTimer /> {msg.timer / 1000}S
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.replyTo && (
                      <div className={`mb-2 flex ${msg.own ? "justify-end" : "justify-start"}`}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToMessage(msg.replyTo?.messageId);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") jumpToMessage(msg.replyTo?.messageId);
                          }}
                          title="Jump to replied message"
                          className={`border-l-2 px-2 py-1 text-[10px] opacity-70 w-full ${msg.own
                              ? "bg-black text-white border-white/60"
                              : "bg-white text-black border-black/60"
                            } ${msg.replyTo?.messageId ? "cursor-pointer hover:opacity-90" : ""}`}
                        >
                          <p className={`font-bold text-[8px] flex items-center gap-1 ${msg.own ? "text-white/70" : "text-black/70"}`}>
                            <IoMdReturnLeft /> {msg.replyTo.username}
                          </p>
                          <p className={`italic truncate ${msg.own ? "text-white/70" : "text-black/70"}`}>
                            {decrypt(msg.replyTo.message)}
                          </p>
                        </div>
                      </div>
                    )}
                    {msg.poll ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm sm:text-[15px] font-bold text-white break-words">
                            {decrypt(msg.poll.question)}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">
                            {msg.poll.allowMultiple ? "Select one or more answers" : "Select one answer"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {(() => {
                            const options = msg.poll.options || [];
                            const totalVotes = options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0);
                            const ended = msg.poll.expiresAt && msg.poll.expiresAt <= Date.now();
                            return options.map((opt) => {
                              const votes = Array.isArray(opt.votes) ? opt.votes.length : 0;
                              const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                              const iVoted = Array.isArray(opt.votes) ? opt.votes.includes(username) : false;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={ended}
                                  onClick={() => voteOnPoll(msg, opt.id)}
                                  className={`w-full text-left border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition px-3 py-2 flex items-center justify-between gap-3 ${ended ? "opacity-60 cursor-not-allowed" : ""}`}
                                  title={ended ? "Poll ended" : "Vote"}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-[13px] text-zinc-200 truncate">
                                        {decrypt(opt.text)}
                                      </p>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[12px] text-zinc-400 font-bold tabular-nums">
                                          {votes} {votes === 1 ? "vote" : "votes"}
                                        </span>
                                        <span className="text-[12px] text-zinc-400 font-bold tabular-nums">
                                          {pct}%
                                        </span>
                                        {iVoted && (
                                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                            <IoMdCheckmark />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-black/50 border border-zinc-800">
                                      <div
                                        className="h-full bg-indigo-600"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          {(() => {
                            const options = msg.poll.options || [];
                            const totalVotes = options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0);
                            return (
                              <span className="font-bold">
                                {totalVotes} {totalVotes === 1 ? "vote" : "votes"} • {formatTimeLeft(msg.poll.expiresAt)}
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => clearMyPollVotes(msg)}
                            className="text-zinc-400 hover:text-white transition border border-zinc-800 px-3 py-1.5"
                          >
                            Remove Vote
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.deleted && <IoMdTrash className="inline mr-1" />} {msg.message}</p>
                    )}
                    <div className="flex items-center gap-2 justify-end mt-2 opacity-40">
                      {msg.edited && !msg.deleted && <span className="text-[7px] border border-current px-1 uppercase font-bold">Edited</span>}
                      <span className="text-[8px] font-black">{msg.time}</span>
                    </div>
                  </div>
                  {!msg.deleted && !isSelectMode && (
                    <div onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }} className={`absolute -top-2 ${msg.own ? "left-0" : "right-0"} p-1 cursor-pointer text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity bg-black rounded border border-zinc-800 ${activeMenuId === msg.id ? "opacity-100" : ""}`}>
                      <IoMdMore size={16} />
                    </div>
                  )}
                  <AnimatePresence>
                    {activeMenuId === msg.id && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className={`absolute top-[90%] mt-1 ${msg.own ? "right-0" : "left-0"} z-50 bg-black border border-white shadow-2xl min-w-[130px]`}>
                        <button onClick={() => startReplying(msg)} className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase font-bold border-t border-zinc-900">
                          <IoMdReturnLeft /> Reply
                        </button>
                        <button
                          onClick={() => toggleStarMessage(msg.id)}
                          className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase font-bold border-t border-zinc-900"
                        >
                          {starredMessageIds.has(msg.id) ? <IoMdStar /> : <IoMdStarOutline />}
                          {starredMessageIds.has(msg.id) ? "Unstar" : "Star"}
                        </button>
                        <button
                          onClick={() => togglePinMessage(msg.id)}
                          className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase font-bold border-t border-zinc-900"
                        >
                          <IoMdPin />
                          {pinnedMessageId === msg.id ? "Unpin" : "Pin"}
                        </button>
                        <button onClick={() => setMessageList(l => l.filter(m => m.id !== msg.id))} className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase font-bold transition-colors">Local Hide</button>
                        {msg.own && !msg.poll && (
                          <>
                            <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase font-bold transition-colors border-t border-zinc-900">Edit Signal</button>
                            <button onClick={() => { socket.emit("delete_message", { roomId, messageId: msg.id }); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-red-900 flex items-center gap-2 uppercase font-bold transition-colors border-t border-zinc-900">Expunge Global</button>
                          </>
                        )}
                        {msg.own && msg.poll && (
                          <button onClick={() => { socket.emit("delete_message", { roomId, messageId: msg.id }); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[9px] hover:bg-white hover:text-black text-red-900 flex items-center gap-2 uppercase font-bold transition-colors border-t border-zinc-900">Expunge Global</button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                <div className="max-w-[90%] bg-zinc-950 border border-zinc-900 border-dashed p-3">
                  <div className="flex items-center gap-3">
                    <IoMdPulse className="text-zinc-500 animate-pulse text-lg" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-1">Signal Incoming...</p>
                      <div className="text-[9px] text-white font-bold flex flex-wrap gap-x-1 uppercase truncate font-mono">
                        <span>[</span>
                        {typingUsers.map((u, i) => (<span key={u} className="text-white"><DecryptingName name={u} />{i < typingUsers.length - 1 ? "," : ""}</span>))}
                        <span>]</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} className="h-2" />
        </main>

        {/* INPUT FOOTER */}
        <footer className="p-3 sm:p-4 border-t border-zinc-900 bg-black relative flex-shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-2">
            {editingMessageId ? (
              <div className="flex items-center gap-2 text-[8px] text-white uppercase tracking-widest border-l border-white pl-2 font-bold">
                <span>Modifying Transmission...</span>
                <button onClick={() => { setEditingMessageId(null); setCurrentMessage(""); }}><IoMdClose /></button>
              </div>
            ) : <div />}
            {selfDestructTime > 0 && !editingMessageId && (
              <div className="flex items-center gap-2 text-[8px] text-red-600 font-bold uppercase tracking-widest animate-pulse">
                <IoMdTimer /> Destruct Enabled: {selfDestructTime / 1000}s
              </div>
            )}
          </div>

          {/* BULK ACTION BAR */}
          {isSelectMode && (
            <div className="mb-2 border border-zinc-800 bg-black/85 backdrop-blur-sm px-3 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.25em] font-black text-zinc-500">
                  Select Mode
                </p>
                <p className="text-[10px] text-zinc-300 font-bold truncate">
                  {selectedCount} selected
                  {selectionHasOthers ? " • global delete disabled (includes others)" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={bulkLocalDelete}
                  disabled={selectedCount === 0}
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest border border-zinc-800 text-zinc-300 hover:bg-white hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Delete locally (hide from your screen)"
                >
                  Local Delete
                </button>
                <button
                  type="button"
                  onClick={bulkGlobalDelete}
                  disabled={selectedCount === 0 || !selectionAllOwn}
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest border border-red-900/60 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title={selectionAllOwn ? "Delete for everyone (your messages only)" : "Global delete only works when all selected messages are yours"}
                >
                  Global Delete
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest border border-zinc-800 text-zinc-500 hover:text-white hover:bg-white/5 transition"
                  title="Exit select mode"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className={`flex items-center border p-1 transition-colors ${editingMessageId ? "border-white" : "border-zinc-900 focus-within:border-zinc-700"}`}>
            <div className="flex items-center">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowTimerMenu(!showTimerMenu); }} className={`p-2 sm:p-3 transition-colors ${selfDestructTime > 0 ? "text-red-600" : "text-zinc-600 hover:text-white"}`}>
                  <IoMdTimer size={18} />
                </button>
                <AnimatePresence>
                  {showTimerMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 bg-black border border-zinc-800 shadow-2xl z-50 w-24 sm:w-32">
                      {timerOptions.map((opt) => (
                        <button key={opt.label} onClick={() => { setSelfDestructTime(opt.value); setShowTimerMenu(false); }} className={`w-full text-left px-3 py-3 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors ${selfDestructTime === opt.value ? "bg-white text-black" : "text-zinc-500"}`}>
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* POLL BUTTON (next to destruct timer) */}
              <button
                type="button"
                onClick={togglePollModal}
                className={`p-2 sm:p-3 transition-colors ${showPollModal ? "text-indigo-400" : "text-zinc-600 hover:text-white"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                title="Create a poll"
                disabled={!!editingMessageId}
              >
                <IoMdStats size={18} />
              </button>

            </div>

            {replyingTo && !editingMessageId && (
              <div className="flex items-center gap-2 text-[8px] text-zinc-400 uppercase tracking-widest border-l border-zinc-500 pl-2 font-bold mb-2">
                <span className="flex items-center gap-1"><IoMdReturnLeft /> Replying to: {replyingTo.username}</span>
                <button onClick={() => setReplyingTo(null)} className="hover:text-white"><IoMdClose /></button>
              </div>
            )}

            <input
              type="text"
              value={currentMessage}
              placeholder={editingMessageId ? "EDITING..." : "ENTER ENCRYPTED SIGNAL..."}
              className="flex-1 bg-transparent px-2 sm:px-4 py-2 sm:py-3 text-white outline-none placeholder:text-zinc-800 text-xs sm:text-sm font-mono min-w-0"
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} className={`p-2 sm:p-3 text-black transition-all ${editingMessageId ? "bg-white" : "bg-white hover:bg-zinc-200"}`}>
              {editingMessageId ? <IoMdCreate size={18} /> : <IoMdSend size={18} />}
            </button>
          </div>
        </footer>

        {/* POLL MODAL */}
        <AnimatePresence>
          {showPollModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => { setShowPollModal(false); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: "spring", damping: 22, stiffness: 240 }}
                className="w-full max-w-xl bg-zinc-900 border border-zinc-800 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">Create a Poll</h3>
                  <button
                    type="button"
                    onClick={() => { setShowPollModal(false); }}
                    className="p-2 text-zinc-400 hover:text-white transition"
                    title="Close"
                  >
                    <IoMdClose size={22} />
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-5">
                  <div>
                    <p className="text-sm text-zinc-300 mb-2">Question</p>
                    <div className="relative">
                      <input
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value.slice(0, 300))}
                        placeholder="What question do you want to ask?"
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 outline-none focus:border-zinc-600"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 tabular-nums">
                        {pollQuestion.length}/300
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-300 mb-2">Answers</p>
                    <div className="space-y-2">
                      {pollAnswers.map((ans, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800">
                            <div className="w-10 h-10 flex items-center justify-center text-zinc-500 border-r border-zinc-800">
                              <IoMdPeople size={18} />
                            </div>
                            <input
                              value={ans}
                              onChange={(e) => setPollAnswers((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                              placeholder="Type your answer"
                              className="flex-1 bg-transparent text-white px-3 py-2 outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPollAnswers((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-zinc-500 hover:text-white transition border border-zinc-800"
                            title="Remove answer"
                            disabled={pollAnswers.length <= 2}
                          >
                            <IoMdTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPollAnswers((prev) => [...prev, ""])}
                        className="px-4 py-2 border border-zinc-800 text-zinc-300 hover:bg-white hover:text-black transition font-bold"
                      >
                        + Add another answer
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-300 mb-2">Duration</p>
                    <select
                      value={pollDurationMs}
                      onChange={(e) => setPollDurationMs(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 outline-none focus:border-zinc-600"
                    >
                      <option value={60 * 60 * 1000}>1 hour</option>
                      <option value={6 * 60 * 60 * 1000}>6 hours</option>
                      <option value={12 * 60 * 60 * 1000}>12 hours</option>
                      <option value={24 * 60 * 60 * 1000}>1 day</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 text-sm text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      checked={pollAllowMultiple}
                      onChange={(e) => setPollAllowMultiple(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    Allow Multiple Answers
                  </label>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div />
                    <button
                      type="button"
                      onClick={postPoll}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={pollQuestion.trim().length === 0 || pollAnswers.map((a) => a.trim()).filter(Boolean).length < 2}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatRoom;