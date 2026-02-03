import { test as base, expect } from '@playwright/test';
import { authFixtures, type AuthFixtures } from './auth';
import { pageFixtures, type PageFixtures } from './pages';

export const test = base.extend<AuthFixtures & PageFixtures>({
  ...authFixtures,
  ...pageFixtures,
});

export { expect };
export { HomePage } from '../pages/home.page';
export { StarsPage } from '../pages/stars.page';
