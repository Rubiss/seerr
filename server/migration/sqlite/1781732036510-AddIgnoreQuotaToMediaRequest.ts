import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIgnoreQuotaToMediaRequest1781732036510 implements MigrationInterface {
  name = 'AddIgnoreQuotaToMediaRequest1781732036510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('media_request', 'ignoreQuota'))) {
      await queryRunner.query(
        `ALTER TABLE "media_request" ADD "ignoreQuota" boolean NOT NULL DEFAULT (0)`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('media_request', 'ignoreQuota')) {
      await queryRunner.query(
        `ALTER TABLE "media_request" DROP COLUMN "ignoreQuota"`
      );
    }
  }
}
