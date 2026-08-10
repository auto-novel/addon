type AddonCapabilityVersion = `${number}.${number}.${number}`;

type AddonCapabilityManifest = {
  [capability: string]: AddonCapabilityVersion | AddonCapabilityManifest;
};

export const AddonCapabilities = {
  // Addon capabilities 这个属性 1.6.1 版本引入
  addonCapabilities: "1.6.1",
  cookiesPatch: {
    writeDelete: "1.5.2",
  },
  tabFetch: {
    redirect: "1.9.1",
  },
  tab: {
    domQuery: {
      base: "1.8.0",
    },
    fetch: {
      forceWaitForLoad: "1.8.0",
      closeTimeout: "1.8.0",
    },
  },
  misc: {
    userAgent: "1.6.0",
    viewportWidth: "1.6.0",
  },
} as const satisfies AddonCapabilityManifest;
