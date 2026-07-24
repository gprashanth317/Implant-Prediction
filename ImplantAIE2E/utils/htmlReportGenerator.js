const fs = require('fs');
const path = require('path');

async function generateHtmlReport(results, summaryByType) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ImplantAI Web E2E Test Execution Report</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #3b82f6;
            --success: #22c55e;
            --danger: #ef4444;
            --border: #334155;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 30px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 1.8rem; color: var(--primary); }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        .stat-value { font-size: 2.2rem; font-weight: bold; margin-top: 5px; }
        .stat-card.passed .stat-value { color: var(--success); }
        .stat-card.failed .stat-value { color: var(--danger); }
        .stat-card.rate .stat-value { color: var(--primary); }
        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card-bg);
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid var(--border);
            margin-bottom: 30px;
        }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
        th { background: #111827; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        .badge.pass { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        .badge.fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>ImplantAI Web E2E Test Execution Report</h1>
            <p style="color: var(--text-muted); margin-top: 5px;">Selenium Headless Execution Suite (1,100 Assertions)</p>
        </div>
        <div>
            <span class="badge pass">Status: Completed</span>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div style="color: var(--text-muted);">Total Assertions</div>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card passed">
            <div style="color: var(--text-muted);">Passed</div>
            <div class="stat-value">${passed}</div>
        </div>
        <div class="stat-card failed">
            <div style="color: var(--text-muted);">Failed</div>
            <div class="stat-value">${failed}</div>
        </div>
        <div class="stat-card rate">
            <div style="color: var(--text-muted);">Pass Rate</div>
            <div class="stat-value">${passRate}%</div>
        </div>
        <div class="stat-card">
            <div style="color: var(--text-muted);">Total Duration</div>
            <div class="stat-value" style="font-size: 1.5rem; margin-top: 12px;">${totalDuration} ms</div>
        </div>
    </div>

    <h2>Category Metrics Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Testing Type Category</th>
                <th>Total Assertions</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Pass Rate</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            ${Object.keys(summaryByType).map(type => {
                const s = summaryByType[type];
                const rate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : '0.0';
                return `<tr>
                    <td><strong>${type}</strong></td>
                    <td>${s.total}</td>
                    <td style="color: var(--success);">${s.passed}</td>
                    <td style="color: ${s.failed > 0 ? 'var(--danger)' : 'var(--text-color)'}">${s.failed}</td>
                    <td>${rate}%</td>
                    <td>${s.duration} ms</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>
</body>
</html>`;

    const htmlDir = path.join(process.cwd(), 'Test_Results', 'HTML');
    fs.mkdirSync(htmlDir, { recursive: true });
    const filePath = path.join(htmlDir, 'execution-report.html');
    const rootFilePath = path.join(process.cwd(), 'execution-report.html');

    fs.writeFileSync(filePath, htmlContent, 'utf8');
    fs.writeFileSync(rootFilePath, htmlContent, 'utf8');
    console.log(` HTML Report generated at: ${filePath}`);
}

module.exports = { generateHtmlReport };
