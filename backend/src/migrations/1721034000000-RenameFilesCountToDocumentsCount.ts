import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameFilesCountToDocumentsCount1721034000000 implements MigrationInterface {
  name = 'RenameFilesCountToDocumentsCount1721034000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename fields in categories table
    await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "filesCount" TO "documentsCount"`);
    await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "activeFiles" TO "activeDocuments"`);

    // Rename fields in collections table
    await queryRunner.query(`ALTER TABLE "collections" RENAME COLUMN "filesCount" TO "documentsCount"`);
    await queryRunner.query(`ALTER TABLE "collections" RENAME COLUMN "activeFiles" TO "activeDocuments"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert fields in collections table
    await queryRunner.query(`ALTER TABLE "collections" RENAME COLUMN "documentsCount" TO "filesCount"`);
    await queryRunner.query(`ALTER TABLE "collections" RENAME COLUMN "activeDocuments" TO "activeFiles"`);

    // Revert fields in categories table
    await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "documentsCount" TO "filesCount"`);
    await queryRunner.query(`ALTER TABLE "categories" RENAME COLUMN "activeDocuments" TO "activeFiles"`);
  }
}