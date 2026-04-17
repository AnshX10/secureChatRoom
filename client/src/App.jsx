import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';

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
  const [roomCapacity, setRoomCapacity] = useState(50);
  const [roomLocked, setRoomLocked] = useState(false);
  const [roomSilencedUserIds, setRoomSilencedUserIds] = useState([]);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [isWaitingForFirstAgent, setIsWaitingForFirstAgent] = useState(false); // Host waiting for first agent to join

  useEffect(() => {
    socket.on("room_created_pending", ({ roomId, createdAt, roomName: serverRoomName, capacity, isWaitingForFirstAgent }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers([{ id: socket.id, username, isHost: true }]); // Just the host for now
      setRoomName(serverRoomName || "");
      setRoomCapacity(capacity || 50);
      setRoomLocked(false);
      setRoomSilencedUserIds([]);
      setIsHost(true);
      setIsWaitingForFirstAgent(true); // Show waiting state
      setIsCreatingRoom(false);
    });

    socket.on("room_created", ({ roomId, createdAt, users, roomName: serverRoomName, capacity, isLocked, silencedUserIds }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setRoomCapacity(capacity || 50);
      setRoomLocked(!!isLocked);
      setRoomSilencedUserIds(Array.isArray(silencedUserIds) ? silencedUserIds : []);
      setIsHost(true);
      setIsWaitingForFirstAgent(false); // First agent joined, room is now created
      setIsInChat(true);
      setIsCreatingRoom(false);
    });

    socket.on("room_halted", ({ roomId, createdAt, users, roomName: serverRoomName, capacity, isLocked, silencedUserIds }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setRoomCapacity(capacity || 50);
      setRoomLocked(!!isLocked);
      setRoomSilencedUserIds(Array.isArray(silencedUserIds) ? silencedUserIds : []);
      setIsInChat(false);
      setIsWaitingForFirstAgent(true);
    });

    socket.on("room_resumed", ({ roomId, createdAt, users, roomName: serverRoomName, capacity, isLocked, silencedUserIds }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setRoomCapacity(capacity || 50);
      setRoomLocked(!!isLocked);
      setRoomSilencedUserIds(Array.isArray(silencedUserIds) ? silencedUserIds : []);
      setIsWaitingForFirstAgent(false);
      setIsInChat(true);
    });

    // Handle Join Success (direct or after host approval)
    socket.on("joined_room_success", ({ roomId, isHost, roomPassword: serverRoomPassword, createdAt, users, roomName: serverRoomName, capacity, isLocked, silencedUserIds }) => {
      setRoomId(roomId);
      setStartTime(createdAt);
      setInitialUsers(users);
      setRoomName(serverRoomName || "");
      setRoomCapacity(capacity || 50);
      setRoomLocked(!!isLocked);
      setRoomSilencedUserIds(Array.isArray(silencedUserIds) ? silencedUserIds : []);
      if (typeof serverRoomPassword === "string" && serverRoomPassword.length > 0) {
        setRoomPassword(serverRoomPassword);
      }
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
      setRoomLocked(false);
      setRoomSilencedUserIds([]);
      setIsWaitingForFirstAgent(false);
    });

    // Handle Errors (show in UI)
    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setIsCreatingRoom(false);
      setIsWaitingApproval(false);
    });

    return () => {
      socket.off("room_created_pending");
      socket.off("room_created");
      socket.off("room_halted");
      socket.off("room_resumed");
      socket.off("joined_room_success");
      socket.off("join_request_pending");
      socket.off("join_request_result");
      socket.off("room_closed");
      socket.off("error");
    };
  }, [username]);

  const createRoom = (user, password, name, requireApproval, capacity) => {
    if (!user || !password || !name) return;
    setErrorMessage("");
    setIsCreatingRoom(true);
    setUsername(user);
    setRoomPassword(password);
    setRoomName(name);
    setRoomCapacity(capacity || 50);
    socket.emit("create_room", {
      username: user,
      password: password,
      roomName: name,
      requireApproval: !!requireApproval,
      capacity,
    });
  };

  const joinRoom = (user, room, password) => {
    if (!user || !room || !password) return;
    setErrorMessage(""); // clear previous error when trying again
    setUsername(user);
    setRoomPassword(password);
    socket.emit("join_room", { username: user, roomId: room, password: password });
  };

  const joinRoomWithInvite = (user, inviteToken) => {
    if (!user || !inviteToken) return;
    setErrorMessage("");
    setUsername(user);
    socket.emit("join_room_with_invite", { username: user, inviteToken });
  };

  const issueMagicLink = async ({ roomId, encryptionKey }) => {
    const payload = {
      roomId,
      encryptionKey,
    };

    return new Promise((resolve, reject) => {
      socket.timeout(7000).emit("issue_magic_invite", payload, (err, response) => {
        if (err) {
          reject(new Error("Failed to issue magic link."));
          return;
        }

        if (!response?.ok || !response?.inviteToken || !response?.roomId) {
          reject(new Error(response?.error || "Failed to issue magic link."));
          return;
        }

        resolve(response);
      });
    });
  };

  const revokeMagicLink = async ({ roomId }) => {
    return new Promise((resolve, reject) => {
      socket.timeout(7000).emit("revoke_magic_invite", { roomId }, (err, response) => {
        if (err) {
          reject(new Error("Failed to revoke magic link."));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || "Failed to revoke magic link."));
          return;
        }

        resolve(response);
      });
    });
  };

  const leaveRoom = () => {
    socket.disconnect();
    window.location.reload(); 
  };

  const terminateRoom = () => {
    if (roomId) {
      socket.emit("close_room", { roomId });
    }
  };

  return (
    <div>
      {!isInChat ? (
        <JoinRoom 
          createRoom={createRoom} 
          joinRoom={joinRoom}
          joinRoomWithInvite={joinRoomWithInvite}
          terminateRoom={terminateRoom}
          isCreatingRoom={isCreatingRoom}
          isWaitingForFirstAgent={isWaitingForFirstAgent}
          roomId={roomId}
          hostRoomPassword={roomPassword}
          issueMagicLink={issueMagicLink}
          revokeMagicLink={revokeMagicLink}
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
          roomCapacity={roomCapacity}
          roomLocked={roomLocked}
          roomSilencedUserIds={roomSilencedUserIds}
        />
      )}
    </div>
  );
}

export default App;