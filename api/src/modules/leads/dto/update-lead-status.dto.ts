import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeadStatus } from '../../../common/enums/lead-status.enum.js';

export class UpdateLeadStatusDto {
  @ApiProperty({
    enum: LeadStatus,
    example: LeadStatus.CONTACTED,
    description: 'Target lead pipeline status',
  })
  @IsEnum(LeadStatus, { message: 'Invalid lead status' })
  @IsNotEmpty({ message: 'Status is required' })
  status: LeadStatus;
}

