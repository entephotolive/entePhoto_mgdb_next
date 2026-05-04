"use client";

import {
  User,
  Camera,
  Search,
  Zap,
  Lock,
  Smartphone,
  Rocket,
  Sparkles,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";

/* ================= ANIMATIONS ================= */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

/* ================= MAIN ================= */

export default function BuildForEveryone() {
  const router = useRouter();
  return (
    <section
      id="build"
      className="py-28 bg-gradient-to-b from-white to-gray-100"
    >
      <motion.div
        className="max-w-6xl mx-auto px-6 text-center"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, margin: "-120px" }}
      >
        {/* TOP */}
        <motion.div
          variants={fadeUp}
          className="inline-block bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-sm"
        >
          Built for Everyone
        </motion.div>

        <motion.h2
          variants={fadeUp}
          className="text-5xl font-bold text-gray-900 mt-6"
        >
          Designed for Events, Powered by Simplicity
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-gray-600 mt-4 max-w-2xl mx-auto"
        >
          Whether you’re attending an event or capturing moments, Ente Photo
          makes sharing and accessing memories effortless.
        </motion.p>

        {/* CARDS */}
        <div className="grid lg:grid-cols-2 gap-16 mt-20">
          {/* LEFT */}
          <motion.div
            variants={scaleIn}
            className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-10 
            shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-200/40 overflow-hidden
            flex flex-col"
          >
            <div className="pointer-events-none absolute w-[300px] h-[240px] bg-blue-100 rounded-[60%] blur-2xl opacity-60 right-6 top-16"></div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-6 items-center">
              <div className="text-left">
                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-4 mb-6"
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-blue-100 text-blue-600 rounded-2xl">
                    <User />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">
                      For Event Attendees
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Easily find and relive your moments
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={container} className="space-y-5">
                  <Feature
                    icon={<Search />}
                    title="Smart Photo Discovery"
                    desc="Find photos instantly."
                    color="blue"
                  />
                  <Feature
                    icon={<Zap />}
                    title="Instant Access"
                    desc="No waiting."
                    color="blue"
                  />
                  <Feature
                    icon={<Lock />}
                    title="Private & Secure"
                    desc="Encrypted."
                    color="blue"
                  />
                  <Feature
                    icon={<Smartphone />}
                    title="Mobile Friendly"
                    desc="Anywhere access."
                    color="blue"
                  />
                </motion.div>
              </div>

              <motion.div variants={scaleIn} className="flex justify-center">
                <AttendeeMockup />
              </motion.div>
            </div>

            <div className="mt-6">
              <button 
              onClick={() => router.push("/qr-scanner")}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition">
                Explore Events →
              </button>
            </div>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            variants={scaleIn}
            className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-10 
            shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-200/40 overflow-hidden
            flex flex-col"
          >
            <div className="pointer-events-none absolute w-[320px] h-[260px] bg-green-100 rounded-[60%] blur-2xl opacity-60 left-6 top-16"></div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-6 items-center">
              <div className="text-left">
                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-4 mb-6"
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-green-100 text-green-600 rounded-2xl">
                    <Camera />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-600">
                      For Photographers
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Deliver photos smarter, faster
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={container} className="space-y-5">
                  <Feature
                    icon={<Rocket />}
                    title="Fast Delivery"
                    desc="Upload instantly."
                    color="green"
                  />
                  <Feature
                    icon={<Sparkles />}
                    title="AI Organization"
                    desc="Auto sorting."
                    color="green"
                  />
                  <Feature
                    icon={<BarChart3 />}
                    title="Client Experience"
                    desc="Premium gallery."
                    color="green"
                  />
                  <Feature
                    icon={<ShieldCheck />}
                    title="Secure Sharing"
                    desc="Privacy-first."
                    color="green"
                  />
                </motion.div>
              </div>

              <motion.div
                variants={scaleIn}
                className="relative flex justify-center items-center mt-12 lg:mt-0"
              >
                <PhotographerMockup />
              </motion.div>
            </div>

            {/* FIXED BUTTON POSITION */}
            <div className="mt-12 mt-auto">
              <button onClick={() => router.push("/admin/login")}className="w-full py-4 rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition">
                Create Event →
              </button>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div variants={scaleIn} className="mt-24 flex justify-center">
          <div
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-6 
          shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-200/40 max-w-xl w-full text-center overflow-hidden"
          >
            <div className="pointer-events-none absolute w-[220px] h-[160px] bg-blue-100 rounded-[60%] blur-2xl opacity-40 left-1/2 -translate-x-1/2 top-0"></div>

            <div className="relative z-10">
              <motion.p
                variants={fadeUp}
                className="text-lg font-medium text-gray-800"
              >
                Questions, feedback, or ideas? We’re here.
              </motion.p>

              <motion.a
                variants={fadeUp}
                whileHover={{ scale: 1.05 }}
                href="https://wa.me/918075393896"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 px-8 py-3 bg-black text-white rounded-full shadow-lg"
              >
                Chat on WhatsApp
              </motion.a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* FEATURE */
function Feature({ icon, title, desc, color }: any) {
  const colorClass = color === "green" ? "text-green-500" : "text-blue-500";

  return (
    <motion.div variants={fadeUp} className="flex gap-4">
      <div className={`${colorClass} mt-1 shrink-0`}>{icon}</div>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-gray-500 text-sm">{desc}</p>
      </div>
    </motion.div>
  );
}

/* DEVICE MOCKUP WRAPPER */
function DeviceMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[170px] sm:w-[190px] md:w-[200px] lg:w-[220px] aspect-[9/19] md:scale-95 lg:scale-100">
      <div className="absolute inset-0 rounded-[2.6rem] bg-black p-[5.5px] shadow-2xl">
        <div className="relative w-full h-full rounded-[2.2rem] overflow-hidden bg-gray-50 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ATTENDEE PHONE CONTENT */
function AttendeeMockup() {
  return (
    <DeviceMockup>
      <div className="flex flex-col h-full pt-5 px-2 pb-2 bg-white">
        <p className="text-[10px] text-center text-gray-500 mb-2">
          Annual Day Event
        </p>

        <div className="grid grid-cols-2 gap-2 flex-1">
          <img
            src="/phone/image.1.avif"
            className="w-full h-full rounded-lg object-cover"
          />
          <img
            src="/phone/image.2.jpeg"
            className="w-full h-full rounded-lg object-cover"
          />
          <img
            src="/phone/image.3.jpg"
            className="w-full h-full rounded-lg object-cover"
          />
          <img
            src="/phone/images.4.webp"
            className="w-full h-full rounded-lg object-cover"
          />
          <img
            src="/phone/images.5.jpg"
            className="w-full h-full rounded-lg object-cover"
          />
          <img
            src="/phone/images.6.jpeg"
            className="w-full h-full rounded-lg object-cover"
          />
        </div>

        <div className="flex justify-between text-[9px] text-gray-400 mt-2 pt-1">
          <span>Photos</span>
          <span>Search</span>
          <span>Events</span>
          <span>Account</span>
        </div>
      </div>
    </DeviceMockup>
  );
}

/* PHOTOGRAPHER DASHBOARD CONTENT */
function PhotographerMockup() {
  return (
    <DeviceMockup>
      <div className="flex flex-col h-full bg-gray-900">
        <img
          src="/images/photographer-mobile.png"
          className="w-full h-full object-cover"
          alt="Photographer Dashboard"
        />
      </div>
    </DeviceMockup>
  );
}
