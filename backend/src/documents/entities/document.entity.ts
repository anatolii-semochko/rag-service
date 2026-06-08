import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Collection } from '../../collections/entities/collection.entity';
import { Chunk } from './chunk.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  collectionId: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string; // For file system storage (optional)

  @Column({ type: 'bytea', nullable: true })
  fileContent: Buffer; // For database storage

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Collection, collection => collection.documents)
  @JoinColumn({ name: 'collectionId' })
  collection: Collection;

  @OneToMany(() => Chunk, chunk => chunk.document)
  chunks: Chunk[];
}