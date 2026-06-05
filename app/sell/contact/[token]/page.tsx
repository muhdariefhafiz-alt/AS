import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Update your contact details · FairComparisons",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function ContactPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select("token, full_name, email, phone, whatsapp, marketing_consent")
    .eq("token", token)
    .single();
  if (!lead) notFound();

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[560px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Your details
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            {lead.full_name?.split(" ")[0] ?? "Hi"}, keep your contact details
            current
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We send shortlists, quotes and updates here. Change them any time.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[560px] px-5 md:px-8">
          <ContactForm
            token={lead.token}
            initialEmail={lead.email ?? ""}
            initialPhone={lead.phone ?? ""}
            initialWhatsapp={lead.whatsapp ?? ""}
            initialConsent={Boolean(lead.marketing_consent)}
          />
        </div>
      </section>
    </>
  );
}
