import type { ReadarrBook } from '@server/api/servarr/readarr';
import ReadarrAPI from '@server/api/servarr/readarr';
import type {
  RunnableScanner,
  StatusBase,
} from '@server/lib/scanners/baseScanner';
import BaseScanner from '@server/lib/scanners/baseScanner';
import type { ReadarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import { uniqWith } from 'lodash';

type SyncStatus = StatusBase & {
  currentServer: ReadarrSettings;
  servers: ReadarrSettings[];
};

class ReadarrScanner
  extends BaseScanner<ReadarrBook>
  implements RunnableScanner<SyncStatus>
{
  private servers: ReadarrSettings[];
  private currentServer: ReadarrSettings;
  private readarrApi: ReadarrAPI;

  constructor() {
    super('Readarr Scan', { bundleSize: 50 });
  }

  public status(): SyncStatus {
    return {
      running: this.running,
      progress: this.progress,
      total: this.items.length,
      currentServer: this.currentServer,
      servers: this.servers,
    };
  }

  public async run(): Promise<void> {
    const settings = getSettings();
    const sessionId = this.startRun();

    try {
      this.servers = uniqWith(settings.readarr, (readarrA, readarrB) => {
        return (
          readarrA.hostname === readarrB.hostname &&
          readarrA.port === readarrB.port &&
          readarrA.baseUrl === readarrB.baseUrl
        );
      });

      for (const server of this.servers) {
        this.currentServer = server;
        if (server.syncEnabled) {
          this.log(
            `Beginning to process Readarr server: ${server.name}`,
            'info'
          );

          this.readarrApi = new ReadarrAPI({
            apiKey: server.apiKey,
            url: ReadarrAPI.buildUrl(server, '/api/v1'),
          });

          this.items = await this.readarrApi.getBooks();

          await this.loop(this.processReadarrBook.bind(this), { sessionId });
        } else {
          this.log(`Sync not enabled. Skipping Readarr server: ${server.name}`);
        }
      }

      this.log('Readarr scan complete', 'info');
    } catch (e) {
      this.log('Scan interrupted', 'error', { errorMessage: e.message });
    } finally {
      this.endRun(sessionId);
    }
  }

  private async processReadarrBook(readarrBook: ReadarrBook): Promise<void> {
    try {
      await this.syncBook(readarrBook, this.currentServer);
    } catch (e) {
      this.log('Failed to process Readarr media', 'error', {
        errorMessage: e.message,
        title: readarrBook.title,
      });
    }
  }

  // Import callbacks share the scan's update path without changing scan state.
  public async syncBook(
    readarrBook: ReadarrBook,
    server: ReadarrSettings
  ): Promise<void> {
    const isFullyDownloaded = readarrBook.statistics?.percentOfBooks >= 100;

    if (!readarrBook.monitored && !readarrBook.grabbed && !isFullyDownloaded) {
      this.log(
        'Title is unmonitored and has not been downloaded. Skipping item.',
        'debug',
        {
          title: readarrBook.title,
        }
      );
      return;
    }

    const serverAudio = server.isAudio;
    const hcId = Number(readarrBook.foreignBookId);

    if (!Number.isSafeInteger(hcId) || hcId <= 0) {
      throw new Error('Invalid Hardcover ID for book');
    }

    await this.processBook(hcId, {
      isAlt: serverAudio,
      serviceId: server.id,
      externalServiceId: readarrBook.id,
      externalServiceSlug: readarrBook.titleSlug,
      title: readarrBook.title,
      processing: !isFullyDownloaded,
    });
  }
}

export const readarrScanner = new ReadarrScanner();
