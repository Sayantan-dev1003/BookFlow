import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
    await dataSource.query('TRUNCATE "user" CASCADE');
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE "user" CASCADE');
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should successfully register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Test User',
          email: 'e2e@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should fail to register with the same email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Another User',
          email: 'e2e@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Another User',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should successfully login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should fail with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });
});
