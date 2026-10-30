/* eslint-disable @next/next/no-img-element -- static export: no next/image optimization */

type PlayerAvatarProps = {
  username: string;
  avatarUrl: string | null;
  size?: "sm" | "lg";
};

/** Google avatar when available, otherwise the username initial. */
export function PlayerAvatar({ username, avatarUrl, size = "sm" }: PlayerAvatarProps) {
  const sizeClass = size === "lg" ? "h-24 w-24 text-5xl" : "h-10 w-10 text-xl";
  const frameClass = "rotate-3 shadow-[3px_3px_0_var(--foreground)]";
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className={`${sizeClass} ${frameClass} object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${sizeClass} ${frameClass} flex items-center justify-center bg-comic-cyan font-display text-black`}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
