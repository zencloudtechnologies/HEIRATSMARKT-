import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FindMatchDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  badgeNumber: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}
