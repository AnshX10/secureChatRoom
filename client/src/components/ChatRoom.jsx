import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoMdSend, IoMdPeople, IoMdLock, IoMdCopy, 
  IoMdMore, IoMdTrash, IoMdCreate, IoMdClose, IoMdExit,
  IoMdTimer // <--- New Import
} from 'react-icons/io';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';

const ChatRoom = ({ socket, username, roomId, roomPassword, isHost, leaveRoom }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // --- New State for Self-Destruct ---
  const [selfDestructTime, setSelfDestructTime] = useState(0); // 0 = Off
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  const scrollRef = useRef(null);

  // Timer Options
  const timerOptions = [
    { label: "OFF", value: 0 },
    { label: "10s", value: 10000 },
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
    { label: "10m", value: 600000 },
  ];

  // --- Encryption ---
  const encrypt = (text) => CryptoJS.AES.encrypt(text, roomPassword).toString();
  const decrypt = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, roomPassword);
      return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ DECRYPT FAIL";
    } catch { return "🚫 ERROR"; }
  };

  // --- Actions ---
  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    if (editingMessageId) {
      // Editing Mode (Timers cannot be added post-creation)
      const encrypted = encrypt(currentMessage);
      socket.emit("edit_message", { roomId, messageId: editingMessageId, newEncryptedMessage: encrypted });
      
      setMessageList((list) => list.map(msg => 
        msg.id === editingMessageId ? { ...msg, message: currentMessage, edited: true } : msg
      ));
      
      setEditingMessageId(null);
      setCurrentMessage("");
    } else {
      // New Message Mode
      const messageId = uuidv4();
      const encrypted = encrypt(currentMessage);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const messageData = { 
        id: messageId, 
        roomId, 
        username, 
        message: encrypted, 
        time, 
        edited: false, 
        deleted: false,
        timer: selfDestructTime // <--- Send Timer Value to Server
      };

      await socket.emit("send_message", messageData);
      
      // Optimistic UI Update
      setMessageList((list) => [...list, { ...messageData, message: currentMessage, own: true }]);
      setCurrentMessage("");
    }
  };

  const deleteForMe = (id) => {
    setMessageList((list) => list.filter((msg) => msg.id !== id));
    setActiveMenuId(null);
  };

  const deleteForEveryone = (id) => {
    socket.emit("delete_message", { roomId, messageId: id });
    setActiveMenuId(null);
  };

  const startEditing = (msg) => {
    // Prevent editing if message is already deleted
    if (msg.deleted) return;
    setEditingMessageId(msg.id);
    setCurrentMessage(msg.message);
    setActiveMenuId(null);
    setShowTimerMenu(false); // Close timer menu if open
  };

  // --- Listeners ---
  useEffect(() => {
    socket.on("receive_message", (data) => {
      if(data.system) {
        setMessageList((l) => [...l, data]);
      } else {
        setMessageList((l) => [...l, { ...data, message: decrypt(data.message), own: false }]);
      }
    });

    socket.on("message_deleted", (deletedId) => {
      setMessageList((list) => list.map((msg) => 
        msg.id === deletedId ? { ...msg, deleted: true, message: "[ DATA EXPUNGED ]", edited: false } : msg
      ));
    });

    socket.on("message_updated", ({ messageId, newEncryptedMessage }) => {
      setMessageList((list) => list.map((msg) => 
        msg.id === messageId ? { ...msg, message: decrypt(newEncryptedMessage), edited: true } : msg
      ));
    });

    socket.on("update_users", (userList) => setUsers(userList));

    return () => { 
      socket.off("receive_message"); 
      socket.off("update_users"); 
      socket.off("message_deleted"); 
      socket.off("message_updated"); 
    };
  }, [socket, roomPassword]);

  // Auto-scroll
  useEffect(() => {
    if(!editingMessageId) {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageList, editingMessageId]);

  // Close menus on click outside
  useEffect(() => {
    const fn = () => {
      setActiveMenuId(null);
      setShowTimerMenu(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  return (
    <div className="flex h-screen bg-black text-white font-mono selection:bg-white selection:text-black overflow-hidden">
      
      {/* Sidebar */}
      <AnimatePresence>
        {(showUsers || window.innerWidth > 768) && (
          <motion.div 
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            className="fixed md:relative z-40 w-72 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col"
          >
             <div className="p-6 border-b border-zinc-800">
                <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <IoMdLock /> CLASSIFIED
                </h2>
             </div>
             <div className="p-4 flex-1">
               <div className="border border-zinc-800 p-4 mb-6">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Operation ID</p>
                  <div className="flex items-center justify-between">
                     <span className="text-lg font-bold tracking-widest text-white">{roomId}</span>
                     <button onClick={() => {navigator.clipboard.writeText(roomId); toast.success("Copied");}} className="p-2 hover:bg-white hover:text-black transition"><IoMdCopy /></button>
                  </div>
               </div>
               <h3 className="text-[10px] uppercase font-bold text-zinc-500 mb-4 tracking-widest">Agents ({users.length})</h3>
               {users.map((user, i) => (
                 <div key={i} className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-xs">
                       {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-xs uppercase tracking-wide">{user.username} {user.username === username && "(YOU)"}</span>
                 </div>
               ))}
             </div>
             <div className="p-4 border-t border-zinc-800">
                <button onClick={leaveRoom} className="w-full border border-zinc-800 text-zinc-400 py-3 uppercase text-xs font-bold hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2"><IoMdExit size={16}/> ABORT MISSION</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col relative bg-black">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 z-30 bg-black">
          <div className="flex items-center gap-3">
             <button onClick={() => setShowUsers(!showUsers)} className="md:hidden text-2xl"><IoMdPeople /></button>
             <div>
                <h1 className="font-bold uppercase tracking-widest text-sm">Secure Channel</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> AES-256 Active</p>
             </div>
          </div>
          {isHost && <button onClick={() => socket.emit("close_room", {roomId})} className="text-[10px] border border-zinc-700 text-zinc-400 px-4 py-2 uppercase hover:bg-white hover:text-black transition">TERMINATE</button>}
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 space-y-6">
          {messageList.map((msg) => (
            <motion.div 
              layout key={msg.id || Math.random()} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex group relative ${msg.system ? "justify-center" : msg.own ? "justify-end" : "justify-start"}`}
            >
              {msg.system ? (
                <span className="text-[9px] border border-zinc-800 text-zinc-500 px-3 py-1 uppercase tracking-widest">{msg.message}</span>
              ) : (
                <div className="flex flex-col max-w-[85%] md:max-w-[60%] relative">
                  
                  {/* Bubble */}
                  <div className={`p-4 relative border transition-all ${
                    msg.deleted 
                      ? "bg-transparent border-zinc-800 text-zinc-600 italic"
                      : msg.own 
                        ? "bg-white text-black border-white" 
                        : "bg-black text-zinc-200 border-zinc-800"
                  }`}>
                    {/* Username & Timer Indicator */}
                    <div className="flex justify-between items-start mb-2">
                        {!msg.own && !msg.deleted && <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{msg.username}</p>}
                        
                        {/* Timer Icon */}
                        {msg.timer > 0 && !msg.deleted && (
                           <span className={`flex items-center gap-1 text-[8px] border border-current px-1 rounded-full opacity-60 ${msg.own ? "ml-auto" : "ml-auto"}`}>
                             <IoMdTimer /> {msg.timer / 1000}s
                           </span>
                        )}
                    </div>
                    
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex items-center gap-2">
                        {msg.deleted && <IoMdTrash />} {msg.message}
                    </p>
                    
                    <div className="flex items-center gap-2 justify-end mt-2">
                        {msg.edited && !msg.deleted && <span className="text-[8px] border border-current px-1 uppercase opacity-50">EDITED</span>}
                        <span className="text-[9px] opacity-50 font-bold">{msg.time}</span>
                    </div>
                  </div>

                  {/* 3-Dot Menu Trigger */}
                  {!msg.deleted && (
                      <div 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }}
                        className={`absolute -top-3 ${msg.own ? "left-0" : "right-0"} p-1 cursor-pointer text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity ${activeMenuId === msg.id ? "opacity-100" : ""}`}
                      >
                        <IoMdMore size={20} />
                      </div>
                  )}

                  {/* Context Menu */}
                  <AnimatePresence>
                    {activeMenuId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className={`absolute top-full mt-2 ${msg.own ? "right-0" : "left-0"} z-50 bg-black border border-white shadow-xl min-w-[160px]`}
                      >
                        <button onClick={() => deleteForMe(msg.id)} className="w-full text-left px-4 py-3 text-xs hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase tracking-wide transition-colors">
                          <IoMdTrash /> Delete (Local)
                        </button>
                        {msg.own && (
                          <>
                            <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-3 text-xs hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase tracking-wide transition-colors border-t border-zinc-900">
                              <IoMdCreate /> Edit
                            </button>
                            <button onClick={() => deleteForEveryone(msg.id)} className="w-full text-left px-4 py-3 text-xs hover:bg-white hover:text-black text-zinc-400 flex items-center gap-2 uppercase tracking-wide transition-colors border-t border-zinc-900">
                              <IoMdTrash /> Delete (All)
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}
            </motion.div>
          ))}
          <div ref={scrollRef} />
        </main>

        {/* Input Bar */}
        <footer className="p-4 border-t border-zinc-800 bg-black relative">
          
          {/* Edit / Timer Indicators */}
          <div className="flex items-center justify-between px-2 mb-2">
            {editingMessageId && (
                <div className="flex items-center gap-2 text-xs text-white uppercase tracking-widest border-l-2 border-white pl-2">
                  <span>Editing Transmisson...</span>
                  <button onClick={() => { setEditingMessageId(null); setCurrentMessage(""); }}><IoMdClose /></button>
                </div>
            )}
            
            {/* Spacer if not editing */}
            {!editingMessageId && <div></div>} 

            {/* Timer Status Text */}
            {selfDestructTime > 0 && !editingMessageId && (
                 <div className="flex items-center gap-2 text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">
                    <IoMdTimer /> Self-Destruct: {selfDestructTime/1000}s
                 </div>
            )}
          </div>
          
          <div className={`flex items-center border p-1 transition-colors ${editingMessageId ? "border-white" : "border-zinc-800 focus-within:border-zinc-500"}`}>
            
            {/* Timer Button */}
            <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTimerMenu(!showTimerMenu); }}
                  className={`p-3 transition-colors ${selfDestructTime > 0 ? "text-red-500" : "text-zinc-500 hover:text-white"}`}
                  title="Self Destruct Timer"
                >
                  <IoMdTimer size={18} />
                </button>

                {/* Timer Dropdown */}
                <AnimatePresence>
                    {showTimerMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 mb-2 bg-black border border-zinc-700 shadow-2xl z-50 w-32"
                        >
                            {timerOptions.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => { setSelfDestructTime(opt.value); setShowTimerMenu(false); }}
                                    className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors ${selfDestructTime === opt.value ? "bg-white text-black" : "text-zinc-400"}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <input
              type="text"
              value={currentMessage}
              placeholder={editingMessageId ? "OVERWRITE DATA..." : "ENTER ENCRYPTED MESSAGE..."}
              className="flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-zinc-700 text-sm font-mono"
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className={`p-3 text-black transition-all ${editingMessageId ? "bg-white" : "bg-white hover:bg-zinc-200"}`}
            >
              {editingMessageId ? <IoMdCreate size={18} /> : <IoMdSend size={18} />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatRoom;