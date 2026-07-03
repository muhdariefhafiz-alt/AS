"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setStatus("signing");
    setError("");
    try {
      const res = await fetch("/api/admin/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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

  return (
    <div className="mx-auto max-w-[420px] px-5 py-24">
      <h1 className="text-xl font-bold text-gray-900">Admin sign in</h1>
      <p className="mt-2 text-sm text-gray-500">Enter the admin password.</p>

      <form onSubmit={handleSignIn} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoFocus
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
    </div>
  );
}
