import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orbit Terms of Service",
  description: "Terms of Service for Orbit communication platform.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Orbit, you agree to these Terms of Service and all applicable laws and regulations. If you do not agree, you must not use the service.",
  },
  {
    title: "2. Eligibility and Accounts",
    body: "You are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate registration information.",
  },
  {
    title: "3. Acceptable Use",
    body: "You may not use Orbit to transmit unlawful, abusive, harassing, defamatory, fraudulent, or malicious content. Attempts to disrupt service integrity, bypass security controls, or abuse APIs are prohibited.",
  },
  {
    title: "4. Content and Moderation",
    body: "You retain ownership of content you submit. By posting content on Orbit, you grant Orbit a limited license to host, process, and display that content to operate and improve the service. Orbit may remove content that violates these Terms or applicable laws.",
  },
  {
    title: "5. Privacy and Data Protection",
    body: "Orbit processes personal data in accordance with the Orbit Privacy Policy. You are responsible for ensuring you have lawful rights to share any personal data through Orbit.",
  },
  {
    title: "6. Third-Party Services",
    body: "Orbit may integrate with third-party providers (for example, authentication, media, or infrastructure services). Orbit is not responsible for third-party outages, policy changes, or external terms.",
  },
  {
    title: "7. Service Availability",
    body: "Orbit is provided on an 'as is' and 'as available' basis. We may modify, suspend, or discontinue features at any time, including for maintenance, security, or legal compliance.",
  },
  {
    title: "8. Limitation of Liability",
    body: "To the maximum extent permitted by law, Orbit and its operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service.",
  },
  {
    title: "9. Termination",
    body: "We may suspend or terminate access to Orbit if we reasonably believe these Terms have been violated or if required by law. You may stop using Orbit at any time.",
  },
  {
    title: "10. Changes to These Terms",
    body: "Orbit may update these Terms periodically. Continued use of Orbit after updates becomes effective constitutes acceptance of the revised Terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#06070b] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-black/30 p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-semibold text-violet-100">Orbit Terms of Service</h1>
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
          <Link className="text-violet-300 hover:text-violet-200" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-violet-300 hover:text-violet-200" href="/">
            Back to Orbit
          </Link>
        </div>
      </div>
    </main>
  );
}
