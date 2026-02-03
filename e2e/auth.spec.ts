import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('authenticated user can access stars page', async ({ starsPage }) => {
    await starsPage.goto();
    await expect(starsPage.page).toHaveURL('/stars');
    await starsPage.expectToBeOnStarsPage();
  });

  test('authenticated user is redirected from home to stars', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.page).toHaveURL('/stars');
  });
});
