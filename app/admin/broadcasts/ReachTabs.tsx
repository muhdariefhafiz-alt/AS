"use client";

import { useState } from "react";
import BroadcastComposer from "./BroadcastComposer";
import BlastComposer from "./BlastComposer";

// Two ways to reach an agent cohort: an in-app dismissible banner (for agents who
// open the dashboard) and an email blast (for agents who do not). Same audience
// model, different channel; the operator picks the reach that fits the message.
export default function ReachTabs() {
  const [tab, setTab] = useState<"banner" | "email">("banner");
  const chip = (active: boolean) =>
    `rounded-md border px-4 py-2 text-sm font-semibold ${active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <button type="button" className={chip(tab === "banner")} onClick={() => setTab("banner")}>In-app banner</button>
        <button type="button" className={chip(tab === "email")} onClick={() => setTab("email")}>Email blast</button>
      </div>
      {tab === "banner" ? <BroadcastComposer /> : <BlastComposer />}
    </div>
  );
}
