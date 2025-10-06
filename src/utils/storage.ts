export async function storeVar<T>(key: string, value: T) {
  await browser.storage.local.set({ key, value });
}

export async function getVar<T>(key: string): Promise<T | null> {
  const result = await browser.storage.local.get(key);
  return result[key];
}
