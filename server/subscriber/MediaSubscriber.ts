import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import Season from '@server/entity/Season';
import SeasonRequest from '@server/entity/SeasonRequest';
import logger from '@server/logger';
import { withNestedTransaction } from '@server/utils/nestedTransaction';
import type {
  EntityManager,
  EntitySubscriberInterface,
  UpdateEvent,
} from 'typeorm';
import { EventSubscriber, In } from 'typeorm';

@EventSubscriber()
export class MediaSubscriber implements EntitySubscriberInterface<Media> {
  private async updateChildRequestStatus(
    manager: EntityManager,
    event: Media,
    isAlt: boolean
  ) {
    const requestRepository = manager.getRepository(MediaRequest);

    const requests = await requestRepository.find({
      where: { media: { id: event.id } },
    });

    for (const request of requests) {
      if (
        request.isAlt === isAlt &&
        request.status === MediaRequestStatus.PENDING
      ) {
        request.status = MediaRequestStatus.APPROVED;
        await requestRepository.save(request);
      }
    }
  }

  private async updateRelatedMediaRequest(
    manager: EntityManager,
    event: Media,
    databaseEvent: Media,
    isAlt: boolean
  ) {
    const requestRepository = manager.getRepository(MediaRequest);
    const seasonRequestRepository = manager.getRepository(SeasonRequest);

    const relatedRequests = await requestRepository.find({
      relations: {
        media: true,
      },
      where: {
        media: { id: event.id },
        status: In([MediaRequestStatus.APPROVED, MediaRequestStatus.FAILED]),
        isAlt,
      },
    });

    // Check the media entity status and if available
    // or deleted, set the related request to completed
    if (relatedRequests.length > 0) {
      const completedRequests: MediaRequest[] = [];

      for (const request of relatedRequests) {
        let shouldComplete = false;

        if (
          (event[request.isAlt ? 'status4k' : 'status'] ===
            MediaStatus.AVAILABLE ||
            event[request.isAlt ? 'status4k' : 'status'] ===
              MediaStatus.DELETED) &&
          (event.mediaType === MediaType.MOVIE ||
            event.mediaType === MediaType.BOOK)
        ) {
          shouldComplete = true;
        } else if (event.mediaType === 'tv') {
          const allSeasonResults: boolean[] = [];

          // Sequential on purpose as these saves share the transaction's connection
          for (const requestSeason of request.seasons) {
            const matchingSeason = event.seasons.find(
              (mediaSeason) =>
                mediaSeason.seasonNumber === requestSeason.seasonNumber
            );
            const matchingOldSeason = databaseEvent.seasons.find(
              (oldSeason) =>
                oldSeason.seasonNumber === requestSeason.seasonNumber
            );

            if (!matchingSeason) {
              allSeasonResults.push(false);
              continue;
            }

            const currentSeasonStatus =
              matchingSeason[request.isAlt ? 'status4k' : 'status'];
            const previousSeasonStatus =
              matchingOldSeason?.[request.isAlt ? 'status4k' : 'status'];

            const hasStatusChanged =
              currentSeasonStatus !== previousSeasonStatus;

            const shouldUpdate =
              (hasStatusChanged ||
                requestSeason.status === MediaRequestStatus.COMPLETED) &&
              (currentSeasonStatus === MediaStatus.AVAILABLE ||
                currentSeasonStatus === MediaStatus.DELETED);

            if (shouldUpdate) {
              requestSeason.status = MediaRequestStatus.COMPLETED;
              await seasonRequestRepository.save(requestSeason);

              allSeasonResults.push(true);
              continue;
            }

            allSeasonResults.push(false);
          }

          const allSeasonsReady = allSeasonResults.every((result) => result);
          shouldComplete = allSeasonsReady;
        }

        if (shouldComplete) {
          request.status = MediaRequestStatus.COMPLETED;
          completedRequests.push(request);
        }
      }

      await requestRepository.save(completedRequests);
    }
  }

