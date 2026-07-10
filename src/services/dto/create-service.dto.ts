import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Haircut', description: 'The title of the service' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'A standard haircut',
    description: 'The description of the service',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 30,
    description: 'The duration of the service in minutes',
  })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ example: 25.5, description: 'The price of the service' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the service is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
