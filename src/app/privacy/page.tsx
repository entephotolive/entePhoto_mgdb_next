import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Ente photo",
  description: "Privacy Policy for Ente photo application.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#0d0d0f] to-[#0d0d0f] text-slate-300 selection:bg-cyan-500/30 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center gap-2"
          >
            &larr; Back to Login
          </Link>
        </div>

        <div className="max-w-none">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 lg:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-cyan-500/80 font-medium tracking-widest uppercase mb-8">
            Effective Date: [Add Date]
          </p>

          <p className="text-lg text-slate-400 leading-relaxed">
            Welcome to <strong className="text-white">Ente Photo</strong>. Your
            privacy is important to us. This Privacy Policy explains how we
            collect, use, and protect your information when you use our
            application.
          </p>

          <div className="space-y-10 mt-12">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                1. Information We Collect
              </h2>
              <p className="mb-4 text-slate-400">
                When you sign in using Google, we may collect the following
                information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Your name</li>
                <li>Your email address</li>
                <li>Your profile picture (if available)</li>
              </ul>
              <p className="mt-4 text-slate-400">
                We only collect the data necessary to provide authentication and
                basic functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                2. How We Use Your Information
              </h2>
              <p className="mb-4 text-slate-400">
                We use the collected information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Authenticate users using Google Sign-In</li>
                <li>Create and manage your account</li>
                <li>Provide and improve our services</li>
                <li>Communicate with you if necessary</li>
              </ul>
              <p className="mt-4 text-slate-400">
                We do <strong className="text-white">not</strong> use your data
                for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                3. Data Sharing
              </h2>
              <p className="mb-4 text-slate-400">
                We do <strong className="text-white">not</strong> sell, trade,
                or rent your personal information.
              </p>
              <p className="mb-4 text-slate-400">
                We may share data only in the following cases:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>When required by law</li>
                <li>To protect our legal rights</li>
                <li>
                  With trusted services required to operate the app (e.g.,
                  hosting providers)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                4. Data Storage and Security
              </h2>
              <p className="text-slate-400 space-y-4 flex flex-col gap-2">
                <span>
                  We take reasonable steps to protect your data from
                  unauthorized access, loss, or misuse.
                </span>
                <span>
                  However, no method of transmission over the internet is 100%
                  secure.
                </span>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                5. Third-Party Services
              </h2>
              <p className="mb-4 text-slate-400">
                Our application uses{" "}
                <strong className="text-white">Google Sign-In</strong>, provided
                by Google.
              </p>
              <p className="text-slate-400">
                By using our service, you also agree to Google&apos;s Privacy
                Policy:
                <br />
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors mt-1 inline-block"
                >
                  https://policies.google.com/privacy
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                6. Your Rights
              </h2>
              <p className="mb-4 text-slate-400">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400 marker:text-cyan-500/50">
                <li>Access your personal data</li>
                <li>Request correction or deletion of your data</li>
                <li>Stop using the service at any time</li>
              </ul>
              <p className="mt-4 text-slate-400">
                To request data deletion, contact us at:{" "}
                <strong className="text-cyan-400">
                  photo.ceremony.msm@gmail.com
                </strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                7. Changes to This Policy
              </h2>
              <p className="text-slate-400">
                We may update this Privacy Policy from time to time. Updates
                will be posted on this page with a revised date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-2 tracking-tight">
                8. Contact Us
              </h2>
              <p className="text-slate-400 mb-2">
                If you have any questions about this Privacy Policy, you can
                contact us at:
              </p>
              <p className="text-slate-400 flex items-center gap-2">
                <span>📧 Email:</span>
                <a
                  href="mailto:photo.ceremony.msm@gmail.com"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  photo.ceremony.msm@gmail.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-slate-500 font-medium text-sm tracking-wide">
              By using Ente Photo, you agree to this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
