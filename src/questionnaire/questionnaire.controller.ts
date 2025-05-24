import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { CreateUserDto } from './entities/dtos/createUser.dto';
import { FindMatchDto } from './entities/dtos/findMatch.dto';
import { FindAllMatchDto } from './entities/dtos/findAllMatch.dto';
import { AuthGuard } from '../guards/authentication.guard';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private userService: QuestionnaireService) {}

  @Post()
  async createUser(@Body() user: CreateUserDto) {
    try {
      const { email, name, age, partnerAge, gender, partnerGender, questions } =
        user;
      const latestUser = await this.userService.getUser({});
      const badgeNumber = latestUser ? latestUser.badgeNumber + 1 : 1;

      const userData = {
        email,
        name,
        age,
        partnerAge,
        gender,
        partnerGender,
        badgeNumber,
      };
      const data = await this.userService.create(userData);
      await Promise.all(
        questions.map((val, ind) => {
          const question = { ...val, userId: data._id, questionNo: ind };
          return this.userService.createQuestions(question);
        }),
      );

      return { success: true, data };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response?.error || 'Error occurred while creating user',
      });
    }
  }

  @Get('findMatch')
  async findMatch(@Query() user: FindMatchDto) {
    try {
      const { name, badgeNumber } = user;
      const findUser = await this.userService.getUser({ name, badgeNumber });
      if (!findUser) {
        throw new ConflictException({
          success: false,
          error: 'Your name or badge number is wrong',
        });
      }

      const match = await this.userService.getMatch(findUser);

      return { success: true, yourBagde: findUser.badgeNumber, match };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response?.error || 'Error occurred while matching user',
      });
    }
  }

  @UseGuards(AuthGuard)
  @Get('findMatchOfAllUsers')
  async findMatchOfAllUsers(@Query() user: FindAllMatchDto) {
    try {
      const { search, page, limit, sortBy } = user;
      let query: any = {};
      if (search) {
        const orConditions: any[] = [
          { name: { $regex: `^${search}`, $options: 'i' } },
        ];
        if (!isNaN(Number(search))) {
          orConditions.push({ badgeNumber: Number(search) });
        }
        query.$or = orConditions;
      }

      const {usersData, totalPages} = await this.userService.getMatchh(page, limit, query, sortBy)

      // const { users, totalPages } = await this.userService.getAllUsersWithPage(
      //   query,
      //   page,
      //   limit,
      // );
      // let usersData = [];
      // if (users.length > 0) {
      //   await Promise.all(
      //     users.map(async (user) => {
      //       const match = await this.userService.getMatchh(user, sortBy);
      //       usersData.push({ user, match });
      //     }),
      //   );
      // }

      return { success: true, usersData, totalPages };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response?.error || 'Error occurred while matching user',
      });
    }
  }
}
