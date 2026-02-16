import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';
import ReactGA from "react-ga4";

// Connect to backend
const BACKEND_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const socket = io.connect(BACKEND_URL);

function App() {
  const [isInChat, setIsInChat] = useState(false);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [initialUsers, setInitialUsers] = useState([]);

  useEffect(() => {
    socket.on("room_created", ({ roomId, createdAt, users }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setIsHost(true);
      setIsInChat(true);
    });

    // Handle Join Success
    socket.on("joined_room_success", ({ roomId, isHost, createdAt, users }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setIsHost(isHost);
      setIsInChat(true);
    });

    // Handle Room Closed (by host)
    socket.on("room_closed", () => {
      setIsInChat(false);
      setRoomId("");
      setIsHost(false);
    });

    // Handle Errors
    socket.on("error", (msg) => {
      console.error(msg); // Error logged to console instead of toast
    });

    return () => {
      socket.off("room_created");
      socket.off("joined_room_success");
      socket.off("room_closed");
      socket.off("error");
    };
  }, []);

  const createRoom = (user, password) => {
    if (!user || !password) return;

    ReactGA.event({
    category: "User",
    action: "Created a Room",
  });
    setUsername(user);
    setRoomPassword(password);
    socket.emit("create_room", { username: user, password: password });
  };

  const joinRoom = (user, room, password) => {
    if (!user || !room || !password) return;

    // Track successful join attempt
  ReactGA.event({
    category: "User",
    action: "Joined a Room",
  });
    setUsername(user);
    setRoomPassword(password);
    socket.emit("join_room", { username: user, roomId: room, password: password });
  };

  const leaveRoom = () => {
    socket.disconnect();
    window.location.reload(); 
  };

  return (
    <div>
      {!isInChat ? (
        <JoinRoom createRoom={createRoom} joinRoom={joinRoom} />
      ) : (
        <ChatRoom 
          socket={socket} 
          username={username} 
          roomId={roomId}
          roomPassword={roomPassword} 
          isHost={isHost}
          leaveRoom={leaveRoom}
          createdAt={startTime}
          initialUsers={initialUsers}
        />
      )}
    </div>
  );
}

export default App;