import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScanManager } from './services/scan-manager.js';
import { createScanRouter } from './routes/scan-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS configuration - allow local dev frontend
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '1mb' }));

const scanManager = new ScanManager();

// API routes
app.use('/api/scan', createScanRouter(scanManager));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexFile = path.join(clientDistPath, 'index.html');
  res.sendFile(indexFile, err => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Website Page Counter Backend</title></head>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h2>Website Page Counter API Server</h2>
          <p>Backend API is active and listening on port ${PORT}.</p>
          <p>Access the Vite frontend at: <a href="http://localhost:5173">http://localhost:5173</a></p>
        </body>
        </html>
      `);
    }
  });
});

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: err.message || 'An internal server error occurred.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`[Website Page Counter Server] Running on http://localhost:${PORT}`);
});

export { app, server };
