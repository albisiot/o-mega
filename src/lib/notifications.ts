import { subscribeToUpdates } from "@/lib/match";
import { parseNotifications, type PlayerNotification } from "@/lib/notification-queue";
import { getSupabase } from "@/lib/supabase/client";

/** The player's unseen news of the last hours, oldest first (SPEC §11.1). */
export async function fetchUnseenNotifications(): Promise<PlayerNotification[]> {
  const { data, error } = await getSupabase().rpc("get_player_notifications");
  if (error) throw error;
  return parseNotifications(data);
}

/** Marks news seen on the server, so it does not show again on another device or visit. */
export async function markNotificationsSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabase().rpc("mark_player_notifications_seen", { p_ids: ids });
  if (error) throw error;
}

/**
 * Calls `onPing` when the server writes news for this player. The ping carries no content:
 * the news is then read with fetchUnseenNotifications. `onLive` tells when pings can arrive.
 */
export function subscribeToNotifications(
  userId: string,
  onPing: () => void,
  onLive?: (live: boolean) => void,
): () => void {
  return subscribeToUpdates(`notify:${userId}`, (payload) => {
    if (payload.kind === "notification") onPing();
  }, onLive);
}
