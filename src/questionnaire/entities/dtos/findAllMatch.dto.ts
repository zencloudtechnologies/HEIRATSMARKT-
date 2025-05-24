import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllMatchDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  search: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['showAll', 'superMatch', 'goodMatch', 'match', 'maybeMatch'])
  sortBy: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  page: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  limit: number;
}
