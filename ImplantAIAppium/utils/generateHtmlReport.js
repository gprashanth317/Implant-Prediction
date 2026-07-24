const fs = require('fs');
const path = require('path');

function generateHtmlReport(results) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ImplantAI Appium Android E2E Execution Report</title>
    <style>
        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; }
        h1 { color: #38bdf8; }
        .card-grid { display: flex; gap: 20px; margin-bottom: 30px; }
        .card { background: #1e293b; padding: 20px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #334155; }
        .card .val { font-size: 2rem; font-weight: bold; margin-top: 5px; }
        .pass { color: #22c55e; }
        .fail { color: #ef4444; }
    </style>
</head>
<body>
    <h1>ImplantAI Appium Android E2E Execution Report</h1>
    <div class="card-grid">
        <div class="card"><div>Total Tests</div><div class="val">${total}</div></div>
        <div class="card"><div>Passed</div><div class="val pass">${passed}</div></div>
        <div class="card"><div>Failed</div><div class="val fail">${failed}</div></div>
        <div class="card"><div>Pass Rate</div><div class="val pass">${passRate}%</div></div>
        <div class="card"><div>Total Duration</div><div class="val">${totalDuration} ms</div></div>
    </div>
</body>
</html>`;

    const htmlDir = path.join(process.cwd(), 'Test_Results', 'HTML');
    fs.mkdirSync(htmlDir, { recursive: true });
    const targetFile = path.join(htmlDir, 'execution-report.html');
    const rootFile = path.join(process.cwd(), 'execution-report.html');

    fs.writeFileSync(targetFile, htmlContent, 'utf8');
    fs.writeFileSync(rootFile, htmlContent, 'utf8');
    console.log(` HTML Appium report saved to: ${targetFile}`);
}

module.exports = { generateHtmlReport };
