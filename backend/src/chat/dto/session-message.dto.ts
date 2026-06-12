import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SessionMessageDto {
  @ApiProperty({
    description: 'User request/question',
    example: 'What is the main topic of the document?',
  })
  @IsString()
  request: string;

  @ApiProperty({
    description: 'Summary of the conversation context',
    example: 'User asked about document content and received overview of key topics',
  })
  @IsString()
  summary: string;
}