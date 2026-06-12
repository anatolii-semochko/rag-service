import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { Category } from '../../entities/category.entity';

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Statistics fields
  @Column({ type: 'int', default: 0 })
  documentsCount: number;

  @Column({ type: 'int', default: 0 })
  activeDocuments: number;

  @Column({ type: 'boolean', default: false })
  isEmpty: boolean;

  @Column({ type: 'boolean', default: false })
  inUse: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Category, (category) => category.collections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @OneToMany(() => Document, (document) => document.collection, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  documents: Document[];
}