import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ example: 'Client requested follow-up discussion on budget and deliverables' })
  @IsString()
  @IsNotEmpty({ message: 'Note content cannot be empty' })
  @MinLength(2, { message: 'Note content must be at least 2 characters' })
  content: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Internal notes are visible only to agency/sales staff and hidden from clients',
  })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}

