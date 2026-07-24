const fs = require('fs');

function publishSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    const md = `
## Appium Android E2E Execution Summary

| Total Tests | Passed | Failed | Pass Rate | Status |
|:---|:---|:---|:---|:---|
| **${total}** | **${passed}** | **${failed}** | **${passRate}%** | ${failed === 0 ? '🟢 PASSED' : '🔴 FAILED'} |
`;

    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
        fs.appendFileSync(summaryFile, md, 'utf8');
        console.log(' Appended Appium summary to GITHUB_STEP_SUMMARY.');
    }
}

module.exports = { publishSummary };
