/**
 * scripts/verify-operations-counter.js
 * Automated Playwright Test Suite for Match Header Operations Counter
 *
 * Verifies:
 * 1. Initial state: before code execution, counter displays strictly "0 ops"
 * 2. Idle stability: waiting 3.5s confirms counter remains 0 (no random timer)
 * 3. Tooltip: exact text "Operations executed in your last run" present on title & hover
 * 4. Execution update: clicking "Run" executes code in Web Worker and updates counter to > 0
 * 5. Oracle isolation: player ops counter is isolated from opponent/oracle telemetry
 */

const { chromium } = require('playwright');
const assert = require('assert');

async function main() {
  console.log('🚀 [Playwright] Starting Operations Counter Verification Suite...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log('Page Error:', err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // Navigation: Enter Arena Cockpit
    // -------------------------------------------------------------------------
    console.log('\n[Step 1] Navigating to http://localhost:3000/lobby...');
    await page.goto('http://localhost:3000/lobby', { waitUntil: 'domcontentloaded' });

    console.log('[Step 2] Launching Instant Demo Duel...');
    const demoButton = page.locator('button:has-text("Instant Demo Duel")').first();
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();

    await page.waitForURL(/\/arena\/.+/, { timeout: 15000 });

    console.log('✅ In Arena Cockpit:', page.url());
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // TEST 1: Initial Operations Counter is Strictly 0 at Match Start
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Operations Counter Initial State (0 ops) ---');
    const playerOpsContainer = page.locator('header [title="Operations executed in your last run"]').first();
    await playerOpsContainer.waitFor({ state: 'visible', timeout: 5000 });

    const playerOpsStrong = playerOpsContainer.locator('strong').first();
    const initialOpsText = (await playerOpsStrong.innerText()).trim();
    console.log(`Initial operations value displayed: "${initialOpsText}" ops`);

    assert.strictEqual(
      initialOpsText,
      '0',
      `Expected operations counter to start at '0', but received '${initialOpsText}'`
    );
    console.log('✅ PASS: Operations counter starts strictly at 0 ops (not 144 or 157 ops).');

    // -------------------------------------------------------------------------
    // TEST 2: Counter Does NOT Mutate on Idle Timer (No Random Fluctuations)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Idle Stability (Wait 3.5s for Timer Immobility) ---');
    console.log('Waiting 3.5 seconds to confirm no mock setInterval mutates the counter...');
    await page.waitForTimeout(3500);

    const postIdleOpsText = (await playerOpsStrong.innerText()).trim();
    console.log(`Operations value after 3.5s idle wait: "${postIdleOpsText}" ops`);

    assert.strictEqual(
      postIdleOpsText,
      '0',
      `Counter mutated unexpectedly to '${postIdleOpsText}' during idle time!`
    );
    console.log('✅ PASS: Counter remains strictly 0 when idle (mock interval completely removed).');

    // -------------------------------------------------------------------------
    // TEST 3: Hover Tooltip Displays Exact Text
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Tooltip Text Verification ---');
    const EXPECTED_TOOLTIP = 'Operations executed in your last run';

    // Verify HTML title attribute
    const titleAttr = await playerOpsContainer.getAttribute('title');
    console.log(`HTML title attribute: "${titleAttr}"`);
    assert.strictEqual(
      titleAttr,
      EXPECTED_TOOLTIP,
      `Expected title attribute "${EXPECTED_TOOLTIP}", but got "${titleAttr}"`
    );

    // Hover over counter and verify macOS Studio hover card
    await playerOpsContainer.hover();
    await page.waitForTimeout(400);

    const tooltipEl = page.locator(`[role="tooltip"]:has-text("${EXPECTED_TOOLTIP}")`).first();
    const tooltipFound = (await tooltipEl.count()) > 0;
    console.log(`Accessible macOS Studio hover card found: ${tooltipFound}`);

    assert.ok(
      tooltipFound,
      `Expected hover tooltip element with exact text "${EXPECTED_TOOLTIP}"`
    );
    console.log(`✅ PASS: Tooltip strictly matches exact text "${EXPECTED_TOOLTIP}".`);

    // -------------------------------------------------------------------------
    // TEST 4: Counter Updates Only After a Run Completes (> 0 ops)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Execution Update (Click Run & Verify Positive Integer) ---');
    const runBtn = page.locator('button[title*="Run on Public Samples"], button:has-text("Run")').first();
    await runBtn.waitFor({ state: 'visible', timeout: 5000 });

    console.log('Clicking "Run" to evaluate code in Web Worker Sandbox...');
    await runBtn.click();

    // Wait for execution to finish (spinner disappears and traces load)
    await page.waitForTimeout(2500);

    const postRunOpsText = (await playerOpsStrong.innerText()).trim();
    const postRunOps = parseInt(postRunOpsText, 10);
    console.log(`Operations count after run completion: ${postRunOps} ops`);

    assert.ok(
      !isNaN(postRunOps) && postRunOps > 0,
      `Expected operations counter to update to a positive integer (> 0), but got: "${postRunOpsText}"`
    );
    console.log(`✅ PASS: Operations counter updated to ${postRunOps} ops after code execution.`);

    // -------------------------------------------------------------------------
    // TEST 5: Oracle Telemetry Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Oracle / Opponent Telemetry Isolation ---');
    const headerElement = page.locator('header').first();
    const opponentZone = headerElement.locator('div.justify-end').first();
    await opponentZone.waitFor({ state: 'visible', timeout: 5000 });

    const opponentText = await opponentZone.innerText();
    console.log(`Opponent header zone text content:\n${opponentText.replace(/\n+/g, ' ')}`);

    // Opponent zone should NOT display player's operations or conflate with player's counter
    assert.ok(
      !opponentText.includes(`${postRunOps} ops`),
      'Player operations counter must not be conflated with opponent/oracle telemetry zone.'
    );
    console.log('✅ PASS: Player operations counter is isolated from opponent/oracle telemetry.');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 5 OPERATIONS COUNTER AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
