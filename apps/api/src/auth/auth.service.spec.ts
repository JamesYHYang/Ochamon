import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    name: 'Test User',
    role: UserRole.BUYER,
    companyName: 'Test Co',
    isVerified: false,
    isActive: true,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password123',
      name: 'New User',
      role: UserRole.BUYER,
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash('different-password', 12),
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
      
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: hashedRefreshToken,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens(mockUser.id, refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: await bcrypt.hash('different-token', 12),
      });

      await expect(
        service.refreshTokens(mockUser.id, 'invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.logout(mockUser.id);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'invalid-id',
        email: 'invalid@example.com',
        role: UserRole.BUYER,
      });

      expect(result).toBeNull();
    });
  });
});
