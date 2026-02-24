import { IsString, Length, Matches } from 'class-validator';

export class SubmitGuessDto {
  @IsString()
  @Length(5, 5, { message: 'Word must be exactly 5 characters' })
  @Matches(/^[a-zA-Z]+$/, { message: 'Word must contain only letters' })
  word: string;
}
