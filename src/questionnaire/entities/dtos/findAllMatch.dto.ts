import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllMatchDto {
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  badgeNumber: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  page: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  limit: number;
}
