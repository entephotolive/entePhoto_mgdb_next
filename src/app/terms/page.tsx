import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Ente photo",
  description: "Terms of Service for Ente photo application.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#0d0d0f] to-[#0d0d0f] text-slate-300 selection:bg-cyan-500/30 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/admin/login"
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center gap-2"
          >
            &larr; Back to Login
          </Link>
        </div>

        <div className="max-w-none">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 lg:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-cyan-500/80 font-medium tracking-widest uppercase mb-8">
            Effective Date: [Add Date]
          </p>

          <p className="text-lg text-slate-400 leading-relaxed">
            Welcome to <strong className="text-white">Ente Photo</strong>. By
            accessing or using our application, you agree to be bound by these
            Terms of Service.
          </p>

          <div className="space-y-10 mt-12">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                1. Use of the Service
              </h2>
              <p className="mb-4 text-slate-400">
                You agree to use Ente Photo only for lawful purposes and in a
                way that does not violate any applicable laws or regulations.
              </p>
              <p className="mb-4 text-slate-400">You must not:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Use the service for illegal or harmful activities</li>
                <li>Attempt to gain unauthorized access to the system</li>
                <li>
                  Interfere with the proper functioning of the application
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                2. User Accounts
              </h2>
              <p className="mb-4 text-slate-400">
                To use certain features, you must sign in using Google Sign-In.
              </p>
              <p className="mb-4 text-slate-400">You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Maintaining the security of your account</li>
                <li>All activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                3. Data and Content
              </h2>
              <p className="mb-4 text-slate-400">
                You retain ownership of any content you upload or create using
                Ente Photo.
              </p>
              <p className="mb-4 text-slate-400">
                However, you grant us permission to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Store and process your data to provide the service</li>
              </ul>
              <p className="mt-4 text-slate-400">
                We do <strong className="text-white">not</strong> claim
                ownership of your content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                4. Service Availability
              </h2>
              <p className="mb-4 text-slate-400">
                We strive to keep the service available at all times, but we do
                not guarantee uninterrupted or error-free operation.
              </p>
              <p className="mb-4 text-slate-400">We may:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>
                  Modify, suspend, or discontinue the service at any time
                  without notice
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                5. Limitation of Liability
              </h2>
              <p className="mb-4 text-slate-400">
                Ente Photo is provided &quot;as is&quot; without warranties of
                any kind.
              </p>
              <p className="mb-4 text-slate-400">We are not responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Data loss</li>
                <li>Service interruptions</li>
                <li>Any indirect or consequential damages</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                6. Termination
              </h2>
              <p className="mb-4 text-slate-400">
                We reserve the right to suspend or terminate your access if you
                violate these Terms.
              </p>
              <p className="text-slate-400">
                You may stop using the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                7. Changes to Terms
              </h2>
              <p className="text-slate-400">
                We may update these Terms from time to time. Continued use of
                the service means you accept the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                8. Contact Information
              </h2>
              <p className="text-slate-400 mb-2">
                If you have any questions about these Terms, contact us at:
              </p>
              <p className="text-slate-400 flex items-center gap-2">
                <span>📧 Email:</span>
                <a
                  href="mailto:[your email]"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  [your email]
                </a>
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-slate-500 font-medium text-sm tracking-wide">
              By using Ente Photo, you agree to these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
