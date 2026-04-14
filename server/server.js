require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require('crypto');
const hash = (str) => crypto.createHash('sha256').update(str).digest('hex');
const { generateRoomId } = require("./utils/roomUtils");

const app = express();
const server = http.createServer(app);

// --- 1. DEFINE ALLOWED ORIGINS ---
const allowedOrigins = [
  "http://localhost:5173",             // Localhost
  "https://ghosttunnel.vercel.app"  // Your Vercel Domain (No trailing slash)
];

// --- 2. DEFINE CORS OPTIONS (Must come BEFORE app.use) ---
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
};

// --- 3. APPLY CORS TO EXPRESS ---
app.use(cors(corsOptions));

// --- 3.1 DISABLE HTTP CACHING FOR SENSITIVE RESPONSES ---
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// --- 4. APPLY CORS TO SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 10 * 1024 * 1024 // Use the same options here
});

// --- ROOM LIMITS & CLEANUP ---
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS, 10) || 50_000;
const MIN_ENCRYPTION_KEY_LENGTH = parseInt(process.env.MIN_ENCRYPTION_KEY_LENGTH, 10) || 6;
const MAX_ENCRYPTION_KEY_LENGTH = parseInt(process.env.MAX_ENCRYPTION_KEY_LENGTH, 10) || 64;
const DEFAULT_ROOM_CAPACITY = parseInt(process.env.DEFAULT_ROOM_CAPACITY, 10) || 50;
const MIN_ROOM_CAPACITY = parseInt(process.env.MIN_ROOM_CAPACITY, 10) || 2;
const MAX_ROOM_CAPACITY = parseInt(process.env.MAX_ROOM_CAPACITY, 10) || 50;
const MAX_ROOM_AGE_MS = parseInt(process.env.MAX_ROOM_AGE_MS, 10) || 24 * 60 * 60 * 1000; // 24h
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS, 10) || 15 * 60 * 1000; // 15 min
const DESTROYED_ROOM_MEMORY_MS = 7 * 24 * 60 * 60 * 1000; // remember destroyed rooms for 7 days

// --- SOCKET LOGIC ---
const rooms = {};
const pendingRooms = {}; // Host has created a room but it hasn't been created yet (waiting for first agent)
/** @type {Map<string, number>} roomId -> destroyedAt (so we can tell "room destroyed" from "room never existed") */
const destroyedRooms = new Map();

// Context message tracking: roomId -> { messages: [] }
const contextMessages = {};
const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "😮", "😢", "🙏"]);
const IMAGE_PIN_SEPARATOR = "::img::";

function extractPinnedMessageId(pinKey) {
  if (!pinKey || typeof pinKey !== "string") return null;
  const splitIndex = pinKey.indexOf(IMAGE_PIN_SEPARATOR);
  if (splitIndex === -1) return pinKey;
  return pinKey.slice(0, splitIndex);
}

function serializeRoomMessageReactions(messageReactions = {}) {
  return Object.entries(messageReactions).reduce((acc, [messageId, perUser]) => {
    const reactions = Object.values(perUser || {});
    if (reactions.length > 0) {
      acc[messageId] = reactions;
    }
    return acc;
  }, {});
}

function ensureContextData(roomId) {
  if (!contextMessages[roomId]) {
    contextMessages[roomId] = {
      messages: [],
    };
  }
  return contextMessages[roomId];
}

function ensureActivityLog(room) {
  if (!room.activityLog) {
    room.activityLog = [];
  }
  return room.activityLog;
}

function appendRoomActivity(room, eventType, payload = {}) {
  if (!room) return;
  const activityLog = ensureActivityLog(room);
  activityLog.push({
    id: crypto.randomBytes(8).toString("hex"),
    eventType,
    timestamp: Date.now(),
    ...payload,
  });
}

function buildExportApprovalStatus(room) {
  const approval = room?.exportApproval;
  if (!approval) return null;

  const approvedAgentIds = new Set(approval.approvedAgentIds || []);
  const requiredAgents = Array.isArray(approval.requiredAgents)
    ? approval.requiredAgents
    : [];
  const approvedAgents = requiredAgents.filter((agent) =>
    approvedAgentIds.has(agent.id),
  );
  const pendingAgents = requiredAgents.filter(
    (agent) => !approvedAgentIds.has(agent.id),
  );

  return {
    requestId: approval.requestId,
    requestedAt: approval.requestedAt,
    status: approval.status,
    totalRequired: requiredAgents.length,
    approvedCount: approvedAgents.length,
    pendingCount: pendingAgents.length,
    approvedAgents,
    pendingAgents,
    rejectedBy: approval.rejectedBy || null,
  };
}

function buildChatHistoryExportPayload(roomId) {
  const room = rooms[roomId];
  if (!room) return null;

  const contextData = contextMessages[roomId] || { messages: [] };
  return {
    roomId,
    roomName: room.roomName || "",
    generatedAt: Date.now(),
    createdAt: room.createdAt,
    hostId: room.hostId,
    messages: contextData.messages || [],
    activityLog: room.activityLog || [],
    currentUsers: (room.users || []).map((user) => ({
      id: user.id,
      username: user.username,
      isHost: !!user.isHost,
      joinedAt: user.joinedAt || null,
    })),
  };
}

