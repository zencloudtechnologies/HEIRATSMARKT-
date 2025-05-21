import { Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import {User, UserSchema} from './entities/models/user.model'
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [QuestionnaireService],
  controllers: [QuestionnaireController]
})
export class QuestionnaireModule {}
