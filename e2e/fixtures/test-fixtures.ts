import { test as base, BrowserContext, Page } from '@playwright/test';

interface PlayerContext {
  context: BrowserContext;
  page: Page;
  playerName: string;
}

interface MultiPlayerFixtures {
  createPlayerContexts: (count: number) => Promise<PlayerContext[]>;
}

export const test = base.extend<MultiPlayerFixtures>({
  createPlayerContexts: async ({ browser }, use) => {
    const contexts: PlayerContext[] = [];

    const createContexts = async (count: number): Promise<PlayerContext[]> => {
      for (let i = 0; i < count; i++) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
        });
        const page = await context.newPage();
        contexts.push({
          context,
          page,
          playerName: `Player ${i + 1}`,
        });
      }
      return contexts;
    };

    await use(createContexts);

    // Cleanup all contexts after test
    for (const ctx of contexts) {
      await ctx.context.close();
    }
  },
});

export { expect } from '@playwright/test';
