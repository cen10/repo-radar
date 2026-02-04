import { test, expect } from './fixtures';

test.describe('Radar CRUD', () => {
  test('can create and delete a radar', async ({ radarsPage }) => {
    await radarsPage.goto();

    const radarName = `E2E Test Radar ${Date.now()}`;
    await radarsPage.createRadar(radarName);
    await radarsPage.navigateToRadar(radarName);
    await expect(radarsPage.page).toHaveURL(/\/radar\//);
    await radarsPage.deleteCurrentRadar();
  });

  test('can add a repo to a radar', async ({ starsPage, radarsPage }) => {
    await radarsPage.goto();
    const radarName = `E2E Radar ${Date.now()}`;
    await radarsPage.createRadar(radarName);

    await starsPage.goto();
    await starsPage.addFirstRepoToRadar(radarName);

    // Verify the repo actually appears on the radar
    await radarsPage.navigateToRadar(radarName);
    await expect(radarsPage.repositoryCards).toHaveCount(1);
  });
});
