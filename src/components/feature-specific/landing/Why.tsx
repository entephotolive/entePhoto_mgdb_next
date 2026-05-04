"use client";

import { motion, Variants } from "framer-motion";

/* ===== FIXED ANIMATIONS (TYPED) ===== */

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const reveal: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
    scale: 0.95,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/* ===== COMPONENT ===== */

export default function Why() {
  return (
    <section id="why" className="py-32 text-center px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">

      {/* Glow */}
      <div className="absolute w-[420px] h-[260px] bg-blue-100 rounded-[60%] blur-3xl opacity-40 left-1/2 -translate-x-1/2 top-16 pointer-events-none"></div>

      <motion.div
  className="max-w-3xl mx-auto relative z-10"
  variants={container}
  initial="hidden"
  whileInView="show"
  viewport={{ once: false, amount: 0.3 }}
>

        {/* Heading */}
        <motion.h2
          variants={reveal}
          className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight"
        >
          Why{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            Ente Photo
          </span>{" "}
          Exists
        </motion.h2>

        {/* Line 1 */}
        <motion.p
          variants={reveal}
          className="mt-6 text-gray-700 text-lg leading-relaxed"
        >
          Your photos should{" "}
          <span className="font-semibold text-gray-900">
            never be scanned, sold,
          </span>{" "}
          or{" "}
          <span className="font-semibold text-gray-900">
            used against you
          </span>.
        </motion.p>

        {/* Line 2 */}
        <motion.p
          variants={reveal}
          className="mt-6 text-gray-600 leading-relaxed"
        >
          Most platforms treat your memories as{" "}
          <span className="font-medium text-gray-800">data</span> — something to{" "}
          <span className="font-medium text-gray-800">
            analyze, monetize, and control
          </span>. We believe your photos belong{" "}
          <span className="font-semibold text-gray-900">
            only to you
          </span>.
        </motion.p>

        {/* Line 3 */}
        <motion.p
          variants={reveal}
          className="mt-4 text-gray-600 leading-relaxed"
        >
          Ente Photo is built with{" "}
          <span className="font-semibold text-gray-900">
            privacy at its core
          </span>, giving you{" "}
          <span className="font-semibold text-gray-900">
            full control
          </span>{" "}
          over your memories without compromise.
        </motion.p>

        {/* Divider */}
        <motion.div
          variants={reveal}
          className="mt-14 flex justify-center"
        >
          <div className="w-16 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
        </motion.div>

      </motion.div>
    </section>
  );
}