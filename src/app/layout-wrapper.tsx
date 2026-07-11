"use client";

import { UserProvider } from "@/context/user-context";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
