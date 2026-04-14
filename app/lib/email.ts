import { Resend } from "resend";

const FROM = "FairComparisons <updates@fair-comparisons.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email-skip] No RESEND_API_KEY. Would send to ${to}: ${subject}`);
    return { id: "dry-run" };
  }

  const { data, error } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email-error]", error);
    throw new Error(error.message);
  }

  return data;
}

export async function sendBatchEmails(
  emails: { to: string; subject: string; html: string }[]
) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email-skip] No RESEND_API_KEY. Would send ${emails.length} emails.`);
    return [];
  }

  const batch = emails.map((e) => ({
    from: FROM,
    to: e.to,
    subject: e.subject,
    html: e.html,
  }));

  const { data, error } = await getResend().batch.send(batch);

  if (error) {
    console.error("[email-batch-error]", error);
    throw new Error(error.message);
  }

  return data;
}
