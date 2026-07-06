import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIgnoreQuotaToMediaRequest1781732098511 implements MigrationInterface {
  name = 'AddIgnoreQuotaToMediaRequest1781732098511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('media_request', 'ignoreQuota'))) {
      await queryRunner.query(
        `ALTER TABLE "media_request" ADD "ignoreQuota" boolean NOT NULL DEFAULT false`
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
