import { MediaStatus } from '@server/constants/media';
import type Media from '@server/entity/Media';
import type { DownloadingItem } from '@server/lib/downloadtracker';

export const getRequestDownloadStatus = (
  downloadStatus: DownloadingItem[] | undefined,
  seasonNumbers: number[]
): DownloadingItem[] => {
  const items = downloadStatus ?? [];

  if (!seasonNumbers.length) {
    return items;
  }

  return items.filter(
    (item) => item.episode && seasonNumbers.includes(item.episode.seasonNumber)
  );
};

export const refreshIntervalHelper = (
  downloadItem: {
    downloadStatus: DownloadingItem[] | undefined;
    downloadStatusAlt: DownloadingItem[] | undefined;
  },
  timer: number
) => {
  if (
    (downloadItem.downloadStatus ?? []).length > 0 ||
    (downloadItem.downloadStatusAlt ?? []).length > 0
  ) {
    return timer;
  } else {
    return 0;
  }
};

export const mediaRefreshInterval = (
  media: Media | undefined,
  sawDownload: { current: boolean },
  timer: number
) => {
  if (
    refreshIntervalHelper(
      {
        downloadStatus: media?.downloadStatus,
        downloadStatusAlt: media?.downloadStatusAlt,
      },
      timer
    )
  ) {
    sawDownload.current = true;
    return timer;
  }

  // The queue empties before the media turns available, and briefly on every sync reset
  // Media keeps its alternate status in statusAlt, seasons still use status4k
  const processing =
    media?.status === MediaStatus.PROCESSING ||
    media?.statusAlt === MediaStatus.PROCESSING ||
    (media?.seasons ?? []).some(
      (season) =>
        season.status === MediaStatus.PROCESSING ||
        season.status4k === MediaStatus.PROCESSING
    );

  return sawDownload.current && processing ? timer : 0;
};
