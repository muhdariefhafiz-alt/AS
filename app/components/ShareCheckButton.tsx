"use client";

// Forwardable WhatsApp share for the "check an agent" utility (F3). wa.me is the
// SG default; sharing carries genuine protective value ("check if they're legit").
// Fires a tracked share_click so K (sharing) is measured, not guessed.

type Props = {
  url: string;
  text: string;
  path: string;          // page the share happened on (for tracking)
  label?: string;
  className?: string;
};

export default function ShareCheckButton({ url, text, path, label = "Share on WhatsApp", className }: Props) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  function onClick() {
    try {
      const sid = (localStorage.getItem("fc_sid") || "").split(":")[0] || null;
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ path, event: "share_click", utm_source: "wa_share", session_id: sid }),
      }).catch(() => {});
    } catch { /* never break the share */ }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className ?? "inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.95 1.34-.5.05-1.13.24-3.66-.77-3.08-1.24-5.05-4.4-5.2-4.6-.15-.2-1.24-1.65-1.24-3.15s.79-2.24 1.07-2.54c.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.24.6.83 2.06.9 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.8 1.32 1.71 2.14 1.18 1.05 2.17 1.38 2.48 1.53.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.22.58.35.07.12.07.72-.17 1.4z"/></svg>
      {label}
    </a>
  );
}
