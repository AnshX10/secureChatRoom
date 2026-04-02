import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";

export default function LegalScrollProgressBar({ containerId }) {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });
  const fillHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const [markers, setMarkers] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rawProgress, setRawProgress] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "legal-hide-scrollbar";
    style.textContent = `
      html { scrollbar-width: none !important; }
      html::-webkit-scrollbar { display: none !important; width: 0 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById("legal-hide-scrollbar")?.remove();
    };
  }, []);

  useEffect(() => {
    const calcMarkers = () => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const sections = Array.from(container.querySelectorAll("section"));
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (!sections.length || total <= 0) return;

      const nextMarkers = sections.map((section, index) => {
        const heading = section.querySelector("h2");
        const top = section.getBoundingClientRect().top + window.scrollY;
        return {
          index,
          label: (heading?.textContent || `SECTION ${index + 1}`).toUpperCase(),
          pct: top / total,
          section,
        };
      });

      setMarkers(nextMarkers);
    };

    const t = setTimeout(calcMarkers, 200);
    window.addEventListener("resize", calcMarkers);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calcMarkers);
    };
  }, [containerId]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setRawProgress(v);
      const idx = [...markers].reverse().find((m) => v >= m.pct - 0.01)?.index ?? 0;
      setActiveIndex(idx);
    });

    return () => unsubscribe();
  }, [scrollYProgress, markers]);

  const scrollToSection = (section) => {
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - 80, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden lg:block fixed right-0 top-0 bottom-0 z-50 select-none"
      style={{ width: 3 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.08)" }} />

      <motion.div
        className="absolute top-0 origin-top pointer-events-none"
        style={{
          height: fillHeight,
          width: 9,
          right: -3,
          background: "#ffffff",
          filter: "blur(5px)",
          opacity: 0.55,
        }}
      />

      <motion.div
        className="absolute top-0 left-0 right-0 origin-top"
        style={{
          height: fillHeight,
          background: "#ffffff",
        }}
      />

      {markers.map((marker) => {
        const isActive = activeIndex === marker.index;
        return (
          <button
            key={`${marker.index}-${marker.label}`}
            onClick={() => scrollToSection(marker.section)}
            className="absolute right-0"
            style={{ top: `${marker.pct * 100}%`, transform: "translateY(-50%)" }}
          >
            <div
              className="absolute right-0 rounded-l-full"
              style={{
                width: isActive ? 10 : 5,
                height: 1.5,
                top: "50%",
                transform: "translateY(-50%)",
                background: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                transition: "width 0.25s ease",
              }}
            />

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
                    style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
                  >
                    {marker.label}
                  </span>
                  <div
                    className="rounded-full"
                    style={{
                      width: isActive ? 4 : 3,
                      height: isActive ? 4 : 3,
                      background: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        );
      })}

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
            <span className="text-[9px] font-mono tracking-widest text-white/40">
              {Math.round(rawProgress * 100)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