function cancelExportApproval(room, ioInstance, reason, extras = {}) {
  if (!room || !room.exportApproval) return;

  const approval = room.exportApproval;
  const payload = {
    roomId: extras.roomId,
    requestId: approval.requestId,
    reason,
    ...extras,
  };

  ioInstance.to(room.hostId).emit("chat_history_export_request_cancelled", payload);
  (approval.requiredAgents || []).forEach((agent) => {
    ioInstance.to(agent.id).emit("chat_history_export_request_cancelled", payload);
  });

  room.exportApproval = null;
}

function emitFullContextToUser({ roomId, user, socketId }) {
  const contextData = contextMessages[roomId];
  if (!contextData || contextData.messages.length === 0) {
    return { sent: false, reason: "NO_CONTEXT" };
  }

  if (!user || user.isHost || user.hasFullHistory) {
    return { sent: false, reason: "ALREADY_HAS_CONTEXT" };
  }

  const targetSocket = io.sockets.sockets.get(socketId);
  if (!targetSocket) {
    return { sent: false, reason: "SOCKET_NOT_FOUND" };
  }

  // Filter to only messages sent BEFORE this user joined
  const preJoinMessages = contextData.messages.filter(
    (msg) => !msg.sentAt || msg.sentAt < user.joinedAt
  );

  preJoinMessages.forEach((msg) => {
    targetSocket.emit("receive_message", {
      ...msg,
      isContextMessage: true,
    });
  });

  user.hasFullHistory = true;
  const room = rooms[roomId];
  if (room) {
    io.to(roomId).emit("update_users", room.users);
  }
  return { sent: true };
}

function markRoomDestroyed(roomId) {
  destroyedRooms.set(roomId, Date.now());
}

function normalizeRoomCapacity(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return Math.max(MIN_ROOM_CAPACITY, Math.min(MAX_ROOM_CAPACITY, DEFAULT_ROOM_CAPACITY));
  }
  return Math.max(MIN_ROOM_CAPACITY, Math.min(MAX_ROOM_CAPACITY, parsed));
}

function cleanupStaleRooms() {
  const now = Date.now();
  for (const roomId in rooms) {
    if (now - rooms[roomId].createdAt > MAX_ROOM_AGE_MS) {
      io.to(roomId).emit("room_closed");
      io.in(roomId).socketsLeave(roomId);
      markRoomDestroyed(roomId);
      delete rooms[roomId];
      delete contextMessages[roomId];
    }
  }
  // Prune old destroyed-room entries so memory doesn't grow forever
  for (const [id, destroyedAt] of destroyedRooms.entries()) {
    if (now - destroyedAt > DESTROYED_ROOM_MEMORY_MS) destroyedRooms.delete(id);
  }
}

setInterval(cleanupStaleRooms, CLEANUP_INTERVAL_MS);

