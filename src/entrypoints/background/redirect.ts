export type RedirectionResult = {
  providerId: string;
  novelId: string;
  url: string;
};

export function getRedirectionResult(url: string): RedirectionResult | null {
  const providers = {
    kakuyomu: (url: string) => /kakuyomu\.jp\/works\/([0-9]+)/.exec(url)?.[1],
    syosetu: (url: string) =>
      /syosetu\.com\/([A-Za-z0-9]+)/.exec(url)?.[1].toLowerCase(),
    novelup: (url: string) => /novelup\.plus\/story\/([0-9]+)/.exec(url)?.[1],
    hameln: (url: string) => /syosetu\.org\/novel\/([0-9]+)/.exec(url)?.[1],
    pixiv: (url: string) => {
      let novelId = /pixiv\.net\/novel\/series\/([0-9]+)/.exec(url)?.[1];
      if (novelId === undefined) {
        novelId = /pixiv\.net\/novel\/show.php\?id=([0-9]+)/.exec(url)?.[1];
        if (novelId !== undefined) {
          novelId = "s" + novelId;
        }
      }
      return novelId;
    },
    alphapolis: (url: string) => {
      const matched = /www\.alphapolis\.co\.jp\/novel\/([0-9]+)\/([0-9]+)/.exec(
        url,
      );
      if (matched) {
        return `${matched[1]}-${matched[2]}`;
      } else {
        return undefined;
      }
    },
    novelism: (url: string) => /novelism\.jp\/novel\/([^/]+)/.exec(url)?.[1],
  };

  for (const providerId in providers) {
    const provider = providers[providerId as keyof typeof providers];
    const novelId = provider(url);
    if (novelId !== undefined) {
      return {
        providerId,
        novelId,
        url: `https://n.novelia.cc/novel/${providerId}/${novelId}`,
      };
    }
  }
  return null;
}

export function redirectToAutoNovel() {
  browser.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tabUrl = tabs[0].url ?? "";

    const redir = getRedirectionResult(tabUrl);
    if (redir == null) return;

    const { url } = redir;
    browser.tabs.create({
      url,
      active: true,
    });
  });
}
