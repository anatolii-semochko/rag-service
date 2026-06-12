import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Collection } from '../collections/entities/collection.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 7, default: '#007bff' })
  color: string; // Hex color for UI

  // Statistics fields
  @Column({ type: 'int', default: 0 })
  collectionsCount: number;

  @Column({ type: 'int', default: 0 })
  documentsCount: number;

  @Column({ type: 'int', default: 0 })
  activeCollections: number;

  @Column({ type: 'int', default: 0 })
  activeDocuments: number;

  @Column({ type: 'boolean', default: false })
  isEmpty: boolean;

  @Column({ type: 'boolean', default: false })
  inUse: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Collection, (collection) => collection.category, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  collections: Collection[];
}