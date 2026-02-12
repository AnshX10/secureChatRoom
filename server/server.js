require('dotenv').config(); // Load environment variables
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { generateRoomId } = require("./utils/roomUtils");

const app = express();

// --- 1. CONFIGURATION ---
// Define allowed origins: Localhost (for dev) + Production URL (from .env)
const allowedOrigins = [
  "http://localhost:5173", // Local Vite
  process.env.FRONTEND_URL // Vercel Deployment URL
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// --- 2. STATE MANAGEMENT ---
// Format: { roomId: { hostId: "socketId", users: [{id, username}] } }
const rooms = {};

// --- 3. SOCKET LOGIC ---
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // CREATE ROOM
  socket.on("create_room", ({ username }) => {
    let roomId = generateRoomId();
    // Ensure ID is unique
    while (rooms[roomId]) {
      roomId = generateRoomId();
    }

    rooms[roomId] = {
      hostId: socket.id,
      users: [],
    };

    socket.join(roomId);
    
    const user = { id: socket.id, username };
    rooms[roomId].users.push(user);

    // Notify creator
    socket.emit("room_created", { roomId });
    // Update user list
    io.to(roomId).emit("update_users", rooms[roomId].users);
    
    console.log(`Room Created: ${roomId} by ${username}`);
  });

  // JOIN ROOM
  socket.on("join_room", ({ username, roomId }) => {
    // 1. Check if room exists
    if (!rooms[roomId]) {
      socket.emit("error", "Room ID not found.");
      return;
    }

    // 2. Check if username is taken in this room
    const isUsernameTaken = rooms[roomId].users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (isUsernameTaken) {
      socket.emit("error", "Username is already taken in this room.");
      return;
    }

    // 3. Join logic
    socket.join(roomId);
    const user = { id: socket.id, username };
    rooms[roomId].users.push(user);

    socket.emit("joined_room_success", { 
      roomId, 
      isHost: rooms[roomId].hostId === socket.id 
    });

    // Notify others
    socket.to(roomId).emit("receive_message", {
      system: true,
      message: `${username} has joined the frequency.`,
    });

    // Update list
    io.to(roomId).emit("update_users", rooms[roomId].users);
    
    console.log(`${username} joined room ${roomId}`);
  });

  // SEND MESSAGE
  socket.on("send_message", (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      // Broadcast to everyone else in the room
      socket.to(roomId).emit("receive_message", data);
    }
  });

  // DELETE MESSAGE (Everyone)
  socket.on("delete_message", ({ roomId, messageId }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("message_deleted", messageId);
    }
  });

  // EDIT MESSAGE
  socket.on("edit_message", ({ roomId, messageId, newEncryptedMessage }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("message_updated", {
        messageId,
        newEncryptedMessage,
        edited: true
      });
    }
  });

  // CLOSE ROOM (Host Only)
  socket.on("close_room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      io.to(roomId).emit("room_closed"); // Notify clients to reset UI
      io.in(roomId).socketsLeave(roomId); // Force disconnect sockets from room
      delete rooms[roomId]; // Clear memory
      console.log(`Room ${roomId} closed by host.`);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex((u) => u.id === socket.id);

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;
        room.users.splice(userIndex, 1);

        // Notify room
        io.to(roomId).emit("receive_message", {
          system: true,
          message: `${username} signal lost.`,
        });
        io.to(roomId).emit("update_users", room.users);

        // Optional: If host leaves, verify if room should close or transfer host
        // For this app, if host leaves, we usually close the room or leave it open without host privileges.
        // Current logic: Leave it open, but host privileges are lost.
        if (room.hostId === socket.id) {
           // You could assign a new host here if desired
           room.hostId = null; 
        }

        // If room is empty, delete it to save memory
        if (room.users.length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
    console.log("User Disconnected", socket.id);
  });
});

// --- 4. START SERVER ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});