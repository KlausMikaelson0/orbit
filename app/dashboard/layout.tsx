import { OrbitDashboardShell } from "@/src/components/dashboard/orbit-dashboard-shell";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <OrbitDashboardShell>{children}</OrbitDashboardShell>;
}
