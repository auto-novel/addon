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

  async refresh(checkCallback: (key: string, val: T) => boolean = () => true) {
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

  async snapshot(): Promise<Record<string, any>> {
    const snapshot = await storage.snapshot(this.storageArea);
    return Object.entries(snapshot).filter(([key]) => {
      return key.startsWith(this.genKey(""));
    });
  }

  async clear() {
    await this.refresh(() => false);
  }

  private genKey(key: K | string): string {
    const keyStr: string = typeof key === "string" ? key : this.key2String(key);
    if (keyStr.includes(":")) throw new Error("Key cannot contain ':'");
    return `${this.tag}:${keyStr}`;
  }

  private genStorageKey(key: K | string): StorageItemKey {
    return `${this.storageArea}:${this.genKey(key)}`;
  }

  private extractKey(storageItemKey: StorageItemKey): string {
    return storageItemKey.split(":")[2];
  }

  async set(key: K | string, value: T) {
    return await storage.setItem(this.genStorageKey(key), value);
  }

  async get(key: K | string): Promise<T | null> {
    return await storage.getItem(this.genStorageKey(key));
  }

  async del(key: K | string) {
    return await storage.removeItem(this.genStorageKey(key));
  }
}

export class RefCount extends Persist<string, number> {
  constructor(tag: string, storageArea: StorageArea = "session") {
    super({ tag, defaultValue: 0, storageArea });
  }

  private operationQueues: Map<string, Promise<any>> = new Map();

  private _atomicUpdate(
    key: string,
    updater: (currentValue: number) => number,
  ) {
    const lastOperation = this.operationQueues.get(key) || Promise.resolve();
    const newOperation = lastOperation.then(async () => {
      let cnt = (await this.get(key)) || 0;
      cnt = updater(cnt);
      await this.set(key, cnt);
      return cnt;
    });

    this.operationQueues.set(
      key,
      newOperation.catch(() => {}),
    );
    return newOperation;
  }

  async inc(key: string) {
    return await this._atomicUpdate(key, (cnt) => cnt + 1);
  }

  async dec(key: string) {
    return await this._atomicUpdate(key, (cnt) => cnt - 1);
  }

  async isZero(key: string): Promise<boolean> {
    const lastOperation = this.operationQueues.get(key) || Promise.resolve();
    const readOperation = lastOperation.then(async () => {
      const cnt = (await this.get(key)) || 0;
      return cnt === 0;
    });

    this.operationQueues.set(
      key,
      readOperation.catch(() => {}),
    );

    return readOperation;
  }
}
