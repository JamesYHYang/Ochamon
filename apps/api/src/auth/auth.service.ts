import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Omit<User, 'passwordHash' | 'refreshTokenHash'>; tokens: TokensDto }> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user (with optional company)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role || UserRole.BUYER,
        ...(dto.companyName && {
          company: {
            create: {
              name: dto.companyName,
            },
          },
        }),
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token hash
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash: _, refreshTokenHash: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: Omit<User, 'passwordHash' | 'refreshTokenHash'>; tokens: TokensDto }> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token hash and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 12),
        lastLoginAt: new Date(),
      },
    });

    const { passwordHash: _, refreshTokenHash: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify refresh token
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token hash
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async getMe(userId: string): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash: _, refreshTokenHash: __, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
  }

  private async generateTokens(user: User): Promise<TokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
