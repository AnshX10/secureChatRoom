require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { generateRoomId } = require("./utils/roomutils");


const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL, // This will be your Vercel URL
  methods: ["GET", "POST"],
};
app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

// Store Room Data: { roomId: { hostId: string, users: [] } }
const rooms = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Create Room
  socket.on("create_room", ({ username }) => {
    let roomId = generateRoomId();
    // Ensure uniqueness
    while (rooms[roomId]) {
      roomId = generateRoomId();
    }

    rooms[roomId] = {
      hostId: socket.id,
      users: [],
    };

    socket.join(roomId);
    
    // Add user to room state
    const user = { id: socket.id, username };
    rooms[roomId].users.push(user);

    socket.emit("room_created", { roomId });
    io.to(roomId).emit("update_users", rooms[roomId].users);
  });

  // 2. Join Room
  socket.on("join_room", ({ username, roomId }) => {
    if (rooms[roomId]) {
      socket.join(roomId);

      const isUsernameTaken = rooms[roomId].users.some(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );

      if (isUsernameTaken) {
        socket.emit("error", "Username is already taken in this room. Please choose another.");
        return; // Stop here, do not join
      }
      // -------------------------------------

      socket.join(roomId);
      
      const user = { id: socket.id, username };
      rooms[roomId].users.push(user);

      // Notify user success
      socket.emit("joined_room_success", { 
        roomId, 
        isHost: rooms[roomId].hostId === socket.id 
      });

      // Notify room of new user
      io.to(roomId).emit("receive_message", {
        system: true,
        message: `${username} has joined the chat.`,
      });

      // Update user list
      io.to(roomId).emit("update_users", rooms[roomId].users);
    } else {
      socket.emit("error", "Room not found.");
    }
  });

  // 3. Send Message
  socket.on("send_message", (data) => {
    socket.to(data.roomId).emit("receive_message", data);
  });

  // 2. Delete Message (Broadcast the ID to be "masked")
  socket.on("delete_message", ({ roomId, messageId }) => {
    io.to(roomId).emit("message_deleted", messageId);
  });

  // 3. NEW: Edit Message
  socket.on("edit_message", ({ roomId, messageId, newEncryptedMessage }) => {
    io.to(roomId).emit("message_updated", { 
      messageId, 
      newEncryptedMessage,
      edited: true // Tell clients this is an edit
    });
  });

  // 4. Close Room (Host only)
  socket.on("close_room", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
      // Notify all users
      io.to(roomId).emit("room_closed");
      
      // Disconnect all sockets in the room
      io.in(roomId).socketsLeave(roomId);
      
      // Delete room data
      delete rooms[roomId];
    }
  });

  // 5. Disconnect
  socket.on("disconnect", () => {
    // Find which room the user was in
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex((u) => u.id === socket.id);

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;
        
        // Remove user
        room.users.splice(userIndex, 1);
        
        // Notify room
        io.to(roomId).emit("receive_message", {
          system: true,
          message: `${username} has left.`,
        });
        io.to(roomId).emit("update_users", room.users);

        // Optional: If host leaves, close room (or you can transfer host)
        if (room.hostId === socket.id) {
            io.to(roomId).emit("room_closed");
            delete rooms[roomId];
        }
        break;
      }
    }
    console.log("User disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001; 
server.listen(PORT, () => {
  console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});