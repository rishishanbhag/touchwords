import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev stand-in for the Vercel function (adds ?day=N preview, which production does not have)
const devApi = {
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api/today', async (req, res) => {
      const { getPuzzle } = await server.ssrLoadModule('/server/puzzle.js');
      const q = new URL(req.url, 'http://x').searchParams;
      const day = q.has('day') ? Number(q.get('day')) : undefined;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(getPuzzle({ day, solution: q.get('jawaab') === '1' })));
    });
  },
};

export default defineConfig({ plugins: [react(), tailwindcss(), devApi] });
