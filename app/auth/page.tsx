import { Suspense } from "react";

import { OrbitAuthCard } from "@/src/components/auth/orbit-auth-card";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06070b]" />}>
      <OrbitAuthCard />
    </Suspense>
  );
}
