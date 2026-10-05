import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import { setupTestDb } from '@server/test/db';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

setupTestDb();

describe('book request quota', () => {
  for (const days of [7, 0]) {
    it(`excludes bypassed and declined books with a ${days}-day quota`, async () => {
      const requester = await getRepository(User).findOneByOrFail({
        email: 'demo@seerr.dev',
      });
      requester.bookQuotaLimit = 2;
      requester.bookQuotaDays = days;
      await getRepository(User).save(requester);
      const media = await getRepository(Media).save(
        new Media({
          hcId: 429102,
          mediaType: MediaType.BOOK,
          status: MediaStatus.PENDING,
        })
      );
      await getRepository(MediaRequest).save(
        [
          new MediaRequest({
            media,
            type: MediaType.BOOK,
            requestedBy: requester,
            status: MediaRequestStatus.PENDING,
          }),
          new MediaRequest({
            media,
            type: MediaType.BOOK,
            requestedBy: requester,
            status: MediaRequestStatus.APPROVED,
            isAlt: true,
            ignoreQuota: true,
          }),
          new MediaRequest({
            media,
            type: MediaType.BOOK,
            requestedBy: requester,
            status: MediaRequestStatus.DECLINED,
          }),
        ],
        { listeners: false }
      );

      const quota = (await requester.getQuota()).book;
      assert.equal(quota.used, 1);
      assert.equal(quota.remaining, 1);
      assert.equal(quota.restricted, false);
    });
  }
});
