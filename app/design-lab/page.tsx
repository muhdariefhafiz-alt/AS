import ScrollReveal from "../components/ScrollReveal";
import DataMarquee from "../components/DataMarquee";
import CountUp from "../components/CountUp";
import InboxDemo from "../components/demos/InboxDemo";
import PlannerDemo from "../components/demos/PlannerDemo";
import { HdbBlock, Shophouse, KeyLine, CalendarLine } from "../components/LineArt";

// Internal proving ground for the Wave-1 motion design system. Every primitive
// that Waves 2-3 will use renders here once, so design review happens on ONE
// page before anything touches a real surface. Not linked anywhere; noindexed.
export const metadata = {
  title: "Design lab - FairComparisons",
  robots: { index: false, follow: false },
};

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--slate)",
  margin: "0 0 14px",
};

export default function DesignLabPage() {
  return (
    <div className="fc-wrap" style={{ padding: "48px 40px 120px" }}>
      <ScrollReveal />

      {/* 1. Hero load-in stagger + italic accent + hairline CTA */}
      <section style={{ padding: "40px 0 64px", textAlign: "center", position: "relative" }}>
        <Shophouse className="fc-lineart fc-float" width={120} style={{ position: "absolute", right: 0, top: 10 }} />
        <HdbBlock
          className="fc-lineart fc-float"
          width={140}
          style={{ position: "absolute", left: 0, bottom: 0, ["--float-delay" as string]: "1.6s" }}
        />
        <p style={label}>1 · hero load-in + serif italic accent + cta hairline</p>
        <h1 className="fc-hero-in fc-hero-in--1" style={{ fontSize: "clamp(34px,4.6vw,56px)", lineHeight: 1.05, margin: 0 }}>
          Your track record,{" "}
          <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--blue)" }}>working for you</span>
        </h1>
        <p className="fc-hero-in fc-hero-in--2 muted" style={{ fontSize: 18, margin: "16px auto 26px", maxWidth: "48ch" }}>
          The presentation layer for the agent suite: scenes, self-typing demos, honest data proof.
        </p>
        <div className="fc-hero-in fc-hero-in--3" style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <a href="#inbox" className="fc-btn fc-btn--primary fc-btn--hairline">Primary with hairline</a>
          <a href="#inbox" className="fc-btn fc-btn--ghost">Ghost stays plain</a>
        </div>
      </section>

      {/* 2. Data marquee */}
      <section style={{ margin: "0 -40px 72px" }}>
        <p style={{ ...label, padding: "0 40px" }}>2 · data marquee (honest logo-wall substitute)</p>
        <DataMarquee
          items={[
            "38,110 agents ranked",
            "1.1M transactions",
            "28 districts",
            "CEA, URA and HDB data only",
            "Rankings cannot be bought",
          ]}
        />
      </section>

      {/* 3. Inbox scene: choreographed (enquiry arrives, AI types, buttons appear) */}
      <section id="inbox" style={{ marginBottom: 72 }}>
        <p style={label}>3 · inbox scene, choreographed: enquiry arrives &gt; ai badge &gt; draft types &gt; actions appear</p>
        <div className="fc-scene fc-scene--inbox fc-reveal">
          <Shophouse className="fc-lineart fc-float" width={110} style={{ position: "absolute", right: 22, bottom: 14 }} />
          <InboxDemo />
        </div>
      </section>

      {/* 4. Planner scene: chips pop in, one selects itself, confirmation lands */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>4 · planner scene: chips pop in &gt; slot self-selects &gt; calendar confirmation</p>
        <div className="fc-scene fc-scene--planner fc-reveal">
          <CalendarLine className="fc-lineart fc-float" width={62} style={{ position: "absolute", left: 26, top: 20 }} />
          <PlannerDemo />
        </div>
      </section>

      {/* 5. Grow scene: staggered cards + counters ticking up */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>5 · grow scene: staggered cards + live counters</p>
        <div className="fc-scene fc-scene--grow">
          <KeyLine className="fc-lineart fc-float" width={70} style={{ position: "absolute", right: 28, top: 22 }} />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginTop: 16 }}>
            {[
              { t: "Profile views", n: 41, suffix: "", s: "sellers viewed you this week" },
              { t: "Deal Radar", n: 3, suffix: "", s: "Tampines owners hit MOP this month" },
              { t: "Your standing", n: 2, suffix: " ↑", s: "places up in Tampines" },
            ].map((c, i) => (
              <div
                key={c.t}
                className="fc-scene__card fc-reveal"
                style={{ ["--reveal-delay" as string]: `${0.14 * i}s`, padding: "16px 18px" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--slate)" }}>{c.t}</div>
                <div style={{ fontSize: 30, fontWeight: 700, margin: "2px 0", fontVariantNumeric: "tabular-nums" }}>
                  <CountUp value={c.n} suffix={c.suffix} />
                </div>
                <p className="muted small" style={{ margin: 0 }}>{c.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Ink trust band */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>6 · ink trust band</p>
        <div className="fc-scene fc-scene--ink" style={{ textAlign: "center" }}>
          <HdbBlock className="fc-lineart fc-float" width={150} style={{ position: "absolute", left: 26, bottom: 16 }} />
          <h2 style={{ color: "#fff", fontSize: "clamp(24px,3vw,34px)", margin: "10px 0 6px" }}>
            Ranked on government data. <span style={{ fontStyle: "italic", fontWeight: 400 }}>Never advertising.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.72)", margin: "0 auto", maxWidth: "52ch", fontSize: 15 }}>
            CEA, URA and HDB records only. No paid placement, no bought rankings, PDPA-first data handling.
          </p>
          <div style={{ display: "flex", gap: 26, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            {[["38,110", "agents ranked"], ["1.1M", "transactions"], ["28", "districts"]].map(([n, s], i) => (
              <div key={s} className="fc-reveal" style={{ ["--reveal-delay" as string]: `${0.12 * i}s` }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{n}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Line-art specimen row */}
      <section>
        <p style={label}>7 · sg line-art set (specimens, floating)</p>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-end", flexWrap: "wrap", color: "var(--line-2)" }}>
          <HdbBlock className="fc-float" width={150} />
          <Shophouse className="fc-float" width={130} style={{ ["--float-delay" as string]: ".8s" }} />
          <KeyLine className="fc-float" width={70} style={{ ["--float-delay" as string]: "1.6s" }} />
          <CalendarLine className="fc-float" width={64} style={{ ["--float-delay" as string]: "2.4s" }} />
        </div>
      </section>
    </div>
  );
}
