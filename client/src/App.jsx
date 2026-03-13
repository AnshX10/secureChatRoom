import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';
import BiometricDemo from './components/BiometricDemo';

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
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);

  // Check if we're on the demo route
  const [isDemoRoute, setIsDemoRoute] = useState(false);

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      const shouldShowDemo = hash === '#demo' || pathname === '/demo';
      setIsDemoRoute(shouldShowDemo);
    };

    // Check initially
    checkRoute();

    // Listen for hash changes and popstate (back/forward buttons)
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  useEffect(() => {
    socket.on("room_created", ({ roomId, createdAt, users, roomName: serverRoomName }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setIsHost(true);
      setIsInChat(true);
      setIsCreatingRoom(false);
    });

    // Handle Join Success (direct or after host approval)
    socket.on("joined_room_success", ({ roomId, isHost, createdAt, users, roomName: serverRoomName }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setIsHost(isHost);
      setIsInChat(true);
      setIsWaitingApproval(false);
    });

    // Join request is pending host approval
    socket.on("join_request_pending", () => {
      setIsWaitingApproval(true);
      setErrorMessage("");
    });

    // Host decided about our join request
    socket.on("join_request_result", ({ approved, reason }) => {
      if (!approved) {
        setIsWaitingApproval(false);
        setErrorMessage(reason || "JOIN REQUEST REJECTED BY HOST.");
      }
    });

    // Handle Room Closed (by host)
    socket.on("room_closed", () => {
      setIsInChat(false);
      setRoomId("");
      setIsHost(false);
    });

    // Handle Errors (show in UI)
    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setIsCreatingRoom(false);
      setIsWaitingApproval(false);
    });

    return () => {
      socket.off("room_created");
      socket.off("joined_room_success");
      socket.off("join_request_pending");
      socket.off("join_request_result");
      socket.off("room_closed");
      socket.off("error");
    };
  }, []);

  const createRoom = (user, password, name, requireApproval) => {
    if (!user || !password || !name) return;
    setErrorMessage("");
    setIsCreatingRoom(true);
    setUsername(user);
    setRoomPassword(password);
    setRoomName(name);
    socket.emit("create_room", { username: user, password: password, roomName: name, requireApproval: !!requireApproval });
  };

  const joinRoom = (user, room, password) => {
    if (!user || !room || !password) return;
    setErrorMessage(""); // clear previous error when trying again
    setUsername(user);
    setRoomPassword(password);
    socket.emit("join_room", { username: user, roomId: room, password: password });
  };

  const leaveRoom = () => {
    socket.disconnect();
    window.location.reload(); 
  };

  // Show demo if on demo route
  if (isDemoRoute) {
    return <BiometricDemo />;
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {!isInChat ? (
        <JoinRoom 
          createRoom={createRoom} 
          joinRoom={joinRoom} 
          isCreatingRoom={isCreatingRoom}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          clearError={() => setErrorMessage("")}
          isWaitingApproval={isWaitingApproval}
        />
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
          roomName={roomName}
        />
      )}
    </div>
  );
}

export default App;