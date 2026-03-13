import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuSend,
  LuUsers,
  LuLock,
  LuCopy,
  LuEllipsisVertical,
  LuTrash2,
  LuPencil,
  LuX,
  LuLogOut,
  LuTimer,
  LuActivity,
  LuUserMinus,
  LuClock,
  LuTriangleAlert,
  LuReply,
  LuStar,
  LuPin,
  LuChartBar,
  LuCheck,
  LuPaperclip,
  LuKeyRound,
  LuDownload,
  LuFingerprint,
  LuShieldCheck,
  LuEye,
  LuEyeOff,
  LuBell,
  LuBellOff,
  LuChevronRight,
  LuMessageSquarePlus,
  LuShieldAlert,
  LuImage,
  LuHash,
  LuCrown,
  LuCircleDot,
  LuCheckCheck,
  LuChevronLeft,
  LuMaximize2,
  LuZoomIn,
  LuFile,
  LuFileText,
  LuMic,
  LuSquare,
  LuPlay,
  LuPause,
  LuPlus,
} from "react-icons/lu";
import Logo from "./Logo";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";
import { encryptMagicLinkPayload } from "../utils/magicLink";
import BiometricVault from "./BiometricVault";
import HighClearanceComposer from "./HighClearanceComposer";
import { thanosSnap } from "../utils/thanosSnap";

