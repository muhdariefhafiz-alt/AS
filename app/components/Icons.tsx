// UI icon family: 24px grid, stroke-only, round caps, currentColor - the same
// pen as the LineArt set so illustrations and interface icons read as one hand.
// Use via <Icon.Mail size={18} /> style calls; decorative by default
// (aria-hidden) since they always sit next to a text label per house style.
// Note: the chat icon is a generic speech bubble on purpose (the WhatsApp
// glyph is trademarked).

import type { CSSProperties } from "react";

type P = { size?: number; className?: string; style?: CSSProperties; strokeWidth?: number };

function Svg({ size = 20, className, style, strokeWidth = 1.75, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Mail: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7.5 L12 13 L20 7.5" />
    </Svg>
  ),
  Chat: (p: P) => (
    <Svg {...p}>
      <path d="M4 6.5 A2.5 2.5 0 0 1 6.5 4 H17.5 A2.5 2.5 0 0 1 20 6.5 V14 A2.5 2.5 0 0 1 17.5 16.5 H9 L5 20 V16.5 H6.5 A2.5 2.5 0 0 1 4 14 Z" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" />
      <line x1="8.5" y1="12" x2="13" y2="12" />
    </Svg>
  ),
  Calendar: (p: P) => (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
      <path d="M8.5 14.5 l2.4 2.4 L15.5 12.5" />
    </Svg>
  ),
  Radar: (p: P) => (
    <Svg {...p}>
      <path d="M12 3 A9 9 0 1 1 3 12" />
      <path d="M12 7 A5 5 0 1 1 7 12" />
      <circle cx="12" cy="12" r="0.9" />
      <line x1="12" y1="12" x2="18.5" y2="5.5" />
    </Svg>
  ),
  TrendUp: (p: P) => (
    <Svg {...p}>
      <path d="M3.5 17.5 L9 12 L13 15.5 L20.5 7.5" />
      <path d="M15.5 7.5 H20.5 V12.5" />
    </Svg>
  ),
  Shield: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.5 L19.5 6.5 V11.5 C19.5 16 16.5 19 12 20.8 C7.5 19 4.5 16 4.5 11.5 V6.5 Z" />
      <path d="M8.8 11.8 l2.2 2.2 L15.4 9.6" />
    </Svg>
  ),
  Bell: (p: P) => (
    <Svg {...p}>
      <path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18.5 H4.5 Z" />
      <path d="M10 21 A2.2 2.2 0 0 0 14 21" />
    </Svg>
  ),
  Doc: (p: P) => (
    <Svg {...p}>
      <path d="M6 3.5 H14.5 L19 8 V20.5 H6 Z" />
      <path d="M14.5 3.5 V8 H19" />
      <line x1="9" y1="12" x2="16" y2="12" />
      <line x1="9" y1="15.5" x2="16" y2="15.5" />
    </Svg>
  ),
  Pin: (p: P) => (
    <Svg {...p}>
      <path d="M12 21 C12 21 5 14.5 5 9.8 A7 7 0 0 1 19 9.8 C19 14.5 12 21 12 21 Z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </Svg>
  ),
  Star: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.8 L14.4 9 L20 9.7 L15.9 13.5 L17 19.2 L12 16.4 L7 19.2 L8.1 13.5 L4 9.7 L9.6 9 Z" />
    </Svg>
  ),
  Spark: (p: P) => (
    <Svg {...p}>
      <path d="M12 3 C12.7 7.5 15.4 10.3 20 11 C15.4 11.7 12.7 14.5 12 19 C11.3 14.5 8.6 11.7 4 11 C8.6 10.3 11.3 7.5 12 3 Z" />
      <path d="M18.5 16.5 c.3 1.6 1.2 2.6 3 3 c-1.8 .4 -2.7 1.4 -3 3 c-.3 -1.6 -1.2 -2.6 -3 -3 c1.8 -.4 2.7 -1.4 3 -3 Z" />
    </Svg>
  ),
  Home: (p: P) => (
    <Svg {...p}>
      <path d="M4 11.5 L12 4.5 L20 11.5" />
      <path d="M6.5 10 V20 H17.5 V10" />
      <rect x="10.2" y="14" width="3.6" height="6" />
    </Svg>
  ),
  Search: (p: P) => (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.3" y1="15.3" x2="20.5" y2="20.5" />
    </Svg>
  ),
  Key: (p: P) => (
    <Svg {...p}>
      <circle cx="8" cy="12" r="4.2" />
      <line x1="12.2" y1="12" x2="20.5" y2="12" />
      <line x1="17" y1="12" x2="17" y2="15.5" />
      <line x1="20.5" y1="12" x2="20.5" y2="14.5" />
    </Svg>
  ),
};

export type IconName = keyof typeof Icon;
