import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Category name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @Expose()
  description: string;

  @ApiProperty({ description: 'Is category active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Category color (hex)' })
  @Expose()
  color: string;

  @ApiProperty({ description: 'Number of collections in this category' })
  @Expose()
  @Transform(({ obj }) => obj.collections?.length || 0)
  collectionsCount: number;

  @ApiProperty({ description: 'Number of active collections in this category' })
  @Expose()
  @Transform(({ obj }) => obj.collections?.filter(c => c.isActive)?.length || 0)
  activeCollectionsCount: number;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  updatedAt: Date;
}