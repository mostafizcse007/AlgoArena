import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\junio\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe',
    headless: true,
  });

  const viewports = [
    { width: 390, height: 844, name: 'Mobile 390px' },
    { width: 1280, height: 800, name: 'Desktop 1280px' },
    { width: 1440, height: 900, name: 'Desktop 1440px' },
    { width: 1920, height: 1080, name: 'Desktop 1920px' },
  ];

  console.log('--- STARTING ALGOARENA ROUND 3 POLISH VERIFICATION ---');

  for (const vp of viewports) {
    console.log(`\n=================== TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ===================`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1. Landing Page
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Verify headline
    const headline = await page.textContent('h1');
    console.log(`[Landing] Headline: "${headline?.trim()}"`);
    if (!headline?.includes('Outsmart your opponent in real time.')) {
      throw new Error(`Headline mismatch: ${headline}`);
    }

    // Verify quiet status line without hardcoded numbers
    const quietStatus = await page.locator('text=Ranked play active · Instant browser execution').count();
    console.log(`[Landing] Quiet status line exists: ${quietStatus > 0}`);
    if (quietStatus === 0) {
      throw new Error('Quiet status line under hero buttons missing');
    }

    // Verify hardcoded numbers removed
    const hardcodedTicker = await page.locator('text=142 active duels').count();
    console.log(`[Landing] Old hardcoded ticker present: ${hardcodedTicker > 0} (Expected: false)`);
    if (hardcodedTicker > 0) {
      throw new Error('Hardcoded ticker should be removed');
    }

    // Verify Hero Demo Card
    const liveDuelLabel = await page.locator('text=Live duel preview').count();
    console.log(`[Landing] Hero card "Live duel preview" label exists: ${liveDuelLabel > 0}`);
    if (liveDuelLabel === 0) {
      throw new Error('"Live duel preview" label missing on hero card');
    }

    // Verify 3 sections below hero
    const howItWorks = await page.locator('h2:text("How it works")').count();
    const seeWhereItGoesWrong = await page.locator('h2:text("See where it goes wrong")').count();
    const readyToClimb = await page.locator('h2:text("Ready to climb the ladder?")').count();
    console.log(`[Landing] Sections present: How it works (${howItWorks}), See where it goes wrong (${seeWhereItGoesWrong}), CTA (${readyToClimb})`);
    if (howItWorks === 0 || seeWhereItGoesWrong === 0 || readyToClimb === 0) {
      throw new Error('One or more of the 3 required landing sections are missing');
    }

    // Verify minimal footer
    const footerPlay = await page.locator('footer a:text("Play")').count();
    const footerLeaderboard = await page.locator('footer a:text("Leaderboard")').count();
    const footerGitHub = await page.locator('footer a:text("GitHub")').count();
    console.log(`[Landing] Footer links: Play (${footerPlay}), Leaderboard (${footerLeaderboard}), GitHub (${footerGitHub})`);
    if (footerPlay === 0 || footerLeaderboard === 0 || footerGitHub === 0) {
      throw new Error('Minimal footer links missing');
    }

    // Mobile Navigation Check
    if (vp.width === 390) {
      const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
      const hasHamburger = await hamburger.count();
      console.log(`[Mobile] Hamburger menu button present: ${hasHamburger > 0}`);
      if (hasHamburger === 0) {
        throw new Error('Mobile hamburger menu button missing on 390px');
      }
      await hamburger.click();
      await page.waitForTimeout(300);
      const mobilePlay = await page.locator('div.md\\:hidden a:has-text("Play")').count();
      console.log(`[Mobile] Mobile drawer opened with Play link: ${mobilePlay > 0}`);
      if (mobilePlay === 0) {
        throw new Error('Mobile drawer did not reveal navigation links');
      }
      await hamburger.click();
      await page.waitForTimeout(200);
    }

    // 2. Lobby Page
    await page.goto('http://localhost:3000/lobby', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const findMatchBtn = page.locator('button:has-text("Find a ranked match")');
    const findMatchExists = await findMatchBtn.count();
    console.log(`[Lobby] "Find a ranked match" button exists: ${findMatchExists > 0}`);
    if (findMatchExists > 0) {
      // Click find ranked match to test in-progress state
      await findMatchBtn.click();
      await page.waitForTimeout(800);

      // Check searching state
      const searchingText = await page.locator('text=Searching for opponent...').count();
      const cancelBtn = page.locator('button:text-is("Cancel")');
      const hasCancel = await cancelBtn.count();
      console.log(`[Lobby] In-progress searching state active: ${searchingText > 0}, Cancel button present: ${hasCancel > 0}`);

      if (hasCancel > 0) {
        await cancelBtn.click();
        await page.waitForTimeout(400);
        const backToStandby = await page.locator('button:has-text("Find a ranked match")').count();
        console.log(`[Lobby] Cancelled search successfully returned to standby: ${backToStandby > 0}`);
      }
    }

    // 3. Leaderboard Page
    await page.goto('http://localhost:3000/leaderboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Verify empty state on search
    const searchInput = page.locator('input[placeholder*="Search by handle"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('nonexistent_player_xyz_123');
      await page.waitForTimeout(300);
      const emptyStateMsg = await page.locator('text=No competitors matched your search or filters.').count();
      const clearBtn = page.locator('button:text("Clear filters")');
      const hasClear = await clearBtn.count();
      console.log(`[Leaderboard] Empty state message on no results: ${emptyStateMsg > 0}, Clear filters button: ${hasClear > 0}`);
      if (emptyStateMsg === 0 || hasClear === 0) {
        throw new Error('Leaderboard search empty state or clear filters button missing');
      }
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // 4. Duel Cockpit Page
    await page.goto('http://localhost:3000/arena/11111111-0000-0000-0000-000000000010', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verify red card is removed from problem sidebar
    const oldRedCard = await page.locator('button:has-text("Hack & Defend Sabotage")').count();
    console.log(`[Arena] Old red card in problem sidebar removed: ${oldRedCard === 0}`);
    if (oldRedCard > 0) {
      throw new Error('Old red card should be removed from problem sidebar');
    }

    // Verify signature Sabotage button in action bar
    const sabotageBtn = page.locator('button:has-text("Sabotage")');
    const hasSabotage = await sabotageBtn.count();
    console.log(`[Arena] Signature Sabotage button in action bar: ${hasSabotage > 0}`);
    if (hasSabotage === 0) {
      throw new Error('Sabotage button missing in action bar');
    }

    // Verify Starter code dropdown
    const starterCodeSelect = page.locator('select#starter-code-select');
    const hasStarterCode = await starterCodeSelect.count();
    console.log(`[Arena] Starter code dropdown present: ${hasStarterCode > 0}`);
    if (hasStarterCode === 0) {
      throw new Error('Starter code select dropdown missing');
    }

    // Verify Bot opponent avatar
    const botBadge = await page.locator('header span:text-is("Bot")').count();
    console.log(`[Arena] Opponent Bot badge present: ${botBadge > 0}`);

    // Verify Layout switcher tooltips (on desktop)
    if (vp.width >= 768) {
      const codeFocusBtn = page.locator('button[title="Code focus (1)"]');
      const balancedBtn = page.locator('button[title="Balanced (2)"]');
      const canvasBtn = page.locator('button[title="Canvas theater (3)"]');
      console.log(`[Arena] Layout toggle tooltips: Code focus (${await codeFocusBtn.count()}), Balanced (${await balancedBtn.count()}), Canvas (${await canvasBtn.count()})`);
      if (await codeFocusBtn.count() === 0 || await balancedBtn.count() === 0 || await canvasBtn.count() === 0) {
        throw new Error('Layout switch tooltips missing');
      }
    }

    // Verify Mobile Cockpit Tabs & Advisory Banner (at 390px)
    if (vp.width === 390) {
      const banner = page.locator('text=Duels work best on a larger screen');
      const bannerLink = page.locator('a:text("View leaderboard")');
      console.log(`[Mobile Arena] Advisory banner present: ${await banner.count() > 0}, Leaderboard link: ${await bannerLink.count() > 0}`);
      if (await banner.count() === 0 || await bannerLink.count() === 0) {
        throw new Error('Mobile advisory banner or leaderboard link missing at 390px');
      }

      const tabProblem = page.locator('button:text-is("Problem")');
      const tabCode = page.locator('button:text-is("Code")');
      const tabTrace = page.locator('button:text-is("Trace")');
      console.log(`[Mobile Arena] Cockpit tabs present: Problem (${await tabProblem.count()}), Code (${await tabCode.count()}), Trace (${await tabTrace.count()})`);
      if (await tabProblem.count() === 0 || await tabCode.count() === 0 || await tabTrace.count() === 0) {
        throw new Error('Mobile cockpit tabs missing at 390px');
      }
    }

    // Verify Trace panel empty state
    const traceEmptyMsg = await page.locator('text=Run your code to compare your trace with the optimal solution.').count();
    console.log(`[Arena] Trace panel empty state centered message: ${traceEmptyMsg > 0}`);
    if (traceEmptyMsg === 0) {
      throw new Error('Trace panel empty state message missing');
    }

    // Open Sabotage Drawer
    await sabotageBtn.click();
    await page.waitForTimeout(400);
    const drawerExplanation = await page.locator('text=Submit an input that breaks your opponent\'s solution.').count();
    console.log(`[Arena] Sabotage drawer explanation verified: ${drawerExplanation > 0}`);
    if (drawerExplanation === 0) {
      throw new Error('Sabotage drawer explanation text mismatch');
    }

    // Close Sabotage Drawer
    const closeDrawerBtn = page.locator('button[aria-label="Close drawer"]');
    if (await closeDrawerBtn.count() > 0) {
      await closeDrawerBtn.click();
      await page.waitForTimeout(200);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('>>> ALL VERIFICATION CHECKS PASSED ACROSS ALL 4 VIEWPORTS! <<<');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
