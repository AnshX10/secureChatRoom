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
  "https://securechatroom.vercel.app"  // Your Vercel Domain (No trailing slash)
];

// --- 2. DEFINE CORS OPTIONS (Must come BEFORE app.use) ---
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
};

// --- 3. APPLY CORS TO EXPRESS ---
app.use(cors(corsOptions));

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
/** @type {Map<string, number>} roomId -> destroyedAt (so we can tell "room destroyed" from "room never existed") */
const destroyedRooms = new Map();

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
    while (rooms[roomId]) roomId = generateRoomId();

    const createdAt = Date.now();
    const hostUser = { id: socket.id, username, isHost: true };
    const roomCapacity = normalizeRoomCapacity(capacity);

    rooms[roomId] = {
      hostId: socket.id,
      users: [hostUser], // Add host IMMEDIATELY
      password: hash(password),
      createdAt: createdAt,
      roomName: roomName || "",
      capacity: roomCapacity,
      isLocked: false,
      silencedUserIds: [],
      requireApproval: !!requireApproval,
      pendingRequests: []
    };

    socket.join(roomId);

    // Send the list containing the host back to the host
    socket.emit("room_created", { 
      roomId, 
      createdAt, 
      users: rooms[roomId].users,
      roomName: rooms[roomId].roomName,
      capacity: rooms[roomId].capacity,
      isLocked: rooms[roomId].isLocked,
      silencedUserIds: rooms[roomId].silencedUserIds,
    });
    
    // Broadcast list to the room (redundant but safe)
    io.to(roomId).emit("update_users", rooms[roomId].users);
  });

  socket.on("join_room", ({ username, roomId, password }) => {
    const keyLen = typeof password === "string" ? password.length : 0;
    if (keyLen < MIN_ENCRYPTION_KEY_LENGTH || keyLen > MAX_ENCRYPTION_KEY_LENGTH) {
      return socket.emit("error", `ENCRYPTION KEY MUST BE BETWEEN ${MIN_ENCRYPTION_KEY_LENGTH} AND ${MAX_ENCRYPTION_KEY_LENGTH} CHARACTERS.`);
    }
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

      // If this room requires host approval, queue the request instead of joining immediately
      if (room.requireApproval) {
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
      const newUser = { id: socket.id, username, isHost: false }; 
      room.users.push(newUser); // Add new user to list

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
    const newUser = { id: socketId, username: request.username, isHost: false };
    room.users.push(newUser);

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

        // Notify room
        io.to(roomId).emit("receive_message", { system: true, message: `${targetUser.username} was removed from the session.` });
        io.to(roomId).emit("update_users", room.users);
      }
    }
  });

  socket.on("transfer_host", ({ roomId, newHostId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id || !newHostId || newHostId === socket.id) return;

    const nextHost = room.users.find((user) => user.id === newHostId);
    if (!nextHost) return;

    room.hostId = newHostId;
    room.users = room.users.map((user) => ({
      ...user,
      isHost: user.id === newHostId,
    }));

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

    const payload = {
      ...data,
      senderIsHost: room.hostId === socket.id,
    };

    // Broadcast message to others immediately
    socket.to(roomId).emit("receive_message", payload);

    // --- Handle Self-Destruct (not for high-clearance messages) ---
    if (timer && timer > 0 && type !== "high-clearance") {
      setTimeout(() => {
        // Trigger the delete event for everyone in the room (including sender)
        io.to(roomId).emit("message_deleted", payload.id);
      }, timer);
    }
  });

  // --- NEW: POLL VOTING (broadcast updates) ---
  socket.on("poll_vote", ({ roomId, messageId, optionId, action, username }) => {
    if (!roomId || !messageId || !optionId || !username) return;
    io.to(roomId).emit("poll_vote_update", { roomId, messageId, optionId, action, username });
  });

  socket.on("delete_message", ({ roomId, messageId }) => {
    io.to(roomId).emit("message_deleted", messageId);
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
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      io.to(roomId).emit("room_closed");
      io.in(roomId).socketsLeave(roomId);
      markRoomDestroyed(roomId);
      delete rooms[roomId];
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      // Clean up any pending join requests for this socket
      if (room.pendingRequests && room.pendingRequests.length > 0) {
        room.pendingRequests = room.pendingRequests.filter((r) => r.socketId !== socket.id);
      }
      const userIndex = room.users.findIndex((u) => u.id === socket.id);

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;
        room.users.splice(userIndex, 1);
        room.silencedUserIds = (room.silencedUserIds || []).filter((id) => id !== socket.id);

        io.to(roomId).emit("receive_message", {
          system: true,
          message: `${username} has left.`,
        });
        io.to(roomId).emit("update_users", room.users);

        if (room.hostId === socket.id) {
          if (room.users.length === 0) {
            io.to(roomId).emit("room_closed");
            markRoomDestroyed(roomId);
            delete rooms[roomId];
          } else {
            const nextHost = room.users[0];
            room.hostId = nextHost.id;
            room.users = room.users.map((user) => ({
              ...user,
              isHost: user.id === nextHost.id,
            }));

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