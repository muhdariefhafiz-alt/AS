"use client";

import { useState } from "react";

type Props = {
  token: string;
  initialEmail: string;
  initialPhone: string;
  initialWhatsapp: string;
  initialConsent: boolean;
};

export default function ContactForm({
  token,
  initialEmail,
  initialPhone,
  initialWhatsapp,
  initialConsent,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [consent, setConsent] = useState(initialConsent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/sell/contact-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          marketing_consent: consent,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not update.");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setError("Network error.");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Mobile</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+65 ..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            WhatsApp <span className="text-xs text-gray-400">(optional)</span>
          </span>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+65 ..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Send me WhatsApp + email updates about my sale and the agents I compare.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {status === "saved" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Updated. Future notifications go to these details.
        </div>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className={
          "mt-5 w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition " +
          (status === "saving" ? "bg-gray-300" : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
        }
      >
        {status === "saving" ? "Saving…" : "Update my details"}
      </button>
    </form>
  );
}
