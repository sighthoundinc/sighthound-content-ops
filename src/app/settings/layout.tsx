import type { Metadata } from "next";
import type { ReactNode } from "react";

import { pageTitle } from "@/lib/page-title";

// Route title only. The page itself is a client component and cannot
// export metadata, so the segment layout carries it.
export const metadata: Metadata = { title: pageTitle("Settings") };

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
