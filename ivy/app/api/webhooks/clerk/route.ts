import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { upsertUser } from "@/lib/auth/sync-user";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserWebhookData = {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserWebhookData;
};

function getPrimaryEmail(data: ClerkUserWebhookData) {
  const primaryEmail = data.email_addresses?.find(
    (email) => email.id === data.primary_email_address_id,
  );

  return primaryEmail?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers." }, { status: 400 });
  }

  const payload = await request.text();
  const webhook = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;

  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertUser({
      clerkUserId: event.data.id,
      email: getPrimaryEmail(event.data),
      firstName: event.data.first_name ?? null,
      lastName: event.data.last_name ?? null,
      imageUrl: event.data.image_url ?? null,
    });
  }

  return NextResponse.json({ received: true });
}
