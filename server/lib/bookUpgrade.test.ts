import { RemapOverseerrDeletedStatus1789257612345 } from '@server/migration/sqlite/1789254652493-RemapOverseerrDeletedStatus';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DataSource } from 'typeorm';

describe('book fork upgrade compatibility', () => {
  for (const bookSchema of [false, true]) {
    it(`remaps deleted movies while preserving blocklisted media with ${bookSchema ? 'book-fork' : 'upstream'} columns`, async () => {
      const db = await new DataSource({
        type: 'sqlite',
        database: ':memory:',
      }).initialize();
      const runner = db.createQueryRunner();
      const altStatus = bookSchema ? 'statusAlt' : 'status4k';
      const blocklistId = bookSchema ? 'externalId' : 'tmdbId';

      try {
        await runner.query(
          `CREATE TABLE media (id INTEGER, tmdbId INTEGER, mediaType TEXT, status INTEGER, "${altStatus}" INTEGER)`
        );
        await runner.query(
          `CREATE TABLE blocklist ("${blocklistId}" INTEGER, mediaType TEXT)`
        );
        await runner.query(
          'CREATE TABLE season (status INTEGER, status4k INTEGER)'
        );
        await runner.query(
          "INSERT INTO media VALUES (1, 100, 'movie', 6, 6), (2, 200, 'movie', 6, 6), (3, NULL, 'book', 6, 6), (4, 300, 'tv', 5, 3)"
        );
        await runner.query("INSERT INTO blocklist VALUES (200, 'movie')");
        await runner.query('INSERT INTO season VALUES (6, 6)');

        await new RemapOverseerrDeletedStatus1789257612345().up(runner);

        assert.deepEqual(
          await runner.query(
            `SELECT id, status, "${altStatus}" AS alternate FROM media ORDER BY id`
          ),
          [
            { id: 1, status: 7, alternate: 7 },
            { id: 2, status: 6, alternate: 6 },
            { id: 3, status: 6, alternate: 6 },
            { id: 4, status: 5, alternate: 3 },
          ]
        );
        assert.deepEqual(await runner.query('SELECT * FROM season'), [
          { status: 7, status4k: 7 },
        ]);
      } finally {
        await runner.release();
        await db.destroy();
      }
    });
  }
});
