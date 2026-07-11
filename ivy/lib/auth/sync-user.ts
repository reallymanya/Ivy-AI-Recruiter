import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const userValues = {
    clerkUserId: input.clerkUserId,
    email: input.email ?? null,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    imageUrl: input.imageUrl ?? null,
    lastSignedInAt: input.lastSignedInAt ?? now,
    updatedAt: now,
  };

  return updateOrInsertUser(userValues);
}

async function updateOrInsertUser(userValues: {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  lastSignedInAt: Date;
  updatedAt: Date;
}) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userValues.clerkUserId))
    .limit(1);

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email: userValues.email,
        firstName: userValues.firstName,
        lastName: userValues.lastName,
        imageUrl: userValues.imageUrl,
        lastSignedInAt: userValues.lastSignedInAt,
        updatedAt: userValues.updatedAt,
      })
      .where(eq(users.clerkUserId, userValues.clerkUserId))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await db.insert(users).values(userValues).returning();

  return createdUser;
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
