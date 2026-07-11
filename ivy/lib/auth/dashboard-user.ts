import { auth, currentUser } from "@clerk/nextjs/server";

import { syncCurrentUser, type ClerkUserProfile } from "./sync-user";

type SessionClaims = {
  email?: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
};

export async function getDashboardUser() {
  const authResult = await auth.protect();

  try {
    const user = await currentUser();

    if (user) {
      return syncCurrentUser(user);
    }
  } catch {
    // Fall back to session claims when Clerk's user API is temporarily unavailable.
  }

  const claims = authResult.sessionClaims as SessionClaims | undefined;
  const fallbackUser: ClerkUserProfile = {
    id: authResult.userId,
    primaryEmailAddress: {
      emailAddress: claims?.email ?? null,
    },
    firstName: claims?.first_name ?? null,
    lastName: claims?.last_name ?? null,
    imageUrl: claims?.image_url ?? null,
  };

  return syncCurrentUser(fallbackUser);
}
