import { emailShell, p, muted } from "./email-layout";

// Lifecycle ACTIVATION emails for newly-claimed, still-incomplete agents.
// Honest-by-construction: every line is true today, no fabricated numbers,
// signed unsubscribe on every send, links only to the agent's own dashboard.
// Each step attacks the profile gaps that most block a claimed agent from
// converting the sellers already viewing them. Sends via Resend (sendEmail).

export type ActivationAgent = {
  name: string | null;
  email: string;
  slug: string | null;
  primary_area: string | null;
  photo_url: string | null;
  message: string | null;
  whatsapp: string | null;
  bio: string | null;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
const DASH = `${SITE}/dashboard?utm_source=activation`;

function given(name: string | null): string {
  if (!name) return "there";
  const cleaned = name.replace(/\(.*?\)/g, "").trim();
  const first = cleaned.split(/\s+/)[0] || "there";
  return first.charAt(0) + first.slice(1).toLowerCase();
}

// The single highest-impact thing still missing, in conversion-weight order.
function topGap(a: ActivationAgent): { field: string; line: string } | null {
  if (!a.photo_url) return { field: "photo", line: "add a profile photo" };
  if (!a.message) return { field: "message", line: "write your one-line message to sellers" };
  if (!a.whatsapp) return { field: "whatsapp", line: "add your WhatsApp for instant lead alerts" };
  if (!a.bio) return { field: "bio", line: "add a short bio" };
  return null;
}

type Built = { subject: string; html: string } | null;

// step is the email number to send (1..4).
export function buildActivationEmail(step: number, a: ActivationAgent): Built {
  const who = given(a.name);
  const area = a.primary_area ? a.primary_area : "your area";
  const gap = topGap(a);
  const foot = `Sent to ${a.email} because you claimed your agent profile on FairComparisons.`;
  const cta = { label: "Open your dashboard", href: DASH };

  if (step === 1) {
    return {
      subject: "Your profile is live, but sellers can't see the best of you yet",
      html: emailShell({
        preheader: "A photo and one line is the difference between being found and being contacted.",
        heading: `${who}, your profile is claimed. Now make it convert.`,
        bodyHtml:
          p(`Sellers in ${area} are already comparing agents on FairComparisons and can see your real CEA record. What they can't see yet is you.`) +
          p(`The two things that turn a profile view into a message: a <strong>photo</strong> and a <strong>one-line message</strong> telling sellers why to pick you. Both take under a minute.`) +
          (gap ? muted(`Your quickest win right now: ${gap.line}.`) : muted(`You're close, finish the last details on your dashboard.`)),
        cta,
        footerNote: foot,
        unsubscribeEmail: a.email,
      }),
    };
  }

  if (step === 2) {
    return {
      subject: `${who}, a seller can't actually reach you yet`,
      html: emailShell({
        preheader: "Connect WhatsApp so you hear the moment a seller shortlists you.",
        heading: "Rank is earned. Reachability is a setting.",
        bodyHtml:
          p(`You're ranked on your real transaction record, that part is done. But a seller who shortlists you can only reach you if you've given them a way.`) +
          p(`Add your <strong>WhatsApp number</strong> and we alert you the moment a seller picks you, so you can reply from your dashboard before the window closes. Then add the <strong>farm areas</strong> you work, and Deal Radar starts handing you owners reaching their MOP nearby.`) +
          muted(`It's the plumbing between your ranking and your inbox. Two fields.`),
        cta,
        footerNote: foot,
        unsubscribeEmail: a.email,
      }),
    };
  }

  if (step === 3) {
    return {
      subject: `Seller demand in ${area}, on your dashboard`,
      html: emailShell({
        preheader: "See who's viewing and shortlisting you, and who's about to sell nearby.",
        heading: "Your dashboard shows real demand, not vanity metrics.",
        bodyHtml:
          p(`Your Demand panel shows real sellers viewing your profile and shortlisting you, honest numbers that never change your rank or who gets leads.`) +
          p(`And Deal Radar surfaces owners in ${area} reaching their 5-year MOP plus every fresh nearby sale, so you always have a warm call list. It's the prospecting that used to cost you a portal subscription, free.`) +
          muted(`Everything is on one dashboard. No portal fee, no pay-to-rank.`),
        cta,
        footerNote: foot,
        unsubscribeEmail: a.email,
      }),
    };
  }

  // step 4: final nudge, targets the single biggest remaining gap, then rests.
  return {
    subject: gap ? `One step left, ${who}: ${gap.line}` : `${who}, you're all set on FairComparisons`,
    html: emailShell({
      preheader: gap ? "The last field between your ranking and a seller's message." : "Your profile is complete and working for you.",
      heading: gap ? "You're one field from a profile sellers contact." : "You're set up. Here's what happens now.",
      bodyHtml: gap
        ? p(`You've done the hard part, your record is public and ranked. The last thing holding your profile back is one detail: <strong>${gap.line}</strong>.`) +
          p(`A complete profile converts more of the sellers already looking at you. This is the last email we'll send about setup.`)
        : p(`Your profile is complete and ranked. From here, sellers compare you in ${area} and invite the ones they choose, and we pass you that introduction free.`) +
          p(`Keep your farm areas current so Deal Radar stays useful, and reply fast when a seller shortlists you. That's the whole game.`),
      cta,
      footerNote: foot,
      unsubscribeEmail: a.email,
    }),
  };
}
