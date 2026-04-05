export default function Footer() {
  return (
    <footer className="relative z-50 flex w-full items-center justify-between border-t border-white/10 bg-white/5 px-6 py-4 text-xs text-gray-400 backdrop-blur-xl">
      <div className="mb-2 md:mb-0">
        © 2026 Photo Ceremony
      </div>

     
      <div className="hidden md:flex items-center gap-4">
        <span className="hover:text-white cursor-pointer transition">
          Privacy
        </span>
        <span className="hover:text-white cursor-pointer transition">
          Terms
        </span>
        <span className="hover:text-white cursor-pointer transition">
          Contact
        </span>
      </div>

      
      <div className="flex items-center gap-3">
        <span className="hover:text-white cursor-pointer transition">
          Support
        </span>
        <span className="hover:text-white cursor-pointer transition">
          Help
        </span>
      </div>
    </footer>
  );
}
