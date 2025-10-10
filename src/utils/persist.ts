export type RefreshAction<T> = {
  action: "delete" | "keep" | "update";
  value?: T;
};

export interface PersistConstructorOptions<K, T> {
  tag: string;
  storageArea?: StorageArea;
  defaultValue?: T;
  key2String?: (key: K) => string;
}

export class Persist<K, T> {
  tag: string;
  // local | session | sync | managed
  storageArea: StorageArea;
  defaultValue?: T;

  private key2String: (key: K) => string;

  constructor(options: PersistConstructorOptions<K, T>) {
    const { tag, storageArea = "session", defaultValue, key2String } = options;
    this.tag = tag;
    this.storageArea = storageArea;
    this.defaultValue = defaultValue;
    this.key2String = key2String || ((key: K) => key as unknown as string);
  }

  async refresh(checkCallback: (key: string, val: T) => boolean) {
    const allItems = await storage.snapshot(this.storageArea);
    const deletePromise = Object.entries(allItems)
      .filter(([fullKey]) => fullKey.startsWith(this.genKey("")))
      .flatMap(([fullKey, value]) => {
        const key = this.extractKey(fullKey as StorageItemKey);
        if (!checkCallback(key, value as T)) {
          return [this.del(key)];
        }
        return [];
      });
    if (deletePromise.length > 0) {
      await Promise.all(deletePromise);
    }
  }

  async clear() {
    await this.refresh(() => false);
  }

  private genKey(key: K | string): StorageItemKey {
    const keyStr: string = typeof key === "string" ? key : this.key2String(key);
    if (keyStr.includes(":")) throw new Error("Key cannot contain ':'");
    return `${this.storageArea}:${this.tag}:${keyStr}`;
  }

  private extractKey(storageItemKey: StorageItemKey): string {
    return storageItemKey.split(":")[2];
  }

  async set(key: K | string, value: T) {
    return await storage.setItem(this.genKey(key), value);
  }

  async get(key: K | string): Promise<T | null> {
    return await storage.getItem(this.genKey(key));
  }

  async del(key: K | string) {
    return await storage.removeItem(this.genKey(key));
  }
}

export class RefCount extends Persist<string, number> {
  constructor(tag: string, storageArea: StorageArea = "session") {
    super(tag, 0, storageArea);
  }

  async inc(key: string) {
    let cnt = (await this.get(key)) || 0;
    cnt += 1;
    await this.set(key, cnt);
    return cnt;
  }

  async dec(key: string) {
    let cnt = (await this.get(key)) || 0;
    cnt -= 1;
    await this.set(key, cnt);
    return cnt;
  }

  async isZero(key: string): Promise<boolean> {
    const cnt = (await this.get(key)) || 0;
    return cnt === 0;
  }
}
