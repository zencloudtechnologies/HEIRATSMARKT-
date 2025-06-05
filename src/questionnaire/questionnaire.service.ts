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
        message: error.response?.error || 'Error occurred while fetching user',
      });
    }
  }

  async getAllUsersWithPage(query: any, page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.userModel
          .find(query)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(query),
      ]);

      return {
        users,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        message: error.response?.error || 'Error occurred while fetching users',
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
  
      // Calculate maximum possible score based on current user's answers
      const multiOptionQuestions = new Set([0, 4, 6, 8]);
      let maxPoints = 0;
  
      for (const ans of userAnswers) {
        const qNo = ans.questionNo;
        if (multiOptionQuestions.has(qNo)) {
          const options = [
            ans.optionNo,
            ans.optionNo2,
            ans.optionNo3,
            ans.optionNo4,
            ans.optionNo5,
          ].filter(Boolean);
          maxPoints += options.length * 10;
        } else {
          maxPoints += 10;
        }
      }
  
      // Get potential matches
      const otherUsers = await this.getAllUser({
        age: { $in: user.partnerAge },
        gender: user.partnerGender,
      });
  
      if (!otherUsers.length) {
        return {
          data: {
            totalScore: maxPoints,
            superMatch: [],
            goodMatch: [],
            match: [],
            maybeMatch: [],
          },
        };
      }
  
      // Fetch all answers of other users
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
  
      const superMatch = [];
      const goodMatch = [];
      const match = [];
      const maybeMatch = [];
  
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
              userAns.optionNo5,
            ].filter(Boolean);
  
            const otherOpts = [
              otherAns.optionNo,
              otherAns.optionNo2,
              otherAns.optionNo3,
              otherAns.optionNo4,
              otherAns.optionNo5,
            ].filter(Boolean);
  
            for (const opt of userOpts) {
              if (otherOpts.includes(opt)) {
                points += 10;
              }
            }
          } else {
            if (userAns.optionNo === otherAns.optionNo) {
              points += 10;
            }
          }
        }
  
        const percentage = (points / maxPoints) * 100;
        const matchData = {
          badgeNumber: otherUser.badgeNumber,
          points: Number(points.toFixed(1)),
          percentage: Number(percentage.toFixed(1)),
        };
  
        if (percentage >= 90) {
          superMatch.push(matchData);
        } else if (percentage >= 80) {
          goodMatch.push(matchData);
        } else if (percentage >= 50) {
          match.push(matchData);
        } else if (percentage >= 30) {
          maybeMatch.push(matchData);
        }
      }
  
      return {
        data: {
          totalScore: maxPoints,
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
  

  async getMatchh(page: number, limit: number, query: any, sort: string) {
    try {
      const SPECIAL_QUESTIONS = [0, 4, 6, 8];
  
      const pipeline: any = [
        {
          $match: query,
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
  
        // Get current user's details
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
  
        // Fetch current user's answers
        {
          $lookup: {
            from: 'questions',
            localField: '_id',
            foreignField: 'userId',
            as: 'currentUserAnswers',
          },
        },
  
        // Find potential matches
        {
          $lookup: {
            from: 'users',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $ne: ['$_id', '$$userId'] } } },
              {
                $lookup: {
                  from: 'questions',
                  localField: '_id',
                  foreignField: 'userId',
                  as: 'answers',
                },
              },
            ],
            as: 'otherUsers',
          },
        },
  
        // Filter other users by preferred gender/age
        {
          $addFields: {
            otherUsers: {
              $filter: {
                input: '$otherUsers',
                as: 'ou',
                cond: {
                  $and: [
                    { $eq: ['$$ou.gender', '$userDetails.partnerGender'] },
                    { $in: ['$$ou.age', '$userDetails.partnerAge'] },
                  ],
                },
              },
            },
          },
        },
  
        // Calculate matches with new point and percentage logic
        {
          $addFields: {
            matches: {
              $map: {
                input: '$otherUsers',
                as: 'otherUser',
                in: {
                  badgeNumber: '$$otherUser.badgeNumber',
                  matchStats: {
                    $reduce: {
                      input: '$$otherUser.answers',
                      initialValue: { totalScore: 0, maxScore: 0 },
                      in: {
                        $let: {
                          vars: {
                            matchingAnswer: {
                              $first: {
                                $filter: {
                                  input: '$currentUserAnswers',
                                  as: 'currAnswer',
                                  cond: {
                                    $eq: ['$$currAnswer.questionNo', '$$this.questionNo'],
                                  },
                                },
                              },
                            },
                            isSpecial: {
                              $in: ['$$this.questionNo', SPECIAL_QUESTIONS],
                            },
                          },
                          in: {
                            totalScore: {
                              $add: [
                                '$$value.totalScore',
                                {
                                  $cond: [
                                    '$$isSpecial',
                                    {
                                      $let: {
                                        vars: {
                                          currentOpts: {
                                            $filter: {
                                              input: [
                                                '$$matchingAnswer.optionNo',
                                                '$$matchingAnswer.optionNo2',
                                                '$$matchingAnswer.optionNo3',
                                                '$$matchingAnswer.optionNo4',
                                                '$$matchingAnswer.optionNo5',
                                              ],
                                              as: 'opt',
                                              cond: { $ne: ['$$opt', null] },
                                            },
                                          },
                                          otherOpts: {
                                            $filter: {
                                              input: [
                                                '$$this.optionNo',
                                                '$$this.optionNo2',
                                                '$$this.optionNo3',
                                                '$$this.optionNo4',
                                                '$$this.optionNo5',
                                              ],
                                              as: 'opt',
                                              cond: { $ne: ['$$opt', null] },
                                            },
                                          },
                                        },
                                        in: {
                                          $sum: {
                                            $map: {
                                              input: '$$currentOpts',
                                              as: 'opt',
                                              in: {
                                                $cond: [
                                                  { $in: ['$$opt', '$$otherOpts'] },
                                                  10,
                                                  0,
                                                ],
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            '$$matchingAnswer.optionNo',
                                            '$$this.optionNo',
                                          ],
                                        },
                                        10,
                                        0,
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            maxScore: {
                              $add: [
                                '$$value.maxScore',
                                {
                                  $cond: ['$$isSpecial', {
                                    $multiply: [
                                      10,
                                      {
                                        $size: {
                                          $filter: {
                                            input: [
                                              '$$matchingAnswer.optionNo',
                                              '$$matchingAnswer.optionNo2',
                                              '$$matchingAnswer.optionNo3',
                                              '$$matchingAnswer.optionNo4',
                                              '$$matchingAnswer.optionNo5',
                                            ],
                                            as: 'opt',
                                            cond: { $ne: ['$$opt', null] },
                                          },
                                        },
                                      },
                                    ],
                                  }, 10],
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
  
        // Calculate match category by percentage
        {
          $addFields: {
            matches: {
              $map: {
                input: '$matches',
                as: 'm',
                in: {
                  badgeNumber: '$$m.badgeNumber',
                  email: '$$m.email',
                  name: '$$m.name',
                  matchPoints: { $round: ['$$m.matchStats.totalScore', 1] },
                  matchPercent: {
                    $cond: [
                      { $eq: ['$$m.matchStats.maxScore', 0] },
                      0,
                      {
                        $round: [
                          {
                            $multiply: [
                              { $divide: ['$$m.matchStats.totalScore', '$$m.matchStats.maxScore'] },
                              100,
                            ],
                          },
                          1,
                        ],
                      },
                    ],
                  },
                  matchCategory: {
                    $switch: {
                      branches: [
                        {
                          case: { $gte: [{ $multiply: [{ $divide: ['$$m.matchStats.totalScore', '$$m.matchStats.maxScore'] }, 100] }, 90] },
                          then: 'superMatch',
                        },
                        {
                          case: { $gte: [{ $multiply: [{ $divide: ['$$m.matchStats.totalScore', '$$m.matchStats.maxScore'] }, 100] }, 80] },
                          then: 'goodMatch',
                        },
                        {
                          case: { $gte: [{ $multiply: [{ $divide: ['$$m.matchStats.totalScore', '$$m.matchStats.maxScore'] }, 100] }, 50] },
                          then: 'match',
                        },
                        {
                          case: { $gte: [{ $multiply: [{ $divide: ['$$m.matchStats.totalScore', '$$m.matchStats.maxScore'] }, 100] }, 30] },
                          then: 'maybeMatch',
                        },
                      ],
                      default: 'noMatch',
                    },
                  },
                },
              },
            },
          },
        },
  
        // Filter out noMatch
        {
          $addFields: {
            matches: {
              $filter: {
                input: '$matches',
                as: 'm',
                cond: { $ne: ['$$m.matchCategory', 'noMatch'] },
              },
            },
          },
        },
  
        // Build match object with categories
        {
          $addFields: {
            'match.data': {
              superMatch: {
                $filter: {
                  input: '$matches',
                  as: 'm',
                  cond: { $eq: ['$$m.matchCategory', 'superMatch'] },
                },
              },
              goodMatch: {
                $filter: {
                  input: '$matches',
                  as: 'm',
                  cond: { $eq: ['$$m.matchCategory', 'goodMatch'] },
                },
              },
              match: {
                $filter: {
                  input: '$matches',
                  as: 'm',
                  cond: { $eq: ['$$m.matchCategory', 'match'] },
                },
              },
              maybeMatch: {
                $filter: {
                  input: '$matches',
                  as: 'm',
                  cond: { $eq: ['$$m.matchCategory', 'maybeMatch'] },
                },
              },
            },
          },
        },
  
        // Sort by chosen match type
        {
          $addFields: {
            sortField: {
              $switch: {
                branches: [
                  {
                    case: { $eq: [sort, 'superMatch'] },
                    then: { $size: '$match.data.superMatch' },
                  },
                  {
                    case: { $eq: [sort, 'goodMatch'] },
                    then: { $size: '$match.data.goodMatch' },
                  },
                  {
                    case: { $eq: [sort, 'match'] },
                    then: { $size: '$match.data.match' },
                  },
                  {
                    case: { $eq: [sort, 'maybeMatch'] },
                    then: { $size: '$match.data.maybeMatch' },
                  },
                ],
                default: -1,
              },
            },
          },
        },
        ...(sort !== 'showAll' ? [{ $sort: { sortField: -1 } }] : []),
  
        {
          $project: {
            user: {
              _id: '$userDetails._id',
              badgeNumber: '$userDetails.badgeNumber',
              email: '$userDetails.email',
              name: '$userDetails.name',
              age: '$userDetails.age',
              partnerAge: '$userDetails.partnerAge',
              gender: '$userDetails.gender',
              partnerGender: '$userDetails.partnerGender',
              date: '$userDetails.date',
            },
            match: 1,
          },
        },
      ];
  
      const results = await this.userModel.aggregate(pipeline).exec();
  
      const totalCount = await this.userModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);
  
      return {
        usersData: results,
        totalPages,
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