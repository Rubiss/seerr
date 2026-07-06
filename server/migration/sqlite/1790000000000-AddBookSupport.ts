import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookSupport1790000000000 implements MigrationInterface {
  name = 'AddBookSupport1790000000000';

  private async renameColumnIfPresent(
    queryRunner: QueryRunner,
    tableName: string,
    from: string,
    to: string
  ): Promise<void> {
    if (await queryRunner.hasColumn(tableName, to)) {
      return;
    }

    if (await queryRunner.hasColumn(tableName, from)) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" RENAME COLUMN "${from}" TO "${to}"`
      );
    }
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    definition: string
  ): Promise<void> {
    if (!(await queryRunner.hasColumn(tableName, columnName))) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" ADD "${columnName}" ${definition}`
      );
    }
  }

  private async ensureBookSupportCompatibilitySchema(
    queryRunner: QueryRunner
  ): Promise<void> {
    await this.renameColumnIfPresent(
      queryRunner,
      'media_request',
      'is4k',
      'isAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'status4k',
      'statusAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'serviceId4k',
      'serviceIdAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'externalServiceId4k',
      'externalServiceIdAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'externalServiceSlug4k',
      'externalServiceSlugAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'ratingKey4k',
      'ratingKeyAlt'
    );
    await this.renameColumnIfPresent(
      queryRunner,
      'media',
      'jellyfinMediaId4k',
      'jellyfinMediaIdAlt'
    );

    await this.addColumnIfMissing(
      queryRunner,
      'media_request',
      'metadataProfileId',
      'integer'
    );
    await this.addColumnIfMissing(
      queryRunner,
      'media_request',
      'ignoreQuota',
      'boolean NOT NULL DEFAULT (0)'
    );
    await this.addColumnIfMissing(
      queryRunner,
      'override_rule',
      'readarrServiceId',
      'integer'
    );
    await this.addColumnIfMissing(
      queryRunner,
      'override_rule',
      'metadataProfileId',
      'integer'
    );
    await this.addColumnIfMissing(
      queryRunner,
      'user',
      'bookQuotaLimit',
      'integer'
    );
    await this.addColumnIfMissing(
      queryRunner,
      'user',
      'bookQuotaDays',
      'integer'
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e460d2f12505b0d9adf2a8014a" ON "blocklist" ("externalId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_356721a49f145aa439c16e6b99" ON "blocklist" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f926a3b825cc8d5b982f726367" ON "media" ("hcId")`
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBookSchema =
      (await queryRunner.hasTable('blocklist')) &&
      (await queryRunner.hasColumn('blocklist', 'externalId')) &&
      (await queryRunner.hasColumn('media', 'hcId')) &&
      (await queryRunner.hasColumn('media_request', 'isAlt'));

    if (hasBookSchema) {
      await this.ensureBookSupportCompatibilitySchema(queryRunner);
      return;
    }

    const hasLegacyPreviewBookSchema =
      (await queryRunner.hasTable('blocklist')) &&
      (await queryRunner.hasColumn('blocklist', 'externalId')) &&
      (await queryRunner.hasColumn('media', 'hcId')) &&
      (await queryRunner.hasColumn('media_request', 'is4k'));

    if (hasLegacyPreviewBookSchema) {
      await this.ensureBookSupportCompatibilitySchema(queryRunner);
      return;
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_09b94c932e84635c5461f3c0a9"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_356721a49f145aa439c16e6b99"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_blocklist" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "title" varchar, "externalId" integer NOT NULL, "blocklistedTags" varchar, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "userId" integer, "mediaId" integer, CONSTRAINT "REL_62b7ade94540f9f8d8bede54b9" UNIQUE ("mediaId"), CONSTRAINT "UQ_cd389742b9156ca10495f21fe0a" UNIQUE ("externalId", "mediaType"), CONSTRAINT "FK_5c8af2d0e83b3be6d250eccc19d" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_356721a49f145aa439c16e6b999" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_blocklist"("id", "mediaType", "title", "externalId", "blocklistedTags", "createdAt", "userId", "mediaId") SELECT "id", "mediaType", "title", "tmdbId", "blocklistedTags", "createdAt", "userId", "mediaId" FROM "blocklist"`
    );
    await queryRunner.query(`DROP TABLE "blocklist"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_blocklist" RENAME TO "blocklist"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e460d2f12505b0d9adf2a8014a" ON "blocklist" ("externalId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_356721a49f145aa439c16e6b99" ON "blocklist" ("userId")`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_f4fc4efa14c3ba2b29c4525fa1"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_6997bee94720f1ecb7f3113709"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_a1aa713f41c99e9d10c48da75a"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_4c696e8ed36ae34fe18abe59d2"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_media_request" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "type" varchar NOT NULL, "mediaId" integer, "requestedById" integer, "modifiedById" integer, "isAlt" boolean NOT NULL DEFAULT (0), "serverId" integer, "profileId" integer, "metadataProfileId" integer, "rootFolder" varchar, "languageProfileId" integer, "tags" text, "isAutoRequest" boolean NOT NULL DEFAULT (0), "ignoreQuota" boolean NOT NULL DEFAULT (0), CONSTRAINT "FK_a1aa713f41c99e9d10c48da75a0" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_6997bee94720f1ecb7f31137095" FOREIGN KEY ("requestedById") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_f4fc4efa14c3ba2b29c4525fa15" FOREIGN KEY ("modifiedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media_request"("id", "status", "createdAt", "updatedAt", "type", "mediaId", "requestedById", "modifiedById", "isAlt", "serverId", "profileId", "rootFolder", "languageProfileId", "tags", "isAutoRequest", "ignoreQuota") SELECT "id", "status", "createdAt", "updatedAt", "type", "mediaId", "requestedById", "modifiedById", "is4k", "serverId", "profileId", "rootFolder", "languageProfileId", "tags", "isAutoRequest", "ignoreQuota" FROM "media_request"`
    );
    await queryRunner.query(`DROP TABLE "media_request"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_media_request" RENAME TO "media_request"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4fc4efa14c3ba2b29c4525fa1" ON "media_request" ("modifiedById")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6997bee94720f1ecb7f3113709" ON "media_request" ("requestedById")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1aa713f41c99e9d10c48da75a" ON "media_request" ("mediaId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c696e8ed36ae34fe18abe59d2" ON "media_request" ("status")`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_7ff2d11f6a83cb52386eaebe74"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_41a289eb1fa489c1bc6f38d9c3"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_7157aad07c73f6a6ae3bbd5ef5"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_media" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "tmdbId" integer, "tvdbId" integer, "imdbId" varchar, "hcId" integer, "status" integer NOT NULL DEFAULT (1), "statusAlt" integer NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "lastSeasonChange" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "mediaAddedAt" datetime DEFAULT (CURRENT_TIMESTAMP), "serviceId" integer, "serviceIdAlt" integer, "externalServiceId" integer, "externalServiceIdAlt" integer, "externalServiceSlug" varchar, "externalServiceSlugAlt" varchar, "ratingKey" varchar, "ratingKeyAlt" varchar, "jellyfinMediaId" varchar, "jellyfinMediaIdAlt" varchar, CONSTRAINT "UQ_41a289eb1fa489c1bc6f38d9c3c" UNIQUE ("tvdbId"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media"("id", "mediaType", "tmdbId", "tvdbId", "imdbId", "status", "statusAlt", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceIdAlt", "externalServiceId", "externalServiceIdAlt", "externalServiceSlug", "externalServiceSlugAlt", "ratingKey", "ratingKeyAlt", "jellyfinMediaId", "jellyfinMediaIdAlt") SELECT "id", "mediaType", "tmdbId", "tvdbId", "imdbId", "status", "status4k", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceId4k", "externalServiceId", "externalServiceId4k", "externalServiceSlug", "externalServiceSlug4k", "ratingKey", "ratingKey4k", "jellyfinMediaId", "jellyfinMediaId4k" FROM "media"`
    );
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`ALTER TABLE "temporary_media" RENAME TO "media"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_7ff2d11f6a83cb52386eaebe74" ON "media" ("imdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_41a289eb1fa489c1bc6f38d9c3" ON "media" ("tvdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7157aad07c73f6a6ae3bbd5ef5" ON "media" ("tmdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f926a3b825cc8d5b982f726367" ON "media" ("hcId")`
    );

    await queryRunner.query(
      `ALTER TABLE "override_rule" ADD "readarrServiceId" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" ADD "metadataProfileId" integer`
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "bookQuotaLimit" integer`);
    await queryRunner.query(`ALTER TABLE "user" ADD "bookQuotaDays" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_e460d2f12505b0d9adf2a8014a"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_356721a49f145aa439c16e6b99"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_blocklist" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "title" varchar, "tmdbId" integer NOT NULL, "blocklistedTags" varchar, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "userId" integer, "mediaId" integer, CONSTRAINT "REL_62b7ade94540f9f8d8bede54b9" UNIQUE ("mediaId"), CONSTRAINT "UQ_81504e02db89b4c1e3152729fa6" UNIQUE ("tmdbId", "mediaType"), CONSTRAINT "FK_5c8af2d0e83b3be6d250eccc19d" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_356721a49f145aa439c16e6b999" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_blocklist"("id", "mediaType", "title", "tmdbId", "blocklistedTags", "createdAt", "userId", "mediaId") SELECT "id", "mediaType", "title", "externalId", "blocklistedTags", "createdAt", "userId", "mediaId" FROM "blocklist"`
    );
    await queryRunner.query(`DROP TABLE "blocklist"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_blocklist" RENAME TO "blocklist"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_09b94c932e84635c5461f3c0a9" ON "blocklist" ("tmdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_356721a49f145aa439c16e6b99" ON "blocklist" ("userId")`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_f4fc4efa14c3ba2b29c4525fa1"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_6997bee94720f1ecb7f3113709"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_a1aa713f41c99e9d10c48da75a"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_4c696e8ed36ae34fe18abe59d2"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_media_request" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "type" varchar NOT NULL, "mediaId" integer, "requestedById" integer, "modifiedById" integer, "is4k" boolean NOT NULL DEFAULT (0), "serverId" integer, "profileId" integer, "rootFolder" varchar, "languageProfileId" integer, "tags" text, "isAutoRequest" boolean NOT NULL DEFAULT (0), "ignoreQuota" boolean NOT NULL DEFAULT (0), CONSTRAINT "FK_a1aa713f41c99e9d10c48da75a0" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_6997bee94720f1ecb7f31137095" FOREIGN KEY ("requestedById") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_f4fc4efa14c3ba2b29c4525fa15" FOREIGN KEY ("modifiedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media_request"("id", "status", "createdAt", "updatedAt", "type", "mediaId", "requestedById", "modifiedById", "is4k", "serverId", "profileId", "rootFolder", "languageProfileId", "tags", "isAutoRequest", "ignoreQuota") SELECT "id", "status", "createdAt", "updatedAt", "type", "mediaId", "requestedById", "modifiedById", "isAlt", "serverId", "profileId", "rootFolder", "languageProfileId", "tags", "isAutoRequest", "ignoreQuota" FROM "media_request"`
    );
    await queryRunner.query(`DROP TABLE "media_request"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_media_request" RENAME TO "media_request"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4fc4efa14c3ba2b29c4525fa1" ON "media_request" ("modifiedById")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6997bee94720f1ecb7f3113709" ON "media_request" ("requestedById")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1aa713f41c99e9d10c48da75a" ON "media_request" ("mediaId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c696e8ed36ae34fe18abe59d2" ON "media_request" ("status")`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_f926a3b825cc8d5b982f726367"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_7ff2d11f6a83cb52386eaebe74"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_41a289eb1fa489c1bc6f38d9c3"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_7157aad07c73f6a6ae3bbd5ef5"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_media" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "tmdbId" integer NOT NULL, "tvdbId" integer, "imdbId" varchar, "status" integer NOT NULL DEFAULT (1), "status4k" integer NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "lastSeasonChange" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "mediaAddedAt" datetime DEFAULT (CURRENT_TIMESTAMP), "serviceId" integer, "serviceId4k" integer, "externalServiceId" integer, "externalServiceId4k" integer, "externalServiceSlug" varchar, "externalServiceSlug4k" varchar, "ratingKey" varchar, "ratingKey4k" varchar, "jellyfinMediaId" varchar, "jellyfinMediaId4k" varchar, CONSTRAINT "UQ_41a289eb1fa489c1bc6f38d9c3c" UNIQUE ("tvdbId"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media"("id", "mediaType", "tmdbId", "tvdbId", "imdbId", "status", "status4k", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceId4k", "externalServiceId", "externalServiceId4k", "externalServiceSlug", "externalServiceSlug4k", "ratingKey", "ratingKey4k", "jellyfinMediaId", "jellyfinMediaId4k") SELECT "id", "mediaType", "tmdbId", "tvdbId", "imdbId", "status", "statusAlt", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceIdAlt", "externalServiceId", "externalServiceIdAlt", "externalServiceSlug", "externalServiceSlugAlt", "ratingKey", "ratingKeyAlt", "jellyfinMediaId", "jellyfinMediaIdAlt" FROM "media"`
    );
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`ALTER TABLE "temporary_media" RENAME TO "media"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_7ff2d11f6a83cb52386eaebe74" ON "media" ("imdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_41a289eb1fa489c1bc6f38d9c3" ON "media" ("tvdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7157aad07c73f6a6ae3bbd5ef5" ON "media" ("tmdbId")`
    );

    await queryRunner.query(
      `ALTER TABLE "override_rule" DROP COLUMN "metadataProfileId"`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" DROP COLUMN "readarrServiceId"`
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bookQuotaDays"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bookQuotaLimit"`);
  }
}
