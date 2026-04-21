"use client";

import Link from "next/link";
import { useState } from "react";

type AgentRef = {
  id: number;
  name: string;
  slug: string;
  agency_name: string | null;
  primary_area: string | null;
  photo_url: string | null;
};

type PendingMessage = AgentRef & { message: string; message_updated_at: string | null };
type PendingPhoto = AgentRef & { photo_url: string; photo_updated_at: string | null };
type PendingBio = AgentRef & { bio: string; bio_updated_at: string | null };

type Props = {
  messages: PendingMessage[];
  photos: PendingPhoto[];
  bios: PendingBio[];
};

export function ModerationQueue(props: Props) {
  const [msgs, setMsgs] = useState(props.messages);
  const [photos, setPhotos] = useState(props.photos);
  const [bios, setBios] = useState(props.bios);
  const [busy, setBusy] = useState<number | null>(null);

  async function act(type: "message" | "photo" | "bio", agentId: number, decision: "approve" | "reject") {
    setBusy(agentId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, agentId, decision }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Action failed");
        setBusy(null);
        return;
      }
      if (type === "message") setMsgs(msgs.filter((m) => m.id !== agentId));
      if (type === "photo") setPhotos(photos.filter((p) => p.id !== agentId));
      if (type === "bio") setBios(bios.filter((b) => b.id !== agentId));
    } catch {
      alert("Network error");
    } finally {
      setBusy(null);
    }
  }

  const total = msgs.length + photos.length + bios.length;

  if (total === 0) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
        All clear. No pending moderation items.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        {total} item{total !== 1 ? "s" : ""} pending ({msgs.length} message, {photos.length} photo, {bios.length} bio)
      </div>

      {msgs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Messages ({msgs.length})</h2>
          <div className="mt-3 space-y-3">
            {msgs.map((m) => (
              <article key={m.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <AgentHeader agent={m} submittedAt={m.message_updated_at} />
                <blockquote className="mt-3 rounded bg-gray-50 px-3 py-2 text-sm italic text-gray-800">
                  &ldquo;{m.message}&rdquo;
                </blockquote>
                <Actions
                  busy={busy === m.id}
                  onApprove={() => act("message", m.id, "approve")}
                  onReject={() => act("message", m.id, "reject")}
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Photos ({photos.length})</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {photos.map((p) => (
              <article key={p.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <AgentHeader agent={p} submittedAt={p.photo_updated_at} />
                <div className="mt-3 overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo_url} alt={p.name} className="h-48 w-full object-cover" />
                </div>
                <p className="mt-2 truncate text-[10px] text-gray-400">{p.photo_url}</p>
                <Actions
                  busy={busy === p.id}
                  onApprove={() => act("photo", p.id, "approve")}
                  onReject={() => act("photo", p.id, "reject")}
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {bios.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Bios ({bios.length})</h2>
          <div className="mt-3 space-y-3">
            {bios.map((b) => (
              <article key={b.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <AgentHeader agent={b} submittedAt={b.bio_updated_at} />
                <p className="mt-3 whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 text-sm text-gray-800">{b.bio}</p>
                <Actions
                  busy={busy === b.id}
                  onApprove={() => act("bio", b.id, "approve")}
                  onReject={() => act("bio", b.id, "reject")}
                />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AgentHeader({ agent, submittedAt }: { agent: AgentRef; submittedAt: string | null }) {
  const age = submittedAt ? timeAgo(submittedAt) : null;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        {agent.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.photo_url}
            alt=""
            className="h-8 w-8 rounded-full border border-gray-200 object-cover"
          />
        )}
        <div>
          <Link
            href={`/property-agents/agent/${agent.slug}`}
            target="_blank"
            className="text-sm font-semibold text-gray-900 hover:text-teal-700"
          >
            {agent.name}
          </Link>
          <div className="text-[11px] text-gray-500">
            {agent.agency_name || "Independent"}
            {agent.primary_area && ` · ${agent.primary_area}`}
          </div>
        </div>
      </div>
      {age && <span className="text-[10px] text-gray-500">{age}</span>}
    </div>
  );
}

function Actions({ busy, onApprove, onReject }: { busy: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={onApprove}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={onReject}
        disabled={busy}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
