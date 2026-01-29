import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import payload from 'payload';
import { COLLECTIONS } from '@/constants/collections';
import { ApiError } from '@/middleware/errorHandler';
import { DatabaseUtils } from '@/utils/database';
import type { User } from '@/payload-types';

/**
 * JWT Token Claims Interface
 */
export interface JWTPayloadExtended extends JWTPayload {
  userId: string | number;
  role: string;
  tenantId?: string | number;
  email: string;
}

/**
 * Token Generation Options
 */
export interface TokenOptions {
  expiresIn?: string; // JWT expiration time (e.g., '1h', '24h')
  issuer?: string;
  audience?: string;
}

/**
 * Authentication Service for JWT token management
 */
export class AuthService {
  private static readonly DEFAULT_EXPIRATION = '24h';
  private static readonly REFRESH_TOKEN_EXPIRATION = '7d';
  private static readonly ISSUER = 'multi-tenant-event-bookings';
  private static readonly AUDIENCE = 'event-booking-users';

  /**
   * Get the JWT secret key as Uint8Array
   */
  private static getSecretKey(): Uint8Array {
    const secret = process.env.PAYLOAD_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT secret not configured. Set PAYLOAD_SECRET or JWT_SECRET environment variable.');
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Generate JWT token for user
   */
  static async generateToken(user: User, options: TokenOptions = {}): Promise<string> {
    try {
      const secretKey = this.getSecretKey();
      const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;

      const payload: JWTPayloadExtended = {
        userId: user.id,
        role: user.role,
        tenantId,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpirationTime(options.expiresIn || this.DEFAULT_EXPIRATION),
        iss: options.issuer || this.ISSUER,
        aud: options.audience || this.AUDIENCE,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(options.expiresIn || this.DEFAULT_EXPIRATION)
        .setIssuer(options.issuer || this.ISSUER)
        .setAudience(options.audience || this.AUDIENCE)
        .sign(secretKey);

      return token;
    } catch (error) {
      console.error('Token generation failed:', error);
      throw ApiError.badRequest('Failed to generate authentication token');
    }
  }

  /**
   * Generate refresh token
   */
  static async generateRefreshToken(user: User): Promise<string> {
    return this.generateToken(user, {
      expiresIn: this.REFRESH_TOKEN_EXPIRATION,
    });
  }

  /**
   * Verify and decode JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayloadExtended> {
    try {
      const secretKey = this.getSecretKey();

      const { payload } = await jwtVerify(token, secretKey, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      });

      return payload as JWTPayloadExtended;
    } catch (error: any) {
      console.error('Token verification failed:', error.message);

      if (error.code === 'ERR_JWT_EXPIRED') {
        throw ApiError.unauthorized('Token has expired');
      }

      if (error.code === 'ERR_JWS_INVALID') {
        throw ApiError.unauthorized('Invalid token signature');
      }

      throw ApiError.unauthorized('Invalid or malformed token');
    }
  }

  /**
   * Extract user from JWT token
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = await this.verifyToken(token);

      const user = await DatabaseUtils.findById(COLLECTIONS.USERS, payload.userId, 0);

      if (!user) {
        return null;
      }

      return user as User;
    } catch (error) {
      console.error('Failed to get user from token:', error);
      return null;
    }
  }

  /**
   * Validate token and return user
   */
  static async validateToken(token: string): Promise<User> {
    const payload = await this.verifyToken(token);
    const user = await this.getUserFromToken(token);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Verify token claims match user data
    if (user.id !== payload.userId || user.email !== payload.email || user.role !== payload.role) {
      throw ApiError.unauthorized('Token claims do not match user data');
    }

    return user;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.validateToken(refreshToken);

    // Generate new tokens
    const accessToken = await this.generateToken(user);
    const newRefreshToken = await this.generateRefreshToken(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Validate user credentials (for login)
   */
  static async validateCredentials(email: string, password: string): Promise<User> {
    try {
      // Use Payload's built-in auth
      const result = await payload.login({
        collection: COLLECTIONS.USERS as any,
        data: { email, password },
      });

      if (!result.user) {
        throw ApiError.unauthorized('Invalid email or password');
      }

      return result.user as User;
    } catch (error) {
      console.error('Credential validation failed:', error);
      throw ApiError.unauthorized('Invalid email or password');
    }
  }

  /**
   * Generate login tokens
   */
  static async login(email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.validateCredentials(email, password);
    const accessToken = await this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * Logout (invalidate tokens)
   * Note: Since we're using stateless JWT, this is mainly for cleanup
   */
  static async logout(token: string): Promise<void> {
    // In a stateless JWT system, logout is mainly handled on the client side
    // by removing tokens from storage. Server-side invalidation would require
    // a token blacklist (Redis, database, etc.)
    console.log('User logged out with token:', token.substring(0, 20) + '...');
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true; // Consider malformed tokens as expired
    }
  }

  /**
   * Parse expiration time string to seconds
   */
  private static parseExpirationTime(expiresIn: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = expiresIn.match(regex);

    if (!match) {
      throw new Error(`Invalid expiration time format: ${expiresIn}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Extract token from request headers
   */
  static extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return null;
    }

    if (authHeader.startsWith('JWT ')) {
      return authHeader.replace('JWT ', '').trim();
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '').trim();
    }

    return null;
  }

  /**
   * Get token payload without verification (for debugging)
   */
  static getTokenPayload(token: string): JWTPayloadExtended | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload as JWTPayloadExtended;
    } catch (error) {
      return null;
    }
  }
}