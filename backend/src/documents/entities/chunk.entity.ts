import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('chunks')
export class Chunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'integer' })
  chunkIndex: number;

  @Column({ type: 'integer', nullable: true })
  tokenCount: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({
    type: 'vector',
    length: 1536, // OpenAI embedding dimensions
    nullable: true,
  })
  embedding: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, document => document.chunks)
  @JoinColumn({ name: 'documentId' })
  document: Document;
}