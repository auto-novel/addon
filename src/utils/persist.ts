export type RefreshAction<T> = {
  action: "delete" | "keep" | "update";
  value?: T;
};

export class Persist<T> {
  tag: string;
  // local | session | sync | managed
  storageArea: StorageArea;
  defaultValue: T;

  constructor(
    tag: string,
    defaultValue: T,
    storageArea: StorageArea = "session",
  ) {
    this.tag = tag;
    this.storageArea = storageArea;
    this.defaultValue = defaultValue;
  }

  async refresh(
    checkCallback: (key: string, val: T) => boolean,
    typeGuard: (value: unknown) => value is T,
  ) {
    const allItems = await storage.snapshot(this.storageArea);
    const deletePromise = Object.entries(allItems)
      .filter(([fullKey]) => fullKey.startsWith(this.genKey("")))
      .filter((entry): entry is [StorageItemKey, T] => typeGuard(entry[1]))
      .flatMap(([fullKey, value]) => {
        const key = this.extractKey(fullKey);
        if (!checkCallback(key, value)) {
          return [this.del(key)];
        }
        return [];
      });
    if (deletePromise.length > 0) {
      await Promise.all(deletePromise);
    }
  }

  private genKey(key: string): StorageItemKey {
    if (key.includes(":")) throw new Error("Key cannot contain ':'");
    return `${this.storageArea}:${this.tag}:${key}`;
  }

  private extractKey(storageItemKey: StorageItemKey): string {
    return storageItemKey.split(":")[2];
  }

  async set(key: string, value: T) {
    return await storage.setItem(this.genKey(key), value);
  }

  async get(key: string): Promise<T | null> {
    return await storage.getItem(this.genKey(key));
  }

  async del(key: string) {
    return await storage.removeItem(this.genKey(key));
  }
}
