import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateNotInPast } from '../validators/not-in-past.validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'Jane Doe', description: 'The name of the customer' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: 'The email of the customer',
  })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'The phone number of the customer',
  })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The UUID of the service to book',
  })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: '2030-12-31',
    description: 'The date of the booking in YYYY-MM-DD format',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'bookingDate must be in YYYY-MM-DD format',
  })
  @IsDateNotInPast()
  bookingDate: string;

  @ApiProperty({
    example: '14:30',
    description: 'The time of the booking in HH:mm format',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'bookingTime must be in HH:mm format',
  })
  bookingTime: string;

  @ApiPropertyOptional({
    example: 'Please call me upon arrival',
    description: 'Optional notes for the booking',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
