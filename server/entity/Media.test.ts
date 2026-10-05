import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import { getSettings } from '@server/lib/settings';
import { setupTestDb } from '@server/test/db';
import assert from 'node:assert/strict';
import { it } from 'node:test';

setupTestDb();

it('marks active ebook and audiobook requests for book discovery', async () => {
  getSettings().main.hideRequested = true;
  const requester = await getRepository(User).findOneByOrFail({
    email: 'demo@seerr.dev',
  });
  const states = [
    { hcId: 101, status: MediaRequestStatus.PENDING, isAlt: false },
    { hcId: 102, status: MediaRequestStatus.APPROVED, isAlt: true },
    { hcId: 103, status: MediaRequestStatus.COMPLETED, isAlt: false },
    { hcId: 104, status: MediaRequestStatus.DECLINED, isAlt: true },
  ];
  for (const { hcId, status, isAlt } of states) {
    const media = await getRepository(Media).save(
      new Media({
        hcId,
        mediaType: MediaType.BOOK,
        status: MediaStatus.PROCESSING,
      })
    );
    await getRepository(MediaRequest).save(
      new MediaRequest({
        media,
        type: MediaType.BOOK,
        requestedBy: requester,
        status,
        isAlt,
      }),
      { listeners: false }
    );
  }

  const media = await Media.getRelatedMedia(
    requester,
    states.map(({ hcId }) => hcId),
    { mediaType: MediaType.BOOK, includeActiveRequest: true }
  );
  assert.deepEqual(
    media
      .sort((a, b) => a.hcId! - b.hcId!)
      .map(({ hcId, hasActiveRequest }) => ({ hcId, hasActiveRequest })),
    [
      { hcId: 101, hasActiveRequest: true },
      { hcId: 102, hasActiveRequest: true },
      { hcId: 103, hasActiveRequest: false },
      { hcId: 104, hasActiveRequest: false },
    ]
  );
});
