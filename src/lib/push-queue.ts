import { newId } from "@/infra/db/id";

export interface PendingPushItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export function newPendingPush(title: string, body: string): PendingPushItem {
  return { id: newId(), title, body, createdAt: new Date().toISOString() };
}

export function drainPendingQueue(device: {
  pendingPushQueue?: PendingPushItem[] | null;
  pendingPush?: { title: string; body: string } | null;
}): PendingPushItem[] {
  const queue = [...(device.pendingPushQueue ?? [])];
  if (device.pendingPush) {
    queue.push({
      id: newId(),
      title: device.pendingPush.title,
      body: device.pendingPush.body,
      createdAt: new Date().toISOString(),
    });
  }
  return queue;
}

export function appendToQueue(
  existing: PendingPushItem[] | null | undefined,
  item: PendingPushItem,
): PendingPushItem[] {
  return [...(existing ?? []), item];
}
