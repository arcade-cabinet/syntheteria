import { test, expect } from '@playwright/experimental-ct-react';
import { HudButton } from '../../src/ui/components/HudButton';

test('HudButton renders correctly', async ({ mount }) => {
  const component = await mount(<HudButton label="TEST BUTTON" onPress={() => {}} />);
  await expect(component).toContainText('TEST BUTTON');
  // Visual regression test to ensure NativeWind styling works
  await expect(component).toHaveScreenshot();
});
