import { IsEnum } from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
    description: 'The new status of the booking',
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
