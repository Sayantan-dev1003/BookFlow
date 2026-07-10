import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BookingStatus } from '../enums/booking-status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryBookingDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for customer name or email',
  })
  @IsOptional()
  @IsString()
  search?: string; // Search by customerName or customerEmail

  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Filter by booking status',
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
