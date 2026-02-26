import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DatabaseService } from '@/database/database.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

const mockDatabaseService = {
  db: mockDb,
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    // Re-wire the chain after clearAllMocks since mockReturnThis is cleared
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
  });

  describe('register()', () => {
    const username = 'testuser';
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = '$2b$10$hashedpassword';

    it('should register a new user successfully', async () => {
      mockDb.limit.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockDb.returning.mockResolvedValue([
        {
          id: 'uuid-1',
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
        },
      ]);

      const result = await service.register(username, email, password);

      expect(result).toEqual({
        message: 'User registered successfully',
        user: {
          id: 'uuid-1',
          username,
          email,
        },
      });
    });

    it('should throw 409 if email already exists', async () => {
      mockDb.limit.mockResolvedValue([
        { id: 'uuid-existing', username: 'other', email, password: 'hashed' },
      ]);

      await expect(service.register(username, email, password)).rejects.toThrow(
        new HttpException('Email already exists', HttpStatus.CONFLICT),
      );
    });

    it('should throw 409 if username already exists', async () => {
      // First query (email check) returns empty — email is unique
      mockDb.limit.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // The DB insert throws a unique constraint violation for username
      mockDb.returning.mockRejectedValue(
        Object.assign(
          new Error(
            'duplicate key value violates unique constraint "users_username_unique"',
          ),
          {
            code: '23505',
            constraint: 'users_username_unique',
          },
        ),
      );

      await expect(
        service.register(username, email, password),
      ).rejects.toThrow();
    });

    it('should hash the password before saving', async () => {
      mockDb.limit.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockDb.returning.mockResolvedValue([
        {
          id: 'uuid-1',
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
        },
      ]);

      await service.register(username, email, password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockDb.values).toHaveBeenCalledWith({
        username,
        email,
        password: hashedPassword,
      });
    });

    it('should not return the password in the response', async () => {
      mockDb.limit.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockDb.returning.mockResolvedValue([
        {
          id: 'uuid-1',
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
        },
      ]);

      const result = await service.register(username, email, password);

      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('login()', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = '$2b$10$hashedpassword';
    const existingUser = {
      id: 'uuid-1',
      username: 'testuser',
      email,
      password: hashedPassword,
    };

    it('should login successfully and return a token', async () => {
      mockDb.limit.mockResolvedValue([existingUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.login(email, password);

      expect(result).toEqual({
        message: 'User logged in successfully',
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
        },
        token: 'jwt-token-123',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: existingUser.id,
      });
    });

    it('should throw 401 if email does not exist', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.login(email, password)).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw 401 if password is incorrect', async () => {
      mockDb.limit.mockResolvedValue([existingUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(email, password)).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
