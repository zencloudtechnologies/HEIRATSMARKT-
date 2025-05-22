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

      // Fetch current user's answers
      const userAnswers = await this.questionsModel.find({ userId });
      const userAnswersMap = new Map<number, any>();
      userAnswers.forEach((ans) => userAnswersMap.set(ans.questionNo, ans));

      // Fetch matching users based on preferences
      const otherUsers = await this.getAllUser({
        age: user.partnerAge,
        gender: user.partnerGender,
      });

      if (!otherUsers.length) {
        return {
          data: {
            totalScore: 210,
            superMatch: [],
            goodMatch: [],
            match: [],
            maybeMatch: [],
          },
        };
      }

      // Pre-fetch all other users' answers in a single query
      const otherUserIds = otherUsers.map((u) => new Types.ObjectId(u._id));
      const allAnswers = await this.questionsModel.find({
        userId: { $in: otherUserIds },
      });

      // Group answers by userId
      const answersByUser = new Map<string, any[]>();
      for (const ans of allAnswers) {
        const uid = ans.userId.toString();
        if (!answersByUser.has(uid)) answersByUser.set(uid, []);
        answersByUser.get(uid)!.push(ans);
      }

      // Scoring thresholds
      const TOTAL_POINTS = 210;
      const superMatchPoints = 189;
      const goodMatchPoints = 168;
      const matchPoints = 105;
      const maybeMatchPoints = 63;
      const multiOptionQuestions = new Set([0, 4, 6, 8]);

      const superMatch = [];
      const goodMatch = [];
      const match = [];
      const maybeMatch = [];

      // Compare all other users
      for (const otherUser of otherUsers) {
        const otherUserAnswers =
          answersByUser.get(otherUser._id.toString()) || [];
        let points = 0;

        for (const otherAns of otherUserAnswers) {
          const userAns = userAnswersMap.get(otherAns.questionNo);
          if (!userAns) continue;

          const qNo = userAns.questionNo;

          if (multiOptionQuestions.has(qNo)) {
            const userOpts = [
              userAns.optionNo,
              userAns.optionNo2,
              userAns.optionNo3,
              userAns.optionNo4,
            ].filter(Boolean);

            const otherOpts = [
              otherAns.optionNo,
              otherAns.optionNo2,
              otherAns.optionNo3,
              otherAns.optionNo4,
            ].filter(Boolean);

            const perOptionPoints = 40 / userOpts.length;

            for (const opt of userOpts) {
              if (otherOpts.includes(opt)) {
                points += perOptionPoints;
              }
            }
          } else {
            if (userAns.optionNo === otherAns.optionNo) {
              points += 10;
            }
          }
        }

        const finalPoints = Number(points.toFixed(1));
        const matchData = {
          badgeNumber: otherUser.badgeNumber,
          points: finalPoints,
        };

        if (finalPoints >= superMatchPoints) {
          superMatch.push(matchData);
        } else if (finalPoints >= goodMatchPoints) {
          goodMatch.push(matchData);
        } else if (finalPoints >= matchPoints) {
          match.push(matchData);
        } else if (finalPoints >= maybeMatchPoints) {
          maybeMatch.push(matchData);
        }
      }

      return {
        data: {
          totalScore: TOTAL_POINTS,
          superMatch,
          goodMatch,
          match,
          maybeMatch,
        },
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
