import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 20, { message: 'Username must be between 3 and 20 characters' })
  username: string;

  @IsString()
  @Length(3, 20, { message: 'Email must be between 3 and 20 characters' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString()
  @Length(8, undefined, {
    message: 'Password must be at least 8 characters long',
  })
  password: string;
}
