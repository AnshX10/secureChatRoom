import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoMdRocket, IoMdLogIn, IoMdArrowBack, IoMdKey, IoMdPerson, IoMdQrScanner } from 'react-icons/io';
import Logo from './Logo';

const JoinRoom = ({ joinRoom, createRoom }) => {
  const [view, setView] = useState("menu"); 
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);

  // Parse URL hash for Magic Invite Link
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove the #
    if (hash) {
      const params = new URLSearchParams(hash);
      const hashRoomId = params.get('room');
      const hashKey = params.get('key');
      
      if (hashRoomId && hashKey) {
        // Auto-fill from magic link
        setRoomId(hashRoomId.toUpperCase());
        setRoomPassword(hashKey);
        setIsMagicLink(true); // Mark as magic link join
        setView("join"); // Auto-switch to join view
        
        // Clear hash from URL for security/privacy
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleJoin = () => {
    if (!username || !roomId || !roomPassword) return;
    joinRoom(username, roomId, roomPassword);
  };

  const handleCreate = () => {
    if (!username || !roomPassword) return;
    createRoom(username, roomPassword);
  };

  const variants = {
    initial: { opacity: 0, x: 20, filter: "blur(10px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -20, filter: "blur(10px)" },
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-mono selection:bg-white selection:text-black">
      
      {/* Background Grid Noise */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-3">
            <Logo variant="shield" className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter border-b-2 border-white inline-block pb-2 mb-2">
            <span className="font-light">CHATROOM</span>
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">Encrypted Signal</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-none shadow-2xl relative">
          <AnimatePresence mode="wait">
            
            {/* === MAIN MENU === */}
            {view === "menu" && (
              <motion.div
                key="menu"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <button
                  onClick={() => setView("create")}
                  className="w-full group bg-white text-black p-6 border border-white hover:bg-zinc-200 transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <span className="block font-bold text-lg tracking-wide">CREATE FREQUENCY</span>
                    <span className="text-zinc-600 text-xs uppercase">Start Host</span>
                  </div>
                  <IoMdRocket className="text-2xl" />
                </button>

                <button
                  onClick={() => {
                    setIsMagicLink(false);
                    setView("join");
                  }}
                  className="w-full group bg-black text-white border border-zinc-700 hover:border-white p-6 transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <span className="block font-bold text-lg tracking-wide">JOIN FREQUENCY</span>
                    <span className="text-zinc-500 text-xs uppercase">Connect</span>
                  </div>
                  <IoMdLogIn className="text-2xl text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </motion.div>
            )}

            {/* === CREATE === */}
            {view === "create" && (
              <motion.div key="create" variants={variants} initial="initial" animate="animate" exit="exit">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setView("menu")} className="hover:text-zinc-400 transition"><IoMdArrowBack size={24} /></button>
                  <h2 className="text-xl font-bold uppercase tracking-widest">Init Host</h2>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-zinc-800 focus-within:border-white transition-colors flex items-center gap-4 py-2">
                    <IoMdPerson className="text-zinc-500" />
                    <input type="text" placeholder="CODENAME" className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase" onChange={(e) => setUsername(e.target.value)} />
                  </div>

                  <div className="border-b border-zinc-800 focus-within:border-white transition-colors flex items-center gap-4 py-2">
                    <IoMdKey className="text-zinc-500" />
                    <input type="text" placeholder="ENCRYPTION KEY" className="bg-transparent w-full outline-none placeholder:text-zinc-700" onChange={(e) => setRoomPassword(e.target.value)} />
                  </div>

                  <button onClick={handleCreate} className="w-full mt-6 bg-white text-black font-bold py-4 uppercase tracking-widest hover:bg-zinc-300 transition-colors">
                    Establish Link
                  </button>
                </div>
              </motion.div>
            )}

            {/* === JOIN === */}
            {view === "join" && (
              <motion.div key="join" variants={variants} initial="initial" animate="animate" exit="exit">
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={() => {
                      setIsMagicLink(false);
                      setRoomId("");
                      setRoomPassword("");
                      setView("menu");
                    }} 
                    className="hover:text-zinc-400 transition"
                  >
                    <IoMdArrowBack size={24} />
                  </button>
                  <h2 className="text-xl font-bold uppercase tracking-widest">
                    {isMagicLink ? "Magic Link Detected" : "Uplink"}
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Magic Link Info Banner */}
                  {isMagicLink && (
                    <div className="bg-zinc-900 border border-zinc-700 p-4 mb-4">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center">
                        Room credentials pre-filled via magic link
                      </p>
                    </div>
                  )}

                  <div className="border-b border-zinc-800 focus-within:border-white transition-colors flex items-center gap-4 py-2">
                    <IoMdPerson className="text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="CODENAME" 
                      className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase" 
                      onChange={(e) => setUsername(e.target.value)}
                      value={username}
                      autoFocus={isMagicLink}
                    />
                  </div>

                  {/* Only show Room ID and Encryption Key if NOT from magic link */}
                  {!isMagicLink && (
                    <>
                      <div className="border-b border-zinc-800 focus-within:border-white transition-colors flex items-center gap-4 py-2">
                        <IoMdQrScanner className="text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="ROOM ID" 
                          className="bg-transparent w-full outline-none placeholder:text-zinc-700 uppercase font-mono" 
                          maxLength={6} 
                          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                          value={roomId}
                        />
                      </div>

                      <div className="border-b border-zinc-800 focus-within:border-white transition-colors flex items-center gap-4 py-2">
                        <IoMdKey className="text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="ENCRYPTION KEY" 
                          className="bg-transparent w-full outline-none placeholder:text-zinc-700" 
                          onChange={(e) => setRoomPassword(e.target.value)}
                          value={roomPassword}
                        />
                      </div>
                    </>
                  )}

                  <button 
                    onClick={handleJoin} 
                    className="w-full mt-6 bg-white text-black font-bold py-4 uppercase tracking-widest hover:bg-zinc-300 transition-colors"
                    disabled={!username || (!isMagicLink && (!roomId || !roomPassword))}
                  >
                    Connect
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;