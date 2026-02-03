import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home.page';

test.describe('Smoke Tests', () => {
  test('home page loads and displays correctly', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify the page loads
    await homePage.expectToBeOnHomePage();

    // Verify key content is present
    await expect(page.getByText(/track momentum and activity/i)).toBeVisible();
    await expect(page.getByText(/track growth/i)).toBeVisible();
    await expect(page.getByText(/release updates/i)).toBeVisible();
    await expect(page.getByText(/activity alerts/i)).toBeVisible();
  });

  test('unauthenticated user is redirected to home from protected routes', async ({ page }) => {
    // Try to access a protected route directly
    await page.goto('/stars');

    await expect(page).toHaveURL('/');

    // Verify home page content is shown
    const homePage = new HomePage(page);
    await homePage.expectToBeOnHomePage();
  });
});
