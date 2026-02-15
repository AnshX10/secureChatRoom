require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
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

  socket.on("create_room", ({ username }) => {
    let roomId = generateRoomId();
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
    socket.emit("room_created", { roomId });
    io.to(roomId).emit("update_users", rooms[roomId].users);
  });

  socket.on("join_room", ({ username, roomId }) => {
    if (rooms[roomId]) {
      const isUsernameTaken = rooms[roomId].users.some(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );

      if (isUsernameTaken) {
        socket.emit("error", "Username is already taken in this room.");
        return;
      }

      socket.join(roomId);
      const user = { id: socket.id, username };
      rooms[roomId].users.push(user);

      socket.emit("joined_room_success", { 
        roomId, 
        isHost: rooms[roomId].hostId === socket.id 
      });

      io.to(roomId).emit("receive_message", {
        system: true,
        message: `${username} has joined the chat.`,
      });

      io.to(roomId).emit("update_users", rooms[roomId].users);
    } else {
      socket.emit("error", "Room not found.");
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
  socket.on("typing_start", ({ roomId, username }) => {
    socket.to(roomId).emit("display_typing", username);
  });

  socket.on("typing_stop", ({ roomId, username }) => {
    socket.to(roomId).emit("hide_typing", username);
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