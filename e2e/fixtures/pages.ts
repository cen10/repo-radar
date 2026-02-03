import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { StarsPage } from '../pages/stars.page';

type PageFixtures = {
  homePage: HomePage;
  starsPage: StarsPage;
};

export const pageFixtures: Parameters<typeof base.extend<PageFixtures>>[0] = {
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  starsPage: async ({ page }, use) => {
    await use(new StarsPage(page));
  },
};

export type { PageFixtures };
