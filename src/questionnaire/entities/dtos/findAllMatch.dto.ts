import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllMatchDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  search: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  page: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  limit: number;
}
