export async function sessionStore<T>(key: string, value: T) {
  await browser.storage.local.set({ key, value });
}

export async function sessionGet<T>(key: string): Promise<T | null> {
  const result = await browser.storage.local.get(key);
  return result[key];
}

export async function sessionDel<T>(key: string): Promise<void> {
  await browser.storage.local.remove(key);
}
