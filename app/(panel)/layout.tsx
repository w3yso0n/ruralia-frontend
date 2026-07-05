"use client";

import { PanelLayout } from "@/components/panel-layout";

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return <PanelLayout>{children}</PanelLayout>;
}
