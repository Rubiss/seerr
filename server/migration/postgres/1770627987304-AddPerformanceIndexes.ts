import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1770627987304 implements MigrationInterface {
  name = 'AddPerformanceIndexes1770627987304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4c696e8ed36ae34fe18abe59d2" ON "media_request" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c730c2d67f271a372c39a07b7e" ON "media" ("status") `
    );

    const altStatusColumn = (await queryRunner.hasColumn('media', 'status4k'))
      ? 'status4k'
      : 'statusAlt';
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5d6218de4f547909391a5c1347" ON "media" ("${altStatusColumn}") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f8233358694d1677a67899b90a" ON "media" ("tmdbId", "mediaType") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8233358694d1677a67899b90a"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d6218de4f547909391a5c1347"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c730c2d67f271a372c39a07b7e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c696e8ed36ae34fe18abe59d2"`
    );
  }
}
