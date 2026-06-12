import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticsFields1672580800000 implements MigrationInterface {
  name = 'AddStatisticsFields1672580800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add statistics fields to categories table
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN "collectionsCount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "filesCount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "activeCollections" integer NOT NULL DEFAULT 0,
      ADD COLUMN "activeFiles" integer NOT NULL DEFAULT 0,
      ADD COLUMN "isEmpty" boolean NOT NULL DEFAULT false,
      ADD COLUMN "inUse" boolean NOT NULL DEFAULT false
    `);

    // Add statistics fields to collections table
    await queryRunner.query(`
      ALTER TABLE "collections"
      ADD COLUMN "filesCount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "activeFiles" integer NOT NULL DEFAULT 0,
      ADD COLUMN "isEmpty" boolean NOT NULL DEFAULT false,
      ADD COLUMN "inUse" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove statistics fields from categories table
    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP COLUMN "collectionsCount",
      DROP COLUMN "filesCount",
      DROP COLUMN "activeCollections",
      DROP COLUMN "activeFiles",
      DROP COLUMN "isEmpty",
      DROP COLUMN "inUse"
    `);

    // Remove statistics fields from collections table
    await queryRunner.query(`
      ALTER TABLE "collections"
      DROP COLUMN "filesCount",
      DROP COLUMN "activeFiles",
      DROP COLUMN "isEmpty",
      DROP COLUMN "inUse"
    `);
  }
}