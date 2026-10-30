import type { SVGProps } from 'react';

/**
 * Hand-drawn minimal icon set (original artwork, PRD principle 6).
 * All icons inherit `currentColor` and render at 20px via CSS (.icon-btn svg).
 */

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  );
}

export function IconRedo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </Svg>
  );
}

export function IconEraser(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m8.5 16.5-4.2-4.2a1.5 1.5 0 0 1 0-2.1l7.6-7.6a1.5 1.5 0 0 1 2.1 0l5.2 5.2a1.5 1.5 0 0 1 0 2.1l-6.6 6.6z" />
      <path d="M5 21h14" />
      <path d="m6.5 10.5 7 7" />
    </Svg>
  );
}

/** Paint-bucket fill tool (round 6: fill a whole contiguous area). */
export function IconFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
      <path d="m5 2 5 5" />
      <path d="M2 13h15" />
      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15V4" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconVolume(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
      <path d="M16.5 9.5a3.6 3.6 0 0 1 0 5" />
      <path d="M18.8 7.2a7 7 0 0 1 0 9.6" />
    </Svg>
  );
}

export function IconMute(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
      <path d="m16 10 5 5" />
      <path d="m21 10-5 5" />
    </Svg>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 19V6l10-2v12" />
      <circle cx="6.5" cy="19" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 13 4 4 10-10" />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconFit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4" />
      <path d="M15 4h4a1 1 0 0 1 1 1v4" />
      <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
      <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
    </Svg>
  );
}

/** Four-way "move" arrows — pans the canvas without painting. */
export function IconMove(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="m9 5 3-3 3 3" />
      <path d="m9 19 3 3 3-3" />
      <path d="M5 9 2 12l3 3" />
      <path d="m19 9 3 3-3 3" />
    </Svg>
  );
}

/** Framed picture — toggles the floating "finished picture" reference card. */
export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 18 5.5-5.5a1.4 1.4 0 0 1 2 0L20 21" />
      <path d="m14.5 13.5 2-2a1.4 1.4 0 0 1 2 0L21 14" />
    </Svg>
  );
}

/** Small cross — closes the reference card. */
export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}
