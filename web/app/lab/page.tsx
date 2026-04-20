import type { Metadata } from "next";
import { LabClient } from "./LabClient";

export const metadata: Metadata = {
  title: "Lab · algorithm tuning",
  description: "Tune the plan generator live and visualise how every knob changes the output.",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <LabClient />;
}
