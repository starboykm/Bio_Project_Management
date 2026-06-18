import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as proxyRequest } from 'node:http';
import { extname, join, resolve } from 'node:path';

const root = resolve('frontend/dist');
const port = Number(process.env.PREVIEW_PORT || 5173);
const apiTargetPort = Number(process.env.BACKEND_PORT || 3333);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer((request, response) => {
  if ((request.url || '').startsWith('/api/') || (request.url || '').startsWith('/uploads/')) {
    const proxy = proxyRequest(
      {
        hostname: '127.0.0.1',
        port: apiTargetPort,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (apiResponse) => {
        response.writeHead(apiResponse.statusCode || 502, apiResponse.headers);
        apiResponse.pipe(response);
      },
    );

    proxy.on('error', () => {
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ message: 'Backend API is not available' }));
    });

    request.pipe(proxy);
    return;
  }

  const urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
  let filePath = join(root, urlPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (urlPath === '/' || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, 'index.html');
  }

  response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview server running at http://127.0.0.1:${port}/`);
});
