import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource } from '../../../common/enums/lead-source.enum.js';
import { LeadService } from '../../../common/enums/lead-service.enum.js';

export class CreatePublicLeadDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name of the prospect' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(120, { message: 'Name cannot exceed 120 characters' })
  name: string;

  @ApiProperty({ example: '+91 98765 43210', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MinLength(8, { message: 'Phone number must be at least 8 characters' })
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters' })
  phone: string;

  @ApiProperty({ example: 'rahul.sharma@example.com', description: 'Contact email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(150, { message: 'Email cannot exceed 150 characters' })
  email: string;

  @ApiProperty({
    enum: LeadService,
    example: LeadService.COMPREHENSIVE_CONSULTATION,
    description: 'Specific service or program requested',
  })
  @IsEnum(LeadService, { message: 'Invalid service selected' })
  @IsNotEmpty({ message: 'Service needed is required' })
  serviceNeeded: LeadService;

  @ApiProperty({
    example: 75000,
    description: 'Estimated budget in Indian Rupees (₹)',
  })
  @IsInt({ message: 'Budget must be an integer' })
  @Min(0, { message: 'Budget cannot be negative' })
  budget: number;

  @ApiProperty({
    example: 'I would like to inquire about appointment availability for next week.',
    description: 'Inquiry details or requirements',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(5, { message: 'Message must be at least 5 characters' })
  message: string;

  @ApiPropertyOptional({
    enum: LeadSource,
    example: LeadSource.WEBSITE,
    default: LeadSource.WEBSITE,
    description: 'Lead generation channel',
  })
  @IsEnum(LeadSource, { message: 'Invalid lead source' })
  @IsOptional()
  source?: LeadSource;

  /**
   * Anti-spam Honeypot field.
   * Rendered hidden in the frontend form (`style="display:none"` or `tabindex="-1"`).
   * Legitimate users leave it empty; spam bots automatically fill it.
   */
  @ApiPropertyOptional({
    description: 'Honeypot field for bot spam detection. Must be left empty.',
  })
  @IsString()
  @IsOptional()
  website?: string;
}
