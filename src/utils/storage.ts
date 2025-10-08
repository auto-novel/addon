export async function sessionStore<T>(key: string, value: T) {
  const data: any = {};
  data[key] = value;
  await chrome.storage.local.set(data);
}

export async function sessionGet<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function sessionDel<T>(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}
