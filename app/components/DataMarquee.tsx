// Scrolling strip of platform facts: The Record's honest substitute for a
// customer-logo wall (no fake logos, no fake testimonials - the data IS the
// social proof). Server component; animation is pure CSS (.fc-marquee). The
// track renders twice for a seamless loop; the duplicate is aria-hidden and
// hidden entirely under reduced motion, leaving one static readable copy.
export default function DataMarquee({ items }: { items: string[] }) {
  const track = (hidden: boolean) => (
    <div className="fc-marquee__track" aria-hidden={hidden ? "true" : undefined}>
      {items.map((t, i) => (
        <span key={i} className="fc-marquee__item">
          <span className="dot" />
          {t}
        </span>
      ))}
    </div>
  );
  return (
    <div className="fc-marquee">
      {track(false)}
      {track(true)}
    </div>
  );
}
