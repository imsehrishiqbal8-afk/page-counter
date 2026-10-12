import { Router, Request, Response } from 'express';
import { ScanManager } from '../services/scan-manager.js';
import { exportUrlsToCsv } from '../utils/csv-exporter.js';
import { ScanMode } from '../types/index.js';

export function createScanRouter(scanManager: ScanManager): Router {
  const router = Router();

  // Start a new scan
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const { url, mode = 'both', maxPages = 100, maxDepth = 4, respectRobotsTxt = true } = req.body;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'A valid website URL is required.' });
        return;
      }

      const validModes: ScanMode[] = ['sitemap', 'crawl', 'both'];
      const validatedMode: ScanMode = validModes.includes(mode) ? mode : 'both';

      const parsedMaxPages = Math.min(Math.max(parseInt(String(maxPages), 10) || 100, 1), 2000);
      const parsedMaxDepth = Math.min(Math.max(parseInt(String(maxDepth), 10) || 4, 1), 10);

      const session = await scanManager.createAndStartScan({
        url,
        mode: validatedMode,
        maxPages: parsedMaxPages,
        maxDepth: parsedMaxDepth,
        respectRobotsTxt: Boolean(respectRobotsTxt)
      });

      res.status(200).json({
        scanId: session.id,
        targetUrl: session.targetUrl,
        mode: session.mode,
        state: session.state,
        stats: session.stats
      });
    } catch (err: any) {
      res.status(400).json({
        error: err.message || 'Failed to start scan.'
      });
    }
  });

  // Server-Sent Events stream for real-time progress
  router.get('/:scanId/stream', (req: Request, res: Response) => {
    const { scanId } = req.params;
    scanManager.registerSSEClient(scanId, res);
  });

  // Stop an active scan
  router.post('/:scanId/stop', (req: Request, res: Response) => {
    const { scanId } = req.params;
    const stopped = scanManager.stopScan(scanId);

    if (stopped) {
      res.status(200).json({ success: true, message: 'Scan stopped successfully.' });
    } else {
      res.status(404).json({ error: 'Scan not found or already completed.' });
    }
  });

  // Get full session snapshot
  router.get('/:scanId', (req: Request, res: Response) => {
    const { scanId } = req.params;
    const session = scanManager.getSession(scanId);

    if (!session) {
      res.status(404).json({ error: 'Scan not found.' });
      return;
    }

    res.status(200).json({
      scanId: session.id,
      targetUrl: session.targetUrl,
      mode: session.mode,
      state: session.state,
      stats: session.stats,
      urls: Array.from(session.urls.values()),
      logs: session.logs,
      errorMessage: session.errorMessage
    });
  });

  // Export results as CSV
  router.get('/:scanId/export/csv', (req: Request, res: Response) => {
    const { scanId } = req.params;
    const session = scanManager.getSession(scanId);

    if (!session) {
      res.status(404).json({ error: 'Scan session not found.' });
      return;
    }

    const urlList = Array.from(session.urls.values());
    const csvContent = exportUrlsToCsv(urlList);

    const host = new URL(session.targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `page-counter-${host}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  });

  return router;
}
