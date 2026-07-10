import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;
  let repository: jest.Mocked<Repository<Service>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      preload: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<Service>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getRepositoryToken(Service),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a service', async () => {
      const createDto = { title: 'Test Service', duration: 60, price: 100 };
      const newService = { id: 'uuid', ...createDto };

      repository.create.mockReturnValue(newService as any);
      repository.save.mockResolvedValue(newService as any);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(newService);
      expect(result).toEqual(newService);
    });
  });

  describe('findAll', () => {
    it('should return paginated active services', async () => {
      const mockServices = [{ id: '1', title: 'Service 1' }];
      repository.findAndCount.mockResolvedValue([mockServices as any, 1]);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 5,
        take: 5,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: mockServices,
        meta: { page: 2, limit: 5, total: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('should return a service if it exists and is active', async () => {
      const mockService = { id: '1', title: 'Service 1' };
      repository.findOne.mockResolvedValue(mockService as any);

      const result = await service.findOne('1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException if service does not exist or inactive', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update a service', async () => {
      const updateDto = { title: 'Updated' };
      const preloadedService = { id: '1', title: 'Updated' };

      repository.preload.mockResolvedValue(preloadedService as any);
      repository.save.mockResolvedValue(preloadedService as any);

      const result = await service.update('1', updateDto);

      expect(repository.preload).toHaveBeenCalledWith({
        id: '1',
        ...updateDto,
      });
      expect(repository.save).toHaveBeenCalledWith(preloadedService);
      expect(result).toEqual(preloadedService);
    });

    it('should throw NotFoundException if service to update is not found', async () => {
      repository.preload.mockResolvedValue(undefined);

      await expect(service.update('99', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove a service', async () => {
      const mockService = { id: '1' };
      repository.findOne.mockResolvedValue(mockService as any);
      repository.remove.mockResolvedValue(mockService as any);

      await service.remove('1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.remove).toHaveBeenCalledWith(mockService);
    });

    it('should throw NotFoundException if service to remove is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('99')).rejects.toThrow(NotFoundException);
    });
  });
});
