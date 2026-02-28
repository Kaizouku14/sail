import { DatabaseService } from '@/database/database.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, desc } from 'drizzle-orm';
import { gameSessions, users } from '@/database/schema';
import * as bcrypt from 'bcrypt';
import { GAME_STATUS } from '@/common/constants/game-state.constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const isEmailExists = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (isEmailExists.length > 0) {
      throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const [user] = await this.database.db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        password: hashedPassword,
      })
      .returning();

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async login(input: LoginDto) {
    const [isEmailExists] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!isEmailExists) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      isEmailExists.password,
    );

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const token = this.jwt.sign({
      id: isEmailExists.id,
      username: isEmailExists.username,
      email: isEmailExists.email,
    });

    return {
      message: 'User logged in successfully',
      user: {
        id: isEmailExists.id,
        username: isEmailExists.username,
        email: isEmailExists.email,
      },
      token,
    };
  }

  async getStats(userId: string) {
    const allSessions = await this.database.db
      .select({
        status: gameSessions.status,
        guessCount: gameSessions.guessCount,
        wordDate: gameSessions.wordDate,
      })
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.wordDate));

    let currentStreak = 0;
    let streakBroken = false;
    const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let wins = 0;
    let losses = 0;

    for (const session of allSessions) {
      if (session.status === GAME_STATUS.WON) {
        wins++;

        if (!streakBroken) currentStreak++;
        if (session.guessCount) {
          guessDistribution[session.guessCount]++;
        }
      } else {
        losses++;
        streakBroken = true;
      }
    }

    const totalGames = wins + losses;
    return {
      totalGames,
      wins,
      losses,
      winRate: totalGames === 0 ? 0 : Math.round((wins / totalGames) * 100),
      currentStreak,
      guessDistribution,
    };
  }
}
