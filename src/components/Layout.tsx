export default function Layout({ children }) {
  return (
    <div className="relative min-h-screen text-white">
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: "#020617",
          backgroundImage: `
            radial-gradient(circle at top left, rgba(147,51,234,0.4), transparent 40%),
            radial-gradient(circle at bottom right, rgba(59,130,246,0.4), transparent 40%)
          `,
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl"></div>
      </div>

      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
