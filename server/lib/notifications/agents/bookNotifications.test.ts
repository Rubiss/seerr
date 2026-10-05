import { MediaType } from '@server/constants/media';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import { initI18n } from '@server/i18n';
import { Notification } from '@server/lib/notifications';
import type { NotificationPayload } from '@server/lib/notifications/agents/agent';
import EmailAgent from '@server/lib/notifications/agents/email';
import WebPushAgent from '@server/lib/notifications/agents/webpush';
import { getSettings } from '@server/lib/settings';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

before(() => {
  initI18n();
  getSettings().main.applicationUrl = 'https://seerr.example';
});

describe('book availability notifications', () => {
  for (const isAlt of [false, true]) {
    for (const type of [
      Notification.MEDIA_AVAILABLE,
      Notification.MEDIA_FAILED,
    ]) {
      it(`uses ${isAlt ? 'audiobook' : 'book'} wording for ${Notification[type]}`, () => {
        const media = new Media({ mediaType: MediaType.BOOK, hcId: 429102 });
        const payload: NotificationPayload = {
          subject: 'Empire of the Vampire',
          notifySystem: false,
          notifyAdmin: false,
          media,
          request: new MediaRequest({
            media,
            isAlt,
            requestedBy: new User({ email: 'reader@example.com' }),
          }),
        };
        const email = new EmailAgent()['buildMessage'](
          type,
          payload,
          'reader@example.com'
        );
        const push = new WebPushAgent()['getNotificationPayload'](
          type,
          payload
        );
        const format = isAlt ? 'audiobook' : 'book';
        assert.match(email?.locals?.body, new RegExp(`\\b${format}\\b`));
        assert.doesNotMatch(email?.locals?.body, /series|4K|Sonarr/);
        assert.match(push.message ?? '', new RegExp(`\\b${format}\\b`));
        assert.doesNotMatch(push.message ?? '', /series|4K/);
        assert.equal(
          email?.locals?.actionUrl,
          'https://seerr.example/book/429102'
        );
        if (type === Notification.MEDIA_FAILED) {
          assert.match(email?.locals?.body, /Readarr/);
        }
      });
    }
  }
});
