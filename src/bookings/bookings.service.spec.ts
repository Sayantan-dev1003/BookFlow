import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { ServicesService } from '../services/services.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { BookingStatus } from './enums/booking-status.enum';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockBookingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockServicesService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if duplicate booking exists', async () => {
      mockServicesService.findOne.mockResolvedValue({ id: '1' });
      mockBookingRepository.findOne.mockResolvedValue({ id: '2' }); // Existing booking

      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@test.com',
          customerPhone: '123',
          serviceId: '1',
          bookingDate: '2050-01-01',
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException if transition is invalid', async () => {
      mockBookingRepository.findOne.mockResolvedValue({
        id: '1',
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.updateStatus('1', { status: BookingStatus.COMPLETED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
