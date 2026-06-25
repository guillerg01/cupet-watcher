import * as SecureStore from "expo-secure-store";

// The ticket token lives ONLY here (device keystore) — it is never sent to the
// backend. The device commandToken authenticates the phone to the coordinator.

const K = {
  ticketToken: "ticket_token",
  ticketExp: "ticket_exp",
  ticketUser: "ticket_user",
  deviceId: "device_id",
  commandToken: "command_token",
} as const;

export interface TicketSession {
  token: string;
  exp: number;
}

export interface DeviceCreds {
  deviceId: string;
  commandToken: string;
}

export async function saveTicketSession(token: string, exp: number): Promise<void> {
  await SecureStore.setItemAsync(K.ticketToken, token);
  await SecureStore.setItemAsync(K.ticketExp, String(exp));
}

export async function getTicketSession(): Promise<TicketSession | null> {
  const token = await SecureStore.getItemAsync(K.ticketToken);
  const exp = await SecureStore.getItemAsync(K.ticketExp);
  if (!token || !exp) return null;
  return { token, exp: Number(exp) };
}

export async function saveTicketUser(username: string): Promise<void> {
  await SecureStore.setItemAsync(K.ticketUser, username);
}

export async function getTicketUser(): Promise<string | null> {
  return SecureStore.getItemAsync(K.ticketUser);
}

export async function saveDeviceCreds(creds: DeviceCreds): Promise<void> {
  await SecureStore.setItemAsync(K.deviceId, creds.deviceId);
  await SecureStore.setItemAsync(K.commandToken, creds.commandToken);
}

export async function getDeviceCreds(): Promise<DeviceCreds | null> {
  const deviceId = await SecureStore.getItemAsync(K.deviceId);
  const commandToken = await SecureStore.getItemAsync(K.commandToken);
  if (!deviceId || !commandToken) return null;
  return { deviceId, commandToken };
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(K).map((k) => SecureStore.deleteItemAsync(k)));
}
