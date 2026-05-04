"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { Send, Shield, MessageSquare, Bug } from "lucide-react";

/* ===== ANIMATION ===== */

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const reveal: Variants = {
  hidden: { opacity: 0, y: 50 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function Contact() {
  const [tab, setTab] = useState<"feedback" | "bug">("bug");

  return (
    <section id="contact" className="py-32 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">

      {/* Glow */}
      <div className="absolute w-[500px] h-[300px] bg-blue-100 rounded-[60%] blur-3xl opacity-40 left-0 top-10 pointer-events-none"></div>

      <motion.div
        className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, margin: "-120px" }}
      >

        {/* LEFT */}
        <motion.div variants={reveal}>
          <div className="inline-flex bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            Get in Touch
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            We’d love to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              hear from you
            </span>
          </h2>

          <p className="mt-6 text-gray-600 text-lg leading-relaxed max-w-md font-medium">
            Have questions, feedback, or found a bug? We’re here to help and
            always improving{" "}
            <span className="text-gray-800 font-semibold">
              Ente Photo
            </span>.
          </p>

          <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 max-w-md">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-xl">
              <Shield />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Your privacy is our promise
              </p>
              <p className="text-gray-600 text-sm mt-1">
                We don’t scan, analyze, or sell your photos — ever.
              </p>
            </div>
          </div>
        </motion.div>

        {/* RIGHT FORM */}
        <motion.div
          variants={reveal}
          className="bg-white rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-200"
        >

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => setTab("feedback")}
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                tab === "feedback"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Send Feedback
            </button>

            <button
              onClick={() => setTab("bug")}
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                tab === "bug"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Report Bug
            </button>
          </div>

          {/* FORM */}
          <form
            action="https://formspree.io/f/maqagwnl"
            method="POST"
            className="space-y-5"
          >

            {/* hidden type */}
            <input type="hidden" name="type" value={tab} />

            {/* Name + Email */}
            <div className="grid grid-cols-2 gap-4">
              <Input name="name" placeholder="Enter your name" />
              <Input name="email" placeholder="Enter your email" />
            </div>

            {/* Device (only bug) */}
            {tab === "bug" && (
              <input
                name="device"
                type="text"
                placeholder="Device / App Version (optional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Message */}
            <textarea
              name="message"
              placeholder={
                tab === "feedback"
                  ? "Share your thoughts..."
                  : "Describe the issue..."
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Button */}
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white ${
                tab === "bug"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-blue-600 to-indigo-500"
              }`}
            >
              {tab === "bug" ? "Report Bug" : "Send Message"}
            </button>

          </form>

        </motion.div>

      </motion.div>
    </section>
  );
}

/* INPUT COMPONENT */

function Input({
  placeholder,
  name,
}: {
  placeholder: string;
  name: string;
}) {
  return (
    <input
      name={name}
      type="text"
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}