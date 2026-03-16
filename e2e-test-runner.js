/**
 * VoiceInk E2E Test Runner
 * Comprehensive end-to-end testing with screenshot capture
 */

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Test results collection
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  screenshots: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  }
};

// Screenshot directory
const screenshotDir = path.join(__dirname, 'e2e-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

let mainWindow;

async function captureScreenshot(name, description) {
  try {
    const image = await mainWindow.webContents.capturePage();
    const filename = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    const filepath = path.join(screenshotDir, filename);
    fs.writeFileSync(filepath, image.toPNG());

    testResults.screenshots.push({
      name,
      description,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Screenshot captured: ${name}`);
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to capture screenshot ${name}:`, error);
    return null;
  }
}

async function testFeature(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;

    testResults.tests.push({
      name,
      status: 'passed',
      duration,
      timestamp: new Date().toISOString()
    });

    testResults.summary.passed++;
    console.log(`✅ PASSED: ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;

    testResults.tests.push({
      name,
      status: 'failed',
      error: error.message,
      duration,
      timestamp: new Date().toISOString()
    });

    testResults.summary.failed++;
    console.error(`❌ FAILED: ${name} (${duration}ms)`, error);
  }

  testResults.summary.total++;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function navigateTo(viewPath) {
  await mainWindow.webContents.executeJavaScript(`
    window.location.hash = '${viewPath}';
  `);
  await wait(1000); // Wait for navigation
}

async function runE2ETests() {
  console.log('🚀 Starting VoiceInk E2E Tests...\n');

  // Test 1: Application Launch
  await testFeature('Application Launch', async () => {
    await wait(2000); // Wait for app to fully load
    await captureScreenshot('01-app-launch', 'Initial application window after launch');

    const title = await mainWindow.webContents.executeJavaScript('document.title');
    if (!title) throw new Error('Window title is empty');
  });

  // Test 2: Dashboard View
  await testFeature('Dashboard / Metrics View', async () => {
    await navigateTo('/');
    await captureScreenshot('02-dashboard', 'Dashboard showing metrics and statistics');

    const hasMetrics = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Dashboard') ||
      document.querySelector('.view-title')?.textContent.includes('Metrics')
    `);
    if (!hasMetrics) throw new Error('Dashboard view not loaded');
  });

  // Test 3: AI Models View
  await testFeature('AI Models Management', async () => {
    await navigateTo('/models');
    await wait(1500);
    await captureScreenshot('03-models-view', 'AI Models management with download options');

    const hasModels = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Models') ||
      document.querySelector('.model-card') !== null
    `);
    if (!hasModels) throw new Error('Models view not loaded');
  });

  // Test 4: Model Categories
  await testFeature('Model Categories', async () => {
    await wait(500);
    await captureScreenshot('04-model-categories', 'Model categories (Whisper, Parakeet, Custom)');

    const hasCategories = await mainWindow.webContents.executeJavaScript(`
      document.querySelectorAll('.category-tab').length > 0
    `);
    if (!hasCategories) throw new Error('Model categories not found');
  });

  // Test 5: Settings View
  await testFeature('Settings View', async () => {
    await navigateTo('/settings');
    await wait(1000);
    await captureScreenshot('05-settings', 'Settings with hotkeys and preferences');

    const hasSettings = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Settings') ||
      document.querySelector('.setting-row') !== null
    `);
    if (!hasSettings) throw new Error('Settings view not loaded');
  });

  // Test 6: Enhancement View
  await testFeature('AI Enhancement View', async () => {
    await navigateTo('/enhancement');
    await wait(1000);
    await captureScreenshot('06-enhancement', 'AI Enhancement with providers and prompts');

    const hasEnhancement = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Enhancement')
    `);
    if (!hasEnhancement) throw new Error('Enhancement view not loaded');
  });

  // Test 7: Dictionary View
  await testFeature('Dictionary Management', async () => {
    await navigateTo('/dictionary');
    await wait(1000);
    await captureScreenshot('07-dictionary', 'Dictionary with vocabulary and replacements');

    const hasDictionary = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Dictionary')
    `);
    if (!hasDictionary) throw new Error('Dictionary view not loaded');
  });

  // Test 8: History View
  await testFeature('Transcription History', async () => {
    await navigateTo('/history');
    await wait(1000);
    await captureScreenshot('08-history', 'Transcription history with search and filters');

    const hasHistory = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('History')
    `);
    if (!hasHistory) throw new Error('History view not loaded');
  });

  // Test 9: Power Mode View
  await testFeature('Power Mode Configuration', async () => {
    await navigateTo('/power-mode');
    await wait(1000);
    await captureScreenshot('09-power-mode', 'Power Mode with app-specific configurations');

    const hasPowerMode = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Power Mode')
    `);
    if (!hasPowerMode) throw new Error('Power Mode view not loaded');
  });

  // Test 10: Audio Input View
  await testFeature('Audio Input Settings', async () => {
    await navigateTo('/audio-input');
    await wait(1000);
    await captureScreenshot('10-audio-input', 'Audio input device selection');

    const hasAudioInput = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Audio')
    `);
    if (!hasAudioInput) throw new Error('Audio Input view not loaded');
  });

  // Test 11: Permissions View
  await testFeature('Permissions View', async () => {
    await navigateTo('/permissions');
    await wait(1000);
    await captureScreenshot('11-permissions', 'System permissions status');

    const hasPermissions = await mainWindow.webContents.executeJavaScript(`
      document.querySelector('.view-title')?.textContent.includes('Permissions')
    `);
    if (!hasPermissions) throw new Error('Permissions view not loaded');
  });

  // Test 12: Transcribe Audio View
  await testFeature('Transcribe Audio View', async () => {
    await navigateTo('/transcribe-audio');
    await wait(1000);
    await captureScreenshot('12-transcribe-audio', 'Audio file transcription interface');
  });

  // Test 13: License View
  await testFeature('License View', async () => {
    await navigateTo('/license');
    await wait(1000);
    await captureScreenshot('13-license', 'License management and activation');
  });

  // Test 14: Onboarding View
  await testFeature('Onboarding Flow', async () => {
    await navigateTo('/onboarding');
    await wait(1000);
    await captureScreenshot('14-onboarding', 'Onboarding wizard');
  });

  // Test 15: Back to Dashboard
  await testFeature('Navigation Consistency', async () => {
    await navigateTo('/');
    await wait(1000);
    await captureScreenshot('15-dashboard-return', 'Return to dashboard for consistency check');
  });

  // Save results
  const resultsPath = path.join(screenshotDir, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log(`📁 Output Directory: ${screenshotDir}`);
  console.log(`📄 Results File: ${resultsPath}`);
  console.log('='.repeat(60));

  return testResults;
}

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-app/dist/main/main/preload.js')
    }
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'electron-app/dist/renderer/index.html')}`;

  await mainWindow.loadURL(startUrl);

  // Wait for app to be ready
  await wait(3000);

  // Run tests
  try {
    const results = await runE2ETests();

    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    setTimeout(() => app.quit(), 1000);
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ E2E tests failed with error:', error);
    setTimeout(() => app.quit(), 1000);
    process.exit(1);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
