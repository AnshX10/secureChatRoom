import React from 'react';
import { IoMdLock, IoMdPulse, IoMdArrowForward } from 'react-icons/io';
import Logo from './Logo';

const SocialBanner = () => {
  return (
    <div className="w-[1200px] h-[630px] flex items-center justify-center font-mono selection:bg-white selection:text-black overflow-hidden relative">
      
      {/* 1. BACKGROUND (Subtle Gradient like the reference) */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black"></div>
      
      {/* Background Noise Texture */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* 2. THE CARD (Floating container) */}
      <div className="relative z-10 w-[1000px] h-[500px] bg-zinc-950 rounded-[3rem] border border-zinc-800 shadow-2xl flex overflow-hidden">
        
        {/* --- LEFT SIDE: THE LOGO (Like the 'UPT' box) --- */}
        <div className="w-[40%] bg-zinc-900 flex items-center justify-center relative border-r border-zinc-800">
          {/* Decorative Circle behind logo */}
          <div className="absolute w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          
          {/* The Big Logo */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-40 h-40 bg-black border-2 border-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
               <Logo variant="shield" className="w-24 h-24 text-white" />
            </div>
            <h2 className="mt-6 text-4xl font-black text-white tracking-tighter">SECURE<br/>CHATROOM</h2>
          </div>
        </div>

        {/* --- RIGHT SIDE: CONTENT (Like the text area) --- */}
        <div className="w-[60%] p-12 flex flex-col justify-center relative">
          
          {/* Top Badge (URL) */}
          <div className="absolute top-12 left-12">
            <span className="bg-zinc-900 border border-zinc-700 text-zinc-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider">
              securechatroom.vercel.app
            </span>
          </div>

          {/* Main Title */}
          <div className="mt-8 space-y-2">
            <h1 className="text-5xl font-black text-white leading-tight">
              End-to-End <br/>
              Encrypted Uplink
            </h1>
            <p className="text-xl text-zinc-500 font-bold tracking-wide mt-4">
              Zero Logs. Self-Destruct. <br/>
              Total Anonymity.
            </p>
          </div>

          {/* Feature List (Small Icons) */}
          <div className="flex gap-6 mt-8 text-zinc-400 text-sm font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2"><IoMdLock /> AES-256</div>
            <div className="flex items-center gap-2"><IoMdPulse /> Real-time</div>
          </div>

          {/* CTA Button (Like the 'Read more' button) */}
          <div className="mt-10">
            <button className="bg-white text-black px-8 py-4 rounded-full font-black text-lg flex items-center gap-3 shadow-lg hover:scale-105 transition-transform">
              ESTABLISH LINK <IoMdArrowForward />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SocialBanner;