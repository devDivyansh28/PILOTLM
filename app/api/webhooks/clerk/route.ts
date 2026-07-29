import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address || null;

    await prisma.user.upsert({
      where: { clerkId: id },
      create: {
        clerkId: id,
        email,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
      update: {
        email,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
    });
  }

  return new Response(null, { status: 204 });
}
