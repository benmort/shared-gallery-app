import { cookies } from "next/headers";
import {
  moderationCookieName,
  verifyModerationToken,
} from "@/lib/moderation-auth";

export async function readModerationCookie(): Promise<boolean> {
  const c = await cookies();
  const v = c.get(moderationCookieName)?.value;
  if (!v) return false;
  return verifyModerationToken(v);
}
