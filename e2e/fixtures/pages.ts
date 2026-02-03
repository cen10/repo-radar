import { test as authTest } from './auth';
import { HomePage } from '../pages/home.page';
import { StarsPage } from '../pages/stars.page';
import { RadarsPage } from '../pages/radars.page';

export const test = authTest.extend<{
  homePage: HomePage;
  starsPage: StarsPage;
  radarsPage: RadarsPage;
}>({
  homePage: async ({ authenticatedPage }, use) => {
    await use(new HomePage(authenticatedPage));
  },

  starsPage: async ({ authenticatedPage }, use) => {
    await use(new StarsPage(authenticatedPage));
  },

  radarsPage: async ({ authenticatedPage }, use) => {
    await use(new RadarsPage(authenticatedPage));
  },
});
