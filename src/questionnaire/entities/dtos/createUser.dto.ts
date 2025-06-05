import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuestionDto {
  @IsNumber()
  optionNo: number;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsOptional()
  @IsNumber()
  optionNo2: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer2: string;

  @IsOptional()
  @IsNumber()
  optionNo3: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer3: string;

  @IsOptional()
  @IsNumber()
  optionNo4: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer4: string;

  @IsOptional()
  @IsNumber()
  optionNo5: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer5: string;
}

export class CreateUserDto {
  @IsOptional()
  @IsNumber()
  badgeNumber: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  partnerAge: string[];

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  partnerGender: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
