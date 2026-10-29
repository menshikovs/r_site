import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';

const base = __ENV.TARGET;
if (!/^http:\/\/127\.0\.0\.1:808[1-4]$/.test(base)) throw new Error('Only dedicated loopback benchmark ports are allowed');
const vus = Number(__ENV.CLIENTS || 1);
if (![1, 10, 25, 50].includes(vus)) throw new Error('Unsupported concurrency');
const paths = ['/', '/bin/windows/', '/web/packages/', '/web/packages/ggplot2/index.html', '/manuals.html'];
const timeouts = new Counter('client_timeouts');
const errors = new Counter('http_status_errors');
const transport = new Counter('transport_errors');
const success = new Counter('successful_responses');
const elapsed = new Trend('attempt_elapsed', true);
export const options = {
  vus, duration: '5s', gracefulStop: '6s', discardResponseBodies: true,
  summaryTrendStats: ['min', 'med', 'p(95)', 'p(99)', 'max'],
  noConnectionReuse: false, maxRedirects: 0,
};
export default function () {
  const start = Date.now();
  const response = http.get(base + paths[(__ITER + __VU - 1) % paths.length], { timeout: '5s', headers: { 'Accept-Encoding': 'gzip' } });
  elapsed.add(Date.now() - start);
  timeouts.add(response.error_code === 1050 ? 1 : 0);
  transport.add(response.status === 0 ? 1 : 0);
  errors.add(response.status !== 0 && response.status !== 200 ? 1 : 0);
  success.add(response.status === 200 ? 1 : 0);
}
export function handleSummary(data) {
  return { [__ENV.SUMMARY]: JSON.stringify(data, null, 2) };
}
