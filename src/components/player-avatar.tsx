/* eslint-disable @next/next/no-img-element -- static export: no next/image optimization */

type PlayerAvatarProps = {
  username: string;
  avatarUrl: string | null;
  size?: "sm" | "lg";
};

/** Google avatar when available, otherwise the username initial. */
export function PlayerAvatar({ username, avatarUrl, size = "sm" }: PlayerAvatarProps) {
  const sizeClass = size === "lg" ? "h-20 w-20 text-3xl" : "h-9 w-9 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full border border-white/10 object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${sizeClass} flex items-center justify-center rounded-full bg-amber-400/20 font-bold text-amber-300`}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