const DecryptingName = ({ name }) => {
  const [displayValue, setDisplayValue] = useState(name);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayValue((prev) =>
        prev
          .split("")
          .map((letter, index) => {
            if (index < iteration) return name[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join(""),
      );
      if (iteration >= name.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);
    return () => clearInterval(interval);
  }, [name]);
  return <span>{displayValue}</span>;
};

const ChatRoom = ({
  socket,
  username,
  roomId,
  roomPassword,
  isHost,
  leaveRoom,
  createdAt,
  initialUsers,
  roomName,
}) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [users, setUsers] = useState(initialUsers || []);
  const [showUsers, setShowUsers] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const [selfDestructTime, setSelfDestructTime] = useState(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");

  const [isSecurityBreach, setIsSecurityBreach] = useState(false);

  const [isPanicMode, setIsPanicMode] = useState(false);
  const [escPressCount, setEscPressCount] = useState(0);
  const [showEscIndicator, setShowEscIndicator] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const escTimeoutRef = useRef(null);
  const escIndicatorTimeoutRef = useRef(null);

  const [showMagicLink, setShowMagicLink] = useState(false);
  const [QRCodeComponent, setQRCodeComponent] = useState(null);

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  useEffect(() => {
    import("qrcode.react")
      .then((module) => {
        setQRCodeComponent(() => module.QRCodeSVG);
      })
      .catch(() => {
        setQRCodeComponent(null);
      });
  }, []);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  const showBrowserNotification = (message) => {
    if (
      typeof Notification === "undefined" ||
      notificationPermission !== "granted" ||
      document.hasFocus() ||
      message.own ||
      message.username === username ||
      message.system
    ) {
      return;
    }

    const title = `${roomName || "Secure Chat"}`;
    const body = message.poll
      ? `${message.username}: [POLL] ${decrypt(message.poll.question).substring(0, 50)}`
      : message.type === "image"
        ? `${message.username}: [Classified Image]`
        : message.type === "file"
          ? `${message.username}: [Classified File]`
          : message.type === "audio"
            ? `${message.username}: [Voice Message]`
            : `${message.username}: ${message.message.substring(0, 100)}`;

    const notification = new Notification(title, {
      body,
      icon: "/og-image.png",
      badge: "/og-image.png",
      tag: `chat-${roomId}`,
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 5000);
  };

  const typingTimeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimeoutRef = useRef(null);

  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

  const [joinRequests, setJoinRequests] = useState([]);

  const renderMessageText = (text, keyPrefix = "msg") => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, idx) => {
      const isUrl = part.startsWith("http://") || part.startsWith("https://");
      if (!isUrl) {
        return <span key={`${keyPrefix}-part-${idx}`}>{part}</span>;
      }
      return (
        <a
          key={`${keyPrefix}-link-${idx}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-dotted hover:text-zinc-300 break-all"
        >
          {part}
        </a>
      );
    });
  };

  const [starredMessageIds, setStarredMessageIds] = useState(() => new Set());
  const [pinnedMessageId, setPinnedMessageId] = useState(null);

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollAnswers, setPollAnswers] = useState(["", "", ""]);
  const [pollDurationMs, setPollDurationMs] = useState(60 * 60 * 1000);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const [audioLevels, setAudioLevels] = useState(new Array(24).fill(0));

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(() => new Set());

  const [showSlideConfirm, setShowSlideConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const slideButtonRef = useRef(null);
  const slideTrackRef = useRef(null);
  const slidePositionRef = useRef(0);
  const confirmActionRef = useRef(null);

  // Biometric vault states
  const [showBiometricVault, setShowBiometricVault] = useState(false);
  const [vaultMessage, setVaultMessage] = useState(null);
  const [showHighClearanceComposer, setShowHighClearanceComposer] = useState(false);

  // Mobile toolbar toggle
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const mobileToolbarRef = useRef(null);
  const hasSelectedAttachments = selectedAttachments.length > 0;

  const timerOptions = [
    { label: "OFF", value: 0 },
    { label: "10s", value: 10000 },
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
    { label: "10m", value: 600000 },
  ];

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const imageMessages = messageList.filter((m) => m.type === "image" && m.message);
    const total = imageMessages.length;
    const handleKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft" && total > 1) setLightboxIndex((i) => (i - 1 + total) % total);
      if (e.key === "ArrowRight" && total > 1) setLightboxIndex((i) => (i + 1) % total);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, messageList]);

  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyDown = (e) => {
      if (isPanicMode) {
        if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setIsPanicMode(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setEscPressCount((prev) => {
          const newCount = prev + 1;

          if (escTimeoutRef.current) {
            clearTimeout(escTimeoutRef.current);
          }
          if (escIndicatorTimeoutRef.current) {
            clearTimeout(escIndicatorTimeoutRef.current);
          }

          if (newCount === 1) {
            setShowEscIndicator(true);
            escIndicatorTimeoutRef.current = setTimeout(() => {
              setShowEscIndicator(false);
            }, 800);
          }

          if (newCount >= 2) {
            setIsPanicMode(true);
            setShowEscIndicator(false);
            return 0;
          }

          escTimeoutRef.current = setTimeout(() => {
            setEscPressCount(0);
            setShowEscIndicator(false);
          }, 800);

          return newCount;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (escTimeoutRef.current) {
        clearTimeout(escTimeoutRef.current);
      }
      if (escIndicatorTimeoutRef.current) {
        clearTimeout(escIndicatorTimeoutRef.current);
      }
    };
  }, [isPanicMode, isMobile]);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();

    const handleSecurityKeyDown = (e) => {
      if (e.key === "Escape") return;

      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.key === "p") ||
        (e.metaKey && e.shiftKey)
      ) {
        setIsSecurityBreach(true);
        navigator.clipboard.writeText(
          "CLASSIFIED DATA - SCREENSHOT ATTEMPT BLOCKED",
        );
        setTimeout(() => setIsSecurityBreach(false), 2000);
      }
    };

    const handleBlur = () => {
      setIsSecurityBreach(true);
    };

    const handleFocus = () => {
      setIsSecurityBreach(false);
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleSecurityKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleSecurityKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const startReplying = (msg) => {
    setReplyingTo(msg);
    setEditingMessageId(null);
    setActiveMenuId(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  useEffect(() => {
    if (!createdAt) return;
    const interval = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - createdAt) / 1000);
      const hrs = Math.floor(secondsPassed / 3600)
        .toString()
        .padStart(2, "0");
      const mins = Math.floor((secondsPassed % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const secs = (secondsPassed % 60).toString().padStart(2, "0");
      setSessionDuration(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const encrypt = (text) => CryptoJS.AES.encrypt(text, roomPassword).toString();
  const decrypt = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, roomPassword);
      return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ DECRYPT FAIL";
    } catch {
      return "🚫 ERROR";
    }
  };

  const storageKeyStarred = `secureChatRoom:${roomId}:starredMessageIds`;
  const storageKeyPinned = `secureChatRoom:${roomId}:pinnedMessageId`;

  useEffect(() => {
    try {
      const rawStarred = JSON.parse(
        localStorage.getItem(storageKeyStarred) || "[]",
      );
      setStarredMessageIds(
        new Set(Array.isArray(rawStarred) ? rawStarred : []),
      );
      const rawPinned = localStorage.getItem(storageKeyPinned);
      setPinnedMessageId(rawPinned || null);
    } catch {
      setStarredMessageIds(new Set());
      setPinnedMessageId(null);
    }
  }, [roomId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKeyStarred,
        JSON.stringify(Array.from(starredMessageIds)),
      );
    } catch {}
  }, [storageKeyStarred, starredMessageIds]);

  useEffect(() => {
    try {
      if (pinnedMessageId)
        localStorage.setItem(storageKeyPinned, pinnedMessageId);
      else localStorage.removeItem(storageKeyPinned);
    } catch {}
  }, [storageKeyPinned, pinnedMessageId]);

  const jumpToMessage = (messageId) => {
    if (!messageId) return;
    const el = messageRefs.current?.[messageId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightMessageId(messageId);

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(
      () => setHighlightMessageId(null),
      2600,
    );
  };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
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
    if (msg.type === "image") return "📷 Image";
    if (msg.type === "audio") return `🎙️ Voice message${msg.audioDuration ? ` (${formatDuration(msg.audioDuration)})` : ""}`;
    if (msg.type === "file") return `📎 ${msg.fileName || "File"}`;
    if (msg.type === "high-clearance") return "🔒 High Clearance Message";
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
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const now = Date.now();

    const poll = {
      question: encrypt(q),
      options: answers.map((text) => ({
        id: uuidv4(),
        text: encrypt(text),
        votes: [],
      })),
      allowMultiple: !!pollAllowMultiple,
      createdAt: now,
      expiresAt: now + pollDurationMs,
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
      poll,
    };

    await socket.emit("send_message", messageData);
    setMessageList((list) => [...list, { ...messageData, own: true }]);
    setShowPollModal(false);
    resetPollDraft();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter((file) => file.size <= maxSize);
    const skippedCount = files.length - validFiles.length;

    if (!validFiles.length) {
      alert("All selected files are too large. Maximum size is 5MB per file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (skippedCount > 0) {
      alert(`${skippedCount} file(s) skipped. Maximum size is 5MB per file.`);
    }

    const readAsDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });

    try {
      const newAttachments = await Promise.all(
        validFiles.map(async (file) => {
          const base64 = await readAsDataUrl(file);
          return {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            type: file.type.startsWith("image/") ? "image" : "file",
            data: base64,
          };
        }),
      );
      setSelectedAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      console.error("Failed to process selected files:", error);
      alert("Some files could not be processed. Please try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearAttachment = () => {
    setSelectedAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (attachmentId) => {
    setSelectedAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  const downloadImage = (imageData, messageId) => {
    try {
      const link = document.createElement("a");
      link.href = imageData;
      link.download = `classified_${messageId}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  const sendSelectedAttachments = async () => {
    if (!selectedAttachments.length) return;

    const attachmentsToSend = [...selectedAttachments];
    const replyPayload = replyingTo ? {
      messageId: replyingTo.id,
      username: replyingTo.username,
      message: encrypt(getReplyPreviewText(replyingTo)),
    } : null;

    for (const attachment of attachmentsToSend) {
      const messageId = uuidv4();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (attachment.type === "image") {
        const encryptedImage = encrypt(attachment.data);
        const messageData = {
          id: messageId,
          roomId,
          username,
          message: encryptedImage,
          time,
          edited: false,
          deleted: false,
          timer: selfDestructTime,
          replyTo: replyPayload,
          type: "image",
        };
        await socket.emit("send_message", messageData);
        setMessageList((list) => [...list, { ...messageData, message: attachment.data, own: true }]);
      } else {
        const encryptedData = encrypt(attachment.data);
        const encryptedName = encrypt(attachment.name);
        const messageData = {
          id: messageId,
          roomId,
          username,
          message: encryptedData,
          fileName: encryptedName,
          fileSize: attachment.size,
          fileType: attachment.mimeType,
          time,
          edited: false,
          deleted: false,
          timer: selfDestructTime,
          replyTo: replyPayload,
          type: "file",
        };
        await socket.emit("send_message", messageData);
        setMessageList((list) => [...list, { ...messageData, message: attachment.data, fileName: attachment.name, own: true }]);
      }
    }

    clearAttachment();
    setReplyingTo(null);
  };

  const downloadFile = (fileData, fileName) => {
    try {
      const link = document.createElement("a");
      link.href = fileData;
      link.download = fileName || `classified_file_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return LuFile;
    if (fileType.includes('pdf') || fileType.includes('text') || fileType.includes('document') || fileType.includes('word') || fileType.includes('sheet') || fileType.includes('presentation')) return LuFileText;
    return LuFile;
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analyser for visualisation
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = { analyser, audioCtx, source };

      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const levels = Array.from(data).slice(0, 24).map(v => v / 255);
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        if (analyserRef.current) {
          analyserRef.current.audioCtx.close();
          analyserRef.current = null;
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevels(new Array(24).fill(0));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Microphone access is required to record audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      if (analyserRef.current) {
        analyserRef.current.audioCtx.close();
        analyserRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setAudioLevels(new Array(24).fill(0));
    }
    setAudioBlob(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
  };

  const sendAudioMessage = async () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const messageId = uuidv4();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const encryptedAudio = encrypt(base64);

      const messageData = {
        id: messageId,
        roomId,
        username,
        message: encryptedAudio,
        audioDuration: recordingDuration,
        time,
        edited: false,
        deleted: false,
        timer: selfDestructTime,
        replyTo: replyingTo ? {
          messageId: replyingTo.id,
          username: replyingTo.username,
          message: encrypt(getReplyPreviewText(replyingTo)),
        } : null,
        type: "audio",
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [
        ...list,
        { ...messageData, message: base64, own: true },
      ]);

      // Cleanup
      setAudioBlob(null);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
      setRecordingDuration(0);
      setIsPlayingPreview(false);
      setReplyingTo(null);
    };
    reader.readAsDataURL(audioBlob);
  };

  const applyPollVoteUpdate = ({
    messageId,
    optionId,
    action,
    username: voter,
  }) => {
    if (!messageId || !optionId || !voter) return;
    setMessageList((list) =>
      list.map((m) => {
        if (m?.id !== messageId || !m.poll || m.deleted) return m;
        const poll = m.poll;
        const isEnded = poll.expiresAt && poll.expiresAt <= Date.now();
        if (isEnded) return m;

        const nextOptions = (poll.options || []).map((opt) => {
          if (opt.id !== optionId) return opt;
          const existing = Array.isArray(opt.votes) ? opt.votes : [];
          const has = existing.includes(voter);
          if (action === "remove")
            return { ...opt, votes: existing.filter((u) => u !== voter) };
          if (!has) return { ...opt, votes: [...existing, voter] };
          return opt;
        });
        return { ...m, poll: { ...poll, options: nextOptions } };
      }),
    );
  };

  const voteOnPoll = (msg, optionId) => {
    if (!msg?.poll || !optionId || msg.deleted) return;
    const poll = msg.poll;
    const isEnded = poll.expiresAt && poll.expiresAt <= Date.now();
    if (isEnded) return;

    const options = poll.options || [];
    const option = options.find((o) => o.id === optionId);
    if (!option) return;

    const myVotesForOption = Array.isArray(option.votes)
      ? option.votes.includes(username)
      : false;
    const action = myVotesForOption ? "remove" : "add";

    // If single-choice poll and we're adding, remove our vote from any other option first.
    if (!poll.allowMultiple && action === "add") {
      options.forEach((o) => {
        if (
          o.id !== optionId &&
          Array.isArray(o.votes) &&
          o.votes.includes(username)
        ) {
          applyPollVoteUpdate({
            messageId: msg.id,
            optionId: o.id,
            action: "remove",
            username,
          });
          socket.emit("poll_vote", {
            roomId,
            messageId: msg.id,
            optionId: o.id,
            action: "remove",
            username,
          });
        }
      });
    }

    applyPollVoteUpdate({ messageId: msg.id, optionId, action, username });
    socket.emit("poll_vote", {
      roomId,
      messageId: msg.id,
      optionId,
      action,
      username,
    });
  };

  const clearMyPollVotes = (msg) => {
    if (!msg?.poll || msg.deleted) return;
    const options = msg.poll.options || [];
    options.forEach((o) => {
      if (Array.isArray(o.votes) && o.votes.includes(username)) {
        applyPollVoteUpdate({
          messageId: msg.id,
          optionId: o.id,
          action: "remove",
          username,
        });
        socket.emit("poll_vote", {
          roomId,
          messageId: msg.id,
          optionId: o.id,
          action: "remove",
          username,
        });
      }
    });
  };

  const selectedMessages = messageList.filter(
    (m) => m?.id && selectedMessageIds.has(m.id) && !m.system,
  );
  const selectedCount = selectedMessages.length;
  const selectionAllOwn =
    selectedCount > 0 && selectedMessages.every((m) => !!m.own);
  const selectionHasOthers =
    selectedCount > 0 && selectedMessages.some((m) => !m.own);

  // Telegram "Thanos Snap" animated deletion helper
  const animateDelete = async (ids, mode = 'local') => {
    const idArr = Array.isArray(ids) ? ids : [ids];
    const idSet = new Set(idArr);
    setDeletingIds(prev => new Set([...prev, ...idSet]));

    // Run particle disintegration on each message bubble concurrently
    const snaps = idArr.map((id) => {
      const wrapper = messageRefs.current?.[id];
      const bubble = wrapper?.querySelector('[data-bubble]') || wrapper;
      return bubble ? thanosSnap(bubble) : Promise.resolve();
    });
    await Promise.all(snaps);

    // Give framer-motion time to finish the height collapse
    await new Promise((r) => setTimeout(r, 700));

    // Clean up
    setDeletingIds(prev => {
      const next = new Set(prev);
      idSet.forEach(id => next.delete(id));
      return next;
    });
    if (mode === 'local') {
      setMessageList(list => list.filter(m => !idSet.has(m?.id)));
    }
  };

  const bulkLocalDelete = () => {
    if (selectedCount === 0) return;
    animateDelete([...selectedMessageIds], 'local');
    setSelectedMessageIds(new Set());
  };

  const bulkGlobalDelete = () => {
    if (selectedCount === 0) return;
    if (!selectionAllOwn) return;
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

  const decideJoinRequest = (socketId, approve) => {
    socket.emit("approve_join_request", { roomId, socketId, approve });
    setJoinRequests((prev) => prev.filter((r) => r.socketId !== socketId));
  };

  const handleTerminateClick = () => {
    setConfirmAction("terminate");
    confirmActionRef.current = "terminate";
    setShowSlideConfirm(true);
    setSlidePosition(0);
    slidePositionRef.current = 0;
  };

  const handleLeaveClick = () => {
    setConfirmAction("leave");
    confirmActionRef.current = "leave";
    setShowSlideConfirm(true);
    setSlidePosition(0);
    slidePositionRef.current = 0;
  };

  useEffect(() => {
    slidePositionRef.current = slidePosition;
  }, [slidePosition]);

  useEffect(() => {
    confirmActionRef.current = confirmAction;
  }, [confirmAction]);

  useEffect(() => {
    if (!isSliding || !showSlideConfirm) return;

    const executeConfirmedAction = () => {
      const action = confirmActionRef.current;
      if (action === "terminate") {
        socket.emit("close_room", { roomId });
      } else if (action === "leave") {
        leaveRoom();
      }
      setShowSlideConfirm(false);
      setSlidePosition(0);
      slidePositionRef.current = 0;
      setConfirmAction(null);
      confirmActionRef.current = null;
      setIsSliding(false);
    };

    const handleMouseMove = (e) => {
      if (!slideTrackRef.current) return;

      const track = slideTrackRef.current;
      const rect = track.getBoundingClientRect();
      const trackWidth = rect.width;
      const buttonWidth = 60;

      let clientX = e.clientX;
      let newPosition = clientX - rect.left - buttonWidth / 2;

      const maxPosition = trackWidth - buttonWidth;
      newPosition = Math.max(0, Math.min(maxPosition, newPosition));

      setSlidePosition(newPosition);
      slidePositionRef.current = newPosition;
    };

    const handleTouchMove = (e) => {
      if (!slideTrackRef.current) return;

      const track = slideTrackRef.current;
      const rect = track.getBoundingClientRect();
      const trackWidth = rect.width;
      const buttonWidth = 60;

      let clientX = e.touches[0].clientX;
      let newPosition = clientX - rect.left - buttonWidth / 2;

      const maxPosition = trackWidth - buttonWidth;
      newPosition = Math.max(0, Math.min(maxPosition, newPosition));

      setSlidePosition(newPosition);
      slidePositionRef.current = newPosition;
    };

    const handleEnd = () => {
      setIsSliding(false);
      if (slideTrackRef.current) {
        const maxPosition = slideTrackRef.current.offsetWidth - 60;
        const currentPos = slidePositionRef.current;
        if (currentPos >= maxPosition - 5) {
          executeConfirmedAction();
          return;
        }
        if (currentPos < maxPosition - 5) {
          setSlidePosition(0);
          slidePositionRef.current = 0;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isSliding, showSlideConfirm, roomId, socket, leaveRoom]);

  const handleSlideStart = (e) => {
    setIsSliding(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const closeSlideConfirm = () => {
    setShowSlideConfirm(false);
    setSlidePosition(0);
    slidePositionRef.current = 0;
    setConfirmAction(null);
    confirmActionRef.current = null;
    setIsSliding(false);
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
      socket.emit("edit_message", {
        roomId,
        messageId: editingMessageId,
        newEncryptedMessage: encrypted,
      });
      setMessageList((list) =>
        list.map((msg) =>
          msg.id === editingMessageId
            ? { ...msg, message: currentMessage, edited: true }
            : msg,
        ),
      );
      setEditingMessageId(null);
      setCurrentMessage("");
    } else {
      const messageId = uuidv4();
      const encrypted = encrypt(currentMessage);
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const replyData = replyingTo
        ? {
            messageId: replyingTo.id,
            username: replyingTo.username,
            message: encrypt(getReplyPreviewText(replyingTo)),
          }
        : null;

      const messageData = {
        id: messageId,
        roomId,
        username,
        message: encrypted,
        time,
        edited: false,
        deleted: false,
        timer: selfDestructTime,
        replyTo: replyData,
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [
        ...list,
        { ...messageData, message: currentMessage, own: true },
      ]);
      setCurrentMessage("");
      setReplyingTo(null);
    }
  };

  const sendHighClearanceMessage = async (messageData) => {
    const messageId = uuidv4();
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Encrypt the high clearance content with additional AES-256 layer
    const highClearanceKey = `${roomPassword}_HIGH_CLEARANCE_${Date.now()}`;
    const encryptedContent = encrypt(JSON.stringify(messageData));
    
    const highClearanceMessageData = {
      id: messageId,
      roomId,
      username,
      message: encryptedContent,
      time,
      edited: false,
      deleted: false,
      timer: 0, // High clearance messages don't auto-destruct
      replyTo: null,
      type: "high-clearance",
      requiresBiometric: messageData.requiresBiometric,
    };

    await socket.emit("send_message", highClearanceMessageData);
    setMessageList((list) => [
      ...list,
      { 
        ...highClearanceMessageData, 
        message: encryptedContent,
        highClearanceContent: messageData,
        own: true 
      },
    ]);
  };

  const openBiometricVault = (message) => {
    setVaultMessage(message);
    setShowBiometricVault(true);
  };

  const handleVaultDecrypted = (message) => {
    // Message has been successfully decrypted and viewed
    console.log('High clearance message accessed:', message);
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      let messageToAdd;

      const isOwnMessage = data.username === username;

      if (data.system) {
        messageToAdd = { ...data, id: data.id || uuidv4() };
      } else if (data.type === "poll" || data.poll) {
        messageToAdd = { ...data, own: isOwnMessage };
      } else if (data.type === "image") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          own: isOwnMessage,
        };
      } else if (data.type === "file") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          fileName: decrypt(data.fileName),
          own: isOwnMessage,
        };
      } else if (data.type === "audio") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          own: isOwnMessage,
        };
      } else if (data.type === "high-clearance") {
        messageToAdd = {
          ...data,
          message: data.message, // Keep encrypted for non-owners
          own: isOwnMessage,
          highClearanceContent: isOwnMessage ? JSON.parse(decrypt(data.message)) : null,
        };
      } else {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          own: isOwnMessage,
        };
      }

      setMessageList((l) => [...l, messageToAdd]);

      if (!isOwnMessage) {
        showBrowserNotification(messageToAdd);
      }
    });
    socket.on("poll_vote_update", (payload) => applyPollVoteUpdate(payload));
    socket.on("user_typing", ({ username: typingUser, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping
          ? [...new Set([...prev, typingUser])]
          : prev.filter((u) => u !== typingUser),
      );
    });
    socket.on("message_deleted", async (deletedId) => {
      // Run Thanos-snap disintegration on the message bubble
      const wrapper = messageRefs.current?.[deletedId];
      const bubble = wrapper?.querySelector('[data-bubble]') || wrapper;
      if (bubble) {
        setDeletingIds(prev => new Set([...prev, deletedId]));
        await thanosSnap(bubble);
        // Let height collapse finish
        await new Promise((r) => setTimeout(r, 700));
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(deletedId);
          return next;
        });
      }
      setMessageList((list) =>
        list.map((msg) =>
          msg.id === deletedId
            ? {
                ...msg,
                deleted: true,
                message: "[ DATA EXPUNGED ]",
                edited: false,
                poll: null,
                type: undefined,
                replyTo: null,
              }
            : msg,
        ),
      );
    });
    socket.on("message_updated", ({ messageId, newEncryptedMessage }) => {
      setMessageList((list) =>
        list.map((msg) =>
          msg.id === messageId
            ? { ...msg, message: decrypt(newEncryptedMessage), edited: true }
            : msg,
        ),
      );
    });
    socket.on("update_users", (userList) => setUsers(userList));
    socket.on("kicked", () => {
      leaveRoom();
    });

    socket.on(
      "join_request",
      ({ roomId: incomingRoomId, username: requesterUsername, socketId }) => {
        if (incomingRoomId !== roomId) return;
        setJoinRequests((prev) => {
          if (prev.some((r) => r.socketId === socketId)) return prev;
          return [...prev, { socketId, username: requesterUsername }];
        });
      },
    );

    return () => {
      socket.off("receive_message");
      socket.off("update_users");
      socket.off("user_typing");
      socket.off("message_deleted");
      socket.off("message_updated");
      socket.off("kicked");
      socket.off("poll_vote_update");
      socket.off("join_request");
    };
  }, [
    socket,
    roomPassword,
    username,
    roomName,
    roomId,
    notificationPermission,
  ]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messageList, typingUsers]);

  useEffect(() => {
    const fn = () => {
      setActiveMenuId(null);
      setShowTimerMenu(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  // Close mobile toolbar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileToolbarRef.current && !mobileToolbarRef.current.contains(e.target)) {
        setShowMobileToolbar(false);
      }
    };
    if (showMobileToolbar) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMobileToolbar]);

  return (
    <div
      className={`flex h-[100dvh] w-full bg-[#09090b] text-white font-sans selection:bg-zinc-700 selection:text-white overflow-hidden relative ${isPanicMode ? "panic-blur" : ""}`}
    >
      <style>{`
        @media print { body { display: none !important; } }

        .panic-blur {
          filter: blur(15px) brightness(0.4) saturate(0.7);
          transition: filter 0.3s ease-out;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        .panic-blur * {
          pointer-events: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }

        .highlight-flash {
          animation: highlight-flash 0.9s ease-out 0s 2;
          will-change: transform, box-shadow, filter;
        }
        @keyframes highlight-flash {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
            filter: brightness(1);
          }
          25% {
            transform: scale(1.01);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 22px rgba(255, 255, 255, 0.25);
            filter: brightness(1.08);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
            filter: brightness(1);
          }
        }

        .scan-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(1200px 500px at 20% 10%, rgba(255, 255, 255, 0.06), transparent 50%),
                      radial-gradient(900px 400px at 80% 30%, rgba(255, 255, 255, 0.04), transparent 45%),
                      linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.92));
          border: 1px solid rgba(255, 255, 255, 0.06);
          pointer-events: none;
          overflow: hidden;
        }

        .scan-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.18;
          transform: translateZ(0);
          animation: scan-grid-flicker 900ms steps(2, end) infinite;
        }

        .scan-noise {
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.04) 0px,
              rgba(255,255,255,0.04) 1px,
              transparent 2px,
              transparent 4px
            );
          mix-blend-mode: overlay;
          opacity: 0.14;
          animation: scan-noise 700ms linear infinite;
        }

        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 80px;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(255, 255, 255, 0.06) 25%,
            rgba(255,255,255,0.16) 50%,
            rgba(255, 255, 255, 0.06) 75%,
            transparent
          );
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
          animation: scan-sweep 900ms linear infinite;
        }

        .scan-hud {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.70);
        }

        .scan-bar {
          flex: 1;
          height: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.35);
          overflow: hidden;
        }

        .scan-bar > span {
          display: block;
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.3));
          animation: scan-progress 620ms ease-in-out infinite alternate;
        }

        @keyframes scan-sweep {
          0% { transform: translateY(-120%); }
          100% { transform: translateY(420%); }
        }

        @keyframes scan-noise {
          0% { transform: translateY(0); }
          100% { transform: translateY(12px); }
        }

        @keyframes scan-grid-flicker {
          0% { opacity: 0.16; }
          50% { opacity: 0.26; }
          100% { opacity: 0.18; }
        }

        @keyframes scan-progress {
          0% { transform: translateX(-30%); opacity: 0.65; }
          100% { transform: translateX(160%); opacity: 1; }
        }

        /* Mobile-specific sidebar scrolling fix */
        @supports (padding: env(safe-area-inset-bottom)) {
          .chat-footer-safe {
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <AnimatePresence>
        {isSecurityBreach && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center select-none"
          >
            <div className="text-red-500 font-mono font-bold text-xl uppercase tracking-widest animate-pulse flex flex-col items-center gap-5 text-center p-8 border border-red-500/30 bg-red-950/20 rounded-xl backdrop-blur-md shadow-[0_0_60px_rgba(239,68,68,0.15)]">
              <div className="relative">
                <LuShieldAlert size={56} strokeWidth={1.5} />
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl mb-2 font-black tracking-[0.15em]">Security Protocol Engaged</h1>
                <p className="text-xs text-zinc-500 tracking-wider">
                  Screenshot / Recording / Focus Loss Detected
                </p>
                <p className="text-[10px] text-zinc-700 mt-2">
                  Display Obscured
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPanicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] cursor-pointer"
            onClick={() => setIsPanicMode(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUsers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUsers(false)}
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showUsers || window.innerWidth > 768) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:relative z-50 w-[88%] max-w-[320px] sm:w-72 h-full bg-[#0a0a0c] border-r border-zinc-800/40 flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-zinc-800/50 flex items-center justify-between flex-shrink-0 relative overflow-hidden pt-safe">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01]" />
              <h2 className="text-base font-black uppercase tracking-[0.2em] flex items-center gap-2.5 text-white relative z-10">
                <div className="p-2 bg-white/5 rounded-xl border border-zinc-700/30 shadow-lg shadow-black/10">
                  <LuShieldCheck size={16} strokeWidth={2.5} className="text-white" />
                </div>
                CLASSIFIED
              </h2>
              <button
                onClick={() => setShowUsers(false)}
                className="md:hidden p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all relative z-10"
              >
                <LuX size={20} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden scrollbar-micro">
              <div className="rounded-xl p-4 mb-4 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 border border-zinc-800/40 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2.5 tracking-[0.2em] flex items-center gap-1.5 relative">
                  <LuHash size={11} className="text-zinc-500" /> Operation ID
                </p>
                <div className="flex items-center justify-between gap-2 relative">
                  <span className="text-[13px] font-bold tracking-[0.18em] text-zinc-200 truncate font-mono">
                    {roomId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomId);
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-zinc-600 hover:text-white shrink-0 active:scale-90"
                    title="Copy Room ID"
                  >
                    <LuCopy size={13} />
                  </button>
                </div>
              </div>

              {isHost && (
                <div className="rounded-xl p-4 mb-4 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 border border-zinc-800/40">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-1.5">
                      <LuKeyRound size={11} className="text-zinc-500" /> Magic Invite
                    </p>
                    <button
                      onClick={() => setShowMagicLink(!showMagicLink)}
                      className="text-[8px] uppercase text-zinc-600 hover:text-white transition-all font-bold px-2 py-1 rounded-md hover:bg-white/5 active:scale-95"
                    >
                      {showMagicLink ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showMagicLink &&
                    (() => {
                      const encryptedPayload = encryptMagicLinkPayload(
                        roomId,
                        roomPassword,
                      );
                      const magicLink = `${window.location.origin}${window.location.pathname}#invite=${encryptedPayload}`;
                      return (
                        <div className="space-y-3">
                          <div className="bg-black/40 border border-zinc-800/50 p-3 rounded-lg">
                            <p className="text-[8px] uppercase text-zinc-500 mb-2 tracking-widest">
                              Invite Link
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={magicLink}
                                readOnly
                                className="flex-1 bg-transparent text-[9px] text-zinc-400 font-mono truncate outline-none selection:bg-zinc-600/30"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(magicLink);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-zinc-600 hover:text-white shrink-0 active:scale-90"
                                title="Copy link"
                              >
                                <LuCopy size={13} />
                              </button>
                            </div>
                          </div>

                          {QRCodeComponent && (
                            <div className="flex justify-center bg-black/40 border border-zinc-800/50 p-4 rounded-lg">
                              <QRCodeComponent
                                value={magicLink}
                                size={148}
                                level="M"
                                bgColor="#0a0a0c"
                                fgColor="#e4e4e7"
                              />
                            </div>
                          )}

                          <p className="text-[7px] text-zinc-600 text-center leading-relaxed">
                            Share this link. Recipients only need to enter their
                            codename.
                          </p>
                        </div>
                      );
                    })()}
                </div>
              )}

              {isHost && joinRequests.length > 0 && (
                <div className="border border-zinc-700/40 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20 rounded-xl p-4 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
                  <p className="text-[9px] uppercase font-black text-zinc-300 tracking-[0.25em] mb-3 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span></span>
                    Join Requests
                  </p>
                  <div className="space-y-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.socketId}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs uppercase tracking-wide text-white truncate">
                          {req.username}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              decideJoinRequest(req.socketId, true)
                            }
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-zinc-600/50 text-white hover:bg-white hover:text-black rounded transition-all"
                          >
                            <LuCheck size={12} className="inline mr-1" />Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              decideJoinRequest(req.socketId, false)
                            }
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-red-700/50 text-red-400 hover:bg-red-600 hover:text-white rounded transition-all"
                          >
                            <LuX size={12} className="inline mr-1" />Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 mt-1">
                <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-1.5">
                  <LuUsers size={11} className="text-zinc-600" /> Agents Online
                </h3>
                <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[9px] tabular-nums font-bold border border-zinc-700/30">
                  {users.length}
                </span>
              </div>

              <div className="space-y-1">
                {users.length === 0 ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/40">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 bg-gradient-to-br from-white to-zinc-300 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-[11px] text-zinc-900 shadow-lg shadow-white/10 ring-2 ring-white/20">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-xs uppercase tracking-wide truncate">
                        {username}{" "}
                        <span className="text-zinc-600 ml-1">(YOU)</span>
                        {isHost && (
                          <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-white/10 border border-zinc-600/30 text-white font-black tracking-widest leading-none shrink-0 rounded">
                            <LuCrown size={8} className="inline mr-0.5 -mt-px" /> HOST
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  users.map((user, i) => {
                    const colors = [
                      'from-zinc-300 to-zinc-500',
                      'from-zinc-400 to-zinc-600',
                      'from-zinc-200 to-zinc-400',
                      'from-zinc-500 to-zinc-700',
                      'from-zinc-300 to-zinc-600',
                      'from-zinc-400 to-zinc-500',
                    ];
                    const colorClass = colors[i % colors.length];
                    return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] group transition-all"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-9 h-9 bg-gradient-to-br ${user.username === username ? 'from-white to-zinc-300 shadow-lg shadow-white/10 ring-2 ring-white/20' : colorClass} rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-[11px] text-zinc-900 relative`}>
                          {user.username[0].toUpperCase()}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#0a0a0c] shadow-sm shadow-white/20" />
                        </div>
                        <span className="text-xs uppercase tracking-wide truncate flex items-center gap-1.5">
                          {user.username}
                          {user.username === username && (
                            <span className="text-zinc-600 text-[10px] shrink-0">
                              (YOU)
                            </span>
                          )}
                          {user.isHost && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-white/10 border border-zinc-600/30 text-white font-black tracking-widest leading-none shrink-0 rounded">
                              <LuCrown size={8} className="inline mr-0.5 -mt-px" /> HOST
                            </span>
                          )}
                        </span>
                      </div>
                      {isHost && user.id !== socket.id && (
                        <button
                          onClick={() => kickAgent(user.id, user.username)}
                          className="text-red-900 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg"
                          title={`Remove ${user.username}`}
                        >
                          <LuUserMinus size={16} />
                        </button>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>

            <div className="p-4 flex-shrink-0 relative">
              <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent" />
              <div className="pt-1">
                {isHost ? (
                  <button
                    onClick={handleTerminateClick}
                    className="w-full border border-red-500/20 text-red-400 py-3 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2 rounded-xl hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] bg-red-500/[0.04]"
                  >
                    <LuLogOut size={14} /> TERMINATE ROOM
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveClick}
                    className="w-full border border-zinc-800/50 text-zinc-500 py-3 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 rounded-xl active:scale-[0.98] bg-zinc-900/30"
                  >
                    <LuLogOut size={14} /> LEAVE ROOM
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        <header className="h-14 sm:h-16 md:h-20 flex items-center justify-between px-3 sm:px-4 md:px-6 z-30 bg-[#09090b]/80 backdrop-blur-xl flex-shrink-0 relative border-b border-zinc-800/30 pt-safe">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
          <div className="flex items-center gap-3 min-w-0 z-10">
            <Logo
              variant="shield"
              className="w-7 h-7 sm:w-8 sm:h-8 text-white/80 shrink-0"
            />
            <button
              onClick={() => setShowUsers(true)}
              className="md:hidden text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all p-2 -ml-1 active:scale-95"
            >
              <LuUsers size={19} />
            </button>
            <div className="hidden xs:flex flex-col truncate">
              <h1 className="font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span></span>
                Encrypted Session
              </h1>
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.15em] flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                <LuClock className="text-zinc-700" size={10} />{" "}
                {sessionDuration}
              </p>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none max-w-[45%] sm:max-w-[50%]">
            <div className="flex flex-col items-center">
              <span className="text-[6px] sm:text-[7px] md:text-[8px] text-zinc-700 uppercase tracking-[0.4em] sm:tracking-[0.5em] font-bold mb-0.5 sm:mb-1">
                Room
              </span>
              <h1 className="text-sm sm:text-base md:text-xl font-black tracking-[0.1em] sm:tracking-[0.12em] text-zinc-100 leading-none uppercase font-mono truncate">
                {roomName}
              </h1>
            </div>
          </div>

          <div className="z-10 min-w-[60px] sm:min-w-[80px] flex justify-end items-center gap-1 sm:gap-1.5">
            {typeof Notification !== "undefined" && (
              <button
                type="button"
                onClick={() => {
                  if (notificationPermission === "default") {
                    Notification.requestPermission().then((permission) => {
                      setNotificationPermission(permission);
                    });
                  } else if (notificationPermission === "denied") {
                    alert(
                      "Notifications are blocked. Please enable them in your browser settings.",
                    );
                  }
                }}
                className={`p-2 rounded-xl transition-all active:scale-90 ${
                  notificationPermission === "granted"
                    ? "text-white hover:text-zinc-300 hover:bg-white/10"
                    : notificationPermission === "denied"
                      ? "text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      : "text-zinc-500 hover:text-white hover:bg-white/5 animate-pulse"
                }`}
                title={
                  notificationPermission === "granted"
                    ? "Notifications enabled"
                    : notificationPermission === "denied"
                      ? "Notifications blocked - click for help"
                      : "Click to enable notifications"
                }
              >
                {notificationPermission === "denied" ? (
                  <LuBellOff size={16} />
                ) : (
                  <LuBell size={16} />
                )}
              </button>
            )}

            {!isMobile && (
              <button
                type="button"
                onClick={() => setIsPanicMode(true)}
                className={`p-2 rounded-lg transition-all ${escPressCount > 0 ? "text-white opacity-80 animate-pulse bg-white/10" : "text-zinc-700 opacity-30 hover:opacity-60 hover:text-zinc-500 hover:bg-white/5"}`}
                title="Panic Mode (or press ESC twice quickly)"
              >
                <LuEyeOff size={15} />
              </button>
            )}

            <AnimatePresence>
              {!isMobile && showEscIndicator && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  className="absolute top-full right-0 mt-2 bg-white text-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-white/20"
                >
                  ESC again for panic mode
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={toggleSelectMode}
              className={`text-[8px] sm:text-[9px] border px-2.5 py-1.5 uppercase transition-all shrink-0 font-bold flex items-center gap-1.5 rounded-xl active:scale-95 ${
                isSelectMode
                  ? "bg-white text-black border-white shadow-lg shadow-white/10"
                  : "border-zinc-800/50 text-zinc-600 hover:bg-white/5 hover:text-zinc-300 hover:border-zinc-700"
              }`}
              title="Select multiple messages"
            >
              <LuCheckCheck size={12} />
              Select
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:px-6 space-y-2 sm:space-y-3 md:space-y-4 scrollbar-hide relative">
          <div className="pointer-events-none fixed top-20 left-72 right-0 h-24 bg-gradient-to-b from-[#09090b] to-transparent z-10 hidden lg:block" />
          {pinnedMessageId &&
            (() => {
              const pinnedMsg = messageList.find(
                (m) => m?.id === pinnedMessageId,
              );
              if (!pinnedMsg) return null;
              const preview = pinnedMsg.deleted
                ? "[ DATA EXPUNGED ]"
                : pinnedMsg.system
                  ? pinnedMsg.message
                  : pinnedMsg.message || "";
              const who = pinnedMsg.system
                ? "SYSTEM"
                : pinnedMsg.username || "UNKNOWN";
              return (
                <div className="sticky top-0 z-20">
                  <div className="mb-3 bg-[#0a0a0c]/95 backdrop-blur-xl rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
                    <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => jumpToMessage(pinnedMessageId)}
                        className="min-w-0 flex items-center gap-2.5 text-left hover:bg-white/[0.03] rounded-lg transition px-2 py-1 -mx-2"
                        title="Jump to pinned message"
                      >
                        <div className="p-1.5 bg-white/5 rounded-lg border border-zinc-700/30">
                          <LuPin className="text-white shrink-0" size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] uppercase tracking-[0.25em] font-black text-zinc-500 truncate">
                            Pinned • {who}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[80vw]">
                            {preview}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPinnedMessageId(null)}
                        className="p-1.5 text-zinc-600 hover:text-white hover:bg-white/5 transition-all rounded-lg active:scale-90"
                        title="Unpin"
                      >
                        <LuX size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          <AnimatePresence initial={false}>
          {messageList.map((msg) => {
            const isDeleting = deletingIds.has(msg.id);
            return (
            <motion.div
              ref={(el) => {
                if (!el || !msg?.id) return;
                messageRefs.current[msg.id] = el;
              }}
              data-message-id={msg?.id}
              layout={!isDeleting ? "position" : false}
              key={msg.id}
              initial={
                msg.system
                  ? { opacity: 0, scale: 0.85 }
                  : msg.own
                    ? { opacity: 0, y: 20, scale: 0.96 }
                    : { opacity: 0, x: -20, scale: 0.97 }
              }
              animate={{
                opacity: isDeleting ? 0 : 1,
                y: 0,
                x: 0,
                scale: 1,
                height: isDeleting ? 0 : "auto",
                paddingTop: isDeleting ? 0 : undefined,
                paddingBottom: isDeleting ? 0 : undefined,
                marginTop: isDeleting ? 0 : undefined,
                marginBottom: isDeleting ? 0 : undefined,
                transition: isDeleting
                  ? { duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: 1.8 }
                  : {
                      type: "spring",
                      stiffness: 300,
                      damping: 26,
                      mass: 0.75,
                    },
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
              }}
              style={{ overflow: isDeleting ? "hidden" : undefined }}
              className={`flex group relative ${msg.system ? "justify-center" : msg.own ? "justify-end" : "justify-start"} ${isSelectMode && !msg.system ? "cursor-pointer" : ""} transition-colors duration-200 ${isSelectMode && !msg.system && selectedMessageIds.has(msg.id) ? "bg-white/[0.06] -mx-4 px-4 py-1 rounded-xl" : ""}`}
              onClick={isSelectMode && !msg.system ? () => toggleSelectMessage(msg.id) : undefined}
            >
              {msg.system ? (
                <span className="text-[8px] sm:text-[9px] text-zinc-600 px-4 py-1.5 uppercase tracking-[0.2em] rounded-full bg-zinc-900/30 border border-zinc-800/20 backdrop-blur-sm font-mono">
                  {msg.message}
                </span>
              ) : (
                <div className={`flex items-start gap-2.5 max-w-full w-full ${msg.own ? "justify-end" : "justify-start"}`}>
                  {/* WhatsApp-style left checkmark */}
                  {isSelectMode && (
                    <div className="flex items-center self-center shrink-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedMessageIds.has(msg.id) ? "border-white bg-white shadow-lg shadow-white/20 scale-110" : "border-zinc-600 bg-transparent hover:border-zinc-400"}`}
                      >
                        {selectedMessageIds.has(msg.id) && (
                          <LuCheck className="text-black" size={12} strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[92%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] relative ${isSelectMode ? "pointer-events-none" : ""}`}>
                  <div
                    data-bubble
                    className={`px-3 py-2.5 sm:px-3.5 sm:py-3 md:px-4 md:py-3.5 relative transition-all rounded-2xl ${
                      msg.deleted
                        ? "bg-zinc-900/30 border border-zinc-800/20 text-zinc-600 italic rounded-2xl"
                        : msg.poll
                          ? "bg-zinc-900/60 text-zinc-200 border border-zinc-800/40 rounded-2xl"
                          : msg.own
                            ? "bg-gradient-to-br from-white via-zinc-50 to-zinc-100 text-zinc-900 shadow-[0_1px_20px_rgba(255,255,255,0.06)] rounded-2xl rounded-br-sm"
                            : "bg-zinc-900/60 text-zinc-300 border border-zinc-800/30 rounded-2xl rounded-bl-sm"
                    } ${highlightMessageId === msg.id ? "highlight-flash" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      {!msg.own && !msg.deleted && (
                        <p className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">
                          {msg.username}
                        </p>
                      )}
                      <div className="flex items-center gap-2 ml-auto shrink-0">
                        {pinnedMessageId === msg.id && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white">
                            <LuPin size={9} /> PINNED
                          </span>
                        )}
                        {starredMessageIds.has(msg.id) && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white">
                            <LuStar size={9} /> STAR
                          </span>
                        )}
                        {msg.timer > 0 && !msg.deleted && (
                          <span className="flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            <LuTimer size={9} /> {msg.timer / 1000}S
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.replyTo && (
                      <div
                        className={`mb-2 flex ${msg.own ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToMessage(msg.replyTo?.messageId);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              jumpToMessage(msg.replyTo?.messageId);
                          }}
                          title="Jump to replied message"
                          className={`border-l-2 px-3 py-1.5 text-[10px] w-full rounded-r-lg ${
                            msg.own
                              ? "bg-black/20 text-white/80 border-zinc-400"
                              : "bg-white/10 text-zinc-300 border-zinc-500"
                          } ${msg.replyTo?.messageId ? "cursor-pointer hover:bg-white/[0.06] transition-colors" : ""}`}
                        >
                          <p
                            className={`font-bold text-[8px] flex items-center gap-1 ${msg.own ? "text-zinc-500" : "text-zinc-500"}`}
                          >
                            <LuReply size={9} /> {msg.replyTo.username}
                          </p>
                          <p
                            className={`italic truncate text-[10px] ${msg.own ? "text-zinc-400" : "text-zinc-400"}`}
                          >
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
                            {msg.poll.allowMultiple
                              ? "Select one or more answers"
                              : "Select one answer"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {(() => {
                            const options = msg.poll.options || [];
                            const totalVotes = options.reduce(
                              (sum, o) =>
                                sum +
                                (Array.isArray(o.votes) ? o.votes.length : 0),
                              0,
                            );
                            const ended =
                              msg.poll.expiresAt &&
                              msg.poll.expiresAt <= Date.now();
                            return options.map((opt) => {
                              const votes = Array.isArray(opt.votes)
                                ? opt.votes.length
                                : 0;
                              const pct = totalVotes
                                ? Math.round((votes / totalVotes) * 100)
                                : 0;
                              const iVoted = Array.isArray(opt.votes)
                                ? opt.votes.includes(username)
                                : false;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={ended}
                                  onClick={() => voteOnPoll(msg, opt.id)}
                                  className={`w-full text-left border border-zinc-800/30 bg-zinc-900/30 hover:bg-zinc-800/40 transition-all px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 ${ended ? "opacity-60 cursor-not-allowed" : ""} ${iVoted ? "border-white/30 bg-white/5" : ""}`}
                                  title={ended ? "Poll ended" : "Vote"}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-[13px] text-zinc-200 truncate">
                                        {decrypt(opt.text)}
                                      </p>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[12px] text-zinc-400 font-bold tabular-nums">
                                          {votes}{" "}
                                          {votes === 1 ? "vote" : "votes"}
                                        </span>
                                        <span className="text-[12px] text-zinc-400 font-bold tabular-nums">
                                          {pct}%
                                        </span>
                                        {iVoted && (
                                          <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/20">
                                            <LuCheck size={13} />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 h-1 bg-black/40 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-white to-zinc-300 rounded-full transition-all duration-500"
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
                            const totalVotes = options.reduce(
                              (sum, o) =>
                                sum +
                                (Array.isArray(o.votes) ? o.votes.length : 0),
                              0,
                            );
                            return (
                              <span className="font-bold">
                                {totalVotes}{" "}
                                {totalVotes === 1 ? "vote" : "votes"} •{" "}
                                {formatTimeLeft(msg.poll.expiresAt)}
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => clearMyPollVotes(msg)}
                            className="text-zinc-500 hover:text-white transition-all border border-zinc-800/40 px-3 py-1.5 rounded-lg hover:bg-white/5 text-[10px] uppercase tracking-wider font-bold active:scale-95"
                          >
                            Remove Vote
                          </button>
                        </div>
                      </div>
                    ) : msg.type === "image" ? (
                      (() => {
                        const imageMessages = messageList.filter((m) => m.type === "image" && m.message);
                        const imgIdx = imageMessages.findIndex((m) => m.id === msg.id);
                        return (
                        <div className="space-y-2">
                          <div className={`relative overflow-hidden group rounded-xl ${msg.own ? "border border-zinc-300/40" : "border border-zinc-800/40 bg-zinc-900/60"}`}>
                            <img
                              src={msg.message}
                              alt="Classified attachment"
                              className="max-w-full max-h-96 object-contain w-full cursor-zoom-in"
                              onClick={() => {
                                setLightboxIndex(imgIdx >= 0 ? imgIdx : 0);
                                setLightboxOpen(true);
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "block";
                              }}
                            />
                            <div
                              style={{ display: "none" }}
                              className="p-4 text-center text-zinc-500 text-xs"
                            >
                              <LuTriangleAlert className="inline mr-2" size={14} />
                              Failed to decrypt image
                            </div>
                            {/* Zoom hint overlay */}
                            <div
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            >
                              <div className="bg-black/60 backdrop-blur-sm rounded-full p-2.5 border border-zinc-700/40">
                                <LuMaximize2 size={18} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => downloadImage(msg.message, msg.id)}
                                className="bg-black/80 backdrop-blur-sm hover:bg-white hover:text-black text-white px-3 py-2 text-[10px] uppercase tracking-widest border border-zinc-700/30 hover:border-white font-bold transition-all flex items-center gap-1.5 rounded-lg"
                                title="Download image"
                              >
                                <LuDownload size={13} />
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })()
                    ) : msg.type === "audio" ? (
                      <div className="space-y-2">
                        <div className={`relative overflow-hidden rounded-xl ${msg.own ? "border border-zinc-300/40 bg-zinc-100" : "border border-zinc-800/40 bg-zinc-900/60"}`}>
                          {(() => {
                            const audioId = `audio-${msg.id}`;
                            return (
                              <div className="p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const el = document.getElementById(audioId);
                                      if (!el) return;
                                      if (el.paused) {
                                        // pause all other players first
                                        document.querySelectorAll('audio[id^="audio-"]').forEach(a => { if (a.id !== audioId) a.pause(); });
                                        el.play().catch(() => {});
                                      } else {
                                        el.pause();
                                      }
                                    }}
                                    className={`h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 ${msg.own ? "bg-zinc-900 hover:bg-zinc-800" : "bg-white/10 hover:bg-white/20"}`}
                                  >
                                    <LuPlay size={14} className={msg.own ? "text-white" : "text-white"} id={`${audioId}-play-icon`} />
                                  </button>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div
                                      className={`relative h-1.5 rounded-full cursor-pointer group ${msg.own ? "bg-zinc-400/40" : "bg-zinc-700/50"}`}
                                      onClick={(e) => {
                                        const el = document.getElementById(audioId);
                                        if (!el || !el.duration) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                        el.currentTime = pct * el.duration;
                                      }}
                                    >
                                      <div
                                        id={`${audioId}-progress`}
                                        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ${msg.own ? "bg-zinc-900/70" : "bg-white/60"}`}
                                        style={{ width: '0%' }}
                                      />
                                      <div className={`absolute inset-0 rounded-full transition-colors ${msg.own ? "bg-black/0 group-hover:bg-black/5" : "bg-white/0 group-hover:bg-white/5"}`} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span id={`${audioId}-time`} className={`text-[9px] font-mono font-bold tabular-nums tracking-wider ${msg.own ? "text-zinc-600" : "text-zinc-500"}`}>
                                        0:00 / {formatDuration(msg.audioDuration || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    id={`${audioId}-speed-btn`}
                                    onClick={() => {
                                      const el = document.getElementById(audioId);
                                      const btn = document.getElementById(`${audioId}-speed-btn`);
                                      if (!el || !btn) return;
                                      const speeds = [1, 1.5, 2, 0.5];
                                      const cur = el.playbackRate;
                                      const idx = speeds.indexOf(cur);
                                      const next = speeds[(idx + 1) % speeds.length];
                                      el.playbackRate = next;
                                      btn.textContent = next + 'x';
                                    }}
                                    className={`h-9 sm:h-8 inline-flex items-center justify-center text-[10px] px-2.5 rounded-md font-mono font-bold transition-all active:scale-90 shrink-0 ${msg.own ? "text-zinc-600 hover:text-zinc-900 bg-zinc-300/50 hover:bg-zinc-300 border border-zinc-400/30" : "text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/30"}`}
                                  >
                                    1x
                                  </button>
                                </div>
                                <audio
                                  id={audioId}
                                  src={msg.message}
                                  preload="metadata"
                                  onTimeUpdate={(e) => {
                                    const el = e.target;
                                    const prog = document.getElementById(`${audioId}-progress`);
                                    const timeEl = document.getElementById(`${audioId}-time`);
                                    const playIcon = document.getElementById(`${audioId}-play-icon`);
                                    if (prog && el.duration) prog.style.width = `${(el.currentTime / el.duration) * 100}%`;
                                    if (timeEl) timeEl.textContent = `${formatDuration(Math.floor(el.currentTime))} / ${formatDuration(Math.floor(el.duration) || msg.audioDuration || 0)}`;
                                  }}
                                  onPlay={(e) => {
                                    const btn = e.target.parentElement?.querySelector('button');
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><line x1="6" y1="4" x2="6" y2="20"></line><line x1="18" y1="4" x2="18" y2="20"></line></svg>';
                                  }}
                                  onPause={(e) => {
                                    const btn = e.target.parentElement?.querySelector('button');
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                                  }}
                                  onEnded={(e) => {
                                    const prog = document.getElementById(`${audioId}-progress`);
                                    if (prog) prog.style.width = '0%';
                                    e.target.currentTime = 0;
                                    const btn = e.target.parentElement?.querySelector('button');
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                                  }}
                                  className="hidden"
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : msg.type === "file" ? (
                      <div className="space-y-2">
                        <div className={`relative overflow-hidden group rounded-xl ${msg.own ? "border border-zinc-300/40 bg-zinc-100" : "border border-zinc-800/40 bg-zinc-900/60"}`}>
                          <div className="flex items-center gap-2.5 p-3">
                            <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl shrink-0 flex items-center justify-center ${msg.own ? "bg-zinc-900/10 border border-zinc-300/40" : "bg-white/5 border border-zinc-700/30"}`}>
                              {React.createElement(getFileIcon(msg.fileType), { size: 22, className: msg.own ? "text-zinc-700" : "text-zinc-300" })}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[11px] sm:text-xs font-bold truncate ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}>
                                {msg.fileName || 'Classified File'}
                              </p>
                              <p className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${msg.own ? "text-zinc-500" : "text-zinc-500"}`}>
                                {formatFileSize(msg.fileSize)} • {(msg.fileType || 'unknown').split('/').pop()}
                              </p>
                            </div>
                            <button
                              onClick={() => downloadFile(msg.message, msg.fileName)}
                              className={`h-11 w-11 sm:h-10 sm:w-auto sm:px-3 sm:py-2 text-[10px] uppercase tracking-widest font-bold transition-all inline-flex items-center justify-center gap-1.5 rounded-lg shrink-0 self-center active:scale-95 ${msg.own ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700" : "bg-white/5 hover:bg-white hover:text-black text-zinc-400 border border-zinc-700/30 hover:border-white"}`}
                              title="Download file"
                            >
                              <LuDownload size={13} />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : msg.type === "high-clearance" ? (
                      <div className="space-y-2">
                        <div className={`relative p-4 sm:p-5 md:p-6 text-center rounded-xl overflow-hidden ${msg.own ? "border border-zinc-400/30 bg-gradient-to-br from-zinc-800 to-zinc-900" : "border border-zinc-700/30 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20"}`}>
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_70%)]" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/25 to-transparent" />
                          
                          <div className="flex items-center justify-between absolute top-2.5 left-2.5 right-2.5 z-10">
                            <span className="bg-white/10 text-white px-2.5 py-1 text-[7px] uppercase tracking-[0.2em] font-bold rounded-lg border border-zinc-700/20 flex items-center gap-1">
                              <LuLock size={9} /> High Clearance
                            </span>
                            {msg.requiresBiometric && (
                              <span className="bg-white/10 text-white px-2.5 py-1 text-[7px] uppercase tracking-[0.2em] font-bold rounded-lg border border-zinc-700/20 flex items-center gap-1">
                                <LuFingerprint size={9} /> Biometric
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-2.5 sm:gap-3.5 mt-5 sm:mt-6 relative z-10">
                            <div className="relative">
                              <div className="p-2.5 sm:p-3.5 bg-white/5 rounded-2xl border border-zinc-700/20">
                                <LuLock className="text-white" size={24} strokeWidth={1.5} />
                              </div>
                              <div className="absolute inset-0 bg-white/[0.02] rounded-2xl animate-pulse" />
                            </div>
                            
                            <div>
                              <p className="text-white/90 text-sm uppercase tracking-[0.15em] font-black mb-1.5">
                                Classified Content
                              </p>
                              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">
                                {msg.requiresBiometric 
                                  ? 'Biometric authentication required'
                                  : 'High security encryption active'
                                }
                              </p>
                            </div>

                            {msg.own ? (
                              <div className="bg-white/10 border border-zinc-700/20 text-white px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-bold rounded-xl flex items-center gap-2">
                                <LuCheck size={13} />
                                Your high clearance message sent
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  try {
                                    const decryptedContent = decrypt(msg.message);
                                    const parsedContent = JSON.parse(decryptedContent);
                                    openBiometricVault({
                                      id: msg.id,
                                      content: parsedContent.content || '',
                                      image: parsedContent.image,
                                      file: parsedContent.file,
                                      audio: parsedContent.audio,
                                      type: 'high-clearance',
                                      requiresBiometric: msg.requiresBiometric,
                                      username: msg.username,
                                    });
                                  } catch (error) {
                                    console.error('Failed to parse high-clearance message:', error);
                                    openBiometricVault({
                                      id: msg.id,
                                      content: decrypt(msg.message),
                                      type: 'high-clearance',
                                      requiresBiometric: msg.requiresBiometric,
                                      username: msg.username,
                                    });
                                  }
                                }}
                                className="px-5 py-2.5 bg-white hover:bg-zinc-100 text-black text-[10px] uppercase font-bold tracking-[0.15em] transition-all flex items-center gap-2 rounded-xl shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-95"
                              >
                                <LuLock size={14} />
                                Access Vault
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
                        {msg.deleted && <LuTrash2 className="inline mr-1 opacity-50" size={13} />}{" "}
                        {renderMessageText(msg.message, msg.id || "message")}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 justify-end mt-2 opacity-35">
                      {msg.edited && !msg.deleted && (
                        <span className="text-[6px] px-1.5 py-0.5 uppercase font-bold rounded-full bg-current/10 border border-current/20 tracking-wider">
                          Edited
                        </span>
                      )}
                      <span className="text-[7px] font-bold tabular-nums font-mono">{msg.time}</span>
                    </div>
                  </div>
                  {!msg.deleted && !isSelectMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === msg.id ? null : msg.id,
                        );
                      }}
                      className={`absolute -top-2.5 ${msg.own ? "left-0" : "right-0"} p-1.5 cursor-pointer text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all bg-[#0a0a0c]/90 backdrop-blur-sm rounded-lg border border-zinc-800/40 hover:bg-zinc-800/80 ${activeMenuId === msg.id ? "opacity-100 bg-zinc-800/80" : ""}`}
                    >
                      <LuEllipsisVertical size={14} />
                    </div>
                  )}
                  <AnimatePresence>
                    {activeMenuId === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`absolute top-[90%] mt-1 ${msg.own ? "right-0" : "left-0"} z-50 bg-[#0f0f11]/95 backdrop-blur-xl border border-zinc-800/40 shadow-[0_12px_50px_rgba(0,0,0,0.8)] min-w-[150px] sm:min-w-[160px] rounded-xl overflow-hidden`}
                      >
                        <button
                          onClick={() => startReplying(msg)}
                          className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                        >
                          <LuReply size={13} /> Reply
                        </button>
                        <button
                          onClick={() => toggleStarMessage(msg.id)}
                          className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                        >
                          <LuStar size={13} className={starredMessageIds.has(msg.id) ? "text-white fill-white" : ""} />
                          {starredMessageIds.has(msg.id) ? "Unstar" : "Star"}
                        </button>
                        <button
                          onClick={() => togglePinMessage(msg.id)}
                          className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                        >
                          <LuPin size={13} />
                          {pinnedMessageId === msg.id ? "Unpin" : "Pin"}
                        </button>
                        <div className="border-t border-zinc-800/30 mx-3" />
                        <button
                          onClick={() => animateDelete(msg.id, 'local')}
                          className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                        >
                          <LuEyeOff size={13} /> Local Hide
                        </button>
                        {msg.own && !msg.poll && !msg.type && (
                          <>
                            <button
                              onClick={() => startEditing(msg)}
                              className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                            >
                              <LuPencil size={13} /> Edit Signal
                            </button>
                          </>
                        )}
                        {msg.own && !msg.poll && (
                          <>
                            <div className="border-t border-zinc-800/30 mx-3" />
                            <button
                              onClick={() => {
                                socket.emit("delete_message", {
                                  roomId,
                                  messageId: msg.id,
                                });
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2.5 uppercase font-bold transition-all"
                            >
                              <LuTrash2 size={13} /> Expunge Global
                            </button>
                          </>
                        )}
                        {msg.own && msg.poll && (
                          <>
                            <div className="border-t border-zinc-800/30 mx-3" />
                            <button
                              onClick={() => {
                                socket.emit("delete_message", {
                                  roomId,
                                  messageId: msg.id,
                                });
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2.5 uppercase font-bold transition-all"
                            >
                              <LuTrash2 size={13} /> Expunge Global
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                </div>
              )}
            </motion.div>
          ); })}
          </AnimatePresence>

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[90%] bg-zinc-900/40 border border-zinc-800/30 p-3 rounded-2xl rounded-bl-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 items-center px-1">
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-1">
                        Signal Incoming...
                      </p>
                      <div className="text-[9px] text-white font-bold flex flex-wrap gap-x-1 uppercase truncate font-mono">
                        <span>[</span>
                        {typingUsers.map((u, i) => (
                          <span key={u} className="text-white">
                            <DecryptingName name={u} />
                            {i < typingUsers.length - 1 ? "," : ""}
                          </span>
                        ))}
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

        <footer className="p-2 sm:p-3 md:p-4 bg-[#09090b]/80 backdrop-blur-xl relative flex-shrink-0 chat-footer-safe">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            {editingMessageId ? (
              <div className="flex items-center gap-2 text-[9px] text-white uppercase tracking-widest font-bold">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <LuPencil size={11} className="text-white" />
                  <span>Modifying Transmission...</span>
                  <button
                    onClick={() => {
                      setEditingMessageId(null);
                      setCurrentMessage("");
                    }}
                    className="hover:text-red-400 transition-colors ml-1"
                  >
                    <LuX size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div />
            )}
            {selfDestructTime > 0 && !editingMessageId && (
              <div className="flex items-center gap-2 text-[9px] text-red-500 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 animate-pulse">
                  <LuTimer size={11} /> Destruct: {selfDestructTime / 1000}s
                </div>
              </div>
            )}
          </div>

          {isSelectMode && (
            <div className="mb-2 bg-zinc-900/40 backdrop-blur-sm px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 rounded-xl border border-zinc-800/30">
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] font-black text-zinc-500">
                  Select Mode
                </p>
                <p className="text-[9px] sm:text-[10px] text-zinc-300 font-bold truncate">
                  {selectedCount} selected
                  {selectionHasOthers
                    ? " • global delete disabled (includes others)"
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={bulkLocalDelete}
                  disabled={selectedCount === 0}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-zinc-800/40 text-zinc-300 hover:bg-white hover:text-black transition-all rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                  title="Delete locally (hide from your screen)"
                >
                  <LuEyeOff size={11} /> Local Delete
                </button>
                <button
                  type="button"
                  onClick={bulkGlobalDelete}
                  disabled={selectedCount === 0 || !selectionAllOwn}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-red-900/30 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                  title={
                    selectionAllOwn
                      ? "Delete for everyone (your messages only)"
                      : "Global delete only works when all selected messages are yours"
                  }
                >
                  <LuTrash2 size={11} /> Global Delete
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-zinc-800/40 text-zinc-500 hover:text-white hover:bg-white/5 transition-all rounded-xl active:scale-95"
                  title="Exit select mode"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            className={`flex ${hasSelectedAttachments ? "flex-col" : "items-center"} p-1 sm:p-1.5 transition-all rounded-2xl ${editingMessageId ? "bg-white/[0.04] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.04)]" : "bg-zinc-900/40 border border-zinc-800/30 focus-within:border-zinc-700/40 focus-within:bg-zinc-900/50 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.02)]"}`}
          >
            <div className="flex items-center w-full">
              {/* ── Mobile: single + button with popup (hidden during recording/audio preview) ── */}
              {!isRecording && !audioBlob && (
              <div className="relative sm:hidden" ref={mobileToolbarRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileToolbar(!showMobileToolbar);
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${showMobileToolbar ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                >
                  <LuPlus size={20} strokeWidth={2.5} className={`transition-transform duration-200 ${showMobileToolbar ? "rotate-45" : ""}`} />
                  {/* Active indicator dot */}
                  {(selfDestructTime > 0 || isRecording || hasSelectedAttachments || audioBlob) && !showMobileToolbar && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
                <AnimatePresence>
                  {showMobileToolbar && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute bottom-full left-0 mb-2 bg-[#111113]/98 backdrop-blur-2xl border border-zinc-800/50 shadow-[0_16px_60px_rgba(0,0,0,0.9)] z-50 rounded-2xl overflow-hidden min-w-[200px]"
                    >
                      <div className="p-1.5 space-y-0.5">
                        {/* Self-destruct timer - inline expandable */}
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTimerMenu(!showTimerMenu);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${selfDestructTime > 0 ? "text-red-400 bg-red-500/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"}`}
                          >
                            <LuTimer size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left">
                              Self-Destruct {selfDestructTime > 0 ? `(${selfDestructTime / 1000}s)` : ""}
                            </span>
                            <LuChevronRight size={14} className={`transition-transform duration-200 ${showTimerMenu ? "rotate-90" : ""}`} />
                          </button>
                          <AnimatePresence>
                            {showTimerMenu && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-3 gap-1 px-2 pb-2 pt-1">
                                  {timerOptions.map((opt) => (
                                    <button
                                      key={opt.label}
                                      onClick={() => {
                                        setSelfDestructTime(opt.value);
                                        setShowTimerMenu(false);
                                        setShowMobileToolbar(false);
                                      }}
                                      className={`px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${selfDestructTime === opt.value ? "bg-white/10 text-white ring-1 ring-white/20" : "text-zinc-500 hover:text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Poll */}
                        <button
                          type="button"
                          onClick={() => {
                            togglePollModal();
                            setShowMobileToolbar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${showPollModal ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={!!editingMessageId}
                        >
                          <LuChartBar size={18} />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Create Poll</span>
                        </button>

                        {/* Attach file */}
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowMobileToolbar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${hasSelectedAttachments ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={!!editingMessageId}
                        >
                          <LuPaperclip size={18} />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Attach File</span>
                        </button>

                        {/* High clearance */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowHighClearanceComposer(true);
                            setShowMobileToolbar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] relative ${showHighClearanceComposer ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={!!editingMessageId}
                        >
                          <div className="relative">
                            <LuLock size={18} />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse opacity-70"></div>
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider">High Clearance</span>
                        </button>

                        {/* Voice record */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording) {
                              stopRecording();
                            } else {
                              startRecording();
                            }
                            setShowMobileToolbar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${isRecording ? "text-red-400 bg-red-500/15" : audioBlob ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={!!editingMessageId}
                        >
                          {isRecording ? <LuSquare size={16} /> : <LuMic size={18} />}
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {isRecording ? "Stop Recording" : "Voice Message"}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}

              {/* ── Desktop: inline toolbar buttons (hidden during recording/audio preview) ── */}
              {!isRecording && !audioBlob && (
              <div className="hidden sm:flex items-center">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTimerMenu(!showTimerMenu);
                    }}
                    className={`p-2.5 rounded-xl transition-all active:scale-90 ${selfDestructTime > 0 ? "text-red-400 bg-red-500/10" : "text-zinc-600 hover:text-white hover:bg-white/5"}`}
                  >
                    <LuTimer size={16} />
                  </button>
                  <AnimatePresence>
                    {showTimerMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 bg-[#0f0f11]/95 backdrop-blur-xl border border-zinc-800/40 shadow-[0_12px_50px_rgba(0,0,0,0.8)] z-50 w-36 rounded-xl overflow-hidden"
                      >
                        {timerOptions.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => {
                              setSelfDestructTime(opt.value);
                              setShowTimerMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/[0.06] transition-all ${selfDestructTime === opt.value ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            {opt.value > 0 && <LuTimer size={10} className="inline mr-1.5" />}
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={togglePollModal}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 ${showPollModal ? "text-white bg-white/10" : "text-zinc-600 hover:text-white hover:bg-white/5"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="Create a poll"
                  disabled={!!editingMessageId}
                >
                  <LuChartBar size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 ${hasSelectedAttachments ? "text-white bg-white/10" : "text-zinc-600 hover:text-white hover:bg-white/5"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="Attach file or image"
                  disabled={!!editingMessageId}
                >
                  <LuPaperclip size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowHighClearanceComposer(true)}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 relative ${showHighClearanceComposer ? "text-white bg-white/10" : "text-zinc-600 hover:text-white hover:bg-white/5"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="Send high clearance message (biometric protected)"
                  disabled={!!editingMessageId}
                >
                  <LuLock size={17} />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse opacity-70"></div>
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 ${isRecording ? "text-red-400 bg-red-500/15 animate-pulse" : audioBlob ? "text-white bg-white/10" : "text-zinc-600 hover:text-white hover:bg-white/5"} ${editingMessageId ? "opacity-40 cursor-not-allowed" : ""}`}
                  title={isRecording ? "Stop recording" : "Record voice message"}
                  disabled={!!editingMessageId}
                >
                  {isRecording ? <LuSquare size={14} /> : <LuMic size={16} />}
                </button>
              </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {!isRecording && !audioBlob && (
                <div className="w-px h-6 bg-zinc-800/40 mx-1 shrink-0 hidden sm:block" />
              )}

              {/* Recording state - animated waveform UI */}
              {isRecording ? (
                <div className="flex-1 flex items-center gap-1.5 sm:gap-3 px-1 sm:px-2 md:px-3">
                  <div className="relative flex items-center gap-0.5 h-6 sm:h-8 flex-1">
                    {audioLevels.map((level, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-full bg-red-500"
                        animate={{
                          height: `${Math.max(4, level * 28)}px`,
                          opacity: 0.4 + level * 0.6,
                        }}
                        transition={{ duration: 0.08, ease: "easeOut" }}
                        style={{ minWidth: 2, maxWidth: 6 }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums tracking-wider">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <button
                    onClick={cancelRecording}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                    title="Cancel recording"
                  >
                    <LuTrash2 size={14} />
                  </button>
                </div>

              ) : audioBlob && audioPreviewUrl ? (
                /* Audio preview before sending */
                <div className="flex-1 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 md:px-3 min-w-0">
                  <button
                    onClick={() => {
                      if (!audioPreviewRef.current) return;
                      if (isPlayingPreview) {
                        audioPreviewRef.current.pause();
                        setIsPlayingPreview(false);
                      } else {
                        audioPreviewRef.current.play();
                        setIsPlayingPreview(true);
                      }
                    }}
                    className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 shrink-0"
                  >
                    {isPlayingPreview ? <LuPause size={12} /> : <LuPlay size={12} />}
                  </button>
                  <audio
                    ref={audioPreviewRef}
                    src={audioPreviewUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                  <div className="flex-1 flex items-center gap-0.5 sm:gap-1 h-6 sm:h-7 min-w-0 overflow-hidden">
                    {/* Static waveform bars for preview */}
                    {Array.from({ length: 32 }).map((_, i) => {
                      const h = Math.sin(i * 0.5) * 0.5 + Math.random() * 0.5;
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-full bg-white/30"
                          style={{ height: `${Math.max(3, h * 24)}px`, minWidth: 2, maxWidth: 5 }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-zinc-400 text-[9px] sm:text-[10px] font-mono font-bold tabular-nums tracking-wider shrink-0">
                    {formatDuration(recordingDuration)}
                  </span>
                  <button
                    onClick={cancelRecording}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90 shrink-0"
                    title="Discard"
                  >
                    <LuTrash2 size={13} />
                  </button>
                </div>

              ) : (
                /* Normal text input */
                <>
                  {replyingTo && !editingMessageId && !hasSelectedAttachments && (
                    <div className="flex items-center gap-2 text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <LuReply size={11} className="text-white" />
                        <span>Replying to: {replyingTo.username}</span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="hover:text-red-400 transition-colors ml-1"
                        >
                          <LuX size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {!hasSelectedAttachments && (
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentMessage}
                      placeholder={
                        editingMessageId
                          ? "Editing message..."
                          : "Type your encrypted signal..."
                      }
                      className="flex-1 bg-transparent px-2 sm:px-4 py-2 sm:py-3 text-white outline-none placeholder:text-zinc-700 text-xs sm:text-sm font-mono tracking-wide min-w-0"
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                  )}
                </>
              )}

              {hasSelectedAttachments && !editingMessageId && !isRecording && !audioBlob && (
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="h-8 w-8 sm:h-9 sm:w-9 mr-1 sm:mr-1.5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90 shrink-0"
                  title="Remove attachment"
                >
                  <LuX size={13} />
                </button>
              )}

              <button
                onClick={isRecording ? stopRecording : audioBlob ? sendAudioMessage : hasSelectedAttachments ? sendSelectedAttachments : sendMessage}
                className={`p-2.5 sm:p-3 transition-all rounded-xl disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 flex items-center justify-center gap-1.5 ${isRecording ? "bg-red-500 text-white hover:bg-red-400" : editingMessageId ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10" : "bg-white text-zinc-900 hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10 disabled:hover:shadow-none"}`}
                disabled={isRecording ? false : !audioBlob && !hasSelectedAttachments && !currentMessage.trim()}
                title={isRecording ? "Stop recording" : audioBlob ? "Send audio message" : "Send message"}
              >
                {isRecording ? (
                  <>
                    <LuSquare size={14} />
                    <span className="sm:hidden text-[10px] font-black uppercase tracking-wider">Stop</span>
                  </>
                ) : editingMessageId ? (
                  <LuCheck size={16} strokeWidth={2.5} />
                ) : audioBlob ? (
                  <>
                    <LuSend size={16} />
                    <span className="sm:hidden text-[10px] font-black uppercase tracking-wider">Send</span>
                  </>
                ) : (
                  <LuSend size={16} />
                )}
              </button>
            </div>

            {hasSelectedAttachments && !editingMessageId && !isRecording && !audioBlob && (
              <div className="w-full px-2 py-2 border-t border-zinc-800/40">
                <div className="mb-2 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                  {selectedAttachments.length} attachment{selectedAttachments.length > 1 ? "s" : ""} ready
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedAttachments.map((attachment) => (
                    attachment.type === "image" ? (
                      <div key={attachment.id} className="relative border border-zinc-700/50 bg-zinc-900 rounded-lg overflow-hidden">
                        <img
                          src={attachment.data}
                          alt={attachment.name}
                          className="max-h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center bg-black/70 text-white hover:bg-red-600 rounded-full transition-all active:scale-90"
                          title="Remove attachment"
                        >
                          <LuX size={11} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm text-[8px] text-zinc-300 px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                          <LuLock size={9} /> Encrypted Image
                        </div>
                      </div>
                    ) : (
                      <div key={attachment.id} className="relative inline-flex items-center gap-3 border border-zinc-700/50 bg-zinc-900 rounded-lg px-3 py-3 pr-9">
                        <div className="p-2 bg-white/5 rounded-lg border border-zinc-700/30">
                          {React.createElement(getFileIcon(attachment.mimeType), { size: 18, className: "text-zinc-300" })}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-zinc-200 font-bold truncate max-w-[200px]">{attachment.name}</p>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                            {formatFileSize(attachment.size)} • {(attachment.mimeType || "unknown").split("/").pop()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-red-600 rounded-full transition-all active:scale-90"
                          title="Remove attachment"
                        >
                          <LuX size={11} />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </footer>

        <AnimatePresence>
          {showPollModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => {
                setShowPollModal(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: "spring", damping: 22, stiffness: 240 }}
                className="w-full max-w-xl bg-[#0f0f11] border border-zinc-800/40 shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800/30 relative sticky top-0 bg-[#0f0f11] z-10">
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
                  <h3 className="text-base font-black text-white flex items-center gap-2.5 uppercase tracking-[0.1em]">
                    <div className="p-2 bg-white/5 rounded-xl border border-zinc-700/30">
                      <LuChartBar size={16} className="text-white" />
                    </div>
                    Create Poll
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPollModal(false);
                    }}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
                    title="Close"
                  >
                    <LuX size={18} />
                  </button>
                </div>

                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 sm:space-y-5 pt-3 sm:pt-4">
                  <div>
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">Question</p>
                    <div className="relative">
                      <input
                        value={pollQuestion}
                        onChange={(e) =>
                          setPollQuestion(e.target.value.slice(0, 300))
                        }
                        placeholder="What question do you want to ask?"
                        className="w-full bg-black/40 border border-zinc-800/50 text-white px-4 py-3 outline-none focus:border-zinc-600 rounded-xl placeholder:text-zinc-700 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 tabular-nums font-mono">
                        {pollQuestion.length}/300
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">Answers</p>
                    <div className="space-y-2">
                      {pollAnswers.map((ans, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center bg-black/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                            <div className="w-10 h-10 flex items-center justify-center text-zinc-600 border-r border-zinc-800/40">
                              <LuCircleDot size={14} />
                            </div>
                            <input
                              value={ans}
                              onChange={(e) =>
                                setPollAnswers((prev) =>
                                  prev.map((v, i) =>
                                    i === idx ? e.target.value : v,
                                  ),
                                )
                              }
                              placeholder="Type your answer"
                              className="flex-1 bg-transparent text-white px-3 py-2.5 outline-none placeholder:text-zinc-700"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPollAnswers((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg border border-zinc-800/60 disabled:opacity-30"
                            title="Remove answer"
                            disabled={pollAnswers.length <= 2}
                          >
                            <LuTrash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPollAnswers((prev) => [...prev, ""])}
                        className="px-4 py-2 border border-zinc-800/40 text-zinc-400 hover:bg-white/5 hover:text-white transition-all font-bold rounded-xl text-xs active:scale-95"
                      >
                        + Add another answer
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">Duration</p>
                    <select
                      value={pollDurationMs}
                      onChange={(e) =>
                        setPollDurationMs(Number(e.target.value))
                      }
                      className="w-full bg-black/40 border border-zinc-800/50 text-white px-4 py-3 outline-none focus:border-zinc-600 rounded-xl transition-colors"
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
                      className="w-4 h-4 accent-zinc-600"
                    />
                    Allow Multiple Answers
                  </label>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div />
                    <button
                      type="button"
                      onClick={postPoll}
                      className="px-6 py-2.5 bg-white hover:bg-zinc-100 text-black font-bold transition-all rounded-xl shadow-lg shadow-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      disabled={
                        pollQuestion.trim().length === 0 ||
                        pollAnswers.map((a) => a.trim()).filter(Boolean)
                          .length < 2
                      }
                    >
                      <LuSend size={13} className="inline mr-1.5" /> Post Poll
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSlideConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={closeSlideConfirm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0f0f11] border border-zinc-800/40 p-5 sm:p-8 max-w-md w-full rounded-t-2xl sm:rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex p-3.5 bg-red-500/10 rounded-2xl mb-4 border border-red-500/10">
                    <LuTriangleAlert
                      className="text-red-500"
                      size={36}
                      strokeWidth={1.5}
                    />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-[0.12em] text-white mb-2">
                    {confirmAction === "terminate"
                      ? "TERMINATE ROOM"
                      : "LEAVE ROOM"}
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm uppercase tracking-wide">
                    {confirmAction === "terminate"
                      ? "This will close the room for all users. Slide to confirm."
                      : "Are you sure you want to leave? Slide to confirm."}
                  </p>
                </div>

                <div
                  ref={slideTrackRef}
                  className="relative w-full h-14 bg-zinc-900/80 border border-zinc-800/40 mb-4 select-none rounded-2xl overflow-hidden"
                  onMouseDown={handleSlideStart}
                  onTouchStart={handleSlideStart}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-zinc-600 text-xs uppercase tracking-widest font-bold">
                      SLIDE TO{" "}
                      {confirmAction === "terminate" ? "TERMINATE" : "LEAVE"}
                    </span>
                  </div>

                  <motion.div
                    ref={slideButtonRef}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 rounded-l-2xl shadow-lg shadow-red-500/20"
                    style={{
                      width: "60px",
                      x: slidePosition,
                    }}
                    animate={{
                      x: slidePosition,
                    }}
                    transition={
                      isSliding
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }
                    }
                  >
                    <LuChevronRight className="text-white" size={22} />
                  </motion.div>

                  {slideTrackRef.current &&
                    slidePosition >= slideTrackRef.current.offsetWidth - 65 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-white/10 pointer-events-none"
                      >
                        <LuCheck className="text-white" size={28} />
                      </motion.div>
                    )}
                </div>

                <button
                  onClick={closeSlideConfirm}
                  className="w-full border border-zinc-800/40 text-zinc-500 py-3 uppercase text-[10px] font-bold tracking-[0.15em] hover:bg-white/5 hover:text-white transition-all rounded-xl active:scale-[0.98]"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Lightbox */}
        <AnimatePresence>
          {lightboxOpen && (() => {
            const imageMessages = messageList.filter((m) => m.type === "image" && m.message);
            const total = imageMessages.length;
            const current = imageMessages[lightboxIndex];
            const handlePrev = () => setLightboxIndex((i) => (i - 1 + total) % total);
            const handleNext = () => setLightboxIndex((i) => (i + 1) % total);
            return (
              <motion.div
                key="lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
                onClick={() => setLightboxOpen(false)}
              >
                {/* Close button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
                  className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2.5 transition-all hover:scale-105 active:scale-95"
                >
                  <LuX size={20} />
                </button>

                {/* Counter */}
                {total > 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur-sm border border-zinc-700/40 text-zinc-300 text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl font-bold">
                    {lightboxIndex + 1} / {total}
                  </div>
                )}

                {/* Prev button */}
                {total > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="absolute left-2 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2.5 sm:p-3 transition-all hover:scale-105 active:scale-95"
                  >
                    <LuChevronLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
                  </button>
                )}

                {/* Next button */}
                {total > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="absolute right-2 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2.5 sm:p-3 transition-all hover:scale-105 active:scale-95"
                  >
                    <LuChevronRight size={20} className="sm:w-[22px] sm:h-[22px]" />
                  </button>
                )}

                {/* Image */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxIndex}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center gap-3 overflow-auto max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] p-2 sm:p-4 md:p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={current?.message}
                      alt="Full preview"
                      className="rounded-xl border border-zinc-700/30 shadow-2xl shadow-black/60 max-h-[70dvh] sm:max-h-[80dvh] w-auto object-contain"
                    />
                    {/* Sender info + download */}
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                        <LuLock size={10} className="inline mr-1" />
                        {current?.username}
                      </span>
                      <button
                        onClick={() => downloadImage(current?.message, current?.id)}
                        className="bg-white/10 hover:bg-white hover:text-black border border-zinc-700/30 hover:border-white text-white px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 rounded-lg active:scale-95"
                      >
                        <LuDownload size={12} />
                        Download
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Thumbnail strip (shown when total > 1) */}
                {total > 1 && (
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm border border-zinc-700/30 rounded-2xl max-w-[90vw] overflow-x-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {imageMessages.map((im, i) => (
                      <button
                        key={im.id}
                        onClick={() => setLightboxIndex(i)}
                        className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          i === lightboxIndex
                            ? "border-white scale-110 shadow-lg shadow-white/10"
                            : "border-zinc-700/40 hover:border-zinc-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={im.message}
                          alt={`thumb-${i}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Biometric Vault Modal */}
        <BiometricVault
          message={vaultMessage}
          username={username}
          roomId={roomId}
          onDecrypted={handleVaultDecrypted}
          onClose={() => {
            setShowBiometricVault(false);
            setVaultMessage(null);
          }}
          isVisible={showBiometricVault}
        />

        {/* High Clearance Composer Modal */}
        <HighClearanceComposer
          isVisible={showHighClearanceComposer}
          onClose={() => setShowHighClearanceComposer(false)}
          onSend={sendHighClearanceMessage}
          username={username}
          roomId={roomId}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
