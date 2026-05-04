"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Lock } from "lucide-react";

export default function About() {
  return (
    <section id="features" className="relative py-28 px-6 bg-[#f7f7f9] overflow-hidden">

     
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-[500px] h-[500px] bg-blue-200/40 blur-[120px] top-[-100px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-purple-200/40 blur-[120px] bottom-[-100px] right-[-100px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center">

        <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4 }}
             className="flex justify-center"
        >
        <div className="px-5 py-2 rounded-full bg-gray-200 text-gray-700 text-sm font-medium shadow-sm">
             Why Ente Photo?
         </div>
        </motion.div>

        
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900"
        >
          A Private Home For Your{" "}
          <span className="text-gray-500">Memories</span>
        </motion.h2>

        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed"
        >
          Built for people who value ownership and simplicity. No tracking.
          No clutter. Just your photos—secure and accessible.
        </motion.p>

        
        <div className="grid md:grid-cols-3 gap-6 mt-14">

          
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <ShieldCheck className="mb-4 text-gray-800" size={28} />
            <h3 className="font-semibold text-lg text-gray-900">
              Private by design
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Only you can access your photos.
            </p>
          </motion.div>

          
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <Sparkles className="mb-4 text-gray-800" size={28} />
            <h3 className="font-semibold text-lg text-gray-900">
              Simple experience
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Clean interface focused on your moments.
            </p>
          </motion.div>

          
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <Lock className="mb-4 text-gray-800" size={28} />
            <h3 className="font-semibold text-lg text-gray-900">
              Secure storage
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Your memories stay safe and protected.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}