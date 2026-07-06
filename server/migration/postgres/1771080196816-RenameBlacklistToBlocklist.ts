import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameBlacklistToBlocklist1771080196816 implements MigrationInterface {
  name = 'RenameBlacklistToBlocklist1771080196816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBlacklist = await queryRunner.hasTable('blacklist');
    const hasBlocklist = await queryRunner.hasTable('blocklist');

    if (hasBlacklist && !hasBlocklist) {
      await queryRunner.query(`ALTER TABLE "blacklist" RENAME TO "blocklist"`);
    }

    if (
      (await queryRunner.hasTable('blocklist')) &&
      (await queryRunner.hasColumn('blocklist', 'blacklistedTags'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "blocklist" RENAME COLUMN "blacklistedTags" TO "blocklistedTags"`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blocklist" RENAME COLUMN "blocklistedTags" TO "blacklistedTags"`
    );
    await queryRunner.query(`ALTER TABLE "blocklist" RENAME TO "blacklist"`);
  }
}
