import { Body, ConflictException, Controller, Post } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { CreateUserDto } from './entities/dtos/createUser.dto';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private userService: QuestionnaireService) {}

  @Post()
  async getMessages(@Body() user: CreateUserDto) {
    try {
      const latestUser = await this.userService.getUser({});
      const id = latestUser ? latestUser.id + 1 : 1;
      user.id = id;
      return this.userService.create(user);
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response?.error || 'Error occurred while creating user',
      });
    }
  }
}
