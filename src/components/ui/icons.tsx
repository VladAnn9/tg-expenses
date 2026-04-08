interface IconProps {
  className?: string;
}

export function SaveIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M8 12.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function ClearIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function TrashIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6.5 7v4M9.5 7v4M3.5 4.5l.5 8a1 1 0 001 1h6a1 1 0 001-1l.5-8" />
    </svg>
  );
}

export function MoreIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}
