import ReadarrAPI from '@server/api/servarr/readarr';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import { checkUser } from '@server/middleware/auth';
import { setupTestDb } from '@server/test/db';
import express from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import mediaRoutes from './media';

setupTestDb();
const app = express();
app.use(checkUser);
app.use('/media', mediaRoutes);

const removals: { url?: string; hcId: number }[] = [];
// Intercept the removal before any external lookup or file operation.
Object.defineProperty(ReadarrAPI.prototype, 'removeBook', {
  configurable: true,
  get(this: ReadarrAPI) {
    return async (hcId: number) => {
      removals.push({ url: this['axios'].defaults.baseURL, hcId });
    };
  },
  set() {},
});

beforeEach(() => {
  removals.length = 0;
  const settings = getSettings();
  settings.main.apiKey = 'test-key';
  settings.readarr = [0, 1, 2, 3].map((id) => ({
    id,
    name: `Bookshelf ${id}`,
    hostname: `bookshelf-${id}.invalid`,
    port: 8787,
    apiKey: 'test-key',
    useSsl: false,
    isAudio: id % 2 === 1,
    isDefault: id >= 2,
    activeProfileId: 1,
    activeProfileName: 'Any',
    activeMetadataProfileId: 1,
    activeMetadataProfileName: 'Any',
    activeDirectory: '/books',
    tags: [],
    syncEnabled: true,
    preventSearch: false,
    tagRequests: false,
    overrideRule: [],
  }));
});

describe('book file removal server selection', () => {
  for (const isAlt of [false, true]) {
    it(`targets the recorded ${isAlt ? 'audiobook' : 'ebook'} server and preserves the other format`, async () => {
      const repository = getRepository(Media);
      const media = await repository.save(
        new Media({
          mediaType: MediaType.BOOK,
          hcId: 429102,
          status: MediaStatus.AVAILABLE,
          statusAlt: MediaStatus.AVAILABLE,
          serviceId: 0,
          serviceIdAlt: 1,
          externalServiceId: 10,
          externalServiceIdAlt: 20,
        })
      );

      await request(app)
        .delete(`/media/${media.id}/file?isAlt=${isAlt}`)
        .set('X-API-Key', 'test-key')
        .expect(204);

      assert.deepEqual(removals, [
        {
          url: `http://bookshelf-${isAlt ? 1 : 0}.invalid:8787/api/v1`,
          hcId: 429102,
        },
      ]);
      const updated = await repository.findOneByOrFail({ id: media.id });
      assert.equal(
        updated[isAlt ? 'statusAlt' : 'status'],
        MediaStatus.DELETED
      );
      assert.equal(
        updated[isAlt ? 'status' : 'statusAlt'],
        MediaStatus.AVAILABLE
      );
      assert.equal(
        updated[isAlt ? 'serviceId' : 'serviceIdAlt'],
        isAlt ? 0 : 1
      );
      assert.equal(
        updated[isAlt ? 'externalServiceId' : 'externalServiceIdAlt'],
        isAlt ? 10 : 20
      );
    });
  }
});
