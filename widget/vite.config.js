
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const envPath = new URL('../ai-backend/.env', import.meta.url);

function loadInternalToken() {
  const envText = readFileSync(envPath, 'utf8');

  const line = envText
    .split(/\r?\n/)
    .find((item) =>
      /^\s*INTERNAL_API_TOKEN\s*=/.test(item)
    );

  const token = line
    ?.replace(/^\s*INTERNAL_API_TOKEN\s*=\s*/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!token) {
    throw new Error('INTERNAL_API_TOKEN is missing');
  }

  return token;
}

export default defineConfig({
  server: {
    host: '127.0.0.1'
  },

  plugins: [
    {
      name: 'local-chat-proxy',
      apply: 'serve',

      configureServer(server) {
        const token = loadInternalToken();

        server.middlewares.use(
          '/api/chat',
          async (req, res) => {
            function sendError(status, detail) {
              res.writeHead(status, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
              });

              res.end(JSON.stringify({ detail }));
            }

            if (req.method !== 'POST') {
              sendError(405, 'Method not allowed');
              return;
            }

            try {
              let rawBody = '';

              for await (const chunk of req) {
                rawBody += chunk;

                if (rawBody.length > 32768) {
                  sendError(413, 'Request too large');
                  return;
                }
              }

              let body;

              try {
                body = JSON.parse(rawBody);
              } catch {
                sendError(400, 'Invalid JSON');
                return;
              }

              if (
                !body ||
                typeof body !== 'object' ||
                Array.isArray(body)
              ) {
                sendError(400, 'Invalid request body');
                return;
              }

              const upstream = await fetch(
                'http://127.0.0.1:8000/internal/chat',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': token
                  },
                  body: JSON.stringify({
                    ...body,
                    owner_id: 'local-development-user'
                  })
                }
              );

              const responseText = await upstream.text();

              res.writeHead(upstream.status, {
                'Content-Type':
                  upstream.headers.get('content-type') ||
                  'application/json',
                'Cache-Control': 'no-store'
              });

              res.end(responseText);

            } catch (error) {
              console.error(
                '[DEV PROXY]',
                error.message
              );

              if (!res.headersSent) {
                sendError(502, 'Backend connection failed');
              }
            }
          }
        );
      }
    }
  ]
});
