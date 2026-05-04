"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Why Ente?", href: "#why" },
  { label: "Get in touch", href: "#contact" },
];

export default function Navbar() {
  const [darkNav, setDarkNav] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setDarkNav(window.scrollY < heroHeight - 80);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    links.forEach((link) => {
      const id = link.href.replace("#", "");
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
  }, [menuOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          darkNav
            ? "bg-transparent py-6"
            : "bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 lg:px-8">
          {/* LOGO */}
          <a
            href="#home"
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tighter text-[#1a1a2e] transition-transform hover:scale-105"
          >
            <div className="w-14 h-9 rounded-full overflow-hidden bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm flex items-center justify-center">
              <img
                src="/logo.png"
                className="w-full h-full object-cover"
                alt="Logo"
              />
            </div>
            <span className="hidden sm:inline">Ente Photo</span>
          </a>

          {/* DESKTOP */}
          <div className="hidden md:flex gap-10 items-center">
            {links.map((item, i) => {
              const isActive = activeSection === item.href.replace("#", "");
              return (
                <a
                  key={i}
                  href={item.href}
                  className={`relative group text-sm font-semibold tracking-wide transition-colors duration-300 ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-0.5 transition-all duration-300 ${
                      isActive
                        ? "w-full bg-purple-600"
                        : "w-0 bg-purple-600 group-hover:w-full"
                    }`}
                  />
                </a>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document
                  .getElementById("whats-app")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="hidden md:block px-7 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/50"
            >
              Contact us →
            </motion.a>

            {/* MOBILE BTN */}
            <button
              className="md:hidden p-2 rounded-lg text-[#1f2937] hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={26} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
              <a
                href="#home"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 font-extrabold text-2xl tracking-tighter text-[#1a1a2e]"
              >
                <div className="w-12 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    className="w-full h-full object-cover"
                    alt="Logo"
                  />
                </div>
                <span>Ente Photo</span>
              </a>

              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-6 px-8 py-12">
              {links.map((item, i) => {
                const isActive = activeSection === item.href.replace("#", "");
                return (
                  <motion.a
                    key={i}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`text-3xl font-bold transition-colors ${
                      isActive
                        ? "text-purple-600"
                        : "text-[#1f2937] hover:text-purple-600"
                    }`}
                  >
                    {item.label}
                  </motion.a>
                );
              })}
            </div>

            {/* Footer / CTA */}
            <div className="mt-auto p-8 border-t border-gray-100 bg-gray-50/50">
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  setMenuOpen(false);
                  document
                    .getElementById("whats-app")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="block w-full text-center py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold shadow-xl shadow-purple-100 cursor-pointer"
              >
                Contact us →
              </motion.a>
              <p className="text-center text-gray-400 text-sm mt-6">
                © {new Date().getFullYear()} Ente Photo. All rights reserved.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
