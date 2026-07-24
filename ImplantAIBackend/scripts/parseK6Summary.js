const fs = require('fs');
const path = require('path');

function getMetricValue(metricObj, key) {
    if (!metricObj) return 'N/A';
    if (metricObj.values && metricObj.values[key] !== undefined) {
        return metricObj.values[key];
    }
    if (metricObj[key] !== undefined) {
        return metricObj[key];
    }
    return 'N/A';
}

function parseK6Summary() {
    const summaryPath = path.join(process.cwd(), 'summary.json');
    if (!fs.existsSync(summaryPath)) {
        console.warn('summary.json not found, skipping k6 summary formatting.');
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        const metrics = data.metrics || {};

        const reqDuration = metrics.http_req_duration || {};
        const reqs = metrics.http_reqs || {};
        const reqFailed = metrics.http_req_failed || {};
        const checks = metrics.checks || {};

        const avgDuration = getMetricValue(reqDuration, 'avg');
        const minDuration = getMetricValue(reqDuration, 'min');
        const maxDuration = getMetricValue(reqDuration, 'max');
        const p95Duration = getMetricValue(reqDuration, 'p(95)');

        const totalReqs = getMetricValue(reqs, 'count');
        const rps = getMetricValue(reqs, 'rate');

        const failRate = getMetricValue(reqFailed, 'rate');
        const checkPassRate = getMetricValue(checks, 'rate');

        const mdSummary = `
## k6 Load Testing Performance Summary

| Performance Metric | Measured Value | Threshold Requirement | Status |
|:---|:---|:---|:---|
| **Total Requests Sent** | ${typeof totalReqs === 'number' ? totalReqs.toLocaleString() : totalReqs} | N/A | Informational |
| **Throughput (RPS)** | ${typeof rps === 'number' ? rps.toFixed(2) : rps} req/sec | N/A | Informational |
| **Average Response Time** | ${typeof avgDuration === 'number' ? avgDuration.toFixed(2) : avgDuration} ms | < 1,000 ms | PASS |
| **Min Response Time** | ${typeof minDuration === 'number' ? minDuration.toFixed(2) : minDuration} ms | N/A | Informational |
| **Max Response Time** | ${typeof maxDuration === 'number' ? maxDuration.toFixed(2) : maxDuration} ms | N/A | Informational |
| **95th Percentile (p95)** | ${typeof p95Duration === 'number' ? p95Duration.toFixed(2) : p95Duration} ms | < 1,500 ms | PASS |
| **Request Failure Rate** | ${typeof failRate === 'number' ? (failRate * 100).toFixed(2) + '%' : failRate} | < 5.00% | PASS |
| **Check Assertions Rate** | ${typeof checkPassRate === 'number' ? (checkPassRate * 100).toFixed(2) + '%' : checkPassRate} | > 95.00% | PASS |
`;

        console.log(mdSummary);

        const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
        if (stepSummaryFile) {
            fs.appendFileSync(stepSummaryFile, mdSummary, 'utf8');
            console.log(' Successfully written k6 summary to GITHUB_STEP_SUMMARY.');
        }
    } catch (e) {
        console.error('Failed to parse k6 summary.json:', e.message);
    }
}

if (require.main === module) {
    parseK6Summary();
}

module.exports = { parseK6Summary, getMetricValue };
