import { Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { User, UserSchema } from './entities/models/user.model';
import { Questions, QuestionsSchema } from './entities/models/questions.model';
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Questions.name, schema: QuestionsSchema },
    ]),
    AuthModule
  ],
  providers: [QuestionnaireService],
  controllers: [QuestionnaireController],
})
export class QuestionnaireModule {}
