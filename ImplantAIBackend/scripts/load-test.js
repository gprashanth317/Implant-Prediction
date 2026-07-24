import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 100,
    duration: '1m',
    thresholds: {
        http_req_failed: ['rate<0.05'], // Request failures must be under 5%
        http_req_duration: ['p(95)<1500'], // 95th percentile latency under 1.5s
    },
};

export default function () {
    const baseUrl = __ENV.BACKEND_URL || 'http://127.0.0.1:5000';
    const res = http.get(baseUrl);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time OK': (r) => r.timings.duration < 1500,
    });

    sleep(1);
}
