import ScrollReveal from "../components/ScrollReveal";
import DataMarquee from "../components/DataMarquee";
import CountUp from "../components/CountUp";
import InboxDemo from "../components/demos/InboxDemo";
import PlannerDemo from "../components/demos/PlannerDemo";
import JourneyDemo from "../components/demos/JourneyDemo";
import {
  HdbBlock, Shophouse, KeyLine, CalendarLine,
  CondoTower, TerraceRow, MrtTrain, SkylineStrip,
} from "../components/LineArt";
import { Icon } from "../components/Icons";

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

      {/* 6. Ink trust band, now with the skyline watermark along the base */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>6 · ink trust band + skyline watermark</p>
        <div className="fc-scene fc-scene--ink" style={{ textAlign: "center", paddingBottom: 84 }}>
          <SkylineStrip
            className="fc-lineart"
            width={640}
            style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -6, opacity: 0.5, maxWidth: "94%" }}
          />
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

      {/* 7. Line-art specimen row (full set) */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>7 · sg line-art set (specimens, floating)</p>
        <div style={{ display: "flex", gap: 36, alignItems: "flex-end", flexWrap: "wrap", color: "var(--line-2)" }}>
          <HdbBlock className="fc-float" width={140} />
          <CondoTower className="fc-float" width={82} style={{ ["--float-delay" as string]: ".4s" }} />
          <Shophouse className="fc-float" width={120} style={{ ["--float-delay" as string]: ".8s" }} />
          <TerraceRow className="fc-float" width={150} style={{ ["--float-delay" as string]: "1.2s" }} />
          <MrtTrain className="fc-float" width={125} style={{ ["--float-delay" as string]: "1.6s" }} />
          <KeyLine className="fc-float" width={66} style={{ ["--float-delay" as string]: "2s" }} />
          <CalendarLine className="fc-float" width={60} style={{ ["--float-delay" as string]: "2.4s" }} />
        </div>
        <div style={{ marginTop: 28, color: "var(--line-2)", overflowX: "auto" }}>
          <SkylineStrip width={640} />
        </div>
      </section>

      {/* 8. UI icon family */}
      <section style={{ marginBottom: 72 }}>
        <p style={label}>8 · ui icon family (same pen as the line-art)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 10 }}>
          {(Object.keys(Icon) as Array<keyof typeof Icon>).map((name) => {
            const C = Icon[name];
            return (
              <div
                key={name}
                className="fc-card"
                style={{ padding: "14px 8px", textAlign: "center", color: "var(--ink)" }}
              >
                <C size={22} />
                <div className="muted" style={{ fontSize: 11, marginTop: 6, fontFamily: "var(--font-mono)" }}>{name}</div>
              </div>
            );
          })}
        </div>
        {/* icon chips: the roundel treatment feature lists will use */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          {([
            ["Mail", "AI inbox"],
            ["Calendar", "Viewing planner"],
            ["Radar", "Deal Radar"],
            ["Shield", "CEA data only"],
            ["TrendUp", "Your standing"],
          ] as const).map(([name, labelTxt]) => {
            const C = Icon[name];
            return (
              <span
                key={name}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--line)",
                  borderRadius: 999, padding: "7px 14px 7px 8px", fontSize: 13.5, fontWeight: 600,
                }}
              >
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                    borderRadius: "50%", background: "var(--blue-wash)", color: "var(--blue-deep)",
                  }}
                >
                  <C size={15} />
                </span>
                {labelTxt}
              </span>
            );
          })}
        </div>
      </section>

      {/* 9. Placement patterns */}
      <section>
        <p style={label}>9 · placements: divider · feature bullets · empty state</p>

        {/* skyline divider between sections */}
        <div style={{ color: "var(--line-2)", textAlign: "center", margin: "6px 0 34px", overflow: "hidden" }}>
          <SkylineStrip width={520} style={{ maxWidth: "100%" }} />
        </div>

        {/* feature bullets with icon roundels (housapp-style benefit rows) */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", marginBottom: 34 }}>
          {([
            ["Spark", "Reply 90% faster", "AI drafts grounded in your own record"],
            ["Calendar", "2 hours back per week", "Viewings book and confirm themselves"],
            ["TrendUp", "Sellers see you climb", "Your standing updates every month"],
          ] as const).map(([name, t, s], i) => {
            const C = Icon[name];
            return (
              <div key={t} className="fc-card fc-reveal" style={{ ["--reveal-delay" as string]: `${0.12 * i}s`, padding: "16px 18px", display: "flex", gap: 12 }}>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38,
                    borderRadius: 12, background: "var(--blue-wash)", color: "var(--blue-deep)", flex: "0 0 auto",
                  }}
                >
                  <C size={19} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t}</div>
                  <p className="muted small" style={{ margin: "3px 0 0" }}>{s}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 10. JourneyDemo (Wave 3a: the homepage thesis moment) */}
        <div style={{ margin: "0 0 34px" }}>
          <p style={label}>10 · journeydemo: ranked rows cascade &gt; three invites pop &gt; quotes arrive</p>
          <div className="fc-scene fc-scene--inbox">
            <JourneyDemo />
          </div>
        </div>

        {/* empty state vignette */}
        <div className="fc-card" style={{ maxWidth: 420, padding: "28px 24px", textAlign: "center", color: "var(--ink)" }}>
          <CalendarLine className="fc-float" width={56} style={{ color: "var(--line-2)" }} />
          <div style={{ fontWeight: 700, marginTop: 10 }}>No viewings yet</div>
          <p className="muted small" style={{ margin: "6px 0 14px" }}>
            Share your booking link and requests will land here.
          </p>
          <span className="fc-btn fc-btn--primary fc-btn--sm">Copy booking link</span>
        </div>
      </section>
    </div>
  );
}
