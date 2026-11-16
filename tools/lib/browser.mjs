import { chromium } from '@playwright/test';

const channel = process.env.PW_CHANNEL || 'msedge';

export function launch() {
  return chromium.launch({
    ...(channel === 'chromium' ? {} : { channel }),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}
