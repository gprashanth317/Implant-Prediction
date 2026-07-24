const xlsxReporter = require('./xlsxReporter');
const { generateHtmlReport } = require('./generateHtmlReport');
const path = require('path');

async function generateFallback() {
    console.log('Generating fallback Appium test reports...');
    xlsxReporter.startRun();
    
    // Record fallback execution status
    xlsxReporter.recordTest('Appium Infrastructure Setup & Emulator Hook', 'Infrastructure', 'FAILED', 15, 'Appium session fallback recorded');
    
    const excelPath = path.join(process.cwd(), 'appium-report.xlsx');
    await xlsxReporter.generateReport(excelPath);
    generateHtmlReport(xlsxReporter.results);
}

if (require.main === module) {
    generateFallback().catch(console.error);
}

module.exports = { generateFallback };
