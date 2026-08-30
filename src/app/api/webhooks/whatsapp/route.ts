import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppWebhook, verifyWhatsAppWebhookToken } from '@/lib/channels/whatsapp-webhook';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode !== 'subscribe' || !challenge || !expected || !verifyWhatsAppWebhookToken(token, expected)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();

  // The concrete Supabase store and channel-account resolver are injected by the app's server composition root.
  // This route intentionally fails closed until those server dependencies are wired.
  const dependencies = globalThis.__ABAR_WHATSAPP_WEBHOOK__;
  if (!dependencies) {
    return NextResponse.json({ error: 'WhatsApp webhook dependencies are not configured' }, { status: 503 });
  }

  const result = await handleWhatsAppWebhook(payload, dependencies.store, dependencies.resolveChannelAccountId);
  return NextResponse.json(result, { status: 200 });
}
