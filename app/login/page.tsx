import { redirect } from "next/navigation";

// "/login" is what people type, and it is what we can safely put in emails and
// on /for-agents. The actual sign-in form lives on /dashboard (it renders there
// when signed out), so this is a thin alias rather than a second form to keep in
// sync. Kept out of the index: it is a doorway, not a landing page.
export const metadata = {
  title: "Agent sign in - FairComparisons",
  description: "Sign in to your FairComparisons agent dashboard.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  redirect("/dashboard");
}
