"use client";

import {
  FaInstagram,
  FaLinkedin,
  FaWhatsapp
} from "react-icons/fa";

import { FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="py-10 px-6 bg-[#f5f1eb] border-t border-gray-200">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 rounded-full overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center">
            <img src="/logo.png" className="w-full h-full object-cover" alt="Logo" />
          </div>
          <p className="text-gray-700 text-sm">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-gray-900">
              Ente Photo
            </span>
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-gray-600 text-sm">

          {/* CONTACT TEXT */}
          <div className="flex items-center gap-2">

            <a
              href="tel:+911234567890"
              className="hover:underline"
            >
              +91 8075393896
            </a>

            <span className="text-gray-400">•</span>

            <a
              href="mailto:entephoto.live@gmail.com"
              className="hover:underline"
            >
              entephoto@gmail.com
            </a>

          </div>

          {/* SOCIAL ICONS */}
          <div className="flex items-center gap-5 text-gray-600">

            <a
              href="https://www.instagram.com/_entephoto_/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-500 hover:scale-110 transition"
            >
              <FaInstagram size={18} />
            </a>

            <a
              href="https://x.com/entephoto"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black hover:scale-110 transition"
            >
              <FaXTwitter size={18} />
            </a>

            <a
              href="https://www.linkedin.com/company/114394331/admin/dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-700 hover:scale-110 transition"
            >
              <FaLinkedin size={18} />
            </a>

            <a
              href="https://wa.me/918075393896"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-500 hover:scale-110 transition"
            >
              <FaWhatsapp size={18} />
            </a>

          </div>

        </div>

      </div>
    </footer>
  );
}