"use client";

import { useState } from "react";
import Link from "next/link";

type Tier = "free" | "pro" | "premium";

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

const TIER_COLORS: Record<Tier, string> = {
  free: "bg-gray-100 text-gray-600",
  pro: "bg-teal-100 text-teal-700",
  premium: "bg-amber-100 text-amber-700",
};

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
    message: string | null;
    score: number | null;
    agency_name: string | null;
    subscription_tier: Tier;
    claimed_at: string | null;
    views_this_week: number;
    whatsapp_clicks_this_week: number;
  } | null>(null);

  // Edit form state
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Photo upload state
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");

  // Check for upgrade success param
  const upgraded = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("upgraded")
    : null;

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
        setMessage(data.agent.message || "");
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

  async function handlePhotoUpload(file: File) {
    if (!agent) return;
    setUploadStatus("uploading");
    setUploadMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("agentId", String(agent.id));
      formData.append("email", email);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setPhotoUrl(data.url);
        setUploadStatus("done");
        setUploadMsg("Photo uploaded successfully.");
        setSaveStatus("idle");
      } else {
        setUploadStatus("error");
        setUploadMsg(data.error || "Upload failed.");
      }
    } catch {
      setUploadStatus("error");
      setUploadMsg("Connection error. Please try again.");
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
          message: message || null,
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

  async function handleUpgrade(tier: "pro" | "premium") {
    if (!agent) return;
    setCheckoutLoading(tier);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout.");
        setCheckoutLoading(null);
      }
    } catch {
      alert("Connection error. Please try again.");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-5 py-12 md:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">
        Manage your profile, view your plan, and upgrade for more visibility.
      </p>

      {/* Upgrade success banner */}
      {upgraded && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            Welcome to {TIER_LABELS[upgraded as Tier] || upgraded}! Your profile has been upgraded.
          </p>
        </div>
      )}

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

      {/* Step 2: Dashboard */}
      {lookupStatus === "found" && agent && (
        <div className="mt-8 space-y-6">
          {/* Agent header with tier badge */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] text-white">&#10003;</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.agency_name || "Independent agent"}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_COLORS[agent.subscription_tier]}`}>
              {TIER_LABELS[agent.subscription_tier]}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-extrabold text-teal-600">{agent.score ? Math.round(Number(agent.score)) : "-"}</p>
              <p className="mt-1 text-[10px] text-gray-400">AgentScore</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{TIER_LABELS[agent.subscription_tier]}</p>
              <p className="mt-1 text-[10px] text-gray-400">Current Plan</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <Link href={`/property-agents/agent/${agent.slug}`} className="text-sm font-medium text-teal-600 hover:underline">
                View profile
              </Link>
              <p className="mt-1 text-[10px] text-gray-400">Public Page</p>
            </div>
          </div>

          {/* Profile activity */}
          <div>
            <h2 className="text-sm font-bold text-gray-900">Profile activity</h2>
            {agent.views_this_week > 0 || agent.whatsapp_clicks_this_week > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-extrabold text-teal-600">{agent.views_this_week}</p>
                  <p className="mt-1 text-[10px] text-gray-400">Profile views this week</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-extrabold text-teal-600">{agent.whatsapp_clicks_this_week}</p>
                  <p className="mt-1 text-[10px] text-gray-400">WhatsApp clicks this week</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                Views tracking starts after your profile is set up
              </p>
            )}
          </div>

          {/* Upgrade cards -- gated behind "aha moment" (7 days since claim) */}
          {agent.subscription_tier !== "premium" && (() => {
            const claimedDaysAgo = agent.claimed_at
              ? (Date.now() - new Date(agent.claimed_at).getTime()) / (1000 * 60 * 60 * 24)
              : null;
            const hasReachedAha = claimedDaysAgo !== null && claimedDaysAgo >= 7;

            if (!hasReachedAha) {
              return (
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
                  <p className="text-sm font-medium text-teal-800">
                    Your profile is live! Over the next week, buyers in your area will see your listing. We will send you a report of how many people viewed your profile. After that, you can upgrade for more visibility.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-900">Upgrade your visibility</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {agent.subscription_tier === "free" && (
                    <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Pro</p>
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Popular</span>
                      </div>
                      <p className="mt-2 text-2xl font-extrabold text-gray-900">S$99<span className="text-sm font-normal text-gray-400">/mo</span></p>
                      <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
                        <li>+ Sponsored badge on profile</li>
                        <li>+ Weekly profile view report</li>
                        <li>+ Sponsored placement in area listings</li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade("pro")}
                        disabled={checkoutLoading !== null}
                        className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                      >
                        {checkoutLoading === "pro" ? "Redirecting to checkout..." : "Upgrade to Pro"}
                      </button>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Premium</p>
                    <p className="mt-2 text-2xl font-extrabold text-gray-900">S$299<span className="text-sm font-normal text-gray-400">/mo</span></p>
                    <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
                      <li>+ Everything in Pro</li>
                      <li>+ Highlighted sponsored placement in rankings</li>
                      <li>+ Dedicated account support</li>
                      <li>+ Monthly market insights for your area</li>
                    </ul>
                    <button
                      onClick={() => handleUpgrade("premium")}
                      disabled={checkoutLoading !== null}
                      className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      {checkoutLoading === "premium" ? "Redirecting to checkout..." : "Upgrade to Premium"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Premium badge */}
          {agent.subscription_tier === "premium" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                You are on the Premium plan. To manage your subscription or cancel, email{" "}
                <a href="mailto:hello@fair-comparisons.com" className="underline">hello@fair-comparisons.com</a>.
              </p>
            </div>
          )}

          {/* Profile edit form */}
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-sm font-bold text-gray-900">Edit your profile</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-5">
              {/* Message to buyers */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Message to buyers
                </label>
                <p className="mt-0.5 text-xs text-gray-400">This appears at the top of your profile. Tell buyers why they should work with you.</p>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setSaveStatus("idle"); }}
                  maxLength={500}
                  rows={3}
                  placeholder="Looking for a trusted agent in your area? I have 10+ years of experience helping buyers find their dream home."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{message.length}/500</p>
              </div>

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

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile photo
                </label>
                <p className="mt-0.5 text-xs text-gray-400">Upload a professional headshot. JPEG, PNG, or WebP.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
                />
                {uploadStatus === "uploading" && (
                  <p className="mt-2 text-xs text-teal-600">Uploading...</p>
                )}
                {uploadStatus === "done" && (
                  <p className="mt-2 text-xs text-green-600">{uploadMsg}</p>
                )}
                {uploadStatus === "error" && (
                  <p className="mt-2 text-xs text-red-500">{uploadMsg}</p>
                )}
                {photoUrl && (
                  <div className="mt-3">
                    <img
                      src={photoUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <p className="mt-1.5 truncate text-xs text-gray-400">{photoUrl}</p>
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
        </div>
      )}
    </div>
  );
}
