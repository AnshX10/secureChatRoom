import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  LuShieldCheck,
  LuFingerprint,
  LuLock,
  LuZap,
  LuUsers,
  LuKeyRound,
  LuEye,
  LuEyeOff,
  LuArrowRight,
  LuGlobe,
  LuRadio,
  LuTimer,
  LuMic,
  LuPin,
  LuChevronDown,
  LuExternalLink,
  LuScanLine,
  LuActivity,
  LuHash,
  LuCrown,
  LuLink,
  LuShieldAlert,
  LuMessageSquarePlus,
  LuTriangleAlert,
} from "react-icons/lu";
import Logo from "./Logo";

gsap.registerPlugin(ScrollTrigger);

/* ─── CONSTANTS ─── */
const FM_EASE = [0.22, 1, 0.36, 1];
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?";
let globalLenis = null;

/* ─── GSAP SCROLL REVEAL HOOK ─── */
/* Animates children with class [data-gsap] when section enters viewport */
function useGsapReveal(containerRef, deps = []) {
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Staggered fade-up for [data-gsap="up"]
      gsap.utils
        .toArray("[data-gsap='up']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Slide from left [data-gsap="left"]
      gsap.utils
        .toArray("[data-gsap='left']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, x: -70 },
            {
              opacity: 1,
              x: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Slide from right [data-gsap="right"]
      gsap.utils
        .toArray("[data-gsap='right']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, x: 70 },
            {
              opacity: 1,
              x: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Scale-in [data-gsap="scale"]
      gsap.utils
        .toArray("[data-gsap='scale']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, scale: 0.88, y: 30 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.8,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Stagger children [data-gsap="stagger"]
      gsap.utils
        .toArray("[data-gsap='stagger']", containerRef.current)
        .forEach((parent) => {
          const children = parent.children;
          gsap.fromTo(
            children,
            { opacity: 0, y: 50, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.1,
              scrollTrigger: {
                trigger: parent,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Per-card individual scroll reveal [data-gsap="cards"]
      // Each direct child fires its own ScrollTrigger as it enters the viewport
      gsap.utils
        .toArray("[data-gsap='cards']", containerRef.current)
        .forEach((parent) => {
          Array.from(parent.children).forEach((card, i) => {
            const col = i % 3; // 0=left, 1=center, 2=right
            const fromX = col === 0 ? -40 : col === 2 ? 40 : 0;
            const fromY = col === 1 ? 50 : 30;
            gsap.fromTo(
              card,
              { opacity: 0, y: fromY, x: fromX, scale: 0.94 },
              {
                opacity: 1,
                y: 0,
                x: 0,
                scale: 1,
                duration: 0.75,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: card,
                  start: "top 90%",   // fires when THIS card's top hits 90% of viewport
                  toggleActions: "play none none none",
                },
              },
            );
          });
        });

      // Stagger from left [data-gsap="stagger-left"]
      gsap.utils
        .toArray("[data-gsap='stagger-left']", containerRef.current)
        .forEach((parent) => {
          const children = parent.children;
          gsap.fromTo(
            children,
            { opacity: 0, x: -50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.65,
              ease: "power3.out",
              stagger: 0.12,
              scrollTrigger: {
                trigger: parent,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Stagger from right [data-gsap="stagger-right"]
      gsap.utils
        .toArray("[data-gsap='stagger-right']", containerRef.current)
        .forEach((parent) => {
          const children = parent.children;
          gsap.fromTo(
            children,
            { opacity: 0, x: 50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.65,
              ease: "power3.out",
              stagger: 0.12,
              scrollTrigger: {
                trigger: parent,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      // Scrub parallax [data-gsap="parallax"]
      gsap.utils
        .toArray("[data-gsap='parallax']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { y: 0 },
            {
              y: -80,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5,
              },
            },
          );
        });

      // Line draw [data-gsap="line"]
      gsap.utils
        .toArray("[data-gsap='line']", containerRef.current)
        .forEach((el) => {
          gsap.fromTo(
            el,
            { scaleY: 0, transformOrigin: "top center" },
            {
              scaleY: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            },
          );
        });
    }, containerRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ─── GLITCH TEXT ─── */
function useGlitchText(text, trigger = true) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (!trigger) {
      setDisplay(text);
      return;
    }
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < iteration) return text[i];
            return GLITCH_CHARS[
              Math.floor(Math.random() * GLITCH_CHARS.length)
            ];
          })
          .join(""),
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 0.4;
    }, 25);
    return () => clearInterval(interval);
  }, [text, trigger]);
  return display;
}

/* ─── COUNTER ─── */
function Counter({ to, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * to));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ─── GRID BG ─── */
function GridBg({ opacity = 0.022 }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `
        linear-gradient(rgba(255,255,255,${opacity}) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,${opacity}) 1px, transparent 1px)
      `,
        backgroundSize: "64px 64px",
      }}
    />
  );
}

/* ─── SCAN LINE ─── */
function ScanLine() {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      animate={{ top: ["0%", "100%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ─── SECTION DIVIDER ─── */
function Divider() {
  return (
    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent to-zinc-700/50" />
  );
}

/* ─── TERMINAL ─── */
function Terminal() {
  const lines = [
    {
      prefix: "HOST",
      text: "FREQUENCY ESTABLISHED — ROOM: 7F3A-9K2B",
      color: "text-zinc-400",
    },
    {
      prefix: "SYS",
      text: "AES-256 ENCRYPTION ACTIVE",
      color: "text-green-400",
    },
    {
      prefix: "AGENT",
      text: "CODENAME: PHANTOM connected",
      color: "text-zinc-300",
    },
    {
      prefix: "VAULT",
      text: "BIOMETRIC LOCK ENGAGED",
      color: "text-amber-400",
    },
    {
      prefix: "HOST",
      text: "BROADCASTING HIGH-CLEARANCE MESSAGE...",
      color: "text-zinc-400",
    },
    { prefix: "SYS", text: "SELF-DESTRUCT TIMER: 30s", color: "text-red-400" },
    {
      prefix: "AGENT",
      text: "MESSAGE RECEIVED & DECRYPTED",
      color: "text-green-400",
    },
    {
      prefix: "SYS",
      text: "TRACE ELIMINATED. CHANNEL SECURE.",
      color: "text-zinc-500",
    },
  ];
  const [visibleLines, setVisibleLines] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);

  useEffect(() => {
    if (currentLine >= lines.length) {
      const t = setTimeout(() => {
        setVisibleLines([]);
        setCurrentLine(0);
        setCurrentChar(0);
      }, 3000);
      return () => clearTimeout(t);
    }
    const line = lines[currentLine];
    if (currentChar < line.text.length) {
      const t = setTimeout(() => setCurrentChar((c) => c + 1), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisibleLines((prev) => [...prev, line]);
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }, 180);
    return () => clearTimeout(t);
  }, [currentLine, currentChar]);

  const activeLine = currentLine < lines.length ? lines[currentLine] : null;

  return (
    <div className="relative rounded-2xl border border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm overflow-hidden font-mono text-xs sm:text-sm shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-zinc-500 text-xs tracking-widest">
          GHOST TUNNEL — SECURE CHANNEL
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-2 min-h-[180px] sm:min-h-[240px] overflow-hidden">
        {visibleLines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-2 sm:gap-3 min-w-0"
          >
            <span className="text-zinc-700 shrink-0 w-12 sm:w-14 text-[10px] sm:text-xs">
              [{line.prefix}]
            </span>
            <span className={`${line.color} truncate text-[10px] sm:text-xs`}>
              {line.text}
            </span>
          </motion.div>
        ))}
        {activeLine && (
          <div className="flex gap-2 sm:gap-3 min-w-0">
            <span className="text-zinc-700 shrink-0 w-12 sm:w-14 text-[10px] sm:text-xs">
              [{activeLine.prefix}]
            </span>
            <span className={`${activeLine.color} text-[10px] sm:text-xs`}>
              {activeLine.text.slice(0, currentChar)}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-[6px] h-[11px] sm:w-[7px] sm:h-[13px] bg-current align-middle ml-0.5"
              />
            </span>
          </div>
        )}
      </div>
      <ScanLine />
    </div>
  );
}

/* ─── NAVBAR ─── */
function Navbar({ onEnter }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el && globalLenis)
      globalLenis.scrollTo(el, { offset: -80, duration: 1.4 });
    else el?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const navLinks = [
    ["features", "Features"],
    ["how-it-works", "How It Works"],
    ["security", "Security"],
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: FM_EASE }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50 shadow-xl shadow-black/40"
            : ""
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-7 h-7 text-white" />
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text font-bold text-white tracking-widest text-sm">GHOST TUNNEL</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-zinc-500 hover:text-white text-sm transition-colors duration-200 tracking-wide"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEnter}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Launch <LuArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 text-zinc-400 hover:text-white"
              aria-label="Toggle menu"
            >
              <div className="space-y-[5px]">
                <motion.div
                  animate={
                    menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }
                  }
                  className="w-5 h-px bg-current"
                />
                <motion.div
                  animate={
                    menuOpen
                      ? { opacity: 0, scaleX: 0 }
                      : { opacity: 1, scaleX: 1 }
                  }
                  className="w-5 h-px bg-current"
                />
                <motion.div
                  animate={
                    menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }
                  }
                  className="w-5 h-px bg-current"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: FM_EASE }}
            className="fixed top-16 left-0 right-0 z-40 bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-800/60 md:hidden"
          >
            <div className="px-5 py-5 space-y-1">
              {navLinks.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="block w-full text-left px-4 py-3 text-zinc-300 hover:text-white text-sm rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={onEnter}
                className="w-full mt-3 px-4 py-3 rounded-xl bg-white text-black text-sm font-bold"
              >
                Launch App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── HERO ─── */
function Hero({ onEnter }) {
  const title1 = useGlitchText("CLASSIFIED", true);
  const [showSub, setShowSub] = useState(false);
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setShowSub(true), 900);
    return () => clearTimeout(t);
  }, []);

  /* GSAP parallax scrub on hero content */
  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -120,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
    >
      <GridBg opacity={0.022} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[700px] h-[700px] rounded-full bg-white/[0.018] blur-[120px]" />
      </div>

      {/* Corner brackets */}
      {[
        "top-24 left-6 sm:left-14 border-t-2 border-l-2",
        "top-24 right-6 sm:right-14 border-t-2 border-r-2",
        "bottom-14 left-6 sm:left-14 border-b-2 border-l-2",
        "bottom-14 right-6 sm:right-14 border-b-2 border-r-2",
      ].map((cls, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: FM_EASE }}
          className={`pointer-events-none absolute w-8 h-8 border-zinc-700/50 ${cls}`}
        />
      ))}

      <div
        ref={contentRef}
        className="relative z-10 text-center px-5 max-w-5xl mx-auto w-full"
      >
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: FM_EASE }}
          className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] font-black tracking-tighter text-white leading-[0.92] mb-6 mt-20"
        >
          {title1}
          <br />
          <span className="text-zinc-700">COMMUNICATIONS</span>
        </motion.h1>

        <AnimatePresence>
          {showSub && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: FM_EASE }}
              className="text-zinc-400 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-2"
            >
              A zero-trace, end-to-end encrypted chat platform built for
              operatives who demand absolute privacy. No logs. No metadata. No
              compromises.
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease: FM_EASE }}
          className="flex flex-col xs:flex-row items-center justify-center gap-3 mb-16 w-full"
        >
          <button
            onClick={onEnter}
            className="group w-full xs:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-black font-bold text-sm sm:text-base hover:bg-zinc-100 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
          >
            <LuRadio className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            OPEN SECURE CHANNEL
            <LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("how-it-works");
              if (el && globalLenis)
                globalLenis.scrollTo(el, { offset: -80, duration: 1.4 });
              else el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full xs:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-medium transition-all duration-200 hover:bg-zinc-900/40"
          >
            <LuScanLine className="w-4 h-4 shrink-0" />
            HOW IT WORKS
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 1.4, ease: FM_EASE }}
          className="max-w-2xl mx-auto"
        >
          <Terminal />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-700"
      >
        <span className="text-[10px] font-mono tracking-[0.3em]">SCROLL</span>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <LuChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── MARQUEE STRIP ─── */
