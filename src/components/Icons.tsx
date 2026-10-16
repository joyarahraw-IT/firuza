import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};
type P = SVGProps<SVGSVGElement>;

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);
export const UserIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.7" />
    <path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
  </svg>
);
export const BagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
// pillar icons
export const HandIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 20c0-6 1-9 3-9V4.5a1.2 1.2 0 0 1 2.4 0V10m0-1.5V3.8a1.2 1.2 0 0 1 2.4 0V9m0-4.2a1.2 1.2 0 0 1 2.4 0V10m0-3a1.2 1.2 0 0 1 2.4 0v7c0 3-1.5 6-4.5 6H9" />
  </svg>
);
export const CalendarIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    <path d="m9.5 15 1.8 1.8 3.4-3.6" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.2 12.2 2.6 2.6 5-5.2" />
  </svg>
);
export const ChatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H11l-4.5 3.5V16a2 2 0 0 1-2-2z" />
    <path d="M8.5 9.5h7M8.5 12.5h4.5" />
  </svg>
);
export const pillarIcons = { hand: HandIcon, calendar: CalendarIcon, check: CheckIcon, chat: ChatIcon } as const;
