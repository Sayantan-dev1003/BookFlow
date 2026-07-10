import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { ServicesService } from '../services/services.service';
import { BookingStatus } from './enums/booking-status.enum';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private servicesService: ServicesService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    // 1. Verify service exists and is active (handled by ServicesService.findOne)
    await this.servicesService.findOne(createBookingDto.serviceId);

    // 2. Check for duplicate booking (serviceId, bookingDate, bookingTime)
    const existing = await this.bookingsRepository.findOne({
      where: {
        serviceId: createBookingDto.serviceId,
        bookingDate: createBookingDto.bookingDate,
        bookingTime: createBookingDto.bookingTime,
      },
    });

    if (existing) {
      throw new ConflictException(
        'This timeslot is already booked for this service',
      );
    }

    const booking = this.bookingsRepository.create(createBookingDto);
    try {
      return await this.bookingsRepository.save(booking);
    } catch (error: any) {
      // Postgres unique constraint violation error code is '23505'
      if (error.code === '23505') {
        throw new ConflictException(
          'This timeslot is already booked for this service',
        );
      }
      throw error;
    }
  }

  async findAll(queryDto: QueryBookingDto) {
    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .orderBy('booking.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(booking.customerName ILIKE :search OR booking.customerEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { service: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${id} not found`);
    }
    return booking;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: [],
    };

    const validNextStates = allowedTransitions[booking.status];
    if (!validNextStates.includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${booking.status} to ${updateStatusDto.status}`,
      );
    }

    booking.status = updateStatusDto.status;
    return this.bookingsRepository.save(booking);
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel a booking that is ${booking.status}`,
      );
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookingsRepository.save(booking);
  }
}