function MarqueeStrip({ light = false }) {
  const items = [
    "AES-256 ENCRYPTED", "ZERO LOGS", "BIOMETRIC VAULT", "SELF-DESTRUCT",
    "MAGIC LINKS", "HOST CONTROLS", "INTRUSION DETECTION", "NO ACCOUNTS",
    "END-TO-END", "OPEN SOURCE", "ZERO TRACE", "REAL-TIME",
  ];
  const doubled = [...items, ...items];
  const bg = light ? "#ffffff" : "#09090b";
  const textCls = light ? "text-zinc-600" : "text-zinc-700";
  const diamondCls = light ? "text-zinc-400" : "text-zinc-800";
  const borderCls = light ? "border-zinc-200" : "border-zinc-800/40";
  return (
    <div className={`relative py-10 overflow-hidden border-y ${borderCls}`}>
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10"
        style={{ background: `linear-gradient(to right, ${bg}, transparent)` }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10"
        style={{ background: `linear-gradient(to left, ${bg}, transparent)` }} />
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        className="flex gap-8 whitespace-nowrap"
      >
        {doubled.map((item, i) => (
          <span key={i} className={`${textCls} text-xs font-mono tracking-[0.25em] flex items-center gap-8`}>
            {item}<span className={diamondCls}>◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}


/* ─── FEATURES SECTION ─── */
function Features() {
  const sectionRef  = useRef(null);
  const stickyRef   = useRef(null);
  const counterRef  = useRef(null);

  const features = [
    {
      icon: LuLock,
      title: "AES-256 Encryption",
      tag: "ENCRYPTION",
      desc: "Every message is encrypted client-side before it ever leaves your device. The server receives only an unreadable cipher — it never sees plaintext, usernames, or metadata.",
      detail: "Uses CryptoJS AES with your shared room key as the secret. Zero server-side decryption capability.",
      accent: "green",
      accentHex: "#4ade80",
    },
    {
      icon: LuFingerprint,
      title: "Biometric Vault",
      tag: "HARDWARE SECURITY",
      desc: "High-clearance messages are locked behind WebAuthn — your device's fingerprint sensor or face recognition. No password, no bypass.",
      detail: "Built on the WebAuthn API. Credentials are stored in your device's secure enclave, never transmitted.",
      accent: "amber",
      accentHex: "#fbbf24",
    },
    {
      icon: LuTimer,
      title: "Self-Destruct Messages",
      tag: "EPHEMERAL",
      desc: "Set a countdown timer on any message. When it hits zero, the message is wiped from every screen simultaneously — no trace left behind.",
      detail: "Server-synchronized destruction. Even if a client disconnects, the message is gone on reconnect.",
      accent: "red",
      accentHex: "#f87171",
    },
    {
      icon: LuLink,
      title: "Magic Invite Links",
      tag: "SECURE SHARING",
      desc: "One-tap encrypted invite links bundle the Room ID and encryption key into a single URL. Share it and your agent joins instantly — no manual entry.",
      detail: "Payload is AES-encrypted before being embedded in the URL hash. Never touches the server.",
      accent: "blue",
      accentHex: "#60a5fa",
    },
    {
      icon: LuUsers,
      title: "Host Command Center",
      tag: "ROOM CONTROL",
      desc: "As host you have full authority — lock the frequency to block new joins, silence specific agents, approve or reject join requests, transfer command, and terminate the room.",
      detail: "All control events are socket-authenticated. Agents cannot spoof host commands.",
      accent: "purple",
      accentHex: "#c084fc",
    },
    {
      icon: LuMic,
      title: "Voice & Media",
      tag: "RICH MEDIA",
      desc: "Record and send encrypted voice messages, upload images in batch, and attach files — all protected by the same end-to-end encryption as text messages.",
      detail: "Media is base64-encoded and AES-encrypted before transmission. Max 10MB per payload.",
      accent: "white",
      accentHex: "#ffffff",
    },
    {
      icon: LuActivity,
      title: "Intrusion Detection",
      tag: "THREAT INTEL",
      desc: "Screenshot attempts, print-screen key presses, failed password entries, and context-menu probes are all detected and reported to the host as security breach events in real-time.",
      detail: "Uses visibilitychange, keydown, and contextmenu event listeners. Host receives timestamped alerts.",
      accent: "red",
      accentHex: "#f87171",
    },
    {
      icon: LuPin,
      title: "Pinned Intel",
      tag: "COORDINATION",
      desc: "Pin any critical message to the top of the channel. Every operative in the room sees it immediately — perfect for mission briefs, coordinates, or standing orders.",
      detail: "Pinned messages persist across reconnects and are synced to new agents via context sharing.",
      accent: "amber",
      accentHex: "#fbbf24",
    },
    {
      icon: LuMessageSquarePlus,
      title: "Polls & Reactions",
      tag: "ENGAGEMENT",
      desc: "Create encrypted polls to coordinate decisions across the team. React to messages with quick emoji responses. All votes and reactions are end-to-end encrypted.",
      detail: "Multi-select polls with live vote counts. Reactions are deduplicated per user per message.",
      accent: "green",
      accentHex: "#4ade80",
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    const sticky  = stickyRef.current;
    if (!section || !sticky) return;

    const cards = Array.from(sticky.querySelectorAll(".feat-card"));
    const dots  = Array.from(sticky.querySelectorAll(".feat-dot"));
    const total = cards.length;

    // All cards start hidden except first
    gsap.set(cards, { opacity: 0, scale: 0.88, y: 60, rotateX: 8 });
    gsap.set(cards[0], { opacity: 1, scale: 1, y: 0, rotateX: 0 });
    gsap.set(dots[0], { backgroundColor: "#ffffff", scale: 1.4 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          // each card transition costs 100vh of scroll
          end: () => `+=${(total - 1) * window.innerHeight}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          snap: {
            snapTo: 1 / (total - 1),
            duration: { min: 0.3, max: 0.6 },
            ease: "power2.inOut",
          },
        },
      });

      for (let i = 0; i < total - 1; i++) {
        const curr = cards[i];
        const next = cards[i + 1];
        const currDot = dots[i];
        const nextDot = dots[i + 1];

        // Exit current card: scale down, fade, slide up
        tl.to(curr, {
          opacity: 0,
          scale: 0.82,
          y: -80,
          rotateX: -10,
          duration: 0.5,
          ease: "power2.in",
        }, i);

        // Enter next card: scale up from below
        tl.fromTo(next,
          { opacity: 0, scale: 0.88, y: 80, rotateX: 10 },
          { opacity: 1, scale: 1,    y: 0,  rotateX: 0, duration: 0.5, ease: "power2.out" },
          i + 0.4
        );

        // Dot indicators
        tl.to(currDot, { backgroundColor: "#3f3f46", scale: 1, duration: 0.3 }, i);
        tl.to(nextDot, { backgroundColor: "#ffffff", scale: 1.4, duration: 0.3 }, i + 0.4);

        // Counter number
        if (counterRef.current) {
          tl.to(counterRef.current, {
            innerHTML: `0${i + 2}`,
            duration: 0.1,
            ease: "none",
            snap: { innerHTML: 1 },
          }, i + 0.4);
        }
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative h-screen overflow-hidden bg-[#09090b]"
    >
      <GridBg opacity={0.018} />

      {/* Sticky viewport — fills the screen */}
      <div
        ref={stickyRef}
        className="relative w-full h-full flex flex-col items-center justify-center px-5 sm:px-10"
        style={{ perspective: "1200px" }}
      >
        {/* Section label */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-500 text-xs font-mono tracking-widest z-20">
          <LuZap className="w-3 h-3" /> CAPABILITIES
        </div>

        {/* Card counter top-right */}
        <div className="absolute top-8 right-6 sm:right-10 flex items-center gap-2 z-20">
          <span ref={counterRef} className="text-white font-mono font-black text-lg tabular-nums">01</span>
          <span className="text-zinc-700 font-mono text-lg">/</span>
          <span className="text-zinc-700 font-mono text-lg">0{features.length}</span>
        </div>

        {/* Cards — stacked absolutely on top of each other */}
        <div className="relative w-full max-w-4xl" style={{ transformStyle: "preserve-3d" }}>
          {features.map((f, i) => {
            // All cards use card-6 (white/zinc) color scheme
            const CARD_BORDER   = "border-zinc-700/40 bg-zinc-900/20";
            const CARD_ACCENT   = "#ffffff";
            const ICON_COLOR    = "text-white";

            return (
              <div
                key={f.title}
                className="feat-card absolute inset-0 w-full"
                style={{ position: i === 0 ? "relative" : "absolute", top: 0, left: 0 }}
              >
                <div className={`relative rounded-3xl border ${CARD_BORDER} backdrop-blur-sm overflow-hidden`}
                  style={{ boxShadow: `0 0 80px rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.04)` }}
                >
                  {/* Top accent bar */}
                  <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)` }} />

                  <div className="p-8 sm:p-12 lg:p-16">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">

                      {/* Left — icon + tag + title */}
                      <div className="lg:w-2/5 shrink-0">
                        {/* Tag */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700/40 bg-zinc-800/30 text-zinc-400 mb-6">
                          <span className="text-[10px] font-mono tracking-[0.2em]">{f.tag}</span>
                        </div>

                        {/* Icon */}
                        <div className="mb-6 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border border-zinc-700/40 bg-zinc-800/30">
                          <f.icon className={`w-8 h-8 sm:w-10 sm:h-10 ${ICON_COLOR}`} />
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight mb-4">
                          {f.title}
                        </h2>

                        {/* Index */}
                        <div className="font-mono text-zinc-700 text-sm tracking-widest">
                          {String(i + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}
                        </div>
                      </div>

                      {/* Right — description + detail */}
                      <div className="lg:w-3/5 flex flex-col justify-center">
                        <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed mb-6">
                          {f.desc}
                        </p>
                        <div className="p-4 sm:p-5 rounded-xl border border-zinc-800/60 bg-zinc-950/60">
                          <div className="text-[10px] font-mono tracking-widest mb-2 text-zinc-500">
                            TECHNICAL NOTE
                          </div>
                          <p className="text-zinc-500 text-sm leading-relaxed">{f.detail}</p>
                        </div>

                        {/* Scroll hint */}
                        {i < features.length - 1 && (
                          <div className="mt-8 flex items-center gap-3 text-zinc-700">
                            <motion.div
                              animate={{ y: [0, 5, 0] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <LuChevronDown className="w-4 h-4" />
                            </motion.div>
                            <span className="text-xs font-mono tracking-widest">SCROLL FOR NEXT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot progress indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {features.map((_, i) => (
            <div
              key={i}
              className="feat-dot rounded-full transition-all"
              style={{ width: 6, height: 6, backgroundColor: i === 0 ? "#ffffff" : "#3f3f46" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── STATS ─── */
function Stats() {
  const sectionRef = useRef(null);
  useGsapReveal(sectionRef);

  const stats = [
    { value: 256, suffix: "-bit", label: "AES Encryption" },
    { value: 50, suffix: "k+", label: "Max Rooms" },
    { value: 24, suffix: "h", label: "Auto-Purge" },
    { value: 0, suffix: "", label: "Logs Stored" },
  ];

  return (
    <section ref={sectionRef} className="relative py-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div
          data-gsap="scale"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 p-6 sm:p-8 lg:p-10 rounded-2xl border border-zinc-800/60 bg-zinc-950/70 backdrop-blur-sm"
        >
          {stats.map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-mono tracking-tight mb-1">
                <Counter to={value} suffix={suffix} />
              </div>
              <div className="text-zinc-600 text-xs tracking-widest uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS — ZOOM INTRO ─── */
function HowItWorksIntro() {
  const sectionRef = useRef(null);
  const line1Ref   = useRef(null);
  const secureRef  = useRef(null);
  const overlayRef = useRef(null);
  const restRef    = useRef(null);
  const oneRef     = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const line1   = line1Ref.current;
    const secure  = secureRef.current;
    const overlay = overlayRef.current;
    const rest    = restRef.current;
    const one     = oneRef.current;
    if (!section || !secure || !overlay) return;

    // Set initial CSS variable — zinc-700 rgb values
    section.style.setProperty("--secure-color", "63, 63, 70");

    // Helper: lerp between two 0-255 channel values
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);

    // zinc-700 = rgb(63,63,70)  →  white = rgb(255,255,255)
    const FROM = [63, 63, 70];
    const TO   = [255, 255, 255];

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=250%",
          pin: true,
          pinSpacing: true,
          scrub: 1.4,
          anticipatePin: 1,
          // onUpdate fires on every scroll tick with raw progress (no scrub lag)
          // We use it to drive the CSS variable directly from scroll position
          onUpdate: (self) => {
            // Color change happens between progress 0.15 → 0.65
            const raw = self.progress;
            const t = Math.max(0, Math.min(1, (raw - 0.15) / 0.5));
            const r = lerp(FROM[0], TO[0], t);
            const g = lerp(FROM[1], TO[1], t);
            const b = lerp(FROM[2], TO[2], t);
            section.style.setProperty("--secure-color", `${r}, ${g}, ${b}`);
          },
        },
      });

      // Phase 1 (0→0.2): other text fades out
      tl.to([line1, one, rest], {
        opacity: 0, y: -30, duration: 0.2, ease: "power2.in", stagger: 0.04,
      }, 0);

      // Phase 2 (0.15→0.75): "secure" scales up — color handled by onUpdate above
      tl.fromTo(secure,
        { scale: 1 },
        { scale: 22, duration: 0.6, ease: "power2.inOut", transformOrigin: "center center" },
        0.15
      );

      // Phase 2 (0.25→0.75): white overlay floods in
      tl.fromTo(overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power1.inOut" },
        0.25
      );

      // Phase 3 (0.7→0.85): "secure" fades out — already white, dissolves
      tl.to(secure, { opacity: 0, duration: 0.15, ease: "power1.in" }, 0.7);

    }, section);

    return () => {
      ctx.revert();
      section.style.removeProperty("--secure-color");
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen flex items-center justify-center bg-[#09090b]"
      style={{ overflow: "clip" }}   /* clip not hidden — allows transform overflow */
    >
      <GridBg opacity={0.015} />

      {/* white flood overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ backgroundColor: "#ffffff", opacity: 0 }}
      />

      <div className="relative z-20 text-center px-5 select-none">
        {/* "Two roles." */}
        <div
          ref={line1Ref}
          className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-white leading-none mb-2"
        >
          Two roles.
        </div>

        {/* "One [secure] channel." */}
        <div className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-none flex items-baseline justify-center gap-[0.18em] flex-wrap">
          <span ref={oneRef} className="text-zinc-700">One</span>

          {/* ZOOM WORD — color driven by CSS variable updated on every scroll tick */}
          <span
            ref={secureRef}
            className="inline-block will-change-transform"
            style={{ transformOrigin: "center center", color: "rgb(var(--secure-color))" }}
          >
            secure
          </span>

          <span ref={restRef} className="text-zinc-700">channel.</span>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-2 text-zinc-700"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[10px] font-mono tracking-[0.3em]">SCROLL</span>
          <LuChevronDown className="w-4 h-4" />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const sectionRef = useRef(null);
  useGsapReveal(sectionRef);

  const hostSteps = [
    {
      number: 1,
      icon: LuCrown,
      title: "Choose a Codename",
      desc: "Pick your operative alias. No real names, no accounts — just a handle that identifies you in the channel.",
    },
    {
      number: 2,
      icon: LuRadio,
      title: "Create a Frequency",
      desc: "Name your room and set an encryption key (6–64 chars). This key encrypts every message — share it only with trusted agents.",
    },
    {
      number: 3,
      icon: LuLink,
      title: "Share the Invite",
      desc: "Copy the auto-generated Magic Link or the Room ID + key separately. Send via your own secure channel.",
    },
    {
      number: 4,
      icon: LuShieldCheck,
      title: "Command the Room",
      desc: "Approve join requests, lock the frequency, silence agents, pin intel, and terminate the room when the mission is complete.",
    },
  ];
  const agentSteps = [
    {
      number: 1,
      icon: LuHash,
      title: "Receive Credentials",
      desc: "Get the Room ID and encryption key from your host, or click a Magic Link to auto-fill everything.",
    },
    {
      number: 2,
      icon: LuScanLine,
      title: "Enter Your Codename",
      desc: "Choose your operative alias and enter the room credentials. The host may require approval before you're admitted.",
    },
    {
      number: 3,
      icon: LuKeyRound,
      title: "Messages Auto-Decrypt",
      desc: "All messages decrypt instantly in your browser using the shared key. Nothing is stored in plaintext anywhere.",
    },
    {
      number: 4,
      icon: LuEye,
      title: "Access High-Clearance Intel",
      desc: "Biometric-locked messages require your fingerprint or face scan to reveal. Auto-locks after 10 seconds.",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-20 sm:py-28 lg:py-40 overflow-hidden"
    >
      <Divider />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Mini header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div data-gsap="up" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-500 text-xs font-mono mb-5 sm:mb-7">
            <LuScanLine className="w-3 h-3" /> PROTOCOL
          </div>
          <p data-gsap="up" className="text-zinc-500 max-w-lg mx-auto text-base leading-relaxed">
            Whether you're commanding the frequency or joining as a field operative, the protocol is simple.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* HOST */}
          <div>
            <div
              data-gsap="left"
              className="flex items-center gap-3 mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-zinc-200"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <LuCrown className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-zinc-900 font-bold tracking-tight">HOST</div>
                <div className="text-zinc-400 text-xs font-mono tracking-widest">FREQUENCY COMMANDER</div>
              </div>
            </div>
            <div data-gsap="stagger-left">
              {hostSteps.map((s, i) => (
                <div key={s.number} className="flex gap-5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full border border-zinc-300 bg-zinc-100 flex items-center justify-center text-zinc-900 font-mono text-sm font-bold group-hover:border-zinc-500 transition-colors duration-300">
                      {s.number}
                    </div>
                    {i < hostSteps.length - 1 && (
                      <div data-gsap="line" className="w-px flex-1 bg-gradient-to-b from-zinc-300 to-transparent mt-2 min-h-[40px]" />
                    )}
                  </div>
                  <div className={i < hostSteps.length - 1 ? "pb-10" : "pb-0"}>
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <s.icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors duration-300" />
                      <h3 className="text-zinc-900 font-semibold tracking-tight">{s.title}</h3>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AGENT */}
          <div>
            <div
              data-gsap="right"
              className="flex items-center gap-3 mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-zinc-200"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-300 flex items-center justify-center">
                <LuUsers className="w-4 h-4 text-zinc-700" />
              </div>
              <div>
                <div className="text-zinc-900 font-bold tracking-tight">AGENT</div>
                <div className="text-zinc-400 text-xs font-mono tracking-widest">FIELD OPERATIVE</div>
              </div>
            </div>
            <div data-gsap="stagger-right">
              {agentSteps.map((s, i) => (
                <div key={s.number} className="flex gap-5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full border border-zinc-300 bg-zinc-100 flex items-center justify-center text-zinc-900 font-mono text-sm font-bold group-hover:border-zinc-500 transition-colors duration-300">
                      {s.number}
                    </div>
                    {i < agentSteps.length - 1 && (
                      <div data-gsap="line" className="w-px flex-1 bg-gradient-to-b from-zinc-300 to-transparent mt-2 min-h-[40px]" />
                    )}
                  </div>
                  <div className={i < agentSteps.length - 1 ? "pb-10" : "pb-0"}>
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <s.icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors duration-300" />
                      <h3 className="text-zinc-900 font-semibold tracking-tight">{s.title}</h3>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── SECURITY ─── */
function Security() {
  const sectionRef = useRef(null);
  useGsapReveal(sectionRef);

  const items = [
    {
      icon: LuShieldCheck,
      label:
        "Client-side AES-256 encryption before any data leaves your device",
    },
    {
      icon: LuEyeOff,
      label:
        "Server stores zero plaintext — only encrypted blobs transit the wire",
    },
    {
      icon: LuFingerprint,
      label:
        "WebAuthn biometric authentication for high-clearance message access",
    },
    {
      icon: LuTriangleAlert,
      label:
        "Screenshot detection triggers instant security breach alert to host",
    },
    {
      icon: LuTimer,
      label:
        "Self-destructing messages with synchronized countdown across all clients",
    },
    {
      icon: LuGlobe,
      label:
        "Rooms auto-purge after 24 hours — no persistent data, no audit trail",
    },
    {
      icon: LuShieldAlert,
      label:
        "Failed password attempts logged and reported to host as intrusion events",
    },
    {
      icon: LuKeyRound,
      label:
        "Encryption key never transmitted — only used locally for crypto operations",
    },
  ];

  return (
    <section
      id="security"
      ref={sectionRef}
      className="relative py-20 sm:py-28 lg:py-40 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — sticky only on desktop */}
          <div className="lg:sticky lg:top-28">
            <div
              data-gsap="left"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-500 text-xs font-mono mb-5 sm:mb-7"
            >
              <LuShieldCheck className="w-3 h-3" /> SECURITY MODEL
            </div>
            <h2
              data-gsap="left"
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-zinc-900 tracking-tighter mb-6 leading-tight"
            >
              Zero trust.
              <br />
              <span className="text-zinc-400">Zero trace.</span>
            </h2>
            <p
              data-gsap="left"
              className="text-zinc-500 leading-relaxed mb-10 text-base"
            >
              Ghost Tunnel was designed with a paranoid security model. We
              assume the server is compromised. That's why encryption happens
              entirely in your browser before a single byte leaves your device.
            </p>
            <div
              data-gsap="scale"
              className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50 font-mono text-xs text-zinc-600 leading-relaxed"
            >
              <div className="text-zinc-400 mb-3 text-[11px] tracking-widest">
                // ENCRYPTION FLOW
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-blue-600">const</span> cipher ={" "}
                  <span className="text-green-600">AES.encrypt</span>(message, key);
                </div>
                <div>
                  <span className="text-blue-600">socket</span>.
                  <span className="text-amber-600">emit</span>(
                  <span className="text-red-500">"send_message"</span>, cipher);
                </div>
                <div className="text-zinc-400 mt-3">// server only ever sees:</div>
                <div className="text-zinc-300 tracking-widest">★★★★★★★★★★★★★★★★★★★★</div>
              </div>
            </div>
          </div>

          {/* Right — checklist */}
          <div data-gsap="stagger-right" className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 transition-all duration-300 group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-zinc-500 transition-colors">
                  <item.icon className="w-3.5 h-3.5 text-zinc-100" />
                </div>
                <span className="text-zinc-600 text-sm leading-relaxed group-hover:text-zinc-900 transition-colors">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── BIOMETRIC SHOWCASE ─── */
function BiometricShowcase() {
  const sectionRef = useRef(null);
  useGsapReveal(sectionRef);

  const DEMO_USER  = "landing_demo";
  const DEMO_ROOM  = "landing_showcase";

  const [capabilities, setCapabilities] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [phase, setPhase]     = useState("idle");   // idle | registering | authenticating | verified | locked | unsupported
  const [error, setError]     = useState("");
  const [countdown, setCountdown] = useState(10);

  // Load capabilities on mount
  useEffect(() => {
    import("../utils/webauthn").then(({ getBiometricCapabilities, hasBiometricCredential }) => {
      getBiometricCapabilities().then(caps => {
        setCapabilities(caps);
        if (!caps.supported || !caps.available) setPhase("unsupported");
      });
      setHasCredential(hasBiometricCredential(DEMO_USER, DEMO_ROOM));
    });
  }, []);

  // Auto-lock countdown after verified
  useEffect(() => {
    if (phase !== "verified") return;
    if (countdown <= 0) { setPhase("locked"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handleRegister = async () => {
    setError("");
    setPhase("registering");
    try {
      const { registerBiometric } = await import("../utils/webauthn");
      await registerBiometric(DEMO_USER, DEMO_ROOM);
      setHasCredential(true);
      setPhase("idle");
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

  const handleAuthenticate = async () => {
    setError("");
    setPhase("authenticating");
    try {
      const { authenticateBiometric } = await import("../utils/webauthn");
      const ok = await authenticateBiometric(DEMO_USER, DEMO_ROOM);
      if (ok) {
        setPhase("verified");
        setCountdown(10);
      }
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  };

  const reset = () => { setPhase("idle"); setError(""); setCountdown(10); };

  const rings = [1, 1.5, 2];

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28 lg:py-36 overflow-hidden bg-[#09090b]">
      <GridBg opacity={0.018} />
      {/* Ambient glow behind the widget */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] bg-white/[0.02]" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Left: copy ── */}
          <div>
            <div data-gsap="left" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700/60 bg-zinc-900/60 text-zinc-300 text-xs font-mono mb-7 tracking-widest">
              <LuFingerprint className="w-3 h-3" /> BIOMETRIC VAULT
            </div>
            <h2 data-gsap="left" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-6 leading-tight">
              Hardware-level<br />
              <span className="text-zinc-600">security. Live.</span>
            </h2>
            <p data-gsap="left" className="text-zinc-400 text-base leading-relaxed mb-8">
              High-clearance messages are locked behind your device's secure enclave — Touch ID, Face ID, or Windows Hello. No password. No bypass. The biometric key never leaves your hardware.
            </p>

            {/* Feature list */}
            <div data-gsap="stagger-left" className="space-y-3">
              {[
                { icon: LuFingerprint, text: "WebAuthn — credentials stored in device secure enclave" },
                { icon: LuLock,        text: "Auto-locks after 10 seconds — no persistent access" },
                { icon: LuEyeOff,      text: "Zero biometric data transmitted to any server" },
                { icon: LuShieldCheck, text: "Works with Face ID, Touch ID, Windows Hello" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-zinc-400 text-sm leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: live demo widget ── */}
          <div data-gsap="scale">
            <div className="relative rounded-3xl border border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="text-zinc-600 text-[10px] font-mono tracking-widest">BIOMETRIC VAULT — DEMO</span>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                  <span className="text-white text-[10px] font-mono">LIVE</span>
                </div>
              </div>

              {/* Widget body */}
              <div className="p-8 flex flex-col items-center text-center min-h-[340px] justify-center">

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full mb-4 px-4 py-3 rounded-xl border border-red-800/40 bg-red-950/30 text-red-300 text-xs font-mono text-left flex items-start gap-2"
                  >
                    <LuTriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}

                {/* UNSUPPORTED */}
                {phase === "unsupported" && (
                  <motion.div key="unsupported" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                      <LuTriangleAlert className="w-7 h-7 text-zinc-500" />
                    </div>
                    <p className="text-zinc-400 text-sm font-semibold mb-2">Not available on this device</p>
                    <p className="text-zinc-600 text-xs max-w-xs">
                      Try on a device with Face ID, Touch ID, Windows Hello, or Android biometrics.
                    </p>
                  </motion.div>
                )}

                {/* IDLE — no credential yet: show setup */}
                {phase === "idle" && !hasCredential && capabilities?.available && (
                  <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                    <div className="relative mb-8">
                      {rings.map((s, i) => (
                        <motion.div key={i} animate={{ scale: [1, s, 1], opacity: [0.2, 0, 0.2] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
                          className="absolute inset-0 rounded-full border border-white/15" />
                      ))}
                      <div className="relative w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700/60 flex items-center justify-center">
                        <LuFingerprint className="w-9 h-9 text-white" />
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-6 max-w-xs">
                      Set up {capabilities?.type ?? "biometric"} to lock and unlock high-clearance messages.
                    </p>
                    <button onClick={handleRegister}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95">
                      <LuFingerprint className="w-4 h-4" />
                      SET UP {(capabilities?.type ?? "BIOMETRIC").toUpperCase()}
                    </button>
                  </motion.div>
                )}

                {/* IDLE — credential exists: show locked message */}
                {phase === "idle" && hasCredential && (
                  <motion.div key="locked-idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                    <div className="relative mb-8">
                      {rings.map((s, i) => (
                        <motion.div key={i} animate={{ scale: [1, s, 1], opacity: [0.2, 0, 0.2] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
                          className="absolute inset-0 rounded-full border border-white/15" />
                      ))}
                      <div className="relative w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700/60 flex items-center justify-center">
                        <LuFingerprint className="w-9 h-9 text-white" />
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-500 text-[10px] font-mono tracking-widest mb-4">
                      <LuLock className="w-3 h-3" /> HIGH-CLEARANCE MESSAGE LOCKED
                    </div>
                    <p className="text-zinc-500 text-sm mb-6 max-w-xs">
                      Authenticate with {capabilities?.type ?? "biometrics"} to reveal the classified message.
                    </p>
                    <button onClick={handleAuthenticate}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95">
                      <LuEye className="w-4 h-4" />
                      UNLOCK WITH {(capabilities?.type ?? "BIOMETRIC").toUpperCase()}
                    </button>
                  </motion.div>
                )}

                {/* REGISTERING */}
                {phase === "registering" && (
                  <motion.div key="registering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="relative mb-6">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute rounded-full border-2 border-transparent border-t-white"
                        style={{ width: 88, height: 88, top: -4, left: -4 }} />
                      <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700/60 flex items-center justify-center">
                        <LuFingerprint className="w-9 h-9 text-white" />
                      </div>
                    </div>
                    <p className="text-white text-sm font-mono tracking-widest">SETTING UP...</p>
                    <p className="text-zinc-600 text-xs mt-2">Follow your device's prompt</p>
                  </motion.div>
                )}

                {/* AUTHENTICATING */}
                {phase === "authenticating" && (
                  <motion.div key="authenticating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="relative mb-6">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute rounded-full border-2 border-transparent border-t-white"
                        style={{ width: 88, height: 88, top: -4, left: -4 }} />
                      <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700/60 flex items-center justify-center">
                        <LuFingerprint className="w-9 h-9 text-white" />
                      </div>
                    </div>
                    <p className="text-white text-sm font-mono tracking-widest">AUTHENTICATING...</p>
                    <p className="text-zinc-600 text-xs mt-2">Use {capabilities?.type ?? "biometrics"} on your device</p>
                  </motion.div>
                )}

                {/* VERIFIED */}
                {phase === "verified" && (
                  <motion.div key="verified" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: FM_EASE }} className="flex flex-col items-center w-full">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-5">
                      <LuShieldCheck className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="text-white text-xs font-mono tracking-widest mb-4">IDENTITY VERIFIED</div>
                    <div className="w-full rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-4 mb-4 text-left">
                      <div className="text-[10px] font-mono text-zinc-600 mb-2 tracking-widest">CLASSIFIED — HIGH CLEARANCE</div>
                      <p className="text-white text-sm leading-relaxed font-mono">
                        🔓 OPERATION GHOST TUNNEL: All transmissions confirmed secure. AES-256 encryption active. No trace. Channel will self-destruct in {countdown}s.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                      <LuTimer className="w-3 h-3" />
                      Auto-locking in <span className="text-white font-bold">{countdown}s</span>
                    </div>
                  </motion.div>
                )}

                {/* LOCKED */}
                {phase === "locked" && (
                  <motion.div key="locked-final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <motion.div initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                      className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-5">
                      <LuLock className="w-7 h-7 text-zinc-400" />
                    </motion.div>
                    <p className="text-zinc-500 text-sm mb-5 font-mono tracking-wide">MESSAGE LOCKED</p>
                    <button onClick={reset}
                      className="text-zinc-500 hover:text-zinc-300 text-xs font-mono tracking-widest transition-colors border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg">
                      AUTHENTICATE AGAIN
                    </button>
                  </motion.div>
                )}

                {/* Loading capabilities */}
                {!capabilities && phase === "idle" && (
                  <div className="flex flex-col items-center gap-3 text-zinc-600">
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
                    <span className="text-xs font-mono tracking-widest">CHECKING DEVICE...</span>
                  </div>
                )}
              </div>

              {/* Bottom note */}
              <div className="px-5 py-3 border-t border-zinc-800/40 text-center">
                <span className="text-zinc-700 text-[10px] font-mono tracking-widest">
                  USES YOUR DEVICE'S REAL BIOMETRICS — FACE ID · TOUCH ID · WINDOWS HELLO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA({ onEnter }) {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);
  const title = useGlitchText("INITIATE PROTOCOL", inView);
  useGsapReveal(sectionRef);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 70%",
        onEnter: () => setInView(true),
        once: true,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="cta-section"
      className="relative py-24 sm:py-32 lg:py-40 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-zinc-100/60 blur-[100px]" />
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <div data-gsap="scale" className="flex justify-center mb-10">
          <div className="relative">
            <Logo className="w-14 h-14 text-zinc-900 relative z-10" />
            {[1, 1.6, 2.2].map((scale, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, scale, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                className="absolute inset-0 rounded-full border border-zinc-300"
              />
            ))}
          </div>
        </div>
        <h2
          data-gsap="up"
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-zinc-900 tracking-tighter mb-6 font-mono leading-none"
        >
          {title}
        </h2>
        <p
          data-gsap="up"
          className="text-zinc-500 text-base sm:text-lg mb-10 sm:mb-12 max-w-xl mx-auto leading-relaxed px-2"
        >
          No account. No signup. No trace. Open a secure frequency in seconds
          and communicate with absolute confidence.
        </p>
        <div data-gsap="up">
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-7 sm:px-10 py-4 sm:py-5 rounded-xl bg-zinc-900 text-white font-bold text-base sm:text-lg hover:bg-zinc-800 transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-zinc-300"
          >
            <LuRadio className="w-5 h-5 shrink-0" />
            OPEN SECURE CHANNEL
            <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
          </button>
          <p className="text-zinc-400 text-xs font-mono mt-8 tracking-[0.3em]">
            NO ACCOUNT · NO LOGS · NO TRACE
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer({ onEnter }) {
  return (
    <footer className="relative border-t border-zinc-200 py-14">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col items-center gap-6 sm:gap-0 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-6 h-6 text-zinc-800" />
            <span className="font-mono text-zinc-800 text-sm tracking-widest">GHOST TUNNEL</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-zinc-600 text-[10px] sm:text-xs font-mono tracking-widest">
            <span>AES-256</span><span className="text-zinc-400">·</span>
            <span>ZERO LOGS</span><span className="text-zinc-400">·</span>
            <span>OPEN SOURCE</span><span className="text-zinc-400">·</span>
            <span>NO ACCOUNTS</span>
          </div>
          <button onClick={onEnter}
            className="text-zinc-600 hover:text-zinc-900 text-sm font-mono transition-colors duration-200 flex items-center gap-2">
            LAUNCH APP <LuExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="mt-10 pt-6 border-t border-zinc-100 text-center text-zinc-400 text-[10px] sm:text-xs font-mono tracking-widest leading-relaxed">
          GHOST TUNNEL — CLASSIFIED COMMUNICATIONS PLATFORM<br className="sm:hidden" /> · ALL TRANSMISSIONS ENCRYPTED
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] sm:text-xs">
            <a href="/terms" className="hover:text-zinc-600 transition-colors">Terms of Use</a>
            <span className="text-zinc-300">·</span>
            <a href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── SCROLL PROGRESS BAR — edge-flush, color-adaptive ─── */
function ScrollProgressBar() {
  const sections = [
    { id: "features",     label: "CAPABILITIES" },
    { id: "how-it-works", label: "PROTOCOL"     },
    { id: "security",     label: "SECURITY"     },
    { id: "cta-section",  label: "INITIATE"     },
  ];

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });
  const fillHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const [markers, setMarkers]         = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [rawProgress, setRawProgress] = useState(0);
  const [hovered, setHovered]         = useState(false);
  // Scroll fraction where white bg starts (HowItWorksIntro section)
  const [whitePct, setWhitePct]       = useState(0.99);

  useEffect(() => {
    const calc = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;

      // Section markers
      setMarkers(
        sections.map(({ id, label }) => {
          const el = document.getElementById(id);
          if (!el) return null;
          return { id, label, pct: (el.getBoundingClientRect().top + window.scrollY) / total };
        }).filter(Boolean)
      );

      // White section starts at HowItWorksIntro — find it by the how-it-works section
      // The intro is just before how-it-works, so use that as the threshold
      const introEl = document.getElementById("how-it-works");
      if (introEl) {
        // White starts ~1 viewport before how-it-works (the zoom intro takes ~250vh)
        const introTop = introEl.getBoundingClientRect().top + window.scrollY;
        setWhitePct(Math.max(0, (introTop - window.innerHeight * 2.5) / total));
      }
    };
    const t = setTimeout(calc, 400);
    window.addEventListener("resize", calc);
    return () => { clearTimeout(t); window.removeEventListener("resize", calc); };
  }, []);

  useEffect(() => scrollYProgress.on("change", (v) => {
    setRawProgress(v);
    const active = [...markers].reverse().find(s => v >= s.pct - 0.01);
    setActiveId(active?.id ?? null);
  }), [scrollYProgress, markers]);

  // Derive whether we're in the white zone
  const isWhite = rawProgress >= whitePct;

  // Colors — smooth CSS transition handles the crossfade
  const trackColor    = isWhite ? "rgba(0,0,0,0.12)"  : "rgba(255,255,255,0.08)";
  const fillColor     = isWhite ? "#000000"            : "#ffffff";
  const tickColor     = isWhite ? "rgba(0,0,0,0.9)"   : "rgba(255,255,255,0.9)";
  const tickDim       = isWhite ? "rgba(0,0,0,0.25)"  : "rgba(255,255,255,0.25)";
  const labelActive   = isWhite ? "rgba(0,0,0,0.85)"  : "rgba(255,255,255,0.9)";
  const labelInactive = isWhite ? "rgba(0,0,0,0.3)"   : "rgba(255,255,255,0.3)";
  const pctColor      = isWhite ? "rgba(0,0,0,0.4)"   : "rgba(255,255,255,0.4)";

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (globalLenis) globalLenis.scrollTo(el, { offset: -80, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  const colorTransition = "background 0.5s ease, color 0.5s ease";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 2.5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden lg:block fixed right-0 top-0 bottom-0 z-50 select-none"
      style={{ width: 3 }}
    >
      {/* Track */}
      <div
        className="absolute inset-0"
        style={{ background: trackColor, transition: colorTransition }}
      />

      {/* Glow layer — blurred copy of fill, slightly wider, sits behind */}
      <motion.div
        className="absolute top-0 origin-top pointer-events-none"
        style={{
          height: fillHeight,
          width: 9,
          right: -3,
          background: fillColor,
          filter: "blur(5px)",
          opacity: isWhite ? 0.35 : 0.55,
          transition: colorTransition,
        }}
      />

      {/* Fill — solid bar on top of glow */}
      <motion.div
        className="absolute top-0 left-0 right-0 origin-top"
        style={{
          height: fillHeight,
          background: fillColor,
          transition: colorTransition,
        }}
      />

      {/* Section tick markers */}
      {markers.map(({ id, label, pct }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="absolute right-0"
            style={{ top: `${pct * 100}%`, transform: "translateY(-50%)" }}
          >
            {/* Tick */}
            <div
              className="absolute right-0 rounded-l-full"
              style={{
                width: isActive ? 10 : 5,
                height: 1.5,
                top: "50%",
                transform: "translateY(-50%)",
                background: isActive ? tickColor : tickDim,
                transition: `width 0.25s ease, ${colorTransition}`,
              }}
            />

            {/* Label on hover */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none"
                >
                  <span
                    className="whitespace-nowrap text-[9px] font-mono tracking-[0.18em]"
                    style={{ color: isActive ? labelActive : labelInactive, transition: colorTransition }}
                  >
                    {label}
                  </span>
                  <div
                    className="rounded-full"
                    style={{
                      width: isActive ? 4 : 3,
                      height: isActive ? 4 : 3,
                      background: isActive ? tickColor : tickDim,
                      transition: colorTransition,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        );
      })}

      {/* Percentage — follows scroll position on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute right-5 pointer-events-none tabular-nums"
            style={{ top: `${rawProgress * 100}%`, transform: "translateY(-50%)" }}
          >
            <span
              className="text-[9px] font-mono tracking-widest"
              style={{ color: pctColor, transition: colorTransition }}
            >
              {Math.round(rawProgress * 100)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── ROOT ─── */
export default function LandingPage({ onEnter }) {
  useEffect(() => {
    /* Hide browser scrollbar but keep scrollability */
    const style = document.createElement("style");
    style.id = "gt-hide-scrollbar";
    style.textContent = `
      html { scrollbar-width: none !important; }
      html::-webkit-scrollbar { display: none !important; width: 0 !important; }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("gt-hide-scrollbar")?.remove();
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.5,
    });
    globalLenis = lenis;

    /* Bridge Lenis → GSAP ScrollTrigger */
    lenis.on("scroll", ScrollTrigger.update);

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    gsap.ticker.lagSmoothing(0);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      globalLenis = null;
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="bg-[#09090b] text-white min-h-screen overflow-x-hidden">
      <ScrollProgressBar />
      <Navbar onEnter={onEnter} />
      <Hero onEnter={onEnter} />
      <MarqueeStrip />
      <Features />
      <Stats />
      <BiometricShowcase />
      <HowItWorksIntro />
      {/* white background starts here — continues from the zoom overlay */}
      <div className="bg-white">
        <HowItWorks />
        <Security />
        <MarqueeStrip light />
        <CTA onEnter={onEnter} />
        <Footer onEnter={onEnter} />
      </div>
    </div>
  );
}