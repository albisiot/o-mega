/* eslint-disable @next/next/no-img-element -- static export: no next/image optimization */
import { thumbArtUrl } from "@/lib/art";
import { isCardArtAvatar } from "@/lib/avatar";
import { withBasePath } from "@/lib/base-path";

type AvatarSize = "2xs" | "xs" | "sm" | "md" | "lg";

type PlayerAvatarProps = {
  username: string;
  avatarUrl: string | null;
  size?: AvatarSize;
  className?: string;
};

const SIZES: Record<AvatarSize, string> = {
  "2xs": "h-[18px] w-[18px] text-[11px]",
  xs: "h-6 w-6 text-sm",
  sm: "h-10 w-10 text-xl",
  md: "h-16 w-16 text-4xl",
  lg: "h-20 w-20 text-5xl",
};

const FRAME = "rotate-3 shadow-[3px_3px_0_var(--foreground)]";
const SMALL_FRAME = "rotate-3 shadow-[2px_2px_0_var(--foreground)]";

/**
 * The face of a card drawing in a square: the drawings are 3:4 with the face in the top part,
 * centred, so the square takes a little over half their width from near the top.
 */
export function CardFace({ artUrl, className = "" }: { artUrl: string; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-black ${className}`}>
      <img
        src={withBasePath(thumbArtUrl(artUrl))}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute left-[-40%] top-[-5%] w-[180%] max-w-none"
      />
    </span>
  );
}

/** The player's avatar: the face of the chosen character, else the account photo, else the username initial. */
export function PlayerAvatar({ username, avatarUrl, size = "sm", className = "" }: PlayerAvatarProps) {
  const box = `${SIZES[size]} ${size === "2xs" ? SMALL_FRAME : FRAME} shrink-0 ${className}`;
  if (isCardArtAvatar(avatarUrl)) {
    return <CardFace artUrl={avatarUrl} className={box} />;
  }
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className={`${box} object-cover`} />;
  }
  return (
    <span aria-hidden className={`${box} flex items-center justify-center bg-comic-cyan font-display text-black`}>
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
