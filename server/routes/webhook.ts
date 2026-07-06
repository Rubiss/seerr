import ReadarrAPI from '@server/api/servarr/readarr';
import { readarrScanner } from '@server/lib/scanners/readarr';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';
import { z } from 'zod';

const webhookRoutes = Router();
const payloadSchema = z.discriminatedUnion('eventType', [
  z.object({ eventType: z.literal('Test') }),
  z.object({
    eventType: z.literal('Download'),
    book: z.object({ id: z.number().int().positive() }),
  }),
]);

webhookRoutes.post('/readarr/:serverId', async (req, res, next) => {
  const settings = getSettings();
  const basicAuth = req.header('Authorization')?.match(/^Basic (.+)$/i);
  const credentials = basicAuth
    ? Buffer.from(basicAuth[1], 'base64').toString('utf8')
    : undefined;
  // Bookshelf supports Basic auth. Browser sessions cannot authorize imports.
  if (
    !settings.main.apiKey ||
    (req.header('X-API-Key') !== settings.main.apiKey &&
      credentials !== `seerr:${settings.main.apiKey}`)
  ) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  const serverId = Number(req.params.serverId);
  const server = settings.readarr.find((entry) => entry.id === serverId);
  if (!Number.isSafeInteger(serverId) || !server) {
    return res.status(404).json({ error: 'Readarr server not found' });
  }
  if (!server.syncEnabled) {
    return res.status(409).json({ error: 'Readarr sync is disabled' });
  }

  const payload = payloadSchema.safeParse(req.body);
  if (!payload.success) {
    return res
      .status(400)
      .json({ error: 'Unsupported or invalid import event' });
  }
  if (payload.data.eventType === 'Test') {
    return res.status(204).send();
  }

  try {
    const api = new ReadarrAPI({
      apiKey: server.apiKey,
      url: ReadarrAPI.buildUrl(server, '/api/v1'),
    });
    const bookId = payload.data.book.id;
    api.clearCache({ externalId: bookId });
    // Read authoritative library state: a download event alone isn't proof
    // that every part of an audiobook has been imported.
    const book = await api.getBook(bookId);
    if (book.id !== bookId) {
      throw new Error('Readarr returned a different book');
    }
    await readarrScanner.syncBook(book, server);
    return res.status(204).send();
  } catch (e) {
    logger.error('Failed to sync imported book', {
      label: 'Readarr Webhook',
      serverId: server.id,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return next({ status: 502, message: 'Unable to sync imported book' });
  }
});

export default webhookRoutes;
