import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Connect to backend
const socket = io.connect(import.meta.env.VITE_BACKEND_URL);


function App() {
  const [isInChat, setIsInChat] = useState(false);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    socket.on("room_created", ({ roomId }) => {
      setRoomId(roomId);
      setIsHost(true);
      setIsInChat(true);
      toast.success(`Secure Room ${roomId} created!`);
    });

    // Handle Join Success
    socket.on("joined_room_success", ({ roomId, isHost }) => {
      setRoomId(roomId);
      setIsHost(isHost);
      setIsInChat(true);
      toast.success(`Joined room ${roomId}`);
    });

    // Handle Room Closed (by host)
    socket.on("room_closed", () => {
      setIsInChat(false);
      setRoomId("");
      setIsHost(false);
      toast.warn("The host has closed the room.");
    });

    // Handle Errors
    socket.on("error", (msg) => {
      toast.error(msg);
    });

    return () => {
      // socket.off("room_created");
      // socket.off("joined_room_success");
      // socket.off("room_closed");
      socket.off("error");
    };
  }, []);

  const createRoom = (user, password) => {
    if (!user || !password) return toast.error("Username and Password required");
    setUsername(user);
    setRoomPassword(password);
    socket.emit("create_room", { username: user });
  };

  const joinRoom = (user, room, password) => {
    if (!user || !room || !password) return toast.error("All fields are required");
    setUsername(user);
    setRoomPassword(password);
    socket.emit("join_room", { username: user, roomId: room });
  };

  const leaveRoom = () => {
    socket.disconnect();
    window.location.reload(); // Simple reload to reset socket completely
  };

  return (
    <div>
      <ToastContainer theme="dark" position="top-center" />
      {!isInChat ? (
        <JoinRoom createRoom={createRoom} joinRoom={joinRoom} />
      ) : (
        <ChatRoom 
          socket={socket} 
          username={username} 
          roomId={roomId}
          roomPassword={roomPassword} // PASS THE PASSWORD
          isHost={isHost}
          leaveRoom={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;