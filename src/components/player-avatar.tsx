/* eslint-disable @next/next/no-img-element -- static export: no next/image optimization */

type PlayerAvatarProps = {
  username: string;
  avatarUrl: string | null;
  size?: "xs" | "sm" | "md";
};

/** Google avatar when available, otherwise the username initial. */
export function PlayerAvatar({ username, avatarUrl, size = "sm" }: PlayerAvatarProps) {
  const sizeClass = { xs: "h-6 w-6 text-sm", sm: "h-10 w-10 text-xl", md: "h-16 w-16 text-4xl" }[size];
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
