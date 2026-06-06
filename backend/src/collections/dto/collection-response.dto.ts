import { ApiProperty } from '@nestjs/swagger';

export class CollectionResponseDto {
  @ApiProperty({
    description: 'Collection ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the collection',
    example: 'Financial Reports 2024',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the collection',
    example: 'Collection of financial reports and documents for the year 2024',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Number of documents in the collection',
    example: 15,
  })
  documentsCount: number;

  @ApiProperty({
    description: 'Whether the collection is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-06-06T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-06-06T10:00:00.000Z',
  })
  updatedAt: string;
}