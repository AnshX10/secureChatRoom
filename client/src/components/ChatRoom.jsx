import React, { useEffect, useMemo, useState, useRef } from "react";
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
  LuMicOff,
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

const ROOM_ID_BOX_COUNT = 8;
const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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
  roomCapacity,
  roomLocked,
  roomSilencedUserIds,
}) => {
  const hostChatStorageKey =
    isHost && roomId ? `host_chat_history_${roomId}` : null;
  const [currentMessage, setCurrentMessage] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [mentionContext, setMentionContext] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [users, setUsers] = useState(initialUsers || []);
  const [showUsers, setShowUsers] = useState(
    typeof window !== "undefined" ? window.innerWidth > 768 : false,
  );
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeHostActionUserId, setActiveHostActionUserId] = useState(null);
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
  const [showSidebarHintLine, setShowSidebarHintLine] = useState(false);
  const [startSidebarHintMorph, setStartSidebarHintMorph] = useState(false);
  const [showMobileChevronHandle, setShowMobileChevronHandle] = useState(false);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const escTimeoutRef = useRef(null);
  const escIndicatorTimeoutRef = useRef(null);
  const sidebarHintTimeoutRef = useRef(null);
  const sidebarHintMorphStartTimeoutRef = useRef(null);
  const mobileChevronTimeoutRef = useRef(null);
  const pendingSidebarHintRef = useRef(false);
  const mobileEdgeTouchStartXRef = useRef(null);
  const mobileOpenDragStartXRef = useRef(null);
  const mobileCloseDragStartXRef = useRef(null);

  const [isRoomLocked, setIsRoomLocked] = useState(!!roomLocked);
  const [silencedUserIds, setSilencedUserIds] = useState(
    new Set(roomSilencedUserIds || []),
  );
  const [showIntrusionHud, setShowIntrusionHud] = useState(false);
  const [intrusionCount, setIntrusionCount] = useState(0);
  const [latestIntrusionCodename, setLatestIntrusionCodename] = useState("");
  const intrusionHudTimeoutRef = useRef(null);

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

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
        : message.type === "image-batch"
          ? `${message.username}: [Classified Image Batch]`
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
  const lightboxImages = useMemo(
    () =>
      messageList.flatMap((msg) => {
        if (msg.type === "image" && msg.message) {
          return [
            {
              messageId: msg.id,
              src: msg.message,
              itemIndex: 0,
              username: msg.username,
            },
          ];
        }
        if (msg.type === "image-batch" && Array.isArray(msg.images)) {
          return msg.images
            .filter((image) => !!image)
            .map((image, imageIndex) => ({
              messageId: msg.id,
              src: image,
              itemIndex: imageIndex,
              username: msg.username,
            }));
        }
        return [];
      }),
    [messageList],
  );
  const highlightTimeoutRef = useRef(null);

  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

  const [joinRequests, setJoinRequests] = useState([]);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [hostTransferSearch, setHostTransferSearch] = useState("");
  const currentUser = users.find((user) => user.id === socket.id);
  const isCurrentHost = currentUser ? !!currentUser.isHost : !!isHost;
  const promotableUsers = users.filter((user) => user.id !== socket.id);
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(agentSearchQuery.trim().toLowerCase()),
  );
  const filteredPromotableUsers = promotableUsers.filter((user) =>
    user.username
      .toLowerCase()
      .includes(hostTransferSearch.trim().toLowerCase()),
  );
  const allAgents = users.filter((user) => !user.isHost);
  const agentsNeedingContext = allAgents.filter((user) => !user.hasFullHistory);
  const contextSyncedAgentsCount =
    allAgents.length - agentsNeedingContext.length;
  const roomIdDisplay = (roomId || "")
    .toUpperCase()
    .slice(0, ROOM_ID_BOX_COUNT);

  useEffect(() => {
    if (currentUser?.hasFullHistory) {
      setIsContextRequestPending(false);
    }
  }, [currentUser?.hasFullHistory]);

  useEffect(() => {
    setContextRequests((prev) =>
      prev.filter((request) =>
        users.some(
          (u) =>
            u.id === request.requesterUserId && !u.isHost && !u.hasFullHistory,
        ),
      ),
    );
  }, [users]);

  useEffect(() => {
    setIsRoomLocked(!!roomLocked);
  }, [roomLocked]);

  useEffect(() => {
    setSilencedUserIds(new Set(roomSilencedUserIds || []));
  }, [roomSilencedUserIds]);

  const isRadioSilenceEnforced =
    silencedUserIds.has(socket.id) && !isCurrentHost;

  const toggleRoomLock = () => {
    if (!isCurrentHost) return;
    const nextLockedState = !isRoomLocked;
    setIsRoomLocked(nextLockedState);
    socket.emit("toggle_room_lock", { roomId, locked: nextLockedState });
  };

  const toggleAgentRadioSilence = (userId) => {
    if (!isCurrentHost || !userId || userId === socket.id) return;

    const nextSilencedState = !silencedUserIds.has(userId);
    setSilencedUserIds((prev) => {
      const next = new Set(prev);
      if (nextSilencedState) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });

    socket.emit("toggle_agent_radio_silence", {
      roomId,
      userId,
      silenced: nextSilencedState,
    });
  };

  const renderMessageText = (text, keyPrefix = "msg") => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, idx) => {
      const isUrl = part.startsWith("http://") || part.startsWith("https://");
      if (!isUrl) {
        const mentionRegex = /(@everyone|@[a-zA-Z0-9_]+)/gi;
        const mentionParts = part.split(mentionRegex);
        return (
          <React.Fragment key={`${keyPrefix}-part-${idx}`}>
            {mentionParts.map((segment, segmentIndex) => {
              if (!segment) return null;
              const isMention = /^@(everyone|[a-zA-Z0-9_]+)$/i.test(segment);
              if (!isMention) {
                return (
                  <span key={`${keyPrefix}-text-${idx}-${segmentIndex}`}>
                    {segment}
                  </span>
                );
              }
              const isEveryone = /^@everyone$/i.test(segment);
              return (
                <span
                  key={`${keyPrefix}-mention-${idx}-${segmentIndex}`}
                  className={`px-1 py-0.5 rounded-md font-bold ${
                    isEveryone
                      ? "bg-blue-500/20 text-blue-200"
                      : "bg-zinc-700/50 text-zinc-100"
                  }`}
                >
                  {segment}
                </span>
              );
            })}
          </React.Fragment>
        );
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

  const hasEveryoneMention = (messageText) =>
    typeof messageText === "string" && /(^|\s)@everyone\b/i.test(messageText);

  const normalizeMentionsForSend = (messageText) => {
    if (typeof messageText !== "string") return messageText;
    return messageText.replace(
      /(^|\s)@([a-zA-Z0-9_]+)/g,
      (match, prefix, mention) => {
        return `${prefix}@${mention.toUpperCase()}`;
      },
    );
  };

  const clearMentionSuggestions = () => {
    setMentionSuggestions([]);
    setActiveMentionIndex(0);
    setMentionContext(null);
  };

  const detectMentionContext = (value) => {
    const match = value.match(/(^|\s)@([a-zA-Z0-9_]*)$/);
    if (!match) return null;
    const query = match[2] || "";
    const atIndex = value.length - query.length - 1;
    return {
      query,
      atIndex,
      mentionLength: 1 + query.length,
    };
  };

  const buildMentionSuggestions = (query) => {
    const uniqueNames = Array.from(
      new Set(
        users
          .map((user) =>
            typeof user.username === "string"
              ? user.username.toUpperCase()
              : "",
          )
          .filter(Boolean),
      ),
    );
    const pool = ["EVERYONE", ...uniqueNames];
    const normalizedQuery = (query || "").toUpperCase();
    return pool.filter((name) => name.startsWith(normalizedQuery)).slice(0, 7);
  };

  const updateMentionSuggestions = (value) => {
    const nextContext = detectMentionContext(value);
    if (!nextContext) {
      clearMentionSuggestions();
      return;
    }
    const nextSuggestions = buildMentionSuggestions(nextContext.query);
    if (nextSuggestions.length === 0) {
      clearMentionSuggestions();
      return;
    }
    setMentionContext(nextContext);
    setMentionSuggestions(nextSuggestions);
    setActiveMentionIndex(0);
  };

  const applyMentionSuggestion = (targetName) => {
    if (!mentionContext) return;
    const normalizedTarget = (targetName || "").toUpperCase();
    const before = currentMessage.slice(0, mentionContext.atIndex);
    const afterRaw = currentMessage.slice(
      mentionContext.atIndex + mentionContext.mentionLength,
    );
    const after = afterRaw.replace(/^\s+/, "");
    const nextValue = `${before}@${normalizedTarget}${after ? ` ${after}` : " "}`;
    setCurrentMessage(nextValue);
    clearMentionSuggestions();
    setTimeout(() => {
      if (inputRef.current) {
        const caretPosition = before.length + normalizedTarget.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(caretPosition, caretPosition);
      }
    }, 0);
  };

  const handleComposerKeyDown = (e) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex((prev) =>
          prev === 0 ? mentionSuggestions.length - 1 : prev - 1,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMentionSuggestion(mentionSuggestions[activeMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        clearMentionSuggestions();
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (isRecording) {
        stopRecording();
        return;
      }
      if (audioBlob) {
        sendAudioMessage();
        return;
      }
      if (hasSelectedAttachments) {
        sendSelectedAttachments();
        return;
      }
      sendMessage();
    }
  };

  const [pinnedMessageIds, setPinnedMessageIds] = useState([]);
  const [isPinnedBannerExpanded, setIsPinnedBannerExpanded] = useState(false);
  const [messageReactions, setMessageReactions] = useState({});
  const [reactionSheetMessageId, setReactionSheetMessageId] = useState(null);

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollAnswers, setPollAnswers] = useState(["", "", ""]);
  const [pollDurationMs, setPollDurationMs] = useState(60 * 60 * 1000);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

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
  const [showHighClearanceComposer, setShowHighClearanceComposer] =
    useState(false);

  // Mobile toolbar toggle
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const mobileToolbarMobileRef = useRef(null);
  const mobileToolbarDesktopRef = useRef(null);
  const hasSelectedAttachments = selectedAttachments.length > 0;
  const areAllSelectedAttachmentsImages =
    hasSelectedAttachments &&
    selectedAttachments.every((attachment) => attachment.type === "image");
  const isMultiAttachmentCaptionLocked =
    hasSelectedAttachments &&
    selectedAttachments.length > 1 &&
    !areAllSelectedAttachmentsImages;

  // Context message states
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextModalMode, setContextModalMode] = useState("agent"); // "agent" or "all"
  const [selectedContextAgent, setSelectedContextAgent] = useState(null);
  const [contextRequests, setContextRequests] = useState([]);
  const [isContextRequestPending, setIsContextRequestPending] = useState(false);

  const timerOptions = [
    { label: "OFF", value: 0 },
    { label: "10s", value: 10000 },
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
    { label: "10m", value: 600000 },
  ];

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth <= 768;
      setIsMobile((prevIsMobile) => {
        if (prevIsMobile !== isMobileDevice) {
          setShowUsers(!isMobileDevice);
        }
        return isMobileDevice;
      });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile || showUsers || isSidebarClosing) {
      setShowSidebarHintLine(false);
      setStartSidebarHintMorph(false);

      if (isMobile || showUsers) {
        pendingSidebarHintRef.current = false;
      }

      if (sidebarHintMorphStartTimeoutRef.current) {
        clearTimeout(sidebarHintMorphStartTimeoutRef.current);
      }
      if (sidebarHintTimeoutRef.current) {
        clearTimeout(sidebarHintTimeoutRef.current);
      }
      return;
    }

    if (pendingSidebarHintRef.current) {
      pendingSidebarHintRef.current = false;
      setShowSidebarHintLine(true);
      setStartSidebarHintMorph(false);

      if (sidebarHintMorphStartTimeoutRef.current) {
        clearTimeout(sidebarHintMorphStartTimeoutRef.current);
      }
      if (sidebarHintTimeoutRef.current) {
        clearTimeout(sidebarHintTimeoutRef.current);
      }

      sidebarHintMorphStartTimeoutRef.current = setTimeout(() => {
        setStartSidebarHintMorph(true);
      }, 2600);

      sidebarHintTimeoutRef.current = setTimeout(() => {
        setShowSidebarHintLine(false);
        setStartSidebarHintMorph(false);
      }, 4100);
    }
  }, [showUsers, isMobile, isSidebarClosing]);

  useEffect(() => {
    return () => {
      if (sidebarHintTimeoutRef.current) {
        clearTimeout(sidebarHintTimeoutRef.current);
      }
      if (sidebarHintMorphStartTimeoutRef.current) {
        clearTimeout(sidebarHintMorphStartTimeoutRef.current);
      }
      if (mobileChevronTimeoutRef.current) {
        clearTimeout(mobileChevronTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobile || showUsers) {
      setShowMobileChevronHandle(false);
      if (mobileChevronTimeoutRef.current) {
        clearTimeout(mobileChevronTimeoutRef.current);
      }
    }
  }, [isMobile, showUsers]);

  const revealMobileChevronHandle = (duration = 2200) => {
    if (!isMobile) return;
    setShowMobileChevronHandle(true);
    if (mobileChevronTimeoutRef.current) {
      clearTimeout(mobileChevronTimeoutRef.current);
    }
    mobileChevronTimeoutRef.current = setTimeout(() => {
      setShowMobileChevronHandle(false);
    }, duration);
  };

  const openSidebar = () => {
    pendingSidebarHintRef.current = false;
    setIsSidebarClosing(false);
    setShowSidebarHintLine(false);
    setStartSidebarHintMorph(false);
    setShowUsers(true);
  };

  const closeSidebar = () => {
    if (!isMobile) {
      pendingSidebarHintRef.current = true;
    }
    setIsSidebarClosing(true);
    setShowUsers(false);
  };

  const isDesktopSidebarClosing = !isMobile && isSidebarClosing;
  const showSidebarPanelContent = !isDesktopSidebarClosing;

  const handleMobileEdgeTouchStart = (e) => {
    if (!isMobile || showUsers) return;
    mobileEdgeTouchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleMobileEdgeTouchEnd = (e) => {
    if (!isMobile || showUsers) return;
    const startX = mobileEdgeTouchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    mobileEdgeTouchStartXRef.current = null;
    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (deltaX > 14) {
      revealMobileChevronHandle();
    }
  };

  const handleMobileOpenHandleTouchStart = (e) => {
    if (!isMobile || showUsers || !showMobileChevronHandle) return;
    mobileOpenDragStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleMobileOpenHandleTouchEnd = (e) => {
    if (!isMobile || showUsers || !showMobileChevronHandle) return;
    const startX = mobileOpenDragStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    mobileOpenDragStartXRef.current = null;
    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (deltaX > 20) {
      openSidebar();
      setShowMobileChevronHandle(false);
    }
  };

  const handleMobileCloseHandleTouchStart = (e) => {
    if (!isMobile || !showUsers) return;
    mobileCloseDragStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleMobileCloseHandleTouchEnd = (e) => {
    if (!isMobile || !showUsers) return;
    const startX = mobileCloseDragStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    mobileCloseDragStartXRef.current = null;
    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (deltaX < -20) {
      closeSidebar();
    }
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const total = lightboxImages.length;
    const handleKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft" && total > 1)
        setLightboxIndex((i) => (i - 1 + total) % total);
      if (e.key === "ArrowRight" && total > 1)
        setLightboxIndex((i) => (i + 1) % total);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, lightboxImages]);

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
    if (!msg || msg.own || msg.username === username) {
      setActiveMenuId(null);
      return;
    }
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

  useEffect(() => {
    if (!isHost || !hostChatStorageKey) return;
    try {
      const rawHistory = sessionStorage.getItem(hostChatStorageKey);
      if (!rawHistory) return;
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        setMessageList(parsedHistory);
      }
    } catch {
      sessionStorage.removeItem(hostChatStorageKey);
    }
  }, [isHost, hostChatStorageKey]);

  useEffect(() => {
    if (!isHost || !hostChatStorageKey) return;
    try {
      sessionStorage.setItem(hostChatStorageKey, JSON.stringify(messageList));
    } catch {}
  }, [isHost, hostChatStorageKey, messageList]);

  const encrypt = (text) => CryptoJS.AES.encrypt(text, roomPassword).toString();
  const decrypt = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, roomPassword);
      return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ DECRYPT FAIL";
    } catch {
      return "🚫 ERROR";
    }
  };

  useEffect(() => {
    setIsPinnedBannerExpanded(false);
  }, [roomId]);

  useEffect(() => {
    if (pinnedMessageIds.length <= 1 && isPinnedBannerExpanded) {
      setIsPinnedBannerExpanded(false);
    }
  }, [pinnedMessageIds.length, isPinnedBannerExpanded]);

  const IMAGE_PIN_SEPARATOR = "::img::";

  const buildPinKey = (messageId, imageIndex = null) => {
    if (!messageId) return "";
    return Number.isInteger(imageIndex)
      ? `${messageId}${IMAGE_PIN_SEPARATOR}${imageIndex}`
      : messageId;
  };

  const parsePinKey = (pinKey) => {
    if (!pinKey || typeof pinKey !== "string") {
      return { pinKey: "", messageId: null, imageIndex: null };
    }

    const separatorIndex = pinKey.indexOf(IMAGE_PIN_SEPARATOR);
    if (separatorIndex === -1) {
      return { pinKey, messageId: pinKey, imageIndex: null };
    }

    const messageId = pinKey.slice(0, separatorIndex);
    const rawIndex = pinKey.slice(separatorIndex + IMAGE_PIN_SEPARATOR.length);
    const parsedIndex = Number.parseInt(rawIndex, 10);

    return {
      pinKey,
      messageId,
      imageIndex: Number.isInteger(parsedIndex) ? parsedIndex : null,
    };
  };

  const getLightboxIndexForMessageImage = (messageId, itemIndex = 0) =>
    lightboxImages.findIndex(
      (item) => item.messageId === messageId && item.itemIndex === itemIndex,
    );

  const openLightboxForMessageImage = (messageId, itemIndex = 0) => {
    const resolvedIndex = getLightboxIndexForMessageImage(messageId, itemIndex);
    if (resolvedIndex < 0) return;
    setLightboxIndex(resolvedIndex);
    setLightboxOpen(true);
  };

  const jumpToMessage = (messageId, options = {}) => {
    if (!messageId) return;
    const el = messageRefs.current?.[messageId];

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightMessageId(messageId);

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(
      () => setHighlightMessageId(null),
      2600,
    );

    if (Number.isInteger(options.openImageIndex)) {
      setTimeout(() => {
        openLightboxForMessageImage(messageId, options.openImageIndex);
      }, 220);
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const togglePinMessage = (messageId, imageIndex = null) => {
    if (!messageId) return;
    const pinKey = buildPinKey(messageId, imageIndex);
    socket.emit("toggle_pin_message", { roomId, messageId, pinKey });
    setActiveMenuId(null);
  };

  const isMessagePinned = (messageId) =>
    !!messageId &&
    pinnedMessageIds.some(
      (pinKey) => parsePinKey(pinKey).messageId === messageId,
    );

  const isImagePinnedFromBatch = (messageId, imageIndex) =>
    pinnedMessageIds.includes(buildPinKey(messageId, imageIndex));

  const pinnedItems = useMemo(
    () =>
      pinnedMessageIds
        .map((pinKey) => {
          const parsedPin = parsePinKey(pinKey);
          const message = messageList.find(
            (msg) => msg?.id === parsedPin.messageId,
          );
          if (!message) return null;
          return {
            pinKey,
            messageId: parsedPin.messageId,
            imageIndex: parsedPin.imageIndex,
            message,
          };
        })
        .filter(Boolean),
    [pinnedMessageIds, messageList],
  );

  const getFilePageCountLabel = (pageCount) => {
    const parsed = Number(pageCount);
    const totalPages =
      Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    return `${totalPages} page${totalPages === 1 ? "" : "s"}`;
  };

  const getPinnedItemPreview = (pinnedItem) => {
    const msg = pinnedItem?.message;
    const pinnedImageIndex = pinnedItem?.imageIndex;

    if (!msg) {
      return {
        title: "Unknown message",
        meta: "",
        icon: LuPin,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.deleted) {
      return {
        title: "[ DATA EXPUNGED ]",
        meta: "Deleted",
        icon: LuPin,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.system) {
      return {
        title: msg.message || "System message",
        meta: "SYSTEM",
        icon: LuPin,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.type === "audio") {
      const duration = formatDuration(msg.audioDuration || 0);
      const caption = msg.caption?.trim();
      return {
        title: caption ? `${duration} • ${caption}` : duration,
        meta: `Audio • ${msg.username || "UNKNOWN"}`,
        icon: LuMic,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.type === "file") {
      return {
        title: `${msg.fileName || "Classified File"} • ${getFilePageCountLabel(msg.filePageCount)}`,
        meta: `File • ${msg.username || "UNKNOWN"}`,
        icon: LuFileText,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.type === "poll" || msg.poll) {
      return {
        title: decrypt(msg.poll?.question || "") || "Poll",
        meta: `Poll • ${msg.username || "UNKNOWN"}`,
        icon: LuChartBar,
        thumbnailSrc: null,
        isMultiImage: false,
      };
    }

    if (msg.type === "image") {
      const caption = msg.caption?.trim() || "image";
      return {
        title: caption,
        meta: `Image • ${msg.username || "UNKNOWN"}`,
        icon: LuImage,
        thumbnailSrc: msg.message || null,
        isMultiImage: false,
      };
    }

    if (msg.type === "image-batch") {
      if (Number.isInteger(pinnedImageIndex) && Array.isArray(msg.images)) {
        const targetImage = msg.images[pinnedImageIndex] || null;
        const imageLabel = msg.caption?.trim() || "image";
        return {
          title: imageLabel,
          meta: `Image ${pinnedImageIndex + 1} • ${msg.username || "UNKNOWN"}`,
          icon: LuImage,
          thumbnailSrc: targetImage,
          isMultiImage: false,
        };
      }

      const caption = msg.caption?.trim() || "multi images";
      return {
        title: caption,
        meta: `Images (${Array.isArray(msg.images) ? msg.images.length : 0}) • ${msg.username || "UNKNOWN"}`,
        icon: LuImage,
        thumbnailSrc: null,
        isMultiImage: true,
      };
    }

    return {
      title: msg.message || "Message",
      meta: msg.username || "UNKNOWN",
      icon: LuPin,
      thumbnailSrc: null,
      isMultiImage: false,
    };
  };

  const reactToMessage = (messageId, emoji) => {
    if (!messageId || !emoji) return;
    socket.emit("react_to_message", { roomId, messageId, emoji });
    setActiveMenuId(null);
  };

  const getMessageReactionList = (messageId) => {
    if (!messageId) return [];
    const raw = messageReactions[messageId];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((entry) => entry && entry.username && entry.emoji)
      .sort((a, b) => a.username.localeCompare(b.username));
  };

  const getMessageReactionSummary = (messageId) => {
    const reactions = getMessageReactionList(messageId);
    const grouped = reactions.reduce((acc, reaction) => {
      const existing = acc.get(reaction.emoji) || 0;
      acc.set(reaction.emoji, existing + 1);
      return acc;
    }, new Map());

    return Array.from(grouped.entries())
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count);
  };

  const openReactionSheet = (messageId) => {
    if (!messageId) return;
    if (getMessageReactionList(messageId).length === 0) return;
    setReactionSheetMessageId(messageId);
    setActiveMenuId(null);
  };

  const getReplyPreviewText = (msg) => {
    if (!msg) return "";
    if (msg.poll) return `[POLL] ${decrypt(msg.poll.question)}`;
    if (msg.system) return msg.message || "";
    if (msg.type === "image") return "📷 Image";
    if (msg.type === "image-batch")
      return `📷 ${msg.images?.length || 0} Images`;
    if (msg.type === "audio")
      return `🎙️ Voice message${msg.audioDuration ? ` (${formatDuration(msg.audioDuration)})` : ""}`;
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
    if (isRadioSilenceEnforced) return;
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
    if (isRadioSilenceEnforced) return;
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
      senderIsHost: isCurrentHost,
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
    setMessageList((list) => [
      ...list,
      { ...messageData, own: true, sentAt: Date.now() },
    ]);
    setShowPollModal(false);
    resetPollDraft();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const estimatePdfPageCount = (dataUrl) => {
    if (
      !dataUrl ||
      typeof dataUrl !== "string" ||
      !dataUrl.startsWith("data:application/pdf")
    ) {
      return null;
    }

    try {
      const base64Part = dataUrl.split(",")[1];
      if (!base64Part) return null;
      const binary = atob(base64Part);
      const pageMatches = binary.match(/\/Type\s*\/Page\b/g);
      return pageMatches?.length || null;
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (e) => {
    if (isRadioSilenceEnforced) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
      return;
    }
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter((file) => file.size <= maxSize);
    const skippedCount = files.length - validFiles.length;

    if (!validFiles.length) {
      alert("All selected files are too large. Maximum size is 5MB per file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
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
          // determine type and for audio files attempt to get duration
          let atype = file.type.startsWith("image/") ? "image" : "file";
          let audioDuration = null;
          if (file.type && file.type.startsWith("audio/")) {
            atype = "audio";
            // try to get duration from the audio data URL
            audioDuration = await new Promise((resolve) => {
              try {
                const audio = document.createElement("audio");
                audio.preload = "metadata";
                audio.src = base64;
                const clear = () => {
                  audio.removeEventListener("loadedmetadata", onLoaded);
                  audio.removeEventListener("error", onError);
                };
                const onLoaded = () => {
                  const d = Math.floor(audio.duration || 0);
                  clear();
                  resolve(d);
                };
                const onError = () => {
                  clear();
                  resolve(null);
                };
                audio.addEventListener("loadedmetadata", onLoaded);
                audio.addEventListener("error", onError);
                // in some browsers loadedmetadata may never fire for data urls; set a fallback timeout
                setTimeout(() => resolve(null), 1500);
              } catch (e) {
                resolve(null);
              }
            });
          }

          return {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            pageCount: estimatePdfPageCount(base64),
            type: atype,
            audioDuration: audioDuration,
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
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const clearAttachment = () => {
    setSelectedAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const removeAttachment = (attachmentId) => {
    setSelectedAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== attachmentId),
    );
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
    if (isRadioSilenceEnforced) return;
    if (!selectedAttachments.length) return;

    const attachmentsToSend = [...selectedAttachments];
    const canUseCaption =
      attachmentsToSend.length === 1 ||
      attachmentsToSend.every((attachment) => attachment.type === "image");
    const normalizedCaption =
      canUseCaption && currentMessage.trim()
        ? normalizeMentionsForSend(currentMessage.trim())
        : "";
    const encryptedCaption = normalizedCaption
      ? encrypt(normalizedCaption)
      : null;
    const replyPayload = replyingTo
      ? {
          messageId: replyingTo.id,
          username: replyingTo.username,
          message: encrypt(getReplyPreviewText(replyingTo)),
        }
      : null;

    const allImages = attachmentsToSend.every(
      (attachment) => attachment.type === "image",
    );
    if (allImages && attachmentsToSend.length > 1) {
      const messageId = uuidv4();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const encryptedImages = attachmentsToSend.map((attachment) =>
        encrypt(attachment.data),
      );

      const messageData = {
        id: messageId,
        roomId,
        username,
        senderIsHost: isCurrentHost,
        message: "",
        images: encryptedImages,
        time,
        edited: false,
        deleted: false,
        timer: selfDestructTime,
        replyTo: replyPayload,
        caption: encryptedCaption,
        type: "image-batch",
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [
        ...list,
        {
          ...messageData,
          images: attachmentsToSend.map((attachment) => attachment.data),
          caption: normalizedCaption || null,
          own: true,
          sentAt: Date.now(),
        },
      ]);

      clearAttachment();
      setCurrentMessage("");
      setReplyingTo(null);
      clearMentionSuggestions();
      return;
    }

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
          senderIsHost: isCurrentHost,
          message: encryptedImage,
          time,
          edited: false,
          deleted: false,
          timer: selfDestructTime,
          replyTo: replyPayload,
          caption: encryptedCaption,
          type: "image",
        };
        await socket.emit("send_message", messageData);
        setMessageList((list) => [
          ...list,
          {
            ...messageData,
            message: attachment.data,
            caption: normalizedCaption || null,
            own: true,
            sentAt: Date.now(),
          },
        ]);
      } else if (attachment.type === "audio") {
        const encryptedAudio = encrypt(attachment.data);
        const messageData = {
          id: messageId,
          roomId,
          username,
          senderIsHost: isCurrentHost,
          message: encryptedAudio,
          audioDuration: attachment.audioDuration || 0,
          time,
          edited: false,
          deleted: false,
          timer: selfDestructTime,
          replyTo: replyPayload,
          caption: encryptedCaption,
          type: "audio",
        };
        await socket.emit("send_message", messageData);
        setMessageList((list) => [
          ...list,
          {
            ...messageData,
            message: attachment.data,
            audioDuration: attachment.audioDuration || 0,
            caption: normalizedCaption || null,
            own: true,
            sentAt: Date.now(),
          },
        ]);
      } else {
        const encryptedData = encrypt(attachment.data);
        const encryptedName = encrypt(attachment.name);
        const messageData = {
          id: messageId,
          roomId,
          username,
          senderIsHost: isCurrentHost,
          message: encryptedData,
          fileName: encryptedName,
          fileSize: attachment.size,
          fileType: attachment.mimeType,
          filePageCount: attachment.pageCount || 1,
          time,
          edited: false,
          deleted: false,
          timer: selfDestructTime,
          replyTo: replyPayload,
          caption: encryptedCaption,
          type: "file",
        };
        await socket.emit("send_message", messageData);
        setMessageList((list) => [
          ...list,
          {
            ...messageData,
            message: attachment.data,
            fileName: attachment.name,
            caption: normalizedCaption || null,
            own: true,
            sentAt: Date.now(),
          },
        ]);
      }
    }

    clearAttachment();
    setCurrentMessage("");
    setReplyingTo(null);
    clearMentionSuggestions();
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
    if (
      fileType.includes("pdf") ||
      fileType.includes("text") ||
      fileType.includes("document") ||
      fileType.includes("word") ||
      fileType.includes("sheet") ||
      fileType.includes("presentation")
    )
      return LuFileText;
    return LuFile;
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (isRadioSilenceEnforced) return;
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
        const levels = Array.from(data)
          .slice(0, 24)
          .map((v) => v / 255);
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/ogg";

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
        stream.getTracks().forEach((t) => t.stop());
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
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required to record audio.");
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
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
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
    if (isRadioSilenceEnforced) return;
    if (!audioBlob) return;

    const normalizedCaption = currentMessage.trim()
      ? normalizeMentionsForSend(currentMessage.trim())
      : "";
    const encryptedCaption = normalizedCaption
      ? encrypt(normalizedCaption)
      : null;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const messageId = uuidv4();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const encryptedAudio = encrypt(base64);

      const messageData = {
        id: messageId,
        roomId,
        username,
        senderIsHost: isCurrentHost,
        message: encryptedAudio,
        audioDuration: recordingDuration,
        time,
        edited: false,
        deleted: false,
        timer: selfDestructTime,
        replyTo: replyingTo
          ? {
              messageId: replyingTo.id,
              username: replyingTo.username,
              message: encrypt(getReplyPreviewText(replyingTo)),
            }
          : null,
        caption: encryptedCaption,
        type: "audio",
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [
        ...list,
        {
          ...messageData,
          message: base64,
          caption: normalizedCaption || null,
          own: true,
          sentAt: Date.now(),
        },
      ]);

      // Cleanup
      setAudioBlob(null);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
      setRecordingDuration(0);
      setIsPlayingPreview(false);
      setCurrentMessage("");
      setReplyingTo(null);
      clearMentionSuggestions();
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
  const canGlobalDeleteSelection =
    selectedCount > 0 && (isCurrentHost || selectionAllOwn);

  // Simple fade + scale animated deletion helper
  const animateDelete = async (ids, mode = "local") => {
    const idArr = Array.isArray(ids) ? ids : [ids];
    const idSet = new Set(idArr);

    // Mark as deleting — framer-motion will animate opacity/height to 0
    setDeletingIds((prev) => new Set([...prev, ...idSet]));

    // Wait for framer-motion fade + height collapse to finish
    await new Promise((r) => setTimeout(r, 450));

    // Clean up
    setDeletingIds((prev) => {
      const next = new Set(prev);
      idSet.forEach((id) => next.delete(id));
      return next;
    });
    if (mode === "local") {
      setMessageList((list) => list.filter((m) => !idSet.has(m?.id)));
    }
  };

  const bulkLocalDelete = () => {
    if (selectedCount === 0) return;
    animateDelete([...selectedMessageIds], "local");
    setSelectedMessageIds(new Set());
  };

  const bulkGlobalDelete = () => {
    if (selectedCount === 0) return;
    if (!canGlobalDeleteSelection) return;
    selectedMessages.forEach((m) => {
      socket.emit("delete_message", { roomId, messageId: m.id });
    });
    setSelectedMessageIds(new Set());
  };

  // Typing & Input Logic
  const handleInputChange = (e) => {
    if (isRadioSilenceEnforced) return;
    if (isMultiAttachmentCaptionLocked) return;
    const nextValue = e.target.value;
    setCurrentMessage(nextValue);
    updateMentionSuggestions(nextValue);
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

  useEffect(() => {
    if (!isMultiAttachmentCaptionLocked) return;
    if (!currentMessage.trim()) {
      clearMentionSuggestions();
      return;
    }
    setCurrentMessage("");
    clearMentionSuggestions();
  }, [isMultiAttachmentCaptionLocked]);

  const kickAgent = (userId, agentName) => {
    socket.emit("kick_user", { roomId, userId });
  };

  const decideJoinRequest = (socketId, approve) => {
    socket.emit("approve_join_request", { roomId, socketId, approve });
    setJoinRequests((prev) => prev.filter((r) => r.socketId !== socketId));
  };

  const transferHostTo = (newHostId, newHostUsername) => {
    if (!isCurrentHost || !newHostId || newHostId === socket.id) return;
    socket.emit("transfer_host", { roomId, newHostId });
  };

  const sendContextToAgent = (targetUserId) => {
    if (!isCurrentHost || !targetUserId) return;
    socket.emit("send_context_to_agent", { roomId, targetUserId });
    setShowContextModal(false);
  };

  const sendContextToAll = () => {
    if (!isCurrentHost) return;
    socket.emit("send_context_to_all", { roomId });
    setShowContextModal(false);
  };

  const requestContext = () => {
    if (isCurrentHost) return;
    if (currentUser?.hasFullHistory) return;
    if (isContextRequestPending) return;
    setIsContextRequestPending(true);
    socket.emit("request_context", { roomId });
  };

  const approveContextRequest = (requesterUserId) => {
    if (!isCurrentHost) return;
    socket.emit("send_context_to_agent", {
      roomId,
      targetUserId: requesterUserId,
    });
    setContextRequests((prev) =>
      prev.filter((r) => r.requesterUserId !== requesterUserId),
    );
  };

  const rejectContextRequest = (requesterUserId) => {
    if (!isCurrentHost) return;
    socket.emit("reject_context_request", { roomId, requesterUserId });
    setContextRequests((prev) =>
      prev.filter((r) => r.requesterUserId !== requesterUserId),
    );
  };

  const handleTerminateClick = () => {
    setConfirmAction("terminate");
    confirmActionRef.current = "terminate";
    setShowSlideConfirm(true);
    setSlidePosition(0);
    slidePositionRef.current = 0;
    setHostTransferSearch("");
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
    setHostTransferSearch("");
  };

  const promoteHostFromPopup = (targetUser) => {
    if (!isCurrentHost || !targetUser || targetUser.id === socket.id) return;
    socket.emit("transfer_host", { roomId, newHostId: targetUser.id });
    closeSlideConfirm();
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setCurrentMessage(msg.message || "");
    setActiveMenuId(null);
  };

  const sendMessage = async () => {
    if (isRadioSilenceEnforced) return;
    if (!currentMessage.trim()) return;
    const normalizedMessage = normalizeMentionsForSend(currentMessage);
    setIsLocalTyping(false);
    socket.emit("typing_status", { roomId, username, isTyping: false });

    if (editingMessageId) {
      const encrypted = encrypt(normalizedMessage);
      socket.emit("edit_message", {
        roomId,
        messageId: editingMessageId,
        newEncryptedMessage: encrypted,
      });
      setMessageList((list) =>
        list.map((msg) =>
          msg.id === editingMessageId
            ? { ...msg, message: normalizedMessage, edited: true }
            : msg,
        ),
      );
      setEditingMessageId(null);
      setCurrentMessage("");
      clearMentionSuggestions();
    } else {
      const messageId = uuidv4();
      const encrypted = encrypt(normalizedMessage);
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
        senderIsHost: isCurrentHost,
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
        {
          ...messageData,
          message: normalizedMessage,
          own: true,
          sentAt: Date.now(),
        },
      ]);
      setCurrentMessage("");
      setReplyingTo(null);
      clearMentionSuggestions();
    }
  };

  const sendHighClearanceMessage = async (messageData) => {
    if (isRadioSilenceEnforced) return;
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
      senderIsHost: isCurrentHost,
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
        own: true,
        sentAt: Date.now(),
      },
    ]);
  };

  const openBiometricVault = (message) => {
    setVaultMessage(message);
    setShowBiometricVault(true);
  };

  const handleVaultDecrypted = (message) => {
    // Message has been successfully decrypted and viewed
    console.log("High clearance message accessed:", message);
  };

  useEffect(() => {
    setMessageReactions({});
    socket.emit("get_message_reactions", { roomId });
    socket.emit("get_pinned_messages", { roomId });

    socket.on("receive_message", (data) => {
      let messageToAdd;

      const isOwnMessage = data.username === username;

      if (data.system) {
        messageToAdd = { ...data, id: data.id || uuidv4() };
      } else if (data.type === "poll" || data.poll) {
        messageToAdd = {
          ...data,
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      } else if (data.type === "image") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          caption: data.caption ? decrypt(data.caption) : null,
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      } else if (data.type === "image-batch") {
        messageToAdd = {
          ...data,
          images: (Array.isArray(data.images) ? data.images : []).map((image) =>
            decrypt(image),
          ),
          caption: data.caption ? decrypt(data.caption) : null,
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      } else if (data.type === "file") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          fileName: decrypt(data.fileName),
          filePageCount: data.filePageCount || 1,
          caption: data.caption ? decrypt(data.caption) : null,
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      } else if (data.type === "audio") {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          caption: data.caption ? decrypt(data.caption) : null,
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      } else if (data.type === "high-clearance") {
        messageToAdd = {
          ...data,
          message: data.message, // Keep encrypted for non-owners
          own: isOwnMessage,
          highClearanceContent: isOwnMessage
            ? JSON.parse(decrypt(data.message))
            : null,
          isContextMessage: data.isContextMessage,
        };
      } else {
        messageToAdd = {
          ...data,
          message: decrypt(data.message),
          own: isOwnMessage,
          isContextMessage: data.isContextMessage,
        };
      }

      setMessageList((l) => {
        // If this is a context message with a timestamp, insert it at the correct chronological position
        if (data.isContextMessage && data.sentAt) {
          // Find the correct position by comparing timestamps
          // Messages are ordered by sentAt, and context messages should be inserted in their proper time slot
          const insertIndex = l.findIndex((msg) => {
            // If msg has no sentAt, it's likely a system message, skip it
            if (!msg.sentAt) return false;
            // Insert before the first message sent after this context message
            return msg.sentAt > data.sentAt;
          });

          if (insertIndex === -1) {
            // All messages with sentAt were sent before this one, or list is empty
            return [...l, messageToAdd];
          } else {
            // Insert at the correct chronological position
            return [
              ...l.slice(0, insertIndex),
              messageToAdd,
              ...l.slice(insertIndex),
            ];
          }
        }
        // Regular messages always append at the end
        return [...l, messageToAdd];
      });

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
      // Simple fade + height collapse animation
      setDeletingIds((prev) => new Set([...prev, deletedId]));
      await new Promise((r) => setTimeout(r, 450));
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
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
      setMessageReactions((prev) => {
        if (!prev[deletedId]) return prev;
        const { [deletedId]: _removed, ...rest } = prev;
        return rest;
      });
      setReactionSheetMessageId((prev) => (prev === deletedId ? null : prev));
      setPinnedMessageIds((prev) =>
        prev.filter((pinKey) => parsePinKey(pinKey).messageId !== deletedId),
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
    socket.on("host_transferred", ({ roomId: incomingRoomId }) => {
      if (incomingRoomId !== roomId) return;
      setJoinRequests([]);
      setContextRequests([]);
    });
    socket.on("kicked", () => {
      leaveRoom();
    });
    socket.on(
      "intrusion_detected",
      ({ roomId: incomingRoomId, attemptedCodename }) => {
        if (incomingRoomId !== roomId || !isCurrentHost) return;
        setIntrusionCount((prev) => prev + 1);
        setShowIntrusionHud(true);
        setLatestIntrusionCodename(attemptedCodename || "UNKNOWN");

        if (intrusionHudTimeoutRef.current) {
          clearTimeout(intrusionHudTimeoutRef.current);
        }
        intrusionHudTimeoutRef.current = setTimeout(() => {
          setShowIntrusionHud(false);
        }, 4600);

        if (attemptedCodename) {
          console.warn(
            "Unauthorized decryption attempt detected:",
            attemptedCodename,
          );
        }
      },
    );
    socket.on("room_lock_state", ({ roomId: incomingRoomId, isLocked }) => {
      if (incomingRoomId !== roomId) return;
      setIsRoomLocked(!!isLocked);
    });
    socket.on(
      "room_silence_state",
      ({ roomId: incomingRoomId, silencedUserIds: nextSilencedUserIds }) => {
        if (incomingRoomId !== roomId) return;
        setSilencedUserIds(new Set(nextSilencedUserIds || []));
      },
    );

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

    socket.on(
      "context_request",
      ({ roomId: incomingRoomId, requesterUserId, requesterUsername }) => {
        if (incomingRoomId !== roomId || !isCurrentHost) return;
        setContextRequests((prev) => {
          if (prev.some((r) => r.requesterUserId === requesterUserId))
            return prev;
          return [...prev, { requesterUserId, requesterUsername }];
        });
      },
    );

    socket.on("context_request_sent", () => {
      setIsContextRequestPending(true);
    });

    socket.on("context_request_rejected", ({ roomId: incomingRoomId }) => {
      if (incomingRoomId !== roomId) return;
      setIsContextRequestPending(false);
      setMessageList((list) => [
        ...list,
        {
          id: uuidv4(),
          system: true,
          message: "Host rejected your context request.",
        },
      ]);
    });

    socket.on(
      "message_reactions_sync",
      ({ roomId: incomingRoomId, reactions }) => {
        if (incomingRoomId !== roomId) return;
        setMessageReactions(
          reactions && typeof reactions === "object" ? reactions : {},
        );
      },
    );

    socket.on(
      "message_reaction_update",
      ({ roomId: incomingRoomId, messageId, reactions }) => {
        if (incomingRoomId !== roomId || !messageId) return;
        setMessageReactions((prev) => {
          if (!Array.isArray(reactions) || reactions.length === 0) {
            if (!prev[messageId]) return prev;
            const { [messageId]: _removed, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [messageId]: reactions,
          };
        });
      },
    );

    socket.on(
      "pinned_messages_sync",
      ({ roomId: incomingRoomId, pinnedMessageIds: nextPinnedIds }) => {
        if (incomingRoomId !== roomId) return;
        setPinnedMessageIds(Array.isArray(nextPinnedIds) ? nextPinnedIds : []);
      },
    );

    socket.on(
      "pinned_messages_update",
      ({ roomId: incomingRoomId, pinnedMessageIds: nextPinnedIds }) => {
        if (incomingRoomId !== roomId) return;
        setPinnedMessageIds(Array.isArray(nextPinnedIds) ? nextPinnedIds : []);
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
      socket.off("host_transferred");
      socket.off("intrusion_detected");
      socket.off("room_lock_state");
      socket.off("room_silence_state");
      socket.off("context_request");
      socket.off("context_request_sent");
      socket.off("context_request_rejected");
      socket.off("message_reactions_sync");
      socket.off("message_reaction_update");
      socket.off("pinned_messages_sync");
      socket.off("pinned_messages_update");
      if (intrusionHudTimeoutRef.current) {
        clearTimeout(intrusionHudTimeoutRef.current);
      }
    };
  }, [
    socket,
    roomPassword,
    username,
    roomName,
    roomId,
    isCurrentHost,
    notificationPermission,
  ]);

  useEffect(() => {
    if (!isRadioSilenceEnforced) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isLocalTyping) {
      socket.emit("typing_status", { roomId, username, isTyping: false });
      setIsLocalTyping(false);
    }

    setCurrentMessage("");
    setShowMobileToolbar(false);
    setShowTimerMenu(false);
    setShowPollModal(false);
    setShowHighClearanceComposer(false);
  }, [isRadioSilenceEnforced, isLocalTyping, roomId, socket, username]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messageList, typingUsers]);

  useEffect(() => {
    const fn = () => {
      setActiveMenuId(null);
      setActiveHostActionUserId(null);
      setShowTimerMenu(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  // Close mobile toolbar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideMobileToolbar =
        mobileToolbarMobileRef.current?.contains(e.target) ?? false;
      const clickedInsideDesktopToolbar =
        mobileToolbarDesktopRef.current?.contains(e.target) ?? false;

      if (!clickedInsideMobileToolbar && !clickedInsideDesktopToolbar) {
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
                <h1 className="text-2xl mb-2 font-black tracking-[0.15em]">
                  Security Protocol Engaged
                </h1>
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
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => setIsSidebarClosing(false)}>
        {showUsers && (
          <motion.div
            initial={
              isMobile ? { x: "-100%" } : { width: 0, opacity: 0, x: -24 }
            }
            animate={isMobile ? { x: 0 } : { width: "22rem", opacity: 1, x: 0 }}
            exit={
              isMobile
                ? {
                    x: "-100%",
                    transition: { duration: 0.95, ease: [0.65, 0, 0.35, 1] },
                  }
                : {
                    width: 0,
                    opacity: 1,
                    x: 0,
                    transition: { duration: 1.05, ease: [0.65, 0, 0.35, 1] },
                  }
            }
            transition={
              isMobile
                ? { duration: 0.72, ease: [0.22, 1, 0.36, 1] }
                : { duration: 0.78, ease: [0.22, 1, 0.36, 1] }
            }
            className={`fixed md:relative z-50 w-[92%] max-w-[380px] sm:w-80 md:w-auto h-full bg-[#0a0a0c] border-r border-zinc-800/40 flex flex-col ${!isMobile && isSidebarClosing ? "overflow-hidden" : "overflow-visible"} will-change-transform`}
          >
            {showSidebarPanelContent && (
              <>
                <div className="p-4 sm:p-5 border-b border-zinc-800/50 flex items-center justify-between flex-shrink-0 relative overflow-hidden pt-safe">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01]" />
                  <h2 className="text-base font-black uppercase tracking-[0.2em] flex items-center gap-2.5 text-white relative z-10">
                    <div className="p-2 bg-white/5 rounded-xl border border-zinc-700/30 shadow-lg shadow-black/10">
                      <LuShieldCheck
                        size={16}
                        strokeWidth={2.5}
                        className="text-white"
                      />
                    </div>
                    CLASSIFIED
                  </h2>
                </div>

                <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden scrollbar-micro">
                  <div
                    className="group rounded-2xl p-4 mb-4 bg-gradient-to-br from-zinc-900/70 via-zinc-900/45 to-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/70 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] relative overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.995]"
                    role="button"
                    tabIndex={0}
                    title="Click to copy Room ID"
                    aria-label="Copy Room ID"
                    onClick={() => {
                      navigator.clipboard.writeText(roomId);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigator.clipboard.writeText(roomId);
                      }
                    }}
                  >
                    <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                    <div className="flex items-center justify-between mb-2.5 relative">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-1.5">
                        <LuHash size={11} className="text-zinc-500" /> Operation
                        ID
                      </p>
                      <span className="text-[8px] uppercase tracking-[0.16em] font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
                        <LuCopy size={10} /> Tap to copy
                      </span>
                    </div>
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                        {Array.from({ length: ROOM_ID_BOX_COUNT }).map(
                          (_, index) => {
                            const char = roomIdDisplay[index] || "";
                            return (
                              <div
                                key={`room-id-box-${index}`}
                                className="h-10 w-8 rounded-xl border border-zinc-700/70 bg-black/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex items-center justify-center text-[15px] font-black tracking-[0.08em] font-mono text-zinc-100 shrink-0"
                              >
                                {char || "•"}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>

                  {isCurrentHost &&
                    (() => {
                      const encryptedPayload = encryptMagicLinkPayload(
                        roomId,
                        roomPassword,
                      );
                      const magicLink = `${window.location.origin}/chatroom/?invite=${encryptedPayload}`;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(magicLink)
                          }
                          className="w-full rounded-xl p-4 mb-4 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 border border-zinc-800/40 flex items-center justify-between gap-2 hover:border-zinc-700/60 hover:bg-zinc-900/50 active:scale-[0.99] transition-all group"
                        >
                          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-1.5 group-hover:text-zinc-300 transition-colors">
                            <LuKeyRound size={11} /> Magic Invite
                          </p>
                          <span className="flex items-center gap-1.5 text-[8px] uppercase font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors">
                            <LuCopy size={11} /> Tap to Copy
                          </span>
                        </button>
                      );
                    })()}

                  {isCurrentHost && joinRequests.length > 0 && (
                    <div className="border border-zinc-700/40 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20 rounded-xl p-4 mb-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
                      <p className="text-[9px] uppercase font-black text-zinc-300 tracking-[0.25em] mb-3 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                        </span>
                        Join Requests
                      </p>
                      <div className="space-y-3">
                        {joinRequests.map((req, reqIndex) => (
                          <div
                            key={req.socketId || `join-request-${reqIndex}`}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="text-xs uppercase tracking-wide text-white break-all">
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
                                <LuCheck size={12} className="inline mr-1" />
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  decideJoinRequest(req.socketId, false)
                                }
                                className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-red-700/50 text-red-400 hover:bg-red-600 hover:text-white rounded transition-all"
                              >
                                <LuX size={12} className="inline mr-1" />
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-1.5 shrink-0">
                      <LuUsers size={11} className="text-zinc-600" /> Agents
                      Online
                    </h3>
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-zinc-500/70 focus-within:bg-zinc-900/90">
                      <input
                        type="text"
                        value={agentSearchQuery}
                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                        placeholder="Search agent"
                        className="min-w-0 flex-1 bg-transparent text-[10px] text-zinc-100 placeholder:text-zinc-400 outline-none"
                      />
                      {agentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAgentSearchQuery("")}
                          className="shrink-0 text-zinc-500 hover:text-white transition-colors"
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <LuX size={12} />
                        </button>
                      )}
                    </div>
                    <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[9px] tabular-nums font-bold border border-zinc-700/30 shrink-0">
                      {users.length}/{roomCapacity || 50}
                    </span>
                  </div>

                  <AnimatePresence>
                    {isCurrentHost && showIntrusionHud && (
                      <motion.div
                        key={`intrusion-${intrusionCount}`}
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        className="mb-3"
                      >
                        <div className="border border-red-500/40 bg-red-950/45 text-red-300 px-3.5 py-3 rounded-xl">
                          <p className="text-[9px] uppercase tracking-[0.18em] font-black">
                            Wrong Encryption Key Attempt
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-red-200 break-all font-mono">
                            {latestIntrusionCodename || "Unknown Agent"} tried
                            to join.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                            {isCurrentHost && (
                              <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-white/10 border border-zinc-600/30 text-white font-black tracking-widest leading-none shrink-0 rounded">
                                <LuCrown
                                  size={8}
                                  className="inline mr-0.5 -mt-px"
                                />{" "}
                                HOST
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/30 text-center">
                        <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-zinc-500">
                          No matching codename
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((user, i) => {
                        const isUserSilenced = silencedUserIds.has(user.id);
                        const contextRequestForUser = contextRequests.find(
                          (request) => request.requesterUserId === user.id,
                        );
                        const colors = [
                          "from-zinc-300 to-zinc-500",
                          "from-zinc-400 to-zinc-600",
                          "from-zinc-200 to-zinc-400",
                          "from-zinc-500 to-zinc-700",
                          "from-zinc-300 to-zinc-600",
                          "from-zinc-400 to-zinc-500",
                        ];
                        const colorClass = colors[i % colors.length];
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] group transition-all"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div
                                className={`w-9 h-9 bg-gradient-to-br ${user.username === username ? "from-white to-zinc-300 shadow-lg shadow-white/10 ring-2 ring-white/20" : colorClass} rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-[11px] text-zinc-900 relative`}
                              >
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
                                    <LuCrown
                                      size={8}
                                      className="inline mr-0.5 -mt-px"
                                    />{" "}
                                    HOST
                                  </span>
                                )}
                                {isUserSilenced && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-300 font-black tracking-widest leading-none shrink-0 rounded inline-flex items-center gap-1">
                                    <LuMicOff size={8} /> SILENT
                                  </span>
                                )}
                                {isCurrentHost && contextRequestForUser && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 font-black tracking-widest leading-none shrink-0 rounded inline-flex items-center gap-1">
                                    <LuMessageSquarePlus size={8} /> CONTEXT REQ
                                  </span>
                                )}
                              </span>
                            </div>
                            {isCurrentHost && user.id !== socket.id && (
                              <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveHostActionUserId((prev) =>
                                      prev === user.id ? null : user.id,
                                    );
                                  }}
                                  className="text-zinc-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg"
                                  title={`Open actions for ${user.username}`}
                                >
                                  <LuEllipsisVertical size={16} />
                                </button>

                                <AnimatePresence>
                                  {activeHostActionUserId === user.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                      transition={{ duration: 0.16, ease: "easeOut" }}
                                      onClick={(event) => event.stopPropagation()}
                                      className="absolute right-0 top-full mt-1.5 min-w-[220px] rounded-xl border border-zinc-700/40 bg-[#0f0f11]/98 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.75)] z-50 p-1.5"
                                    >
                                      {contextRequestForUser ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              rejectContextRequest(user.id);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/10 transition-all"
                                          >
                                            <LuX size={14} />
                                            Reject Context Request
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              approveContextRequest(user.id);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/10 transition-all"
                                          >
                                            <LuCheck size={14} />
                                            Accept Context Request
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              toggleAgentRadioSilence(user.id);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                              isUserSilenced
                                                ? "text-red-300 hover:bg-red-500/10"
                                                : "text-zinc-300 hover:bg-white/10"
                                            }`}
                                          >
                                            {isUserSilenced ? (
                                              <LuMicOff size={14} />
                                            ) : (
                                              <LuMic size={14} />
                                            )}
                                            {isUserSilenced
                                              ? "Restore Agent Channel"
                                              : "Enforce Radio Silence"}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              transferHostTo(user.id, user.username);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 transition-all"
                                          >
                                            <LuCrown size={14} />
                                            Transfer Host Access
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedContextAgent(user);
                                              setContextModalMode("agent");
                                              setShowContextModal(true);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            disabled={!!user.hasFullHistory}
                                          >
                                            <LuMessageSquarePlus size={14} />
                                            {user.hasFullHistory
                                              ? "Context Already Synced"
                                              : "Send Chat Context"}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              kickAgent(user.id, user.username);
                                              setActiveHostActionUserId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/10 transition-all"
                                          >
                                            <LuUserMinus size={14} />
                                            Remove Agent
                                          </button>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
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
                    {isCurrentHost ? (
                      <>
                        <button
                          onClick={() => {
                            setContextModalMode("all");
                            setShowContextModal(true);
                          }}
                          className="w-full border border-blue-500/20 text-blue-400 py-2.5 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] bg-blue-500/[0.04] mb-2"
                        >
                          <LuMessageSquarePlus size={13} /> SEND CONTEXT TO ALL
                        </button>
                        <button
                          onClick={handleTerminateClick}
                          className="w-full border border-red-500/20 text-red-400 py-3 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2 rounded-xl hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] bg-red-500/[0.04]"
                        >
                          <LuLogOut size={14} /> TERMINATE ROOM
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={requestContext}
                          disabled={
                            !!currentUser?.hasFullHistory ||
                            isContextRequestPending
                          }
                          className="w-full border border-blue-500/20 text-blue-400 py-2.5 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] bg-blue-500/[0.04] mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LuMessageSquarePlus size={13} />{" "}
                          {isContextRequestPending
                            ? "CONTEXT REQUESTED"
                            : "REQUEST CONTEXT"}
                        </button>
                        <button
                          onClick={handleLeaveClick}
                          className="w-full border border-zinc-800/50 text-zinc-500 py-3 uppercase text-[10px] font-black tracking-[0.15em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 rounded-xl active:scale-[0.98] bg-zinc-900/30"
                        >
                          <LuLogOut size={14} /> LEAVE ROOM
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Chevron handle — half-pill flush to right edge of sidebar */}
            <button
              onClick={() => {
                if (!isMobile) closeSidebar();
              }}
              onTouchStart={handleMobileCloseHandleTouchStart}
              onTouchEnd={handleMobileCloseHandleTouchEnd}
              className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-full z-[60] w-[22px] min-w-[22px] max-w-[22px] h-[88px] min-h-[88px] max-h-[88px] flex items-center justify-center rounded-r-[999px] bg-zinc-800 hover:bg-zinc-700 border-y border-r border-zinc-700/50 transition-all shadow-[4px_0_16px_rgba(0,0,0,0.4)] active:scale-95"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path
                  d="M15 5 L9 12 L15 19"
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open handle — edge line logic restored, fixed chevron shape preserved */}
      {!showUsers &&
        !isSidebarClosing &&
        (isMobile ? (
          <div className="fixed top-1/2 -translate-y-1/2 left-3 z-[60] h-[88px] w-8">
            <div
              onTouchStart={handleMobileEdgeTouchStart}
              onTouchEnd={handleMobileEdgeTouchEnd}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-[64px]"
              style={{ touchAction: "pan-y" }}
            />

            <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[64px] rounded-full bg-zinc-600/80" />

            {showMobileChevronHandle && (
              <button
                onTouchStart={handleMobileOpenHandleTouchStart}
                onTouchEnd={handleMobileOpenHandleTouchEnd}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[22px] min-w-[22px] max-w-[22px] h-[88px] min-h-[88px] max-h-[88px] flex items-center justify-center rounded-r-[999px] bg-zinc-800 hover:bg-zinc-700 border-y border-r border-zinc-700/50 transition-all shadow-[4px_0_16px_rgba(0,0,0,0.4)] active:scale-95"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path
                    d="M9 5 L15 12 L9 19"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="fixed top-1/2 -translate-y-1/2 left-0 z-[60] h-[88px] w-[22px] group">
            {showSidebarHintLine ? (
              startSidebarHintMorph ? (
                <motion.div
                  initial={{
                    width: 22,
                    height: 88,
                    borderRadius: 999,
                    opacity: 1,
                    backgroundColor: "#27272a",
                  }}
                  animate={{
                    width: 2,
                    height: 64,
                    borderRadius: 999,
                    opacity: 0.8,
                    backgroundColor: "rgba(82,82,91,0.8)",
                  }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                />
              ) : (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[22px] h-[88px] flex items-center justify-center rounded-r-[999px] bg-zinc-800 border-y border-r border-zinc-700/50 shadow-[4px_0_16px_rgba(0,0,0,0.4)] pointer-events-none">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 5 L15 12 L9 19"
                      fill="none"
                      stroke="#e4e4e7"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )
            ) : (
              <>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[64px] rounded-full bg-zinc-600/80 opacity-45 group-hover:opacity-100 transition-opacity duration-300" />
                <button
                  onClick={openSidebar}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[22px] h-[88px] flex items-center justify-center rounded-r-[999px] bg-zinc-800 hover:bg-zinc-700 border-y border-r border-zinc-700/50 transition-all duration-200 shadow-[4px_0_16px_rgba(0,0,0,0.4)] active:scale-95 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 5 L15 12 L9 19"
                      fill="none"
                      stroke="#e4e4e7"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        <header className="h-14 sm:h-16 md:h-20 flex items-center justify-between px-3 sm:px-4 md:px-6 z-30 bg-[#09090b]/80 backdrop-blur-xl flex-shrink-0 relative border-b border-zinc-800/30 pt-safe">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
          <div className="flex items-center gap-3 min-w-0 z-10">
            <Logo
              variant="shield"
              className="w-7 h-7 sm:w-8 sm:h-8 text-white/80 shrink-0"
            />
            <div className="hidden xs:flex flex-col truncate">
              <h1 className="font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
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
              <span className="text-[6px] sm:text-[7px] md:text-[8px] text-zinc-500 uppercase tracking-[0.4em] sm:tracking-[0.5em] font-bold mb-0.5 sm:mb-1">
                Room
              </span>
              <h1 className="text-sm sm:text-base md:text-xl font-black tracking-[0.1em] sm:tracking-[0.12em] text-zinc-100 leading-none uppercase font-mono truncate">
                {roomName}
              </h1>
            </div>
          </div>

          <div className="z-10 min-w-[60px] sm:min-w-[80px] flex justify-end items-center gap-1 sm:gap-1.5">
            {isCurrentHost && (
              <button
                type="button"
                onClick={toggleRoomLock}
                className={`p-2 rounded-xl transition-all active:scale-90 ${
                  isRoomLocked
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
                title={
                  isRoomLocked
                    ? "Lockdown active — click to unlock frequency"
                    : "Frequency open — click to lock"
                }
              >
                <LuLock size={16} />
              </button>
            )}

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
                  : "border-zinc-800/50 text-zinc-300 hover:bg-white/5 hover:text-zinc-300 hover:border-zinc-700"
              }`}
              title="Select multiple messages"
            >
              <LuCheckCheck size={12} />
              Select
            </button>
          </div>
        </header>

        {pinnedItems.length > 0 && (
          <div className="z-20 bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-zinc-800/40 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/25 to-transparent" />
            <div className="px-3 py-2.5 border-b border-zinc-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] font-black text-zinc-500">
                <LuPin size={12} className="text-white" />
                Pinned Messages ({pinnedItems.length})
              </div>
              {pinnedItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsPinnedBannerExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-zinc-400 hover:text-white transition"
                  title={
                    isPinnedBannerExpanded
                      ? "Collapse pinned list"
                      : "Expand pinned list"
                  }
                >
                  {isPinnedBannerExpanded ? "Collapse" : "Expand"}
                  <LuChevronRight
                    size={12}
                    className={`transition-transform ${isPinnedBannerExpanded ? "rotate-90" : "rotate-0"}`}
                  />
                </button>
              )}
            </div>

            <div className="px-2 py-2 space-y-1.5">
              {(isPinnedBannerExpanded
                ? pinnedItems
                : pinnedItems.slice(0, 1)
              ).map((pinnedItem) => {
                const preview = getPinnedItemPreview(pinnedItem);
                const Icon = preview.icon || LuPin;

                return (
                  <div
                    key={`pinned-banner-${pinnedItem.pinKey}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        jumpToMessage(pinnedItem.messageId, {
                          openImageIndex: pinnedItem.imageIndex,
                        })
                      }
                      className="min-w-0 flex-1 flex items-center gap-2.5 text-left hover:bg-white/[0.03] rounded-lg transition px-2 py-1"
                      title="Jump to pinned message"
                    >
                      <div className="p-1.5 bg-white/5 rounded-lg border border-zinc-700/30 shrink-0 relative">
                        <Icon className="text-white" size={13} />
                        {preview.isMultiImage && (
                          <LuPlus
                            size={8}
                            className="text-zinc-300 absolute -right-1 -bottom-1 bg-[#0a0a0c] rounded-full"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] uppercase tracking-[0.2em] font-black text-zinc-500 truncate">
                          {preview.meta}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[76vw]">
                          {preview.title}
                        </p>
                      </div>
                      {preview.thumbnailSrc && (
                        <img
                          src={preview.thumbnailSrc}
                          alt="Pinned preview"
                          className="h-7 w-7 rounded object-cover border border-zinc-700/50 shrink-0"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        togglePinMessage(
                          pinnedItem.messageId,
                          pinnedItem.imageIndex,
                        )
                      }
                      className="p-1.5 text-zinc-600 hover:text-white hover:bg-white/5 transition-all rounded-lg active:scale-90 shrink-0"
                      title="Unpin"
                    >
                      <LuX size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:px-6 space-y-2 sm:space-y-3 md:space-y-4 scrollbar-hide relative">
          <div className="pointer-events-none fixed top-20 left-72 right-0 h-24 bg-gradient-to-b from-[#09090b] to-transparent z-10 hidden lg:block" />

          <AnimatePresence initial={false}>
            {messageList.map((msg, msgIndex) => {
              const isDeleting = deletingIds.has(msg.id);
              const isCommanderMessage =
                !msg.system && !msg.deleted && !!msg.senderIsHost;
              const messageReactionList = getMessageReactionList(msg?.id);
              const messageReactionSummary = getMessageReactionSummary(msg?.id);
              const myReactionEmoji =
                messageReactionList.find(
                  (reaction) =>
                    reaction.username?.toLowerCase() ===
                    username?.toLowerCase(),
                )?.emoji || null;
              const isMediaPayload =
                msg.type === "image" ||
                msg.type === "image-batch" ||
                msg.type === "audio" ||
                msg.type === "file";
              const hasHeaderContent =
                (!msg.own && !msg.deleted) ||
                (hasEveryoneMention(msg.message) && !msg.deleted) ||
                (msg.isContextMessage && !msg.deleted) ||
                (isMessagePinned(msg.id) && !msg.deleted) ||
                (msg.timer > 0 && !msg.deleted);
              return (
                <motion.div
                  ref={(el) => {
                    if (!el || !msg?.id) return;
                    messageRefs.current[msg.id] = el;
                  }}
                  data-message-id={msg?.id}
                  layout={!isDeleting ? "position" : false}
                  key={msg.id || `msg-${msgIndex}`}
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
                      ? { duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0 }
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
                  onClick={
                    isSelectMode && !msg.system
                      ? () => toggleSelectMessage(msg.id)
                      : undefined
                  }
                >
                  {msg.system ? (
                    <div className="w-full flex items-center justify-center gap-3 px-1 py-1.5">
                      <span className="h-px flex-1 bg-zinc-700/45" />
                      <span className="text-[10px] sm:text-[11px] text-zinc-600 font-semibold uppercase tracking-[0.14em] text-center leading-tight">
                        {msg.message}
                      </span>
                      <span className="h-px flex-1 bg-zinc-700/45" />
                    </div>
                  ) : (
                    <div
                      className={`flex items-start gap-2.5 max-w-full w-full ${msg.own ? "justify-end" : "justify-start"}`}
                    >
                      {/* WhatsApp-style left checkmark */}
                      {isSelectMode && (
                        <div className="flex items-center self-center shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedMessageIds.has(msg.id) ? "border-white bg-white shadow-lg shadow-white/20 scale-110" : "border-zinc-600 bg-transparent hover:border-zinc-400"}`}
                          >
                            {selectedMessageIds.has(msg.id) && (
                              <LuCheck
                                className="text-black"
                                size={12}
                                strokeWidth={3}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex flex-col ${msg.type === "audio" ? "max-w-full" : "max-w-[92%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%]"} relative ${isSelectMode ? "pointer-events-none" : ""}`}
                      >
                        <div
                          data-bubble
                          className={`${
                            isMediaPayload
                              ? "px-2 py-2 sm:px-2.5 sm:py-2.5 md:px-3 md:py-3"
                              : "px-3 py-2.5 sm:px-3.5 sm:py-3 md:px-4 md:py-3.5"
                          } relative transition-all rounded-xl ${
                            msg.deleted
                              ? "bg-zinc-900/30 border border-zinc-800/20 text-zinc-600 italic rounded-xl"
                              : msg.poll
                                ? msg.own
                                  ? "bg-gradient-to-br from-white via-zinc-50 to-zinc-100 text-zinc-900 shadow-[0_1px_20px_rgba(255,255,255,0.06)] rounded-xl rounded-br-sm"
                                  : "bg-zinc-900/60 text-zinc-200 border border-zinc-800/40 rounded-xl"
                                : msg.own
                                  ? "bg-gradient-to-br from-white via-zinc-50 to-zinc-100 text-zinc-900 shadow-[0_1px_20px_rgba(255,255,255,0.06)] rounded-xl rounded-br-sm"
                                  : "bg-zinc-900/60 text-zinc-300 border border-zinc-800/30 rounded-xl rounded-bl-sm"
                          } ${isCommanderMessage ? "border-red-500/60 shadow-[0_0_0_1px_rgba(239,68,68,0.22),0_0_26px_rgba(239,68,68,0.10)]" : ""} ${highlightMessageId === msg.id ? "highlight-flash" : ""} ${msg.isContextMessage ? `context-message ${msg.own ? "context-message-own" : "context-message-other"}` : ""}`}
                        >
                          <div
                            className={`flex justify-between items-start gap-4 ${hasHeaderContent ? "mb-2" : "mb-0"}`}
                          >
                            {!msg.own && !msg.deleted && (
                              <p className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">
                                {msg.username}
                              </p>
                            )}
                            <div className="flex items-center gap-2 ml-auto shrink-0">
                              {hasEveryoneMention(msg.message) &&
                                !msg.deleted && (
                                  <span className="flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                    @EVERYONE
                                  </span>
                                )}
                              {msg.isContextMessage && !msg.deleted && (
                                <span className="context-message-badge">
                                  CONTEXT
                                </span>
                              )}
                              {isMessagePinned(msg.id) && !msg.deleted && (
                                <span
                                  className={`flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full ${
                                    msg.own
                                      ? "bg-black/10 text-zinc-900 border border-zinc-200/10"
                                      : "bg-white/10 text-white"
                                  }`}
                                >
                                  <LuPin size={9} /> PINNED
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
                                <p
                                  className={`text-sm sm:text-[15px] font-bold break-words ${msg.own ? "text-zinc-900" : "text-white"}`}
                                >
                                  {decrypt(msg.poll.question)}
                                </p>
                                <p
                                  className={`text-[10px] mt-1 uppercase tracking-widest font-bold ${msg.own ? "text-zinc-600" : "text-zinc-500"}`}
                                >
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
                                      (Array.isArray(o.votes)
                                        ? o.votes.length
                                        : 0),
                                    0,
                                  );
                                  const ended =
                                    msg.poll.expiresAt &&
                                    msg.poll.expiresAt <= Date.now();
                                  return options.map((opt, optIndex) => {
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
                                        key={`${msg.id || "poll"}-opt-${opt.id || optIndex}`}
                                        type="button"
                                        disabled={ended}
                                        onClick={() => voteOnPoll(msg, opt.id)}
                                        className={`w-full text-left transition-all px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 ${ended ? "opacity-60 cursor-not-allowed" : ""} ${iVoted ? (msg.own ? "border-zinc-300/40 bg-white/5" : "border-white/30 bg-white/5") : ""} ${msg.own ? "border border-zinc-300/40 bg-white/5 hover:bg-white/10" : "border border-zinc-800/30 bg-zinc-900/30 hover:bg-zinc-800/40"}`}
                                        title={ended ? "Poll ended" : "Vote"}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <p
                                              className={`text-[13px] truncate ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                            >
                                              {decrypt(opt.text)}
                                            </p>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <span
                                                className={`text-[12px] font-bold tabular-nums ${msg.own ? "text-zinc-600" : "text-zinc-400"}`}
                                              >
                                                {votes}{" "}
                                                {votes === 1 ? "vote" : "votes"}
                                              </span>
                                              <span
                                                className={`text-[12px] font-bold tabular-nums ${msg.own ? "text-zinc-600" : "text-zinc-400"}`}
                                              >
                                                {pct}%
                                              </span>
                                              {iVoted && (
                                                <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/20">
                                                  <LuCheck size={13} />
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div
                                            className={`mt-2 h-1 rounded-full overflow-hidden ${msg.own ? "bg-zinc-200" : "bg-black/40"}`}
                                          >
                                            <div
                                              className={`${msg.own ? "h-full bg-gradient-to-r from-zinc-700 to-zinc-500" : "h-full bg-gradient-to-r from-white to-zinc-300"} rounded-full transition-all duration-500`}
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
                                      (Array.isArray(o.votes)
                                        ? o.votes.length
                                        : 0),
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
                                  className={`text-zinc-500 transition-all border border-zinc-800/40 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold active:scale-95 ${msg.own ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
                                >
                                  Remove Vote
                                </button>
                              </div>
                            </div>
                          ) : msg.type === "image" ? (
                            (() => {
                              const imgIdx = lightboxImages.findIndex(
                                (item) =>
                                  item.messageId === msg.id &&
                                  item.itemIndex === 0,
                              );
                              return (
                                <div className="space-y-2">
                                  <div
                                    className={`relative overflow-hidden group rounded-xl ${msg.own ? "border border-zinc-300/40" : "border border-zinc-800/40 bg-zinc-900/60"}`}
                                  >
                                    <img
                                      src={msg.message}
                                      alt="Classified attachment"
                                      className="max-w-full max-h-96 object-contain w-full cursor-zoom-in"
                                      onClick={() => {
                                        setLightboxIndex(
                                          imgIdx >= 0 ? imgIdx : 0,
                                        );
                                        setLightboxOpen(true);
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display =
                                          "block";
                                      }}
                                    />
                                    <div
                                      style={{ display: "none" }}
                                      className="p-4 text-center text-zinc-500 text-xs"
                                    >
                                      <LuTriangleAlert
                                        className="inline mr-2"
                                        size={14}
                                      />
                                      Failed to decrypt image
                                    </div>
                                    {/* Zoom hint overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <div className="bg-black/60 backdrop-blur-sm rounded-full p-2.5 border border-zinc-700/40">
                                        <LuMaximize2
                                          size={18}
                                          className="text-white"
                                        />
                                      </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() =>
                                          downloadImage(msg.message, msg.id)
                                        }
                                        className="bg-black/80 backdrop-blur-sm hover:bg-white hover:text-black text-white px-3 py-2 text-[10px] uppercase tracking-widest border border-zinc-700/30 hover:border-white font-bold transition-all flex items-center gap-1.5 rounded-lg"
                                        title="Download image"
                                      >
                                        <LuDownload size={13} />
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                  {msg.caption && !msg.deleted && (
                                    <p
                                      className={`text-xs sm:text-sm mt-1 leading-relaxed ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                    >
                                      {renderMessageText(
                                        msg.caption,
                                        `${msg.id}-caption`,
                                      )}
                                    </p>
                                  )}
                                </div>
                              );
                            })()
                          ) : msg.type === "image-batch" ? (
                            <div className="space-y-2">
                              <div
                                className={`relative overflow-hidden rounded-[14px] p-1 w-[248px] sm:w-[284px] md:w-[320px] ${msg.own ? "border border-zinc-300/45 bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]" : "border border-zinc-800/45 bg-zinc-900/75"}`}
                              >
                                {(() => {
                                  const previewImages = (
                                    msg.images || []
                                  ).slice(0, 4);
                                  const previewCount = previewImages.length;
                                  const remainingCount =
                                    (msg.images?.length || 0) - 4;
                                  const gridClass =
                                    previewCount === 1
                                      ? "grid-cols-1"
                                      : previewCount === 3
                                        ? "grid-cols-2"
                                        : "grid-cols-2";

                                  return (
                                    <div className={`grid ${gridClass} gap-1`}>
                                      {previewImages.map(
                                        (imageSrc, imageIndex) => {
                                          const isLastPreview =
                                            imageIndex === 3 &&
                                            remainingCount > 0;
                                          const cornerClass =
                                            previewCount === 1
                                              ? "rounded-[10px]"
                                              : previewCount === 2
                                                ? imageIndex === 0
                                                  ? "rounded-l-[10px] rounded-r-[6px]"
                                                  : "rounded-r-[10px] rounded-l-[6px]"
                                                : previewCount === 3
                                                  ? imageIndex === 0
                                                    ? "rounded-t-[10px] rounded-b-[6px]"
                                                    : imageIndex === 1
                                                      ? "rounded-bl-[10px] rounded-tr-[6px]"
                                                      : "rounded-br-[10px] rounded-tl-[6px]"
                                                  : imageIndex === 0
                                                    ? "rounded-tl-[10px] rounded-br-[6px]"
                                                    : imageIndex === 1
                                                      ? "rounded-tr-[10px] rounded-bl-[6px]"
                                                      : imageIndex === 2
                                                        ? "rounded-bl-[10px] rounded-tr-[6px]"
                                                        : "rounded-br-[10px] rounded-tl-[6px]";
                                          const tileClass =
                                            previewCount === 1
                                              ? "aspect-[5/4]"
                                              : previewCount === 2
                                                ? "aspect-[5/6]"
                                                : previewCount === 3
                                                  ? imageIndex === 0
                                                    ? "col-span-2 aspect-[3/2]"
                                                    : "aspect-square"
                                                  : "aspect-square";

                                          return (
                                            <button
                                              key={`${msg.id}-image-${imageIndex}`}
                                              type="button"
                                              className={`relative overflow-hidden group transition-transform duration-200 hover:scale-[1.01] ${tileClass} ${cornerClass}`}
                                              onClick={() => {
                                                openLightboxForMessageImage(
                                                  msg.id,
                                                  imageIndex,
                                                );
                                              }}
                                            >
                                              <img
                                                src={imageSrc}
                                                alt={`Classified attachment ${imageIndex + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                              {/* Pin control moved to the lightbox view; removed inline pin from grid */}
                                              {isLastPreview && (
                                                <div className="absolute inset-0 bg-black/62 backdrop-blur-[1.5px] flex items-center justify-center">
                                                  <span className="text-white text-[28px] font-black tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                                                    +{remainingCount}
                                                  </span>
                                                </div>
                                              )}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              {msg.caption && !msg.deleted && (
                                <p
                                  className={`text-[11px] sm:text-xs mt-1.5 leading-relaxed ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                >
                                  {renderMessageText(
                                    msg.caption,
                                    `${msg.id}-caption`,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : msg.type === "audio" ? (
                            <div className="space-y-2">
                              <div
                                className={`relative overflow-hidden rounded-xl ${msg.own ? "border border-zinc-300/40 bg-zinc-100" : "border border-zinc-800/40 bg-zinc-900/60"}`}
                              >
                                {(() => {
                                  const audioId = `audio-${msg.id}`;
                                  return (
                                    <div className="p-3 space-y-2 w-full">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            const el =
                                              document.getElementById(audioId);
                                            if (!el) return;
                                            if (el.paused) {
                                              // pause all other players first
                                              document
                                                .querySelectorAll(
                                                  'audio[id^="audio-"]',
                                                )
                                                .forEach((a) => {
                                                  if (a.id !== audioId)
                                                    a.pause();
                                                });
                                              el.play().catch(() => {});
                                            } else {
                                              el.pause();
                                            }
                                          }}
                                          className={`h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 ${msg.own ? "bg-zinc-900 hover:bg-zinc-800" : "bg-white/10 hover:bg-white/20"}`}
                                        >
                                          <LuPlay
                                            size={14}
                                            className={
                                              msg.own
                                                ? "text-white"
                                                : "text-white"
                                            }
                                            id={`${audioId}-play-icon`}
                                          />
                                        </button>
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div
                                            className={`relative h-1.5 rounded-full cursor-pointer group ${msg.own ? "bg-zinc-400/40" : "bg-zinc-700/50"}`}
                                            onClick={(e) => {
                                              const el =
                                                document.getElementById(
                                                  audioId,
                                                );
                                              if (!el || !el.duration) return;
                                              const rect =
                                                e.currentTarget.getBoundingClientRect();
                                              const pct = Math.max(
                                                0,
                                                Math.min(
                                                  1,
                                                  (e.clientX - rect.left) /
                                                    rect.width,
                                                ),
                                              );
                                              el.currentTime =
                                                pct * el.duration;
                                            }}
                                          >
                                            <div
                                              id={`${audioId}-progress`}
                                              className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ${msg.own ? "bg-zinc-900/70" : "bg-white/60"}`}
                                              style={{ width: "0%" }}
                                            />
                                            <div
                                              className={`absolute inset-0 rounded-full transition-colors ${msg.own ? "bg-black/0 group-hover:bg-black/5" : "bg-white/0 group-hover:bg-white/5"}`}
                                            />
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span
                                              id={`${audioId}-time`}
                                              className={`text-[9px] font-mono font-bold tabular-nums tracking-wider ${msg.own ? "text-zinc-600" : "text-zinc-500"}`}
                                            >
                                              0:00 /{" "}
                                              {formatDuration(
                                                msg.audioDuration || 0,
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          id={`${audioId}-speed-btn`}
                                          onClick={() => {
                                            const el =
                                              document.getElementById(audioId);
                                            const btn = document.getElementById(
                                              `${audioId}-speed-btn`,
                                            );
                                            if (!el || !btn) return;
                                            const speeds = [1, 1.5, 2, 0.5];
                                            const cur = el.playbackRate;
                                            const idx = speeds.indexOf(cur);
                                            const next =
                                              speeds[(idx + 1) % speeds.length];
                                            el.playbackRate = next;
                                            btn.textContent = next + "x";
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
                                          const prog = document.getElementById(
                                            `${audioId}-progress`,
                                          );
                                          const timeEl =
                                            document.getElementById(
                                              `${audioId}-time`,
                                            );
                                          const playIcon =
                                            document.getElementById(
                                              `${audioId}-play-icon`,
                                            );
                                          if (prog && el.duration)
                                            prog.style.width = `${(el.currentTime / el.duration) * 100}%`;
                                          if (timeEl)
                                            timeEl.textContent = `${formatDuration(Math.floor(el.currentTime))} / ${formatDuration(Math.floor(el.duration) || msg.audioDuration || 0)}`;
                                        }}
                                        onPlay={(e) => {
                                          const btn =
                                            e.target.parentElement?.querySelector(
                                              "button",
                                            );
                                          if (btn)
                                            btn.innerHTML =
                                              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><line x1="6" y1="4" x2="6" y2="20"></line><line x1="18" y1="4" x2="18" y2="20"></line></svg>';
                                        }}
                                        onPause={(e) => {
                                          const btn =
                                            e.target.parentElement?.querySelector(
                                              "button",
                                            );
                                          if (btn)
                                            btn.innerHTML =
                                              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                                        }}
                                        onEnded={(e) => {
                                          const prog = document.getElementById(
                                            `${audioId}-progress`,
                                          );
                                          if (prog) prog.style.width = "0%";
                                          e.target.currentTime = 0;
                                          const btn =
                                            e.target.parentElement?.querySelector(
                                              "button",
                                            );
                                          if (btn)
                                            btn.innerHTML =
                                              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                                        }}
                                        className="hidden"
                                      />
                                    </div>
                                  );
                                })()}
                              </div>
                              {msg.caption && !msg.deleted && (
                                <p
                                  className={`text-xs sm:text-sm mt-1 leading-relaxed ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                >
                                  {renderMessageText(
                                    msg.caption,
                                    `${msg.id}-caption`,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : msg.type === "file" ? (
                            <div className="space-y-2">
                              <div
                                className={`relative overflow-hidden group rounded-xl ${msg.own ? "border border-zinc-300/40 bg-zinc-100" : "border border-zinc-800/40 bg-zinc-900/60"}`}
                              >
                                <div className="flex items-center gap-2.5 p-3">
                                  <div
                                    className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl shrink-0 flex items-center justify-center ${msg.own ? "bg-zinc-900/10 border border-zinc-300/40" : "bg-white/5 border border-zinc-700/30"}`}
                                  >
                                    {React.createElement(
                                      getFileIcon(msg.fileType),
                                      {
                                        size: 22,
                                        className: msg.own
                                          ? "text-zinc-700"
                                          : "text-zinc-300",
                                      },
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-[11px] sm:text-xs font-bold truncate ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                    >
                                      {msg.fileName || "Classified File"}
                                    </p>
                                    <p
                                      className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${msg.own ? "text-zinc-500" : "text-zinc-500"}`}
                                    >
                                      {formatFileSize(msg.fileSize)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      downloadFile(msg.message, msg.fileName)
                                    }
                                    className={`h-11 w-11 sm:h-10 sm:w-auto sm:px-3 sm:py-2 text-[10px] uppercase tracking-widest font-bold transition-all inline-flex items-center justify-center gap-1.5 rounded-lg shrink-0 self-center active:scale-95 ${msg.own ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700" : "bg-white/5 hover:bg-white hover:text-black text-zinc-400 border border-zinc-700/30 hover:border-white"}`}
                                    title="Download file"
                                  >
                                    <LuDownload size={13} />
                                    <span className="hidden sm:inline">
                                      Download
                                    </span>
                                  </button>
                                </div>
                              </div>
                              {msg.caption && !msg.deleted && (
                                <p
                                  className={`text-xs sm:text-sm mt-1 leading-relaxed ${msg.own ? "text-zinc-800" : "text-zinc-200"}`}
                                >
                                  {renderMessageText(
                                    msg.caption,
                                    `${msg.id}-caption`,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : msg.type === "high-clearance" ? (
                            <div className="space-y-2">
                              <div
                                className={`relative p-4 sm:p-5 md:p-6 text-center rounded-xl overflow-hidden ${msg.own ? "border border-zinc-400/30 bg-gradient-to-br from-zinc-800 to-zinc-900" : "border border-zinc-700/30 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20"}`}
                              >
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
                                      <LuLock
                                        className="text-white"
                                        size={24}
                                        strokeWidth={1.5}
                                      />
                                    </div>
                                    <div className="absolute inset-0 bg-white/[0.02] rounded-2xl animate-pulse" />
                                  </div>

                                  <div>
                                    <p className="text-white/90 text-sm uppercase tracking-[0.15em] font-black mb-1.5">
                                      Classified Content
                                    </p>
                                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">
                                      {msg.requiresBiometric
                                        ? "Biometric authentication required"
                                        : "High security encryption active"}
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
                                          const decryptedContent = decrypt(
                                            msg.message,
                                          );
                                          const parsedContent =
                                            JSON.parse(decryptedContent);
                                          openBiometricVault({
                                            id: msg.id,
                                            content:
                                              parsedContent.content || "",
                                            image: parsedContent.image,
                                            file: parsedContent.file,
                                            audio: parsedContent.audio,
                                            type: "high-clearance",
                                            requiresBiometric:
                                              msg.requiresBiometric,
                                            username: msg.username,
                                          });
                                        } catch (error) {
                                          console.error(
                                            "Failed to parse high-clearance message:",
                                            error,
                                          );
                                          openBiometricVault({
                                            id: msg.id,
                                            content: decrypt(msg.message),
                                            type: "high-clearance",
                                            requiresBiometric:
                                              msg.requiresBiometric,
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
                            <p
                              className={`leading-relaxed whitespace-pre-wrap break-words font-mono ${isCommanderMessage ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
                            >
                              {msg.deleted && (
                                <LuTrash2
                                  className="inline mr-1 opacity-50"
                                  size={13}
                                />
                              )}{" "}
                              {renderMessageText(
                                msg.message,
                                msg.id || "message",
                              )}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 justify-end mt-2 opacity-35">
                            {msg.edited && !msg.deleted && (
                              <span className="text-[6px] px-1.5 py-0.5 uppercase font-bold rounded-full bg-current/10 border border-current/20 tracking-wider">
                                Edited
                              </span>
                            )}
                            <span className="text-[7px] font-bold tabular-nums font-mono">
                              {msg.time}
                            </span>
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
                          {activeMenuId === msg.id && !msg.deleted && (
                            <motion.div
                              key={`quick-reaction-bar-${msg.id || msgIndex}`}
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                              transition={{ duration: 0.14 }}
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute -top-10 ${msg.own ? "right-0" : "left-0"} z-[55] bg-[#0f0f11]/95 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_30px_rgba(0,0,0,0.45)] rounded-full px-1.5 py-1 inline-flex items-center gap-1`}
                            >
                              {QUICK_REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={`${msg.id}-${emoji}`}
                                  type="button"
                                  onClick={() => reactToMessage(msg.id, emoji)}
                                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all active:scale-90 ${myReactionEmoji === emoji ? "bg-white/15 ring-1 ring-white/30" : "hover:bg-white/10"}`}
                                  title={`React with ${emoji}`}
                                  aria-label={`React with ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                          {activeMenuId === msg.id && (
                            <motion.div
                              key={`message-action-menu-${msg.id || msgIndex}`}
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              className={`absolute top-[90%] mt-1 ${msg.own ? "right-0" : "left-0"} z-50 bg-[#0f0f11]/95 backdrop-blur-xl border border-zinc-800/40 shadow-[0_12px_50px_rgba(0,0,0,0.8)] min-w-[150px] sm:min-w-[160px] rounded-xl overflow-hidden`}
                            >
                              {!msg.own && msg.username !== username && (
                                <button
                                  onClick={() => startReplying(msg)}
                                  className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                                >
                                  <LuReply size={13} /> Reply
                                </button>
                              )}
                              <button
                                onClick={() => togglePinMessage(msg.id)}
                                className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-2.5 uppercase font-bold transition-all"
                              >
                                <LuPin size={13} />
                                {isMessagePinned(msg.id) ? "Unpin" : "Pin"}
                              </button>
                              <div className="border-t border-zinc-800/30 mx-3" />
                              <button
                                onClick={() => animateDelete(msg.id, "local")}
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
                              {(msg.own || isCurrentHost) && !msg.system && (
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
                                    <LuTrash2 size={13} />
                                    {isCurrentHost && !msg.own
                                      ? "Expunge Global (Host)"
                                      : "Expunge Global"}
                                  </button>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {messageReactionList.length > 0 && !msg.deleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReactionSheet(msg.id);
                            }}
                            className={`absolute -bottom-3 ${msg.own ? "right-2" : "left-2"} z-20`}
                          >
                            <span className="inline-flex h-6 min-w-6 px-1.5 items-center gap-1 rounded-full bg-[#0f0f11]/95 border border-zinc-700/50 shadow-[0_4px_18px_rgba(0,0,0,0.45)] text-sm leading-none">
                              <span className="flex items-center -space-x-0.5">
                                {messageReactionSummary
                                  .slice(0, 3)
                                  .map((reaction) => (
                                    <span
                                      key={`${msg.id}-summary-${reaction.emoji}`}
                                      className="inline-flex h-4 w-4 items-center justify-center text-[11px]"
                                    >
                                      {reaction.emoji}
                                    </span>
                                  ))}
                              </span>
                              <span className="text-[9px] font-bold text-zinc-300 tabular-nums">
                                {messageReactionList.length}
                              </span>
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
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
                      <span
                        className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-1">
                        Signal Incoming...
                      </p>
                      <div className="text-[9px] text-white font-bold flex flex-wrap gap-x-1 uppercase truncate font-mono">
                        <span>[</span>
                        {typingUsers.map((u, i) => (
                          <span
                            key={`typing-${u || "unknown"}-${i}`}
                            className="text-white"
                          >
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
                  {!isCurrentHost && selectionHasOthers
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
                  disabled={!canGlobalDeleteSelection}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-red-900/30 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
                  title={
                    canGlobalDeleteSelection
                      ? "Delete for everyone"
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

          {mentionSuggestions.length > 0 &&
            !isRecording &&
            !isMultiAttachmentCaptionLocked && (
              <div className="mb-2 px-1 sm:px-2">
                <div className="border border-zinc-700/40 bg-zinc-950/95 rounded-xl overflow-hidden">
                  <p className="px-3 py-1.5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold border-b border-zinc-800/40">
                    Mention Suggestions
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    {mentionSuggestions.map((name, index) => {
                      const isActive = index === activeMentionIndex;
                      return (
                        <button
                          key={`mention-${name}-${index}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyMentionSuggestion(name)}
                          className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          @{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          <div
            className={`flex ${hasSelectedAttachments ? "flex-col" : "items-center"} p-1 sm:p-1.5 transition-all rounded-2xl ${isRadioSilenceEnforced ? "bg-zinc-900/70 border border-zinc-700/50 opacity-80" : editingMessageId ? "bg-white/[0.04] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.04)]" : "bg-zinc-900/40 border border-zinc-800/30 focus-within:border-zinc-700/40 focus-within:bg-zinc-900/50 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.02)]"}`}
          >
            <div className="flex items-center w-full">
              {/* ── Mobile: single + button with popup (hidden during recording/audio preview) ── */}
              {!isRecording && !audioBlob && (
                <div className="relative sm:hidden" ref={mobileToolbarMobileRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (isRadioSilenceEnforced) return;
                      e.stopPropagation();
                      setShowMobileToolbar(!showMobileToolbar);
                    }}
                    className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${showMobileToolbar ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"} ${isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={isRadioSilenceEnforced}
                  >
                    <LuPlus
                      size={20}
                      strokeWidth={2.5}
                      className={`transition-transform duration-200 ${showMobileToolbar ? "rotate-45" : ""}`}
                    />
                    {/* Active indicator dot */}
                    {(selfDestructTime > 0 ||
                      isRecording ||
                      hasSelectedAttachments ||
                      audioBlob) &&
                      !showMobileToolbar && (
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
                                Self-Destruct{" "}
                                {selfDestructTime > 0
                                  ? `(${selfDestructTime / 1000}s)`
                                  : ""}
                              </span>
                              <LuChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${showTimerMenu ? "rotate-90" : ""}`}
                              />
                            </button>
                            <AnimatePresence>
                              {showTimerMenu && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: "easeOut",
                                  }}
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
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${showPollModal ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={
                              !!editingMessageId || isRadioSilenceEnforced
                            }
                          >
                            <LuChartBar size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Create Poll
                            </span>
                          </button>

                          {/* Attach file */}
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${hasSelectedAttachments ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={
                              !!editingMessageId || isRadioSilenceEnforced
                            }
                          >
                            <LuPaperclip size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Attach File
                            </span>
                          </button>

                          {/* Attach audio (new) */}
                          <button
                            type="button"
                            onClick={() => {
                              audioInputRef.current?.click();
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] text-zinc-400 hover:text-white hover:bg-white/[0.06] ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={
                              !!editingMessageId || isRadioSilenceEnforced
                            }
                          >
                            <LuMic size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Attach Audio
                            </span>
                          </button>

                          {/* High clearance */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowHighClearanceComposer(true);
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] relative ${showHighClearanceComposer ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={
                              !!editingMessageId || isRadioSilenceEnforced
                            }
                          >
                            <div className="relative">
                              <LuLock size={18} />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse opacity-70"></div>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              High Clearance
                            </span>
                          </button>

                          {/* Voice message option removed from mobile toolbar; use composer mic button instead */}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Desktop: same + popup as mobile (hidden during recording/audio preview) ── */}
              {!isRecording && !audioBlob && (
                <div className="relative hidden sm:block" ref={mobileToolbarDesktopRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (isRadioSilenceEnforced) return;
                      e.stopPropagation();
                      setShowMobileToolbar(!showMobileToolbar);
                    }}
                    className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${showMobileToolbar ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"} ${isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={isRadioSilenceEnforced}
                  >
                    <LuPlus
                      size={20}
                      strokeWidth={2.5}
                      className={`transition-transform duration-200 ${showMobileToolbar ? "rotate-45" : ""}`}
                    />
                    {(selfDestructTime > 0 ||
                      isRecording ||
                      hasSelectedAttachments ||
                      audioBlob) &&
                      !showMobileToolbar && (
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
                                Self-Destruct{" "}
                                {selfDestructTime > 0
                                  ? `(${selfDestructTime / 1000}s)`
                                  : ""}
                              </span>
                              <LuChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${showTimerMenu ? "rotate-90" : ""}`}
                              />
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

                          <button
                            type="button"
                            onClick={() => {
                              togglePollModal();
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${showPollModal ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={!!editingMessageId || isRadioSilenceEnforced}
                          >
                            <LuChartBar size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Create Poll
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] ${hasSelectedAttachments ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={!!editingMessageId || isRadioSilenceEnforced}
                          >
                            <LuPaperclip size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Attach File
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              audioInputRef.current?.click();
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] text-zinc-400 hover:text-white hover:bg-white/[0.06] ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={!!editingMessageId || isRadioSilenceEnforced}
                          >
                            <LuMic size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              Attach Audio
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowHighClearanceComposer(true);
                              setShowMobileToolbar(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] relative ${showHighClearanceComposer ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"} ${editingMessageId || isRadioSilenceEnforced ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={!!editingMessageId || isRadioSilenceEnforced}
                          >
                            <div className="relative">
                              <LuLock size={18} />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse opacity-70"></div>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              High Clearance
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 md:px-3 min-w-0">
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
                      {isPlayingPreview ? (
                        <LuPause size={12} />
                      ) : (
                        <LuPlay size={12} />
                      )}
                    </button>
                    <audio
                      ref={audioPreviewRef}
                      src={audioPreviewUrl}
                      onEnded={() => setIsPlayingPreview(false)}
                      className="hidden"
                    />
                    <div className="flex-1 flex items-center gap-0.5 sm:gap-1 h-6 sm:h-7 min-w-0 overflow-hidden">
                      {Array.from({ length: 32 }).map((_, i) => {
                        const h = Math.sin(i * 0.5) * 0.5 + Math.random() * 0.5;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-full bg-white/30"
                            style={{
                              height: `${Math.max(3, h * 24)}px`,
                              minWidth: 2,
                              maxWidth: 5,
                            }}
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
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentMessage}
                    placeholder={
                      isRadioSilenceEnforced
                        ? `Radio Silence Enforced By HOST...`
                        : "Add caption for voice message..."
                    }
                    className={`w-full bg-transparent px-2 sm:px-4 py-2 sm:py-3 outline-none text-xs sm:text-sm font-mono tracking-wide min-w-0 ${isRadioSilenceEnforced ? "text-zinc-500 placeholder:text-zinc-500 cursor-not-allowed" : "text-white placeholder:text-zinc-700"}`}
                    disabled={isRadioSilenceEnforced}
                    onChange={handleInputChange}
                    onKeyDown={handleComposerKeyDown}
                  />
                </div>
              ) : (
                /* Normal text input */
                <>
                  {replyingTo &&
                    !editingMessageId &&
                    !hasSelectedAttachments && (
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

                  <input
                    ref={inputRef}
                    type="text"
                    value={currentMessage}
                    placeholder={
                      isRadioSilenceEnforced
                        ? `Radio Silence Enforced By HOST...`
                        : isMultiAttachmentCaptionLocked
                          ? "Caption available for single file or image batch"
                          : editingMessageId
                            ? "Editing message..."
                            : hasSelectedAttachments
                              ? "Add caption for attachment..."
                              : "Type your encrypted signal..."
                    }
                    className={`flex-1 bg-transparent px-2 sm:px-4 py-2 sm:py-3 outline-none text-xs sm:text-sm font-mono tracking-wide min-w-0 ${isRadioSilenceEnforced || isMultiAttachmentCaptionLocked ? "text-zinc-500 placeholder:text-zinc-500 cursor-not-allowed" : "text-white placeholder:text-zinc-400"}`}
                    disabled={
                      isRadioSilenceEnforced || isMultiAttachmentCaptionLocked
                    }
                    onChange={handleInputChange}
                    onKeyDown={handleComposerKeyDown}
                  />
                </>
              )}

              {hasSelectedAttachments &&
                !editingMessageId &&
                !isRecording &&
                !audioBlob && (
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="h-8 w-8 sm:h-9 sm:w-9 mr-1 sm:mr-1.5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90 shrink-0"
                    title="Remove attachment"
                  >
                    <LuX size={13} />
                  </button>
                )}

              {/** Show mic button when input is empty; show send when there is text **/}
              <button
                onClick={() => {
                  const hasText = !!(currentMessage && currentMessage.trim());
                  if (isRecording) {
                    stopRecording();
                    return;
                  }
                  if (audioBlob) {
                    sendAudioMessage();
                    return;
                  }
                  if (hasSelectedAttachments) {
                    sendSelectedAttachments();
                    return;
                  }
                  if (hasText) {
                    sendMessage();
                    return;
                  }
                  // No text/attachments/audio -> start recording (mic)
                  startRecording();
                }}
                className={`p-2.5 sm:p-3 transition-all rounded-xl active:scale-90 flex items-center justify-center gap-1.5 ${isRecording ? "bg-red-500 text-white hover:bg-red-400" : editingMessageId ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10" : "bg-white text-zinc-900 hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10"}`}
                disabled={isRadioSilenceEnforced}
                title={
                  isRecording
                    ? "Stop recording"
                    : audioBlob
                      ? "Send voice message"
                      : hasSelectedAttachments
                        ? "Send attachments"
                        : currentMessage && currentMessage.trim()
                          ? "Send message"
                          : "Record voice message"
                }
              >
                {isRecording ? (
                  <>
                    <LuSquare size={14} />
                    <span className="sm:hidden text-[10px] font-black uppercase tracking-wider">
                      Stop
                    </span>
                  </>
                ) : editingMessageId ? (
                  <LuCheck size={16} strokeWidth={2.5} />
                ) : audioBlob ? (
                  <>
                    <LuSend size={16} />
                    <span className="sm:hidden text-[10px] font-black uppercase tracking-wider">
                      Send
                    </span>
                  </>
                ) : hasSelectedAttachments ? (
                  <>
                    <LuSend size={16} />
                    <span className="sm:hidden text-[10px] font-black uppercase tracking-wider">
                      Send
                    </span>
                  </>
                ) : currentMessage && currentMessage.trim() ? (
                  <LuSend size={16} />
                ) : (
                  <LuMic size={18} />
                )}
              </button>
            </div>

            {hasSelectedAttachments &&
              !editingMessageId &&
              !isRecording &&
              !audioBlob && (
                <div className="w-full px-2 py-2 border-t border-zinc-800/40">
                  <div className="mb-2 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                    {selectedAttachments.length} attachment
                    {selectedAttachments.length > 1 ? "s" : ""} ready
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAttachments.map((attachment, attachmentIndex) =>
                      attachment.type === "image" ? (
                        <div
                          key={
                            attachment.id ||
                            `attachment-image-${attachmentIndex}`
                          }
                          className="relative border border-zinc-700/50 bg-zinc-900 rounded-lg overflow-hidden"
                        >
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
                        </div>
                      ) : attachment.type === "audio" ? (
                        <div
                          key={
                            attachment.id ||
                            `attachment-audio-${attachmentIndex}`
                          }
                          className="relative border border-zinc-700/50 bg-zinc-900 rounded-lg px-3 py-3 pr-9"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg border border-zinc-700/30">
                              <LuMic size={18} className="text-zinc-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-zinc-200 font-bold truncate">
                                {attachment.name}
                              </p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                                {formatFileSize(attachment.size)} •{" "}
                                {formatDuration(attachment.audioDuration || 0)}
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
                        </div>
                      ) : (
                        <div
                          key={
                            attachment.id ||
                            `attachment-file-${attachmentIndex}`
                          }
                          className="relative inline-flex items-center gap-3 border border-zinc-700/50 bg-zinc-900 rounded-lg px-3 py-3 pr-9"
                        >
                          <div className="p-2 bg-white/5 rounded-lg border border-zinc-700/30">
                            {React.createElement(
                              getFileIcon(attachment.mimeType),
                              { size: 18, className: "text-zinc-300" },
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-zinc-200 font-bold truncate max-w-[200px]">
                              {attachment.name}
                            </p>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                              {formatFileSize(attachment.size)}
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
                      ),
                    )}
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
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">
                      Question
                    </p>
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
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">
                      Answers
                    </p>
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
                    <p className="text-xs text-zinc-400 mb-2 font-bold uppercase tracking-wider">
                      Duration
                    </p>
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
          {reactionSheetMessageId &&
            (() => {
              const targetMessage = messageList.find(
                (message) => message.id === reactionSheetMessageId,
              );
              const reactions = getMessageReactionList(reactionSheetMessageId);
              const groupedSummary = getMessageReactionSummary(
                reactionSheetMessageId,
              );

              if (!targetMessage || reactions.length === 0) {
                return null;
              }

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9997] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                  onClick={() => setReactionSheetMessageId(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ type: "spring", damping: 24, stiffness: 260 }}
                    className="w-full max-w-md bg-[#0f0f11] border border-zinc-800/40 shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-t-2xl sm:rounded-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 sm:p-5 border-b border-zinc-800/30 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-black">
                          Reactions
                        </p>
                        <p className="text-sm text-white font-bold mt-0.5">
                          All {reactions.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReactionSheetMessageId(null)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        aria-label="Close reactions"
                      >
                        <LuX size={16} />
                      </button>
                    </div>

                    <div className="px-4 sm:px-5 py-3 border-b border-zinc-800/30 flex items-center gap-2 overflow-x-auto">
                      {groupedSummary.map((entry) => (
                        <span
                          key={`${reactionSheetMessageId}-tab-${entry.emoji}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/40 text-xs text-zinc-200 whitespace-nowrap"
                        >
                          <span>{entry.emoji}</span>
                          <span className="font-bold">{entry.count}</span>
                        </span>
                      ))}
                    </div>

                    <div className="max-h-[52vh] overflow-y-auto">
                      {reactions.map((reaction, index) => {
                        const isOwnReaction =
                          reaction.username?.toLowerCase() ===
                          username?.toLowerCase();
                        const initials = (reaction.username || "?")
                          .slice(0, 1)
                          .toUpperCase();
                        const codenameLabel = (
                          isOwnReaction ? "You" : reaction.username || ""
                        ).toUpperCase();
                        return (
                          <button
                            key={`${reactionSheetMessageId}-${reaction.username}-${reaction.emoji}-${index}`}
                            type="button"
                            onClick={() => {
                              if (isOwnReaction) {
                                reactToMessage(
                                  reactionSheetMessageId,
                                  reaction.emoji,
                                );
                              }
                            }}
                            className={`w-full px-4 sm:px-5 py-3.5 border-b border-zinc-800/20 flex items-center justify-between gap-3 text-left ${isOwnReaction ? "hover:bg-white/[0.04]" : ""}`}
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-zinc-800/80 border border-zinc-700/40 text-zinc-200 text-xs font-black uppercase flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-zinc-100 truncate">
                                  {codenameLabel}
                                </p>
                                {isOwnReaction && (
                                  <p className="text-[11px] text-zinc-500">
                                    Click to remove
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-2xl leading-none">
                              {reaction.emoji}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
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

                {confirmAction === "terminate" &&
                  isCurrentHost &&
                  promotableUsers.length > 0 && (
                    <div className="mb-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 mb-2 font-bold">
                        Promote a new host instead of terminating
                      </p>
                      <input
                        type="text"
                        value={hostTransferSearch}
                        onChange={(e) => setHostTransferSearch(e.target.value)}
                        placeholder="Search codename"
                        className="w-full mb-2 bg-black/40 border border-zinc-800/60 text-white px-3 py-2 text-xs outline-none rounded-lg focus:border-zinc-600 placeholder:text-zinc-700"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {filteredPromotableUsers.length === 0 ? (
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider py-1">
                            No matching codename found
                          </p>
                        ) : (
                          filteredPromotableUsers.map((user, userIndex) => (
                            <div
                              key={user.id || `promotable-user-${userIndex}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-black/20 px-2.5 py-2"
                            >
                              <span className="text-xs text-zinc-200 uppercase tracking-wide truncate">
                                {user.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => promoteHostFromPopup(user)}
                                className="shrink-0 px-2.5 py-1 text-[9px] uppercase tracking-widest font-black rounded-md border border-zinc-700/60 text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all"
                              >
                                Promote
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

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
          {lightboxOpen &&
            (() => {
              const total = lightboxImages.length;
              const current = lightboxImages[lightboxIndex];
              const handlePrev = () =>
                setLightboxIndex((i) => (i - 1 + total) % total);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(false);
                    }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                      className="absolute left-2 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2.5 sm:p-3 transition-all hover:scale-105 active:scale-95"
                    >
                      <LuChevronLeft
                        size={20}
                        className="sm:w-[22px] sm:h-[22px]"
                      />
                    </button>
                  )}

                  {/* Next button */}
                  {total > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="absolute right-2 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-zinc-700/40 text-white rounded-xl p-2.5 sm:p-3 transition-all hover:scale-105 active:scale-95"
                    >
                      <LuChevronRight
                        size={20}
                        className="sm:w-[22px] sm:h-[22px]"
                      />
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
                        src={current?.src}
                        alt="Full preview"
                        className="rounded-xl border border-zinc-700/30 shadow-2xl shadow-black/60 max-h-[70dvh] sm:max-h-[80dvh] w-auto object-contain"
                      />
                      {/* Sender info + download */}
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                          <LuLock size={10} className="inline mr-1" />
                          {current?.username}
                        </span>
                        {/* Pin / Unpin for specific image (when viewing in lightbox) */}
                        {current?.messageId != null &&
                          typeof current?.itemIndex === "number" && (
                            <button
                              onClick={() =>
                                togglePinMessage(
                                  current.messageId,
                                  current.itemIndex,
                                )
                              }
                              className={`ml-2 bg-white/10 hover:bg-white hover:text-black border border-zinc-700/30 text-white px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 rounded-lg active:scale-95`}
                              title={
                                isImagePinnedFromBatch(
                                  current.messageId,
                                  current.itemIndex,
                                )
                                  ? "Unpin this image"
                                  : "Pin this image"
                              }
                            >
                              <LuPin size={12} />
                              {isImagePinnedFromBatch(
                                current.messageId,
                                current.itemIndex,
                              )
                                ? "Unpin"
                                : "Pin"}
                            </button>
                          )}
                        <button
                          onClick={() =>
                            downloadImage(current?.src, current?.messageId)
                          }
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
                      {lightboxImages.map((im, i) => (
                        <button
                          key={`${im.messageId}-${im.itemIndex}`}
                          onClick={() => setLightboxIndex(i)}
                          className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                            i === lightboxIndex
                              ? "border-white scale-110 shadow-lg shadow-white/10"
                              : "border-zinc-700/40 hover:border-zinc-500 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={im.src}
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
        {showContextModal && isCurrentHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowContextModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="w-full max-w-md bg-[#0f0f11] border border-zinc-800/40 shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-t-2xl sm:rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800/30 relative sticky top-0 bg-[#0f0f11] z-10">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
                <h3 className="text-base font-black text-white flex items-center gap-2.5 uppercase tracking-[0.1em]">
                  <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-700/30">
                    <LuMessageSquarePlus size={16} className="text-blue-400" />
                  </div>
                  {contextModalMode === "all"
                    ? "Send Context to All"
                    : "Send Context"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowContextModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <LuX size={18} className="text-zinc-400" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {contextModalMode === "agent" && selectedContextAgent ? (
                  <>
                    <p className="text-sm text-zinc-400">
                      Send all previous messages from the chat history to{" "}
                      <span className="font-bold text-white">
                        {selectedContextAgent.username}
                      </span>
                      ?
                    </p>
                    <div className="bg-blue-500/10 border border-blue-700/30 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-blue-300 font-bold">
                        Info
                      </p>
                      <p className="text-xs text-blue-200 mt-1">
                        This will send all previous messages as context. The
                        context messages will appear with a dotted border and be
                        slightly dimmed.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowContextModal(false)}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700/60 text-zinc-300 font-bold uppercase text-xs tracking-wider hover:bg-zinc-900 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          sendContextToAgent(selectedContextAgent.id)
                        }
                        disabled={!!selectedContextAgent?.hasFullHistory}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-blue-700 transition-all active:scale-95 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send Context
                      </button>
                    </div>
                  </>
                ) : contextModalMode === "all" ? (
                  <>
                    <p className="text-sm text-zinc-400">
                      Send all previous messages to agents who don't have
                      context yet?
                    </p>
                    <div className="bg-blue-500/10 border border-blue-700/30 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-blue-300 font-bold">
                        Info
                      </p>
                      <p className="text-xs text-blue-200">
                        Agents who already have context will not receive
                        duplicate messages.
                      </p>
                      <div className="mt-2 text-xs text-blue-200 space-y-1">
                        <p>
                          <span className="font-bold">Total Agents:</span>{" "}
                          {allAgents.length}
                        </p>
                        <p>
                          <span className="font-bold">
                            Already have context:
                          </span>{" "}
                          {contextSyncedAgentsCount}
                        </p>
                        <p>
                          <span className="font-bold">
                            Will receive context:
                          </span>{" "}
                          {agentsNeedingContext.length}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowContextModal(false)}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700/60 text-zinc-300 font-bold uppercase text-xs tracking-wider hover:bg-zinc-900 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendContextToAll}
                        disabled={agentsNeedingContext.length === 0}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-blue-700 transition-all active:scale-95 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send to All
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}

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
