import { IsString, Matches, MinLength } from 'class-validator';
import { USERNAME_REGEX, USERNAME_REGEX_MESSAGE } from '../../domain/username';

export class LoginDto {
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_REGEX_MESSAGE })
  username: string;

  @IsString()
  @MinLength(1)
  password: string;
}
