import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type ClerkUserProfile = {
  id: string;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
};

export type UserSyncInput = {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  lastSignedInAt?: Date | null;
};

export async function upsertUser(input: UserSyncInput) {
  const now = new Date();

  const [syncedUser] = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      imageUrl: input.imageUrl ?? null,
      lastSignedInAt: input.lastSignedInAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: input.email ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        imageUrl: input.imageUrl ?? null,
        lastSignedInAt: input.lastSignedInAt ?? now,
        updatedAt: now,
      },
    })
    .returning();

  return syncedUser;
}

export async function syncCurrentUser(user: ClerkUserProfile) {
  return upsertUser({
    clerkUserId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? null,
  });
}