  public async beforeUpdate(event: UpdateEvent<Media>): Promise<void> {
    if (!event.entity || !event.databaseEntity) {
      return;
    }

    try {
      if (
        event.entity.status === MediaStatus.AVAILABLE &&
        event.databaseEntity?.status === MediaStatus.PENDING
      ) {
        await withNestedTransaction(event.manager, async (manager) => {
          await this.updateChildRequestStatus(
            manager,
            event.entity as Media,
            false
          );
        });
      }
    } catch (e) {
      logger.error(
        'Error while updating child request status in beforeUpdate subscriber',
        {
          label: 'Media',
          mediaId: event.entity.id,
          isAlt: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        }
      );
    }

    try {
      if (
        event.entity.statusAlt === MediaStatus.AVAILABLE &&
        event.databaseEntity?.statusAlt === MediaStatus.PENDING
      ) {
        await withNestedTransaction(event.manager, async (manager) => {
          await this.updateChildRequestStatus(
            manager,
            event.entity as Media,
            true
          );
        });
      }
    } catch (e) {
      logger.error(
        'Error while updating child request status in beforeUpdate subscriber',
        {
          label: 'Media',
          mediaId: event.entity.id,
          isAlt: true,
          errorMessage: e instanceof Error ? e.message : String(e),
        }
      );
    }

    // Manually load related seasons into databaseEntity
    // for seasonStatusCheck in afterUpdate
    const seasons = await event.manager
      .getRepository(Season)
      .createQueryBuilder('season')
      .leftJoin('season.media', 'media')
      .where('media.id = :id', { id: event.databaseEntity.id })
      .getMany();

    event.databaseEntity.seasons = seasons;
  }

  public async afterUpdate(event: UpdateEvent<Media>): Promise<void> {
    if (!event.entity || !event.databaseEntity) {
      return;
    }

    const validStatuses = [
      MediaStatus.PARTIALLY_AVAILABLE,
      MediaStatus.AVAILABLE,
      MediaStatus.DELETED,
    ];

    const seasonStatusCheck = (isAlt: boolean) => {
      return event.entity?.seasons?.some((season: Season, index: number) => {
        const previousSeason = event.databaseEntity.seasons[index];

        return (
          season[isAlt ? 'status4k' : 'status'] !==
          previousSeason?.[isAlt ? 'status4k' : 'status']
        );
      });
    };

    try {
      if (
        (event.entity.status !== event.databaseEntity?.status ||
          (event.entity.mediaType === MediaType.TV &&
            seasonStatusCheck(false))) &&
        validStatuses.includes(event.entity.status)
      ) {
        await withNestedTransaction(event.manager, async (manager) => {
          await this.updateRelatedMediaRequest(
            manager,
            event.entity as Media,
            event.databaseEntity as Media,
            false
          );
        });
      }
    } catch (e) {
      logger.error(
        'Error while updating related requests in afterUpdate subscriber',
        {
          label: 'Media',
          mediaId: event.entity.id,
          isAlt: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        }
      );
    }

    try {
      if (
        (event.entity.statusAlt !== event.databaseEntity?.statusAlt ||
          (event.entity.mediaType === MediaType.TV &&
            seasonStatusCheck(true))) &&
        validStatuses.includes(event.entity.statusAlt)
      ) {
        await withNestedTransaction(event.manager, async (manager) => {
          await this.updateRelatedMediaRequest(
            manager,
            event.entity as Media,
            event.databaseEntity as Media,
            true
          );
        });
      }
    } catch (e) {
      logger.error(
        'Error while updating related requests in afterUpdate subscriber',
        {
          label: 'Media',
          mediaId: event.entity.id,
          isAlt: true,
          errorMessage: e instanceof Error ? e.message : String(e),
        }
      );
    }
  }

  public listenTo(): typeof Media {
    return Media;
  }
}
