import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/models/user.model';
import { Model } from 'mongoose';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: Partial<User>) {
    try {
      const newUser = new this.userModel(user);
      await newUser.save();
      return {success: true, newUser};
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
}
