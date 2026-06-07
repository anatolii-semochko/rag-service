import { IsString, IsOptional, IsBoolean, MaxLength, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is category active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Category color (hex)', default: '#007bff' })
  @IsOptional()
  @IsHexColor()
  color?: string = '#007bff';
}