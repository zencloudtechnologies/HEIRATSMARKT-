import {
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
  }
  
  export class CreateUserDto {
    @IsOptional()
    @IsNumber()
    id: number;
  
    @IsEmail()
    email: string;
  
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @IsString()
    @IsNotEmpty()
    age: string;
  
    @IsString()
    @IsNotEmpty()
    partnerAge: string;
  
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
  