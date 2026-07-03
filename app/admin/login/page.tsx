"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [error, setError] = useState("");
  const [magic, setMagic] = useState<"idle" | "sending" | "sent">("idle");

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus("signing");
    setError("");
    try {
      const res = await fetch("/api/admin/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Sign in failed.");
      setStatus("error");
    } catch {
      setError("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your admin email first.");
      return;
    }
    setMagic("sending");
    try {
      await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMagic("sent");
    } catch {
      setMagic("idle");
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-5 py-24">
      <h1 className="text-xl font-bold text-gray-900">Admin sign in</h1>
      <p className="mt-2 text-sm text-gray-500">
        Sign in with your admin email and password.
      </p>

      <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={status === "signing"}
          className="w-full rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {status === "signing" ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <div className="mt-8 border-t border-gray-100 pt-6">
        {magic === "sent" ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-medium text-teal-800">Sign-in link sent.</p>
            <p className="mt-1 text-sm text-teal-700">
              If the email matches an admin account and delivery is working, a
              link is on its way. It expires in 24 hours.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magic === "sending"}
            className="text-sm font-medium text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
          >
            {magic === "sending"
              ? "Sending..."
              : "Email me a one-time sign-in link instead"}
          </button>
        )}
      </div>
    </div>
  );
}