io.on("connection", (socket) => {
  // console.log(`User connected: ${socket.id}`);

  socket.on("create_room", ({ username, password, roomName, requireApproval, capacity }) => {
    cleanupStaleRooms();
    if (Object.keys(rooms).length >= MAX_ROOMS) {
      return socket.emit("error", "ROOM_LIMIT_REACHED");
    }
    const keyLen = typeof password === "string" ? password.length : 0;
    if (keyLen < MIN_ENCRYPTION_KEY_LENGTH || keyLen > MAX_ENCRYPTION_KEY_LENGTH) {
      return socket.emit("error", `ENCRYPTION KEY MUST BE BETWEEN ${MIN_ENCRYPTION_KEY_LENGTH} AND ${MAX_ENCRYPTION_KEY_LENGTH} CHARACTERS.`);
    }

    let roomId = generateRoomId();
    while (rooms[roomId] || pendingRooms[roomId]) roomId = generateRoomId();

    const createdAt = Date.now();
    const hostUser = { id: socket.id, username, isHost: true };
    const roomCapacity = normalizeRoomCapacity(capacity);

    // Store as PENDING room (not created yet, waiting for first agent to join)
    pendingRooms[roomId] = {
      hostId: socket.id,
      username,
      password: hash(password),
      createdAt: createdAt,
      roomName: roomName || "",
      capacity: roomCapacity,
      isLocked: false,
      silencedUserIds: [],
      pinnedMessageIds: [],
      messageOwners: {},
      messageReactions: {},
      requireApproval: !!requireApproval,
      pendingRequests: []
    };

    // Send room_created to host with a status flag indicating it's waiting
    socket.emit("room_created_pending", { 
      roomId, 
      createdAt,
      roomName: pendingRooms[roomId].roomName,
      capacity: pendingRooms[roomId].capacity,
      isWaitingForFirstAgent: true
    });
  });

  socket.on("join_room", ({ username, roomId, password }) => {
    const keyLen = typeof password === "string" ? password.length : 0;
    if (keyLen < MIN_ENCRYPTION_KEY_LENGTH || keyLen > MAX_ENCRYPTION_KEY_LENGTH) {
      return socket.emit("error", `ENCRYPTION KEY MUST BE BETWEEN ${MIN_ENCRYPTION_KEY_LENGTH} AND ${MAX_ENCRYPTION_KEY_LENGTH} CHARACTERS.`);
    }

    // Check if this is a PENDING room (first agent joining)
    const pendingRoom = pendingRooms[roomId];
    if (pendingRoom) {
      if (pendingRoom.password !== hash(password)) {
        io.to(pendingRoom.hostId).emit("intrusion_detected", {
          roomId,
          attemptedCodename: username || "UNKNOWN",
          sourceSocketId: socket.id,
          detectedAt: Date.now(),
        });
        return socket.emit("error", "ACCESS DENIED: Invalid Encryption Key.");
      }

      // Check if agent's username matches host's username
      if (username.toLowerCase() === pendingRoom.username.toLowerCase()) {
        return socket.emit("error", "CODENAME ALREADY IN USE.");
      }

      // CREATE the actual room now (first agent is joining)
      const nowTime = Date.now();
      const hostUser = { id: pendingRoom.hostId, username: pendingRoom.username, isHost: true, hasFullHistory: true, joinedAt: nowTime };
      const newUser = { id: socket.id, username, isHost: false, hasFullHistory: true, joinedAt: nowTime };
      const actualCreatedAt = Date.now(); // Room is created NOW when first agent joins

      rooms[roomId] = {
        hostId: pendingRoom.hostId,
        users: [hostUser, newUser],
        password: pendingRoom.password,
        createdAt: actualCreatedAt,
        roomName: pendingRoom.roomName,
        capacity: pendingRoom.capacity,
        isLocked: pendingRoom.isLocked,
        isHalted: false,
        silencedUserIds: pendingRoom.silencedUserIds,
        pinnedMessageIds: pendingRoom.pinnedMessageIds || [],
        messageOwners: pendingRoom.messageOwners,
        messageReactions: pendingRoom.messageReactions || {},
        requireApproval: pendingRoom.requireApproval,
        pendingRequests: pendingRoom.pendingRequests,
        activityLog: [],
        exportApproval: null,
      };

      appendRoomActivity(rooms[roomId], "room_created", {
        roomName: rooms[roomId].roomName || "",
        capacity: rooms[roomId].capacity,
      });
      appendRoomActivity(rooms[roomId], "host_joined", {
        userId: hostUser.id,
        username: hostUser.username,
      });
      appendRoomActivity(rooms[roomId], "agent_joined", {
        userId: newUser.id,
        username: newUser.username,
      });

      // Initialize context tracking for this room
      ensureContextData(roomId);

      // Remove from pending
      delete pendingRooms[roomId];

      // Join the host to the room (host needs to be in socket.io room too)
      const hostSocket = io.sockets.sockets.get(pendingRoom.hostId);
      if (hostSocket) {
        hostSocket.join(roomId);
      }

      // Join the new user
      socket.join(roomId);

      // Notify the HOST that room has been created (first agent joined)
      io.to(pendingRoom.hostId).emit("room_created", {
        roomId,
        createdAt: rooms[roomId].createdAt,
        users: rooms[roomId].users,
        roomName: rooms[roomId].roomName,
        capacity: rooms[roomId].capacity,
        isLocked: rooms[roomId].isLocked,
        silencedUserIds: rooms[roomId].silencedUserIds,
      });

      // Notify the agent (new user) they've joined
      socket.emit("joined_room_success", {
        roomId,
        isHost: false,
        createdAt: rooms[roomId].createdAt,
        users: rooms[roomId].users,
        roomName: rooms[roomId].roomName,
        capacity: rooms[roomId].capacity,
        isLocked: rooms[roomId].isLocked,
        silencedUserIds: rooms[roomId].silencedUserIds,
      });

      // Announce to the room
      io.to(roomId).emit("receive_message", {
        system: true,
        message: `${username} has entered the frequency.`,
      });

      // Update everyone
      io.to(roomId).emit("update_users", rooms[roomId].users);

      return;
    }

    // Regular room join (room already exists)
    const room = rooms[roomId];
    if (room) {
      if (room.password !== hash(password)) {
        io.to(room.hostId).emit("intrusion_detected", {
          roomId,
          attemptedCodename: username || "UNKNOWN",
          sourceSocketId: socket.id,
          detectedAt: Date.now(),
        });
        return socket.emit("error", "ACCESS DENIED: Invalid Encryption Key.");
      }
      if (room.isLocked) {
        return socket.emit("error", "ACCESS DENIED: Frequency Locked By Host.");
      }
      if (room.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return socket.emit("error", "CODENAME ALREADY IN USE.");
      }
      if (room.users.length >= room.capacity) {
        return socket.emit("error", "ROOM IS FULL.");
      }

      const requiresApprovalForThisJoin = room.requireApproval && !room.isHalted;

      // If this room requires host approval, queue the request instead of joining immediately
      if (requiresApprovalForThisJoin) {
        room.pendingRequests = room.pendingRequests || [];
        if (room.pendingRequests.some(r => r.username.toLowerCase() === username.toLowerCase())) {
          return socket.emit("error", "JOIN REQUEST ALREADY PENDING FOR THIS CODENAME.");
        }

        room.pendingRequests.push({ socketId: socket.id, username });

        // Notify requester to wait
        socket.emit("join_request_pending", { roomId });

        // Notify host about the join request
        io.to(room.hostId).emit("join_request", { roomId, username, socketId: socket.id });

        return;
      }
  
      socket.join(roomId);
      const contextData = ensureContextData(roomId);
      const needsContext = contextData.messages.length > 0;
      const nowTime = Date.now();
      const newUser = { id: socket.id, username, isHost: false, hasFullHistory: !needsContext, joinedAt: nowTime }; 
      room.users.push(newUser); // Add new user to list
      appendRoomActivity(room, "agent_joined", {
        userId: newUser.id,
        username: newUser.username,
      });

      if (room.isHalted) {
        room.isHalted = false;
        io.to(room.hostId).emit("room_resumed", {
          roomId,
          createdAt: room.createdAt,
          users: room.users,
          roomName: room.roomName || "",
          capacity: room.capacity,
          isLocked: room.isLocked,
          silencedUserIds: room.silencedUserIds,
        });
      }

      // Send the FULL list including the new user to the person joining
      socket.emit("joined_room_success", { 
        roomId, 
        isHost: false, 
        createdAt: room.createdAt,
        users: room.users,
        roomName: room.roomName || "",
        capacity: room.capacity,
        isLocked: room.isLocked,
        silencedUserIds: room.silencedUserIds,
      });
  
      io.to(roomId).emit("receive_message", {
        system: true,
        message: `${username} has entered the frequency.`,
      });
  
      // Update everyone else
      io.to(roomId).emit("update_users", room.users);
    } else {
      if (destroyedRooms.has(roomId)) {
        socket.emit("error", "THIS ROOM HAS ALREADY BEEN TERMINATED.");
      } else {
        socket.emit("error", "ROOM NOT FOUND.");
      }
    }
  });

  // Host approves or rejects a pending join request
  socket.on("approve_join_request", ({ roomId, socketId, approve }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    room.pendingRequests = room.pendingRequests || [];
    const idx = room.pendingRequests.findIndex((r) => r.socketId === socketId);
    if (idx === -1) return;

    const request = room.pendingRequests[idx];
    room.pendingRequests.splice(idx, 1);

    const targetSocket = io.sockets.sockets.get(socketId);
    if (!targetSocket) return;

    if (!approve) {
      return targetSocket.emit("join_request_result", {
        approved: false,
        reason: "JOIN REQUEST REJECTED BY HOST."
      });
    }

    if (room.isLocked) {
      return targetSocket.emit("error", "[ ERROR: FREQUENCY LOCKED BY COMMANDER ]");
    }

    // Ensure codename is still unique at approval time
    if (room.users.some((u) => u.username.toLowerCase() === request.username.toLowerCase())) {
      return targetSocket.emit("error", "CODENAME ALREADY IN USE.");
    }
    if (room.users.length >= room.capacity) {
      return targetSocket.emit("join_request_result", {
        approved: false,
        reason: "ROOM IS FULL."
      });
    }

    targetSocket.join(roomId);
    const contextData = ensureContextData(roomId);
    const needsContext = contextData.messages.length > 0;
    const nowTime = Date.now();
    const newUser = { id: socketId, username: request.username, isHost: false, hasFullHistory: !needsContext, joinedAt: nowTime };
    room.users.push(newUser);
    appendRoomActivity(room, "agent_joined", {
      userId: newUser.id,
      username: newUser.username,
      approvedJoin: true,
    });

    if (room.isHalted) {
      room.isHalted = false;
      io.to(room.hostId).emit("room_resumed", {
        roomId,
        createdAt: room.createdAt,
        users: room.users,
        roomName: room.roomName || "",
        capacity: room.capacity,
        isLocked: room.isLocked,
        silencedUserIds: room.silencedUserIds,
      });
    }

    targetSocket.emit("joined_room_success", {
      roomId,
      isHost: false,
      createdAt: room.createdAt,
      users: room.users,
      roomName: room.roomName || "",
      capacity: room.capacity,
      isLocked: room.isLocked,
      silencedUserIds: room.silencedUserIds,
    });

    io.to(roomId).emit("receive_message", {
      system: true,
      message: `${request.username} has entered the frequency.`,
    });

    io.to(roomId).emit("update_users", room.users);
  });

  socket.on("toggle_room_lock", ({ roomId, locked }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    room.isLocked = typeof locked === "boolean" ? locked : !room.isLocked;

    io.to(roomId).emit("room_lock_state", {
      roomId,
      isLocked: room.isLocked,
      updatedBy: socket.id,
    });

    io.to(roomId).emit("receive_message", {
      system: true,
      message: room.isLocked
        ? "Frequency sealed by HOST."
        : "Frequency open for approved joins.",
    });
  });

  socket.on("toggle_agent_radio_silence", ({ roomId, userId, silenced }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id || !userId || userId === socket.id) return;

    const targetUser = room.users.find((user) => user.id === userId && !user.isHost);
    if (!targetUser) return;

    const nextSilencedUserIds = new Set(room.silencedUserIds || []);
    const shouldSilence = typeof silenced === "boolean" ? silenced : !nextSilencedUserIds.has(userId);

    if (shouldSilence) nextSilencedUserIds.add(userId);
    else nextSilencedUserIds.delete(userId);

    room.silencedUserIds = Array.from(nextSilencedUserIds);

    io.to(roomId).emit("room_silence_state", {
      roomId,
      silencedUserIds: room.silencedUserIds,
      targetUserId: userId,
      silenced: shouldSilence,
      updatedBy: socket.id,
    });

    io.to(roomId).emit("receive_message", {
      system: true,
      message: shouldSilence
        ? `${targetUser.username} is muted by HOST.`
        : `${targetUser.username} is unmuted by HOST.`,
    });
  });

  // NEW: Kick User Feature
  socket.on("kick_user", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      const targetUser = room.users.find(u => u.id === userId);
      if (targetUser) {
        // Notify the target user they are kicked
        io.to(userId).emit("kicked");

        // Remove from room data
        room.users = room.users.filter(u => u.id !== userId);
        room.silencedUserIds = (room.silencedUserIds || []).filter((id) => id !== userId);
        appendRoomActivity(room, "agent_removed", {
          userId,
          username: targetUser.username,
          removedBy: socket.id,
        });

        if (
          room.exportApproval &&
          room.exportApproval.status === "pending" &&
          room.exportApproval.requiredAgents?.some((agent) => agent.id === userId)
        ) {
          cancelExportApproval(
            room,
            io,
            `${targetUser.username} left before export approval completed.`,
            { roomId },
          );
        }

        // Notify room
        io.to(roomId).emit("receive_message", { system: true, message: `${targetUser.username} was removed from the session.` });
        io.to(roomId).emit("update_users", room.users);

        const activeAgents = room.users.filter((u) => !u.isHost);
        if (activeAgents.length === 0 && room.users.length > 0) {
          room.isHalted = true;
          io.to(room.hostId).emit("room_halted", {
            roomId,
            createdAt: room.createdAt,
            users: room.users,
            roomName: room.roomName || "",
            capacity: room.capacity,
            isLocked: room.isLocked,
            silencedUserIds: room.silencedUserIds,
          });
        }
      }
    }
  });

  socket.on("transfer_host", ({ roomId, newHostId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id || !newHostId || newHostId === socket.id) return;

    const nextHost = room.users.find((user) => user.id === newHostId);
    if (!nextHost) return;

    if (!nextHost.hasFullHistory) {
      const syncResult = emitFullContextToUser({
        roomId,
        user: nextHost,
        socketId: newHostId,
      });

      if (!syncResult.sent && syncResult.reason === "SOCKET_NOT_FOUND") {
        socket.emit("error", "TARGET AGENT IS OFFLINE.");
        return;
      }

      if (!syncResult.sent && syncResult.reason === "NO_CONTEXT") {
        nextHost.hasFullHistory = true;
      }
    }

    room.hostId = newHostId;
    room.users = room.users.map((user) => ({
      ...user,
      isHost: user.id === newHostId,
    }));
    appendRoomActivity(room, "host_transferred", {
      previousHostId: socket.id,
      newHostId,
      newHostUsername: nextHost.username,
    });

    io.to(roomId).emit("host_transferred", {
      roomId,
      newHostId,
      newHostUsername: nextHost.username,
      previousHostId: socket.id,
    });

    io.to(roomId).emit("receive_message", {
      system: true,
      message: `${nextHost.username} is now session host.`,
    });

    io.to(roomId).emit("update_users", room.users);
  });

  socket.on("send_message", (data) => {
    const { roomId, timer, type } = data; // Receive timer (in ms) and message type
    const room = rooms[roomId];
    if (!room) return;

    const senderInRoom = room.users.some((user) => user.id === socket.id);
    if (!senderInRoom) return;
    if ((room.silencedUserIds || []).includes(socket.id) && room.hostId !== socket.id) return;

    const sentAtTimestamp = Date.now();
    const payload = {
      ...data,
      senderIsHost: room.hostId === socket.id,
      sentAt: sentAtTimestamp,
    };

    if (payload?.id) {
      room.messageOwners[payload.id] = socket.id;
    }

    // Store ALL messages (from any user) in context for sharing (excluding system and high-clearance messages)
    if (!data.system && type !== "high-clearance") {
      const contextData = ensureContextData(roomId);
      contextData.messages.push({
        id: data.id,
        username: data.username,
        message: data.message,
        images: data.images || null,
        type: data.type || "text",
        time: data.time,
        replyTo: data.replyTo || null,
        edited: data.edited,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        fileType: data.fileType || null,
        filePageCount: data.filePageCount || 1,
        audioDuration: data.audioDuration || null,
        caption: data.caption || null,
        poll: data.poll || null,
        senderIsHost: room.hostId === socket.id,
        sentAt: sentAtTimestamp,
      });
    }

    // Broadcast message to others immediately
    socket.to(roomId).emit("receive_message", payload);

    // --- Handle Self-Destruct (not for high-clearance messages) ---
    if (timer && timer > 0 && type !== "high-clearance") {
      setTimeout(() => {
        // Trigger the delete event for everyone in the room (including sender)
        io.to(roomId).emit("message_deleted", payload.id);
        if (payload?.id && room.messageOwners) {
          delete room.messageOwners[payload.id];
        }
        if (payload?.id) {
          room.pinnedMessageIds = (room.pinnedMessageIds || []).filter(
            (pinKey) => extractPinnedMessageId(pinKey) !== payload.id,
          );
          io.to(roomId).emit("pinned_messages_update", {
            roomId,
            pinnedMessageIds: room.pinnedMessageIds,
          });
        }
        if (payload?.id && room.messageReactions) {
          delete room.messageReactions[payload.id];
          io.to(roomId).emit("message_reaction_update", {
            roomId,
            messageId: payload.id,
            reactions: [],
          });
        }
      }, timer);
    }
  });

  // --- NEW: SEND CONTEXT TO SPECIFIC AGENT ---
  socket.on("send_context_to_agent", ({ roomId, targetUserId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    const targetUser = room.users.find((u) => u.id === targetUserId && !u.isHost);
    if (!targetUser) return;

    const contextData = contextMessages[roomId];
    if (!contextData || contextData.messages.length === 0) {
      socket.emit("error", "NO CONTEXT AVAILABLE TO SEND.");
      return;
    }

    if (targetUser.hasFullHistory) {
      socket.emit("error", `${targetUser.username} ALREADY HAS CONTEXT.`);
      return;
    }

    const result = emitFullContextToUser({
      roomId,
      user: targetUser,
      socketId: targetUserId,
    });
    if (!result.sent && result.reason === "SOCKET_NOT_FOUND") {
      socket.emit("error", "TARGET AGENT IS OFFLINE.");
    }
  });

  // --- NEW: SEND CONTEXT TO ALL AGENTS ---
  socket.on("send_context_to_all", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    const contextData = contextMessages[roomId];
    if (!contextData || contextData.messages.length === 0) {
      socket.emit("error", "NO CONTEXT AVAILABLE TO SEND.");
      return;
    }

    // Get all agents who don't already have context
    const agentsToReceiveContext = room.users.filter((u) => !u.isHost && !u.hasFullHistory);

    if (agentsToReceiveContext.length === 0) {
      socket.emit("error", "NO NEW OR REJOINED AGENTS NEED CONTEXT.");
      return;
    }

    // Send context to each agent who doesn't have it
    agentsToReceiveContext.forEach((agent) => {
      emitFullContextToUser({ roomId, user: agent, socketId: agent.id });
    });
  });

  // --- NEW: POLL VOTING (broadcast updates) ---
  socket.on("poll_vote", ({ roomId, messageId, optionId, action, username }) => {
    if (!roomId || !messageId || !optionId || !username) return;
    io.to(roomId).emit("poll_vote_update", { roomId, messageId, optionId, action, username });
  });

  socket.on("get_pinned_messages", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const senderInRoom = room.users.some((user) => user.id === socket.id);
    if (!senderInRoom) return;

    socket.emit("pinned_messages_sync", {
      roomId,
      pinnedMessageIds: room.pinnedMessageIds || [],
    });
  });

  socket.on("toggle_pin_message", ({ roomId, messageId, pinKey }) => {
    const room = rooms[roomId];
    const resolvedPinKey =
      typeof pinKey === "string" && pinKey.trim()
        ? pinKey.trim()
        : typeof messageId === "string"
          ? messageId
          : null;
    if (!room || !resolvedPinKey) return;

    const senderInRoom = room.users.some((user) => user.id === socket.id);
    if (!senderInRoom) return;

    const currentPinnedIds = new Set(room.pinnedMessageIds || []);
    if (currentPinnedIds.has(resolvedPinKey)) {
      currentPinnedIds.delete(resolvedPinKey);
    } else {
      currentPinnedIds.add(resolvedPinKey);
    }

    room.pinnedMessageIds = Array.from(currentPinnedIds);

    io.to(roomId).emit("pinned_messages_update", {
      roomId,
      pinnedMessageIds: room.pinnedMessageIds,
      updatedBy: socket.id,
    });
  });

  socket.on("get_message_reactions", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const senderInRoom = room.users.some((user) => user.id === socket.id);
    if (!senderInRoom) return;

    socket.emit("message_reactions_sync", {
      roomId,
      reactions: serializeRoomMessageReactions(room.messageReactions || {}),
    });
  });

  socket.on("react_to_message", ({ roomId, messageId, emoji }) => {
    const room = rooms[roomId];
    if (!room || !messageId || !emoji || !ALLOWED_REACTIONS.has(emoji)) return;

    const sender = room.users.find((user) => user.id === socket.id);
    if (!sender) return;

    room.messageReactions = room.messageReactions || {};
    room.messageReactions[messageId] = room.messageReactions[messageId] || {};

    const reactorKey = sender.username.toLowerCase();
    const existing = room.messageReactions[messageId][reactorKey];

    if (existing && existing.emoji === emoji) {
      delete room.messageReactions[messageId][reactorKey];
    } else {
      room.messageReactions[messageId][reactorKey] = {
        username: sender.username,
        emoji,
      };
    }

    const nextReactions = Object.values(room.messageReactions[messageId]);
    if (nextReactions.length === 0) {
      delete room.messageReactions[messageId];
    }

    io.to(roomId).emit("message_reaction_update", {
      roomId,
      messageId,
      reactions: Object.values(room.messageReactions[messageId] || {}),
    });
  });

  socket.on("delete_message", ({ roomId, messageId }) => {
    const room = rooms[roomId];
    if (!room || !messageId) return;

    const senderInRoom = room.users.some((user) => user.id === socket.id);
    if (!senderInRoom) return;

    const ownerId = room.messageOwners?.[messageId];
    const canDelete = room.hostId === socket.id || (ownerId && ownerId === socket.id);
    if (!canDelete) return;

    io.to(roomId).emit("message_deleted", messageId);
    if (room.messageOwners) {
      delete room.messageOwners[messageId];
    }
    room.pinnedMessageIds = (room.pinnedMessageIds || []).filter(
      (pinKey) => extractPinnedMessageId(pinKey) !== messageId,
    );
    io.to(roomId).emit("pinned_messages_update", {
      roomId,
      pinnedMessageIds: room.pinnedMessageIds,
      updatedBy: socket.id,
    });
    if (room.messageReactions) {
      delete room.messageReactions[messageId];
    }
    io.to(roomId).emit("message_reaction_update", {
      roomId,
      messageId,
      reactions: [],
    });
  });

  socket.on("edit_message", ({ roomId, messageId, newEncryptedMessage }) => {
    const room = rooms[roomId];
    if (!room) return;
    if ((room.silencedUserIds || []).includes(socket.id) && room.hostId !== socket.id) return;
    io.to(roomId).emit("message_updated", {
      messageId,
      newEncryptedMessage,
      edited: true
    });
  });

  // --- TYPING INDICATOR ---
  socket.on("typing_status", ({ roomId, username, isTyping }) => {
    const room = rooms[roomId];
    if (!room) return;
    if ((room.silencedUserIds || []).includes(socket.id) && room.hostId !== socket.id) return;
    socket.to(roomId).emit("user_typing", { username, isTyping });
  });

  socket.on("close_room", ({ roomId }) => {
    if (pendingRooms[roomId] && pendingRooms[roomId].hostId === socket.id) {
      delete pendingRooms[roomId];
      socket.emit("room_closed");
      return;
    }
    
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      if (rooms[roomId].exportApproval && rooms[roomId].exportApproval.status === "pending") {
        cancelExportApproval(
          rooms[roomId],
          io,
          "Host terminated room before export approval completed.",
          { roomId },
        );
      }
      io.to(roomId).emit("room_closed");
      io.in(roomId).socketsLeave(roomId);
      markRoomDestroyed(roomId);
      delete rooms[roomId];
      delete contextMessages[roomId];
    }
  });

  // --- AGENT REQUESTS CONTEXT FROM HOST ---
  socket.on("request_context", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const requester = room.users.find((u) => u.id === socket.id && !u.isHost);
    if (!requester) return;

    if (requester.hasFullHistory) {
      socket.emit("error", "YOU ALREADY HAVE THE FULL CONTEXT.");
      return;
    }

    const contextData = contextMessages[roomId];
    if (!contextData || contextData.messages.length === 0) {
      socket.emit("error", "NO CONTEXT AVAILABLE YET.");
      return;
    }

    io.to(room.hostId).emit("context_request", {
      roomId,
      requesterUserId: socket.id,
      requesterUsername: requester.username,
    });

    socket.emit("context_request_sent", {
      message: "Context request sent to host. Awaiting approval...",
    });
  });

  socket.on("reject_context_request", ({ roomId, requesterUserId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    const requester = room.users.find((u) => u.id === requesterUserId && !u.isHost);
    if (!requester) return;

    io.to(requesterUserId).emit("context_request_rejected", {
      roomId,
      message: "Host rejected your context request.",
    });
  });

  socket.on("request_chat_history_export", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;

    const requester = room.users.find((user) => user.id === socket.id);
    const activeAgents = room.users.filter((user) => !user.isHost);

    if (room.exportApproval && room.exportApproval.status === "pending") {
      socket.emit("chat_history_export_approval_status", {
        roomId,
        ...(buildExportApprovalStatus(room) || {}),
      });
      return;
    }

    if (activeAgents.length === 0) {
      const exportPayload = buildChatHistoryExportPayload(roomId);
      if (!exportPayload) return;
      socket.emit("chat_history_export_ready", {
        roomId,
        requestId: null,
        exportPayload,
      });
      return;
    }

    const requestId = crypto.randomBytes(8).toString("hex");
    room.exportApproval = {
      requestId,
      requestedAt: Date.now(),
      status: "pending",
      hostId: socket.id,
      requiredAgents: activeAgents.map((agent) => ({
        id: agent.id,
        username: agent.username,
      })),
      approvedAgentIds: [],
      rejectedBy: null,
    };

    appendRoomActivity(room, "chat_history_export_requested", {
      requestId,
      requestedBy: requester?.username || "HOST",
      requiredApprovals: activeAgents.length,
    });

    io.to(room.hostId).emit("chat_history_export_approval_status", {
      roomId,
      ...(buildExportApprovalStatus(room) || {}),
    });

    activeAgents.forEach((agent) => {
      io.to(agent.id).emit("chat_history_export_approval_requested", {
        roomId,
        requestId,
        hostUsername: requester?.username || "HOST",
        requestedAt: room.exportApproval.requestedAt,
      });
    });
  });

  socket.on("respond_chat_history_export_approval", ({ roomId, requestId, approve }) => {
    const room = rooms[roomId];
    if (!room || !room.exportApproval) return;

    const approval = room.exportApproval;
    if (approval.status !== "pending" || approval.requestId !== requestId) return;

    const responder = room.users.find((user) => user.id === socket.id && !user.isHost);
    if (!responder) return;

    const isRequiredApprover = (approval.requiredAgents || []).some(
      (agent) => agent.id === socket.id,
    );
    if (!isRequiredApprover) return;

    if ((approval.approvedAgentIds || []).includes(socket.id)) return;

    if (!approve) {
      approval.status = "rejected";
      approval.rejectedBy = {
        id: responder.id,
        username: responder.username,
        at: Date.now(),
      };

      appendRoomActivity(room, "chat_history_export_rejected", {
        requestId,
        rejectedBy: responder.username,
      });

      cancelExportApproval(
        room,
        io,
        `${responder.username} rejected the export approval request.`,
        {
          roomId,
          rejectedBy: approval.rejectedBy,
        },
      );
      return;
    }

    approval.approvedAgentIds.push(socket.id);
    appendRoomActivity(room, "chat_history_export_approved", {
      requestId,
      approvedBy: responder.username,
    });

    io.to(room.hostId).emit("chat_history_export_approval_status", {
      roomId,
      ...(buildExportApprovalStatus(room) || {}),
    });

    io.to(socket.id).emit("chat_history_export_response_received", {
      roomId,
      requestId,
      approved: true,
    });

    const requiredCount = (approval.requiredAgents || []).length;
    if (approval.approvedAgentIds.length < requiredCount) {
      return;
    }

    approval.status = "approved";
    appendRoomActivity(room, "chat_history_export_ready", {
      requestId,
      approvedCount: requiredCount,
    });

    const exportPayload = buildChatHistoryExportPayload(roomId);
    if (!exportPayload) return;

    io.to(room.hostId).emit("chat_history_export_ready", {
      roomId,
      requestId,
      exportPayload,
      approval: buildExportApprovalStatus(room),
    });

    (approval.requiredAgents || []).forEach((agent) => {
      io.to(agent.id).emit("chat_history_export_request_completed", {
        roomId,
        requestId,
      });
    });

    room.exportApproval = null;
  });

  socket.on("disconnect", () => {
    // Clean up pending rooms if host disconnects
    for (const roomId in pendingRooms) {
      if (pendingRooms[roomId].hostId === socket.id) {
        delete pendingRooms[roomId];
      }
    }

    for (const roomId in rooms) {
      const room = rooms[roomId];
      // Clean up any pending join requests for this socket
      if (room.pendingRequests && room.pendingRequests.length > 0) {
        room.pendingRequests = room.pendingRequests.filter((r) => r.socketId !== socket.id);
      }
      const userIndex = room.users.findIndex((u) => u.id === socket.id);

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;
        const disconnectedUser = room.users[userIndex];
        const wasHost = disconnectedUser?.isHost || room.hostId === socket.id;

        if (
          room.exportApproval &&
          room.exportApproval.status === "pending" &&
          room.exportApproval.requiredAgents?.some((agent) => agent.id === socket.id)
        ) {
          cancelExportApproval(
            room,
            io,
            `${username} disconnected before approving export request.`,
            { roomId },
          );
        }

        room.users.splice(userIndex, 1);
        room.silencedUserIds = (room.silencedUserIds || []).filter((id) => id !== socket.id);
        appendRoomActivity(room, wasHost ? "host_left" : "agent_left", {
          userId: socket.id,
          username,
          reason: "disconnect",
        });

        io.to(roomId).emit("receive_message", {
          system: true,
          message: `${username} has left.`,
        });
        io.to(roomId).emit("update_users", room.users);

        if (room.hostId !== socket.id) {
          const activeAgents = room.users.filter((u) => !u.isHost);
          if (activeAgents.length === 0 && room.users.length > 0) {
            room.isHalted = true;
            io.to(room.hostId).emit("room_halted", {
              roomId,
              createdAt: room.createdAt,
              users: room.users,
              roomName: room.roomName || "",
              capacity: room.capacity,
              isLocked: room.isLocked,
              silencedUserIds: room.silencedUserIds,
            });
          }
        }

        if (room.hostId === socket.id) {
          if (room.exportApproval && room.exportApproval.status === "pending") {
            cancelExportApproval(
              room,
              io,
              "Host disconnected. Export approval request cancelled.",
              { roomId },
            );
          }

          if (room.users.length === 0) {
            io.to(roomId).emit("room_closed");
            markRoomDestroyed(roomId);
            delete rooms[roomId];
            delete contextMessages[roomId];
          } else {
            const nextHost = room.users[0];
            room.hostId = nextHost.id;
            room.users = room.users.map((user) => ({
              ...user,
              isHost: user.id === nextHost.id,
            }));
            appendRoomActivity(room, "host_transferred", {
              previousHostId: socket.id,
              newHostId: nextHost.id,
              newHostUsername: nextHost.username,
              reason: "disconnect",
            });

            io.to(roomId).emit("host_transferred", {
              roomId,
              newHostId: nextHost.id,
              newHostUsername: nextHost.username,
              previousHostId: socket.id,
            });

            io.to(roomId).emit("receive_message", {
              system: true,
              message: `${nextHost.username} is now session host.`,
            });

            io.to(roomId).emit("update_users", room.users);
          }
        }
        break;
      }
    }
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});