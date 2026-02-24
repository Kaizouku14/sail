import * as common from '@nestjs/common';
import { WordService } from 'src/word/word.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';

@common.Controller('game')
export class GameController {
  constructor(private readonly wordService: WordService) {}

  @common.Post('validate')
  validate(@common.Body() body: SubmitGuessDto) {
    const word = body.word.toLowerCase();
    const isValid = this.wordService.isValid(word);

    if (!isValid) {
      return { valid: false, message: 'Not a valid word' };
    }

    return { valid: true };
  }
}
