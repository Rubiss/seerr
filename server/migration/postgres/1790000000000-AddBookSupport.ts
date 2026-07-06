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
      'boolean NOT NULL DEFAULT false'
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
      `DROP INDEX "public"."IDX_09b94c932e84635c5461f3c0a9"`
    );
    await queryRunner.query(
      `ALTER TABLE "blocklist" RENAME COLUMN "tmdbId" TO "externalId"`
    );
    await queryRunner.query(
      `ALTER TABLE "blocklist" RENAME CONSTRAINT "UQ_81504e02db89b4c1e3152729fa6" TO "UQ_cd389742b9156ca10495f21fe0a"`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request" RENAME COLUMN "is4k" TO "isAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "status4k" TO "statusAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "serviceId4k" TO "serviceIdAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "externalServiceId4k" TO "externalServiceIdAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "externalServiceSlug4k" TO "externalServiceSlugAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "ratingKey4k" TO "ratingKeyAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "jellyfinMediaId4k" TO "jellyfinMediaIdAlt"`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" ADD "readarrServiceId" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" ADD "metadataProfileId" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request" ADD "metadataProfileId" integer`
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "bookQuotaLimit" integer`);
    await queryRunner.query(`ALTER TABLE "user" ADD "bookQuotaDays" integer`);
    await queryRunner.query(`ALTER TABLE "media" ADD "hcId" integer`);
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "tmdbId" DROP NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e460d2f12505b0d9adf2a8014a" ON "blocklist" ("externalId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f926a3b825cc8d5b982f726367" ON "media" ("hcId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f926a3b825cc8d5b982f726367"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e460d2f12505b0d9adf2a8014a"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "tmdbId" SET NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "hcId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bookQuotaDays"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bookQuotaLimit"`);
    await queryRunner.query(
      `ALTER TABLE "media_request" DROP COLUMN "metadataProfileId"`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" DROP COLUMN "metadataProfileId"`
    );
    await queryRunner.query(
      `ALTER TABLE "override_rule" DROP COLUMN "readarrServiceId"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "jellyfinMediaIdAlt" TO "jellyfinMediaId4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "ratingKeyAlt" TO "ratingKey4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "externalServiceSlugAlt" TO "externalServiceSlug4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "externalServiceIdAlt" TO "externalServiceId4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "serviceIdAlt" TO "serviceId4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" RENAME COLUMN "statusAlt" TO "status4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "media_request" RENAME COLUMN "isAlt" TO "is4k"`
    );
    await queryRunner.query(
      `ALTER TABLE "blocklist" RENAME CONSTRAINT "UQ_cd389742b9156ca10495f21fe0a" TO "UQ_81504e02db89b4c1e3152729fa6"`
    );
    await queryRunner.query(
      `ALTER TABLE "blocklist" RENAME COLUMN "externalId" TO "tmdbId"`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_09b94c932e84635c5461f3c0a9" ON "blocklist" ("tmdbId")`
    );
  }
}
