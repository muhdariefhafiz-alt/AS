"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");
  const [agent, setAgent] = useState<{
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    photo_url: string | null;
    whatsapp: string | null;
    score: number | null;
    agency_name: string | null;
  } | null>(null);

  // Edit form state
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLookupStatus("loading");

    try {
      const res = await fetch("/api/dashboard/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok && data.agent) {
        setAgent(data.agent);
        setBio(data.agent.bio || "");
        setPhotoUrl(data.agent.photo_url || "");
        setWhatsapp(data.agent.whatsapp || "");
        setLookupStatus("found");
      } else if (res.status === 404) {
        setLookupStatus("not_found");
      } else {
        setLookupStatus("error");
      }
    } catch {
      setLookupStatus("error");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) return;
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          email,
          bio: bio || null,
          photoUrl: photoUrl || null,
          whatsapp: whatsapp || null,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSaveStatus("saved");
        setSaveMsg("Profile updated successfully.");
      } else {
        setSaveStatus("error");
        setSaveMsg(data.error || "Failed to save.");
      }
    } catch {
      setSaveStatus("error");
      setSaveMsg("Connection error. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-[600px] px-5 py-12 md:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Edit your profile</h1>
      <p className="mt-2 text-sm text-gray-500">
        Manage your claimed agent profile. Changes appear on your public page within minutes.
      </p>

      {/* Step 1: Email lookup */}
      {lookupStatus !== "found" && (
        <form onSubmit={handleLookup} className="mt-8">
          <label className="block text-sm font-medium text-gray-700">
            Enter the email you used to claim your profile
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLookupStatus("idle"); }}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={lookupStatus === "loading"}
              className="shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {lookupStatus === "loading" ? "..." : "Find profile"}
            </button>
          </div>

          {lookupStatus === "not_found" && (
            <p className="mt-3 text-sm text-gray-500">
              No claimed profile found for this email.{" "}
              <Link href="/for-agents" className="text-teal-600 hover:underline">
                Claim your profile first
              </Link>
            </p>
          )}

          {lookupStatus === "error" && (
            <p className="mt-3 text-sm text-red-500">Something went wrong. Please try again.</p>
          )}
        </form>
      )}

      {/* Step 2: Edit form */}
      {lookupStatus === "found" && agent && (
        <div className="mt-8">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] text-white">&#10003;</span>
            <div>
              <p className="text-sm font-medium text-green-800">{agent.name}</p>
              <p className="text-xs text-green-600">{agent.agency_name || "Independent agent"}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bio / practice description
              </label>
              <p className="mt-0.5 text-xs text-gray-400">Tell buyers about your specialization and experience. Max 1,000 characters.</p>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setSaveStatus("idle"); }}
                maxLength={1000}
                rows={4}
                placeholder="I specialize in HDB resale transactions in Tampines and Bedok..."
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{bio.length}/1000</p>
            </div>

            {/* Photo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Photo URL
              </label>
              <p className="mt-0.5 text-xs text-gray-400">Link to a professional headshot. Use your LinkedIn photo or upload to any image host.</p>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => { setPhotoUrl(e.target.value); setSaveStatus("idle"); }}
                maxLength={500}
                placeholder="https://..."
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {photoUrl && (
                <div className="mt-2">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                WhatsApp number
              </label>
              <p className="mt-0.5 text-xs text-gray-400">Include country code (e.g. +6591234567). Shown as a contact button on your profile.</p>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setSaveStatus("idle"); }}
                maxLength={20}
                placeholder="+65 9XXX XXXX"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saveStatus === "saving" ? "Saving..." : "Save changes"}
              </button>

              {saveStatus === "saved" && (
                <span className="text-sm text-green-600">{saveMsg}</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-500">{saveMsg}</span>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Your changes will appear on your{" "}
                <Link href={`/property-agents/agent/${agent.slug}`} className="text-teal-600 hover:underline">
                  public profile page
                </Link>{" "}
                after the next page refresh. Photos, bio text, and WhatsApp number are visible to all visitors.
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
