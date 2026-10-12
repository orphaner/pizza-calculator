import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  try {
    // Desktop: 1600x900, deviceScaleFactor 1
    const desktopContext = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:4200/', { waitUntil: 'networkidle' });
    await desktopPage.screenshot({ 
      path: '/private/tmp/claude-501/-Users-nicolas-geekmac-pizza-calculator/58a46f3d-c4a2-4062-a781-87f5cf3516da/scratchpad/footer-1600.png',
      fullPage: true 
    });
    await desktopContext.close();
    console.log('✓ Desktop screenshot captured: footer-1600.png');

    // Mobile: 390x844, deviceScaleFactor 2, isMobile true
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:4200/', { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ 
      path: '/private/tmp/claude-501/-Users-nicolas-geekmac-pizza-calculator/58a46f3d-c4a2-4062-a781-87f5cf3516da/scratchpad/footer-mobile.png',
      fullPage: true 
    });
    await mobileContext.close();
    console.log('✓ Mobile screenshot captured: footer-mobile.png');
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
