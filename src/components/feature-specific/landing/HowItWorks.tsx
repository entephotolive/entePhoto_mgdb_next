"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useInView } from "framer-motion"
import { QrCode, ScanFace, Sparkles, ImageIcon } from "lucide-react"

const steps = [
  {
    id: "01",
    title: "Join Event",
    desc: "Scan QR or enter event code to begin.",
    icon: QrCode,
    color: "bg-orange-100 text-orange-600",
    image: "/screens/join.png",
  },
  {
    id: "02",
    title: "Face Scan",
    desc: "Securely identify yourself once.",
    icon: ScanFace,
    color: "bg-purple-100 text-purple-600",
    image: "/screens/scan.png",
  },
  {
    id: "03",
    title: "Smart Matching",
    desc: "We instantly find your photos.",
    icon: Sparkles,
    color: "bg-green-100 text-green-600",
    image: "/screens/match.png",
  },
  {
    id: "04",
    title: "Your Moments",
    desc: "Only your photos — clean & private.",
    icon: ImageIcon,
    color: "bg-red-100 text-red-500",
    image: "/screens/moments.png",
  },
]

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.4 })

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length)
    }, 2900)
    return () => clearInterval(interval)
  }, [])

  return (
    <section
    id="how"
      ref={ref}
      className="py-20 md:py-32 bg-gradient-to-br from-[#f7f3ef] to-[#ece4db] overflow-x-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-20"
        >
          <span className="px-4 py-1 text-xs rounded-full bg-[#efe7df] text-[#8b5e3c]">
            PROCESS
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-6 text-[#1f2937]">
            How It <span className="text-[#8b5e3c]">Works</span>
          </h2>

          <p className="text-gray-500 mt-4 text-sm md:text-base">
            A seamless and private way to discover your moments instantly.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">

          {/* PHONE VISUAL */}
          <div className="flex justify-center relative">

            {/* LEFT SIDE PHONE (desktop only) */}
            <motion.div
              initial={{ opacity: 0, x: -80, rotate: -20 }}
              animate={isInView ? { opacity: 0.3, x: 0, rotate: -18 } : {}}
              transition={{ duration: 0.8 }}
              className="hidden md:block absolute -left-12 lg:-left-16 scale-90 blur-sm"
            >
              <div className="w-[180px] lg:w-[220px] h-[360px] lg:h-[440px] bg-gradient-to-br from-gray-300 to-gray-400 rounded-[36px]" />
            </motion.div>

            {/* RIGHT SIDE PHONE (desktop only) */}
            <motion.div
              initial={{ opacity: 0, x: 80, rotate: 20 }}
              animate={isInView ? { opacity: 0.3, x: 0, rotate: 18 } : {}}
              transition={{ duration: 0.8 }}
              className="hidden md:block absolute -right-12 lg:-right-16 scale-90 blur-sm"
            >
              <div className="w-[180px] lg:w-[220px] h-[360px] lg:h-[440px] bg-gradient-to-br from-gray-300 to-gray-400 rounded-[36px]" />
            </motion.div>

            {/* MAIN PHONE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
              className="relative w-[200px] sm:w-[230px] md:w-[260px] h-[420px] sm:h-[480px] md:h-[520px] bg-black rounded-[40px] p-[6px] shadow-xl"
            >
              <div className="relative w-full h-full bg-white rounded-[36px] overflow-hidden">

                <AnimatePresence mode="wait">
                  <motion.img
                    key={steps[active].image}
                    src={steps[active].image}
                    alt="screen"
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                  />
                </AnimatePresence>

              </div>

              {/* NOTCH */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-black rounded-b-2xl z-20" />
          <div className="absolute left-[-3px] top-20 w-[3px] h-10 bg-gray-700 rounded-full" />
          <div className="absolute left-[-3px] top-32 w-[3px] h-10 bg-gray-700 rounded-full" />
          <div className="absolute right-[-3px] top-24 w-[3px] h-16 bg-gray-700 rounded-full" />
            </motion.div>
          </div>

          {/* STEPS */}
          <div className="space-y-5">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                onClick={() => setActive(i)}
                initial={{ opacity: 0, x: 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.15 }}
                whileHover={{ scale: 1.02 }}
                className={`flex gap-4 p-4 md:p-6 rounded-xl cursor-pointer transition
                ${active === i ? "bg-white shadow-md" : "bg-white/60"}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${step.color}`}>
                  <step.icon size={18} />
                </div>

                <div>
                  <span className="text-xs text-gray-400 font-bold">
                    {step.id}
                  </span>
                  <h3 className="font-bold text-base md:text-lg text-[#1f2937]">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* DOTS */}
            <div className="flex gap-2 pt-4">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: active === i ? 32 : 8,
                    backgroundColor: active === i ? "#3b82f6" : "#d1d5db",
                  }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}