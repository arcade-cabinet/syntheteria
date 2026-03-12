import { test, expect } from '@playwright/test';

test('Onboarding flow: awakening thought appears and can be dismissed', async ({ page }) => {
  await page.goto('/');

  // Click New Game on Title Screen
  await page.click('text=[ NEW GAME ]');

  // Verify Awakening Thought appears
  const thought = page.locator('text=... VOID. SILENCE. I AM. BUT WHAT AM I?');
  await expect(thought).toBeVisible({ timeout: 10000 });

  // Dismiss thought
  await page.click('text=[ TAP TO DISMISS ]');

  // Verify thought disappears
  await expect(thought).not.toBeVisible();
});

test('Onboarding flow: first unit thought triggers', async ({ page }) => {
  await page.goto('/');
  await page.click('text=[ NEW GAME ]');
  await page.click('text=[ TAP TO DISMISS ]');

  // Verify next thought (Sensorium online) appears when unit is spawned/found
  // Since units are spawned on game start in factory.ts, it should trigger almost immediately after the first one is dismissed
  const thought = page.locator('text=SIGNALS. A WEAK PULSE. I CAN FEEL... METAL? ELECTRICAL DISCHARGE.');
  await expect(thought).toBeVisible({ timeout: 5000 });
});
