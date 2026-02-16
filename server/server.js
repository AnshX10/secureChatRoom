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
  cors: corsOptions // Use the same options here
});

// --- SOCKET LOGIC ---
const rooms = {};

io.on("connection", (socket) => {
  // console.log(`User connected: ${socket.id}`);

  socket.on("create_room", ({ username, password }) => {
    let roomId = generateRoomId();
    while (rooms[roomId]) roomId = generateRoomId();

    const createdAt = Date.now(); // <--- Capture creation time here

    rooms[roomId] = {
      hostId: socket.id,
      users: [],
      password: hash(password),
      createdAt: createdAt // <--- Store it in the room object
    };

    socket.join(roomId);
    rooms[roomId].users.push({ id: socket.id, username });

    // Send createdAt to the host
    socket.emit("room_created", { roomId, createdAt });
    io.to(roomId).emit("update_users", rooms[roomId].users);
  });


  socket.on("join_room", ({ username, roomId, password }) => {
    const room = rooms[roomId];
  
    if (room) {
      // 1. Check Encryption Key (Security Handshake)
      if (room.password !== hash(password)) {
        return socket.emit("error", "ACCESS DENIED: Invalid Encryption Key.");
      }
  
      // 2. STRICT DUPLICATE USERNAME CHECK (The Fix)
      const isNameTaken = room.users.some(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
  
      if (isNameTaken) {
        return socket.emit("error", "CODENAME ALREADY IN USE. CHOOSE ANOTHER.");
      }
  
      // 3. If passed, join the room
      socket.join(roomId);
      const newUser = { id: socket.id, username };
      room.users.push(newUser);
  
      // 4. Notify everyone
      socket.emit("joined_room_success", { 
        roomId, 
        isHost: false, 
        createdAt: room.createdAt 
      });
  
      io.to(roomId).emit("receive_message", {
        system: true,
        message: `${username} has entered the frequency.`,
      });
  
      io.to(roomId).emit("update_users", room.users);
    } else {
      socket.emit("error", "ROOM NOT FOUND OR EXPIRED.");
    }
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

        // Notify room
        io.to(roomId).emit("receive_message", { system: true, message: `${targetUser.username} was removed from the session.` });
        io.to(roomId).emit("update_users", room.users);
      }
    }
  });

  socket.on("send_message", (data) => {
    const { roomId, messageId, timer } = data; // Receive timer (in ms)

    // Broadcast message to others immediately
    socket.to(roomId).emit("receive_message", data);

    // --- NEW: Handle Self-Destruct ---
    if (timer && timer > 0) {
      setTimeout(() => {
        // Trigger the delete event for everyone in the room (including sender)
        io.to(roomId).emit("message_deleted", data.id);
      }, timer);
    }
  });

  socket.on("delete_message", ({ roomId, messageId }) => {
    io.to(roomId).emit("message_deleted", messageId);
  });

  socket.on("edit_message", ({ roomId, messageId, newEncryptedMessage }) => {
    io.to(roomId).emit("message_updated", {
      messageId,
      newEncryptedMessage,
      edited: true
    });
  });

  // --- TYPING INDICATOR ---
  socket.on("typing_status", ({ roomId, username, isTyping }) => {
    socket.to(roomId).emit("user_typing", { username, isTyping });
  });

  socket.on("close_room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      io.to(roomId).emit("room_closed");
      io.in(roomId).socketsLeave(roomId);
      delete rooms[roomId];
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex((u) => u.id === socket.id);

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;
        room.users.splice(userIndex, 1);

        io.to(roomId).emit("receive_message", {
          system: true,
          message: `${username} has left.`,
        });
        io.to(roomId).emit("update_users", room.users);

        if (room.hostId === socket.id) {
          io.to(roomId).emit("room_closed");
          delete rooms[roomId];
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