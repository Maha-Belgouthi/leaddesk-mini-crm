import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignLeadDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'Target user ID to assign the lead to',
  })
  @IsUUID('4', { message: 'Must be a valid UUID' })
  @IsNotEmpty({ message: 'Assigned user ID is required' })
  assignedToId: string;
}
