import Hardcover from '@server/api/hardcover';
import type { ReadarrBook } from '@server/api/servarr/readarr';
import ReadarrAPI from '@server/api/servarr/readarr';
import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import type { ReadarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import { setupTestDb } from '@server/test/db';
import express from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import request from 'supertest';
import webhookRoutes from './webhook';

setupTestDb();
const app = express();
app.use(express.json());
app.use(
  OpenApiValidator.middleware({
    apiSpec: 'seerr-api.yml',
    validateRequests: true,
  })
);
app.use('/api/v1/webhook', webhookRoutes);

function configureServer(id: number, isAudio: boolean): ReadarrSettings {
  return {
    id,
    isAudio,
    name: `Bookshelf ${id}`,
    hostname: 'localhost',
    port: 8787,
    apiKey: 'bookshelf-test-key',
    baseUrl: '',
    useSsl: false,
    activeProfileId: 1,
    activeProfileName: 'Any',
    activeMetadataProfileId: 1,
    activeMetadataProfileName: 'Any',
    activeDirectory: '/books',
    tags: [],
    isDefault: true,
    syncEnabled: true,
    preventSearch: false,
    tagRequests: false,
    overrideRule: [],
  };
}

let importedBook: ReadarrBook;
let failLookup = false;
let lookups = 0;
Object.defineProperty(ReadarrAPI.prototype, 'getBook', {
  configurable: true,
  get: () => async () => {
    lookups++;
    if (failLookup) throw new Error('Bookshelf unavailable');
    return importedBook;
  },
  set() {},
});
mock.method(MediaRequest, 'sendNotification', async () => undefined);
Object.defineProperty(Hardcover.prototype, 'getBook', {
  configurable: true,
  get: () => async () => ({
    id: 429102,
    title: 'Empire of the Vampire',
    pages: 738,
  }),
  set() {},
});

beforeEach(() => {
  const settings = getSettings();
  settings.main.apiKey = 'seerr-test-key';
  settings.readarr = [configureServer(0, false), configureServer(1, true)];
  importedBook = {
    id: 465,
    foreignBookId: '429102',
    title: 'Empire of the Vampire',
    titleSlug: 'empire-of-the-vampire',
    monitored: true,
    statistics: {
      bookFileCount: 1,
      bookCount: 1,
      totalBookCount: 1,
      sizeOnDisk: 100,
      percentOfBooks: 100,
    },
  } as ReadarrBook;
  failLookup = false;
  lookups = 0;
});

const post = (serverId = 0) =>
  request(app)
    .post(`/api/v1/webhook/readarr/${serverId}`)
    .auth('seerr', 'seerr-test-key');
const payload = {
  eventType: 'Download',
  book: { id: 465, goodreadsId: 'wrong-id' },
  isUpgrade: false,
  bookFiles: [{ id: 1 }],
};

describe('Bookshelf import webhook', () => {
  for (const isAudio of [false, true]) {
    it(`immediately marks an imported ${isAudio ? 'audiobook' : 'ebook'} available and completes its request`, async () => {
      const repository = getRepository(Media);
      const media = await repository.save(
        new Media({
          mediaType: MediaType.BOOK,
          hcId: 429102,
          status: MediaStatus.PROCESSING,
          statusAlt: MediaStatus.PROCESSING,
        })
      );
      // Save without subscribers to represent an already-approved request.
      const requester = await getRepository(User).findOneByOrFail({ id: 1 });
      const pending = await getRepository(MediaRequest).save(
        new MediaRequest({
          media,
          type: MediaType.BOOK,
          isAlt: isAudio,
          requestedBy: requester,
          status: MediaRequestStatus.APPROVED,
        }),
        { listeners: false }
      );

      await post(isAudio ? 1 : 0)
        .send(payload)
        .expect(204);
      const updated = await repository.findOneByOrFail({ id: media.id });
      assert.equal(
        updated[isAudio ? 'statusAlt' : 'status'],
        MediaStatus.AVAILABLE
      );
      assert.equal(
        updated[isAudio ? 'status' : 'statusAlt'],
        MediaStatus.PROCESSING
      );
      assert.equal(
        updated[isAudio ? 'serviceIdAlt' : 'serviceId'],
        isAudio ? 1 : 0
      );
      assert.equal(
        updated[isAudio ? 'externalServiceIdAlt' : 'externalServiceId'],
        465
      );
      assert.equal(
        (await getRepository(MediaRequest).findOneByOrFail({ id: pending.id }))
          .status,
        MediaRequestStatus.COMPLETED
      );

      await post(isAudio ? 1 : 0)
        .send({ ...payload, isUpgrade: true })
        .expect(204);
      assert.equal(await repository.count(), 1);
    });
  }

  it('does not mark a partially imported audiobook available', async () => {
    importedBook.statistics.percentOfBooks = 50;
    await post(1).send(payload).expect(204);
    const media = await getRepository(Media).findOneByOrFail({ hcId: 429102 });
    assert.equal(media.statusAlt, MediaStatus.PROCESSING);
    assert.equal(media.status, MediaStatus.UNKNOWN);
  });

  it('accepts connection tests without changing media', async () => {
    await post().send({ eventType: 'Test', author: {} }).expect(204);
    await request(app)
      .post('/api/v1/webhook/readarr/0')
      .set('X-API-Key', 'seerr-test-key')
      .send({ eventType: 'Test' })
      .expect(204);
    assert.equal(lookups, 0);
    assert.equal(await getRepository(Media).count(), 0);
  });

  it('rejects unauthenticated, malformed, unknown, and disabled callbacks', async () => {
    await request(app)
      .post('/api/v1/webhook/readarr/0')
      .send(payload)
      .expect(401);
    await request(app)
      .post('/api/v1/webhook/readarr/0')
      .set('X-API-Key', 'incorrect')
      .send(payload)
      .expect(403);
    await request(app)
      .post('/api/v1/webhook/readarr/0')
      .auth('seerr', 'incorrect')
      .send(payload)
      .expect(403);
    await request(app)
      .post('/api/v1/webhook/readarr/0')
      .auth('other-user', 'seerr-test-key')
      .send(payload)
      .expect(403);
    await post().send({ eventType: 'Download' }).expect(400);
    await post(999).send(payload).expect(404);
    getSettings().readarr[0].syncEnabled = false;
    await post().send(payload).expect(409);
    assert.equal(lookups, 0);
  });

  it('returns a failure when Bookshelf cannot be queried', async () => {
    failLookup = true;
    await post().send(payload).expect(502);
    assert.equal(await getRepository(Media).count(), 0);
  });
});
