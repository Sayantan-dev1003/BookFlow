import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'jwt.secret') return 'secret';
        if (key === 'jwt.refreshSecret') return 'refreshSecret';
        if (key === 'jwt.expiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user exists', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      } as any);

      await expect(
        authService.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const createdUser = { id: 'uuid', email: 'new@example.com' };
      usersService.create.mockResolvedValue(createdUser as any);

      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.register({
        name: 'Test',
        email: 'new@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Test',
        email: 'new@example.com',
        password: 'hashedPassword',
      });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'wrong@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByEmail.mockResolvedValue({
        password: 'hashedPassword',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens for valid login', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: '1',
        email: 'test@example.com',
      });

      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refresh('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });
});
