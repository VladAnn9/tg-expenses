import { createAdminClient } from "./admin";

/**
 * Returns an array of user IDs that share a household with the given user.
 * If the user is not in any household, returns [userId].
 */
export async function getHouseholdMemberIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string[]> {
  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", userId)
    .single();

  if (!profile?.household_id) return [userId];

  const { data: members } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", profile.household_id);

  if (!members || members.length === 0) return [userId];

  return members.map((m) => m.user_id);
}
