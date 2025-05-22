import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/models/user.model';
import { Types } from 'mongoose';
import {
  Questions,
  QuestionsDocument,
} from './entities/models/questions.model';
import { Model } from 'mongoose';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Questions.name)
    private readonly questionsModel: Model<QuestionsDocument>,
  ) {}

  async create(user: Partial<User>) {
    try {
      const newUser = new this.userModel(user);
      await newUser.save();
      return newUser;
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message: error.response?.error || 'Error occurred while creating user',
      });
    }
  }

  async createQuestions(question: Partial<Questions>) {
    try {
      const newQuestion = new this.questionsModel(question);
      await newQuestion.save();
      return { success: true, newQuestion };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message: error.response?.error || 'Error occurred while creating user',
      });
    }
  }

  async getUser(query: any) {
    try {
      const user = await this.userModel
        .findOne(query)
        .sort({ date: -1 })
        .exec();
      return user;
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message: error.response?.error || 'Error occurred while creating user',
      });
    }
  }

  async getAllUser(query: any) {
    try {
      const user = await this.userModel.find(query).sort({ date: -1 }).exec();
      return user;
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message: error.response?.error || 'Error occurred while creating user',
      });
    }
  }

  async getMatch(user: any) {
    try {
      const userId = new Types.ObjectId(user._id);
      const userAnswers = await this.questionsModel.find({ userId });

      const otherUsers = await this.getAllUser({
        age: user.partnerAge,
        gender: user.partnerGender,
      });

      const superMatchPoints = 189;
      const goodMatchPoints = 168;
      const matchPointss = 105;
      const maybeMatchPoints = 63;

      let superMatch = [];
      let goodMatch = [];
      let match = [];
      let maybeMatch = [];

      for (const otherUser of otherUsers) {
        const otherUserAnswers = await this.questionsModel.find({
          userId: new Types.ObjectId(otherUser._id),
        });

        let matchPoints = 0;

        userAnswers.forEach((userAnswer) => {
          const matching = otherUserAnswers.find(
            (otherAns) => otherAns.questionNo === userAnswer.questionNo,
          );

          if (!matching) return;

          const qNo = userAnswer.questionNo;
          const isMultiOption = [0, 4, 6, 8].includes(qNo);

          if (isMultiOption) {
            const userOptions = [
              userAnswer.optionNo,
              userAnswer.optionNo2,
              userAnswer.optionNo3,
              userAnswer.optionNo4,
            ].filter(Boolean);

            const matchOptions = [
              matching.optionNo,
              matching.optionNo2,
              matching.optionNo3,
              matching.optionNo4,
            ].filter(Boolean);

            const optionCount = userOptions.length;

            let pointsPerOption = 40 / optionCount;

            userOptions.forEach((opt) => {
              if (matchOptions.includes(opt)) {
                matchPoints += pointsPerOption;
              }
            });
          } else {
            if (userAnswer.optionNo == matching.optionNo) {
              matchPoints += 10;
            }
          }
        });
        const points = Number(matchPoints.toFixed(1));

        if (points >= superMatchPoints) {
          superMatch.push({ badgeNumber: otherUser.badgeNumber, points });
        } else if (points >= goodMatchPoints) {
          goodMatch.push({ badgeNumber: otherUser.badgeNumber, points });
        } else if (points >= matchPointss) {
          match.push({ badgeNumber: otherUser.badgeNumber, points });
        } else if (points >= maybeMatchPoints) {
          maybeMatch.push({ badgeNumber: otherUser.badgeNumber, points });
        }
      }

      return {
        data: { totalScore: 210, superMatch, goodMatch, match, maybeMatch },
      };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message:
          error.response?.error || 'Error occurred while matching user answers',
      });
    }
  }
}
