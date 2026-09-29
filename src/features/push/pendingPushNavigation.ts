import type { PushPayloadData } from './pushRegistration';

let pendingPayload: PushPayloadData | null = null;

export function stashPendingPushPayload(data: PushPayloadData | null | undefined): void {
  if (!data) {
    pendingPayload = null;
    return;
  }
  pendingPayload = { ...data };
}

export function peekPendingPushPayload(): PushPayloadData | null {
  return pendingPayload ? { ...pendingPayload } : null;
}

export function consumePendingPushPayload(): PushPayloadData | null {
  const next = peekPendingPushPayload();
  pendingPayload = null;
  return next;
}
