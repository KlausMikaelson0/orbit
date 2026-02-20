import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orbit Privacy Policy",
  description: "Privacy Policy for Orbit communication platform.",
};

const sections = [
  {
    title: "1. Information We Collect",
    body: "Orbit collects account information (such as email and profile details), workspace content (messages, uploads, and channel metadata), and technical telemetry required for platform reliability and security.",
  },
  {
    title: "2. How We Use Information",
    body: "We use your information to provide the Orbit service, authenticate users, synchronize realtime collaboration, detect abuse, improve product quality, and comply with legal obligations.",
  },
  {
    title: "3. Legal Bases and Consent",
    body: "Where required, Orbit processes data under applicable legal bases, including contractual necessity, legitimate interests, legal compliance, and consent for optional features.",
  },
  {
    title: "4. Data Sharing",
    body: "Orbit does not sell personal data. Data may be shared with trusted infrastructure and service providers strictly to operate the platform (for example, hosting, authentication, notifications, and media delivery).",
  },
  {
    title: "5. Data Retention",
    body: "Orbit retains data only as long as needed to provide services, fulfill contractual obligations, resolve disputes, enforce agreements, and satisfy legal requirements.",
  },
  {
    title: "6. Security Controls",
    body: "Orbit applies layered safeguards including encrypted transport, role-based access controls, rate limiting, abuse detection, and secure authentication features such as multi-factor support.",
  },
  {
    title: "7. Your Rights",
    body: "Depending on your jurisdiction, you may have rights to access, correct, delete, or export your personal data, and to object to certain processing activities.",
  },
  {
    title: "8. International Transfers",
    body: "If data is transferred across borders, Orbit applies appropriate safeguards consistent with applicable data protection laws.",
  },
  {
    title: "9. Children’s Privacy",
    body: "Orbit is not intended for children under the minimum digital age in their jurisdiction. If we become aware of unauthorized child data collection, we will take appropriate action.",
  },
  {
    title: "10. Policy Updates",
    body: "We may update this Privacy Policy from time to time. Material changes will be reflected by updating the 'Last updated' date and, where appropriate, by additional notices.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#06070b] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-black/30 p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-semibold text-violet-100">Orbit Privacy Policy</h1>
        <p className="mb-8 text-sm text-zinc-400">Last updated: February 19, 2026</p>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-1 text-lg font-semibold text-zinc-100">{section.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-300">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-sm">
          <Link className="text-violet-300 hover:text-violet-200" href="/terms">
            Terms of Service
          </Link>
          <Link className="text-violet-300 hover:text-violet-200" href="/">
            Back to Orbit
          </Link>
        </div>
      </div>
    </main>
  );
}
