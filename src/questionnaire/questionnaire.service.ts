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

  async getMatchh(page: number, limit: number, query: any, sort: string) {
    try {
      const SPECIAL_QUESTIONS = [0, 4, 6, 8];

      const pipeline: any = [
        {
          $match: query,
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },

        // First get all user details we'll need
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },

        // Then get other users for matching
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

        // Filter otherUsers to only those matching partnerGender and partnerAge conditions
        {
          $addFields: {
            otherUsers: {
              $filter: {
                input: '$otherUsers',
                as: 'otherUser',
                cond: {
                  $and: [
                    {
                      $eq: ['$$otherUser.gender', '$userDetails.partnerGender'],
                    },
                    { $eq: ['$$otherUser.age', '$userDetails.partnerAge'] },
                  ],
                },
              },
            },
          },
        },

        // Get current user's answers
        {
          $lookup: {
            from: 'questions',
            localField: '_id',
            foreignField: 'userId',
            as: 'currentUserAnswers',
          },
        },

        // Calculate matches
        {
          $addFields: {
            matches: {
              $map: {
                input: '$otherUsers',
                as: 'otherUser',
                in: {
                  badgeNumber: '$$otherUser.badgeNumber',
                  name: '$$otherUser.name',
                  email: '$$otherUser.email',
                  matchPoints: {
                    $sum: {
                      $map: {
                        input: '$$otherUser.answers',
                        as: 'otherAnswer',
                        in: {
                          $let: {
                            vars: {
                              matchingAnswer: {
                                $first: {
                                  $filter: {
                                    input: '$currentUserAnswers',
                                    as: 'currAnswer',
                                    cond: {
                                      $eq: [
                                        '$$currAnswer.questionNo',
                                        '$$otherAnswer.questionNo',
                                      ],
                                    },
                                  },
                                },
                              },
                              questionNo: '$$otherAnswer.questionNo',
                            },
                            in: {
                              $cond: [
                                { $in: ['$$questionNo', SPECIAL_QUESTIONS] },
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
                                          ],
                                          as: 'opt',
                                          cond: { $ne: ['$$opt', null] },
                                        },
                                      },
                                      otherOpts: {
                                        $filter: {
                                          input: [
                                            '$$otherAnswer.optionNo',
                                            '$$otherAnswer.optionNo2',
                                            '$$otherAnswer.optionNo3',
                                            '$$otherAnswer.optionNo4',
                                          ],
                                          as: 'opt',
                                          cond: { $ne: ['$$opt', null] },
                                        },
                                      },
                                    },
                                    in: {
                                      $let: {
                                        vars: {
                                          len: { $size: '$$currentOpts' },
                                        },
                                        in: {
                                          $let: {
                                            vars: {
                                              pointPerMatch: {
                                                $switch: {
                                                  branches: [
                                                    {
                                                      case: {
                                                        $eq: ['$$len', 4],
                                                      },
                                                      then: 10,
                                                    },
                                                    {
                                                      case: {
                                                        $eq: ['$$len', 3],
                                                      },
                                                      then: 13.3,
                                                    },
                                                    {
                                                      case: {
                                                        $eq: ['$$len', 2],
                                                      },
                                                      then: 20,
                                                    },
                                                    {
                                                      case: {
                                                        $eq: ['$$len', 1],
                                                      },
                                                      then: 40,
                                                    },
                                                  ],
                                                  default: 0,
                                                },
                                              },
                                            },
                                            in: {
                                              $sum: {
                                                $map: {
                                                  input: '$$currentOpts',
                                                  as: 'currOpt',
                                                  in: {
                                                    $cond: [
                                                      {
                                                        $in: [
                                                          '$$currOpt',
                                                          '$$otherOpts',
                                                        ],
                                                      },
                                                      '$$pointPerMatch',
                                                      0,
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
                                {
                                  $cond: [
                                    {
                                      $eq: [
                                        '$$matchingAnswer.optionNo',
                                        '$$otherAnswer.optionNo',
                                      ],
                                    },
                                    10,
                                    0,
                                  ],
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

        // Categorize matches
        {
          $addFields: {
            matches: {
              $map: {
                input: '$matches',
                as: 'm',
                in: {
                  badgeNumber: '$$m.badgeNumber',
                  matchPoints: { $round: ['$$m.matchPoints', 1] },
                  matchCategory: {
                    $switch: {
                      branches: [
                        {
                          case: { $gte: ['$$m.matchPoints', 189] },
                          then: 'superMatch',
                        },
                        {
                          case: { $gte: ['$$m.matchPoints', 168] },
                          then: 'goodMatch',
                        },
                        {
                          case: { $gte: ['$$m.matchPoints', 105] },
                          then: 'match',
                        },
                        {
                          case: { $gte: ['$$m.matchPoints', 63] },
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

        // Filter matches to exclude 'noMatch'
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

        // Calculate totalScore
        {
          $addFields: {
            totalScore: 210, // { $sum: '$matches.matchPoints' },
          },
        },

        // Structure match data into categories
        {
          $addFields: {
            'match.data': {
              totalScore: '$totalScore',
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

        // Sorting stage based on 'sort' parameter
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
                default: -1, // showAll or unknown sort means no sorting effect
              },
            },
          },
        },
        // Apply sorting only if sort is not 'showAll'
        ...(sort !== 'showAll' ? [{ $sort: { sortField: -1 } }] : []),

        // Final projection with user details and match data, remove sortField
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
              __v: '$userDetails.__v',
            },
            match: 1,
          },
        },
      ];

      const results = await this.userModel.aggregate(pipeline).exec();

      // Count total documents for pagination
      const totalCount = await this.userModel.countDocuments();
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
