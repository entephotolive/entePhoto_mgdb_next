"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* FLOATING IMAGES */
const floatingPhotos = [
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
    x: -180,
    y: -100,
    rotate: -12,
  },
  {
    src: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=400",
    x: 160,
    y: -80,
    rotate: 10,
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400",
    x: -150,
    y: 140,
    rotate: 8,
  },
  {
    src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400",
    x: 170,
    y: 130,
    rotate: -8,
  },
];

const incomingPhotos = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
];

const resultPhotos = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
];

export default function SmartFilter() {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.5, once: false });

  const [stage, setStage] = useState<
    "idle" | "scanning" | "loading" | "success" | "done"
  >("idle");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    if (isInView) {
      setStage("idle");

      setTimeout(() => {
        setStage("scanning");

        t1 = setTimeout(() => setStage("loading"), 1300);
        t2 = setTimeout(() => setStage("success"), 3600);
        t3 = setTimeout(() => setStage("done"), 4200);
      }, 100);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isInView]);

  return (
    <section
      ref={ref}
      className="py-20 md:py-24 bg-[#f3eee7] relative overflow-x-hidden"
    >
      {/* subtle bg */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.05))]" />

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* LEFT */}
        <div>
          {/* TAG */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
          >
            <div className="inline-block px-4 py-1 mb-6 rounded-full bg-[#ede5dc] text-[#8b5e3c] text-xs font-medium">
              Smart Filter
            </div>
          </motion.div>

          {/* HEADING */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="text-[34px] sm:text-[48px] md:text-[60px] leading-[1.05] font-bold text-[#1f2937]"
          >
            Find Your Photos
            <span className="block text-[#8b5e3c] font-extrabold">
              Instantly
            </span>
          </motion.h1>

          {/* PARAGRAPH */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="mt-6 text-sm md:text-base text-[#6b7280] max-w-md"
          >
            Your photos appear the moment you need them. No searching, no
            clutter — just your moments.
          </motion.p>

          {/* FEATURES */}
          <div className="mt-10 space-y-6 max-w-md">
            {[
              {
                title: "Instant results",
                desc: "Photos surface instantly with zero effort.",
              },
              {
                title: "Only your photos",
                desc: "AI filters out everything unrelated.",
              },
              {
                title: "Private by design",
                desc: "Your data stays secure and fully yours.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.15 }}
                className="flex gap-4"
              >
                <div className="w-[2px] bg-[#8b5e3c]" />
                <div>
                  <h4 className="text-base md:text-[17px] font-bold text-[#1f2937]">
                    {item.title}
                  </h4>
                  <p className="text-sm text-[#6b7280] mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative flex justify-center items-center">
          {/* glow */}
          <div className="absolute w-[220px] sm:w-[280px] md:w-[340px] h-[220px] sm:h-[280px] md:h-[340px] bg-[#8b5e3c]/10 blur-[100px] rounded-full" />

          {/* FLOATING IMAGES */}
          {floatingPhotos.map((p, i) => (
            <motion.img
              key={i}
              src={p.src}
              className="absolute w-24 sm:w-28 md:w-32 h-32 sm:h-36 md:h-40 object-cover rounded-xl shadow-xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isInView
                  ? {
                      opacity: 1,
                      x: isMobile ? 0 : p.x,
                      y: isMobile ? 0 : p.y,
                      rotate: isMobile ? 0 : p.rotate,
                    }
                  : {}
              }
              transition={{ delay: i * 0.2 }}
            />
          ))}

          {/* PHONE */}
          <div className="relative w-[200px] sm:w-[220px] md:w-[230px] h-[420px] sm:h-[440px] md:h-[460px] bg-black rounded-[40px] border-[6px] border-black shadow-xl overflow-hidden">
            <div className="w-full h-full bg-white flex items-center justify-center relative overflow-hidden">
              {/* SCANNING */}
              <AnimatePresence>
                {stage === "scanning" &&
                  incomingPhotos.map((img, i) => (
                    <motion.img
                      key={i}
                      src={img}
                      className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover"
                      initial={{ x: i % 2 === 0 ? -200 : 200, opacity: 0 }}
                      animate={{ x: 0, scale: 0.5, opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  ))}
              </AnimatePresence>

              {/* LOADING */}
              {stage === "loading" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400"
                      className="w-full h-full object-cover"
                    />
                    <motion.div
                      className="absolute inset-0 border-4 border-[#8b5e3c] rounded-full"
                      animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">Scanning face...</p>
                </div>
              )}

              {/* SUCCESS */}
              {stage === "success" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                    ✓
                  </div>
                  <p className="text-sm text-gray-600">Face matched</p>
                </div>
              )}

              {/* RESULT */}
              {stage === "done" && (
                <div className="p-3 w-full space-y-3">
                  {resultPhotos.map((img, i) => (
                    <motion.img
                      key={i}
                      src={img}
                      className="rounded-xl w-full object-cover"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
