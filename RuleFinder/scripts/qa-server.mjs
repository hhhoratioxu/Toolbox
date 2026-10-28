// Local-only deterministic remote-loading fixtures for manual browser QA.
import { createServer } from 'node:http';
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (req.url === '/rules.list') { res.end('# 远程原文第 1 行\n\nDOMAIN-SUFFIX,remote.example\n'); }
  else if (req.url === '/slow.list') { const timer = setTimeout(() => res.end('DOMAIN,example.com'), 20000); req.on('close', () => clearTimeout(timer)); }
  else { res.statusCode = 404; res.end('Fixture: missing rule file'); }
});
server.listen(5180, '127.0.0.1', () => console.log('QA fixtures: http://127.0.0.1:5180'));
