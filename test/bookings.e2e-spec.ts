import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('BookingsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    await dataSource.query('TRUNCATE "user", "service", "booking" CASCADE');

    // Register a user and get token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
      });
    accessToken = registerRes.body.accessToken;

    // Create a service
    const serviceRes = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Haircut',
        description: 'Standard haircut',
        duration: 30,
        price: 25.0,
        isActive: true,
      });
    serviceId = serviceRes.body.id;
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE "user", "service", "booking" CASCADE');
    await app.close();
  });

  describe('Business Rules Enforcement', () => {
    it('should create a booking without authentication (public endpoint)', () => {
      // Future date
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const futureDate = d.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          customerName: 'Public Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          serviceId: serviceId,
          bookingDate: futureDate,
          bookingTime: '10:00',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toBe('PENDING');
        });
    });

    it('should return 409 Conflict for duplicate timeslot (duplicate rule)', async () => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      const futureDate = d.toISOString().split('T')[0];

      const payload = {
        customerName: 'Customer A',
        customerEmail: 'a@example.com',
        customerPhone: '+1111',
        serviceId: serviceId,
        bookingDate: futureDate,
        bookingTime: '11:00',
      };

      // First booking succeeds
      await request(app.getHttpServer())
        .post('/bookings')
        .send(payload)
        .expect(201);

      // Second booking with same date/time fails
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          ...payload,
          customerName: 'Customer B',
        })
        .expect(409);
    });

    it('should reject booking in the past (past date rule)', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const pastDate = d.toISOString().split('T')[0];

      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          customerName: 'Past Customer',
          customerEmail: 'past@example.com',
          customerPhone: '+0000',
          serviceId: serviceId,
          bookingDate: pastDate,
          bookingTime: '10:00',
        })
        .expect(400);
    });

    it('should not allow unauthenticated read of bookings', () => {
      return request(app.getHttpServer()).get('/bookings').expect(401);
    });
  });
});
