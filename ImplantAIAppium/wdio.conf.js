const fs = require('fs');
const path = require('path');
const xlsxReporter = require('./utils/xlsxReporter');
const { generateHtmlReport } = require('./utils/generateHtmlReport');
const { publishSummary } = require('./utils/generateSummary');

const resultsFile = path.join(process.cwd(), '.wdio-results.jsonl');

exports.config = {
    runner: 'local',
    specs: [
        process.env.WDIO_CI_SPEC || './tests/12_e2e/mega_android_1100.test.js'
    ],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'Nexus 6',
        'appium:platformVersion': '10.0',
        'appium:noReset': true,
        'appium:newCommandTimeout': 240
    }],
    logLevel: 'warn',
    bail: 0,
    baseUrl: 'http://127.0.0.1',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 2,
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 300000
    },

    onPrepare: function () {
        if (fs.existsSync(resultsFile)) {
            fs.unlinkSync(resultsFile);
        }
        xlsxReporter.startRun();
    },

    afterTest: function (test, context, { error, result, duration, passed }) {
        const title = test.title;
        const category = test.parent ? test.parent.replace(/^Category \d+: /, '') : 'General';
        const status = passed ? 'PASSED' : 'FAILED';
        const errLog = error ? (error.stack || error.message) : '';

        const record = JSON.stringify({ title, category, status, duration, error: errLog }) + '\n';
        fs.appendFileSync(resultsFile, record, 'utf8');
    },

    after: function (result, capabilities, specs) {
        if (!fs.existsSync(resultsFile)) {
            const fallbackRecord = JSON.stringify({
                title: 'Fatal Appium Session Setup',
                category: 'Infrastructure',
                status: 'FAILED',
                duration: 10,
                error: 'Fatal Appium capability or session initialization error'
            }) + '\n';
            fs.appendFileSync(resultsFile, fallbackRecord, 'utf8');
        }
    },

    onComplete: async function () {
        xlsxReporter.startRun();
        if (fs.existsSync(resultsFile)) {
            const lines = fs.readFileSync(resultsFile, 'utf8').trim().split('\n');
            lines.forEach(line => {
                if (line) {
                    try {
                        const item = JSON.parse(line);
                        xlsxReporter.recordTest(item.title, item.category, item.status, item.duration, item.error);
                    } catch (e) {}
                }
            });
        }

        const excelPath = path.join(process.cwd(), 'appium-report.xlsx');
        await xlsxReporter.generateReport(excelPath);
        generateHtmlReport(xlsxReporter.results);
        publishSummary(xlsxReporter.results);
    }
};
