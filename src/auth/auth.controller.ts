import { Body, ConflictException, Controller, Post, Put } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './entities/models/admin.model';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './entities/dtos/login.dto';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private AuthService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() user: AdminLoginDto) {
    try {
      const { email, password } = user;
      const query: any = {};
      if (email) query.email = email;
      const existingUser = await this.adminModel.findOne(query);
      if (existingUser) {
        throw new ConflictException({
          success: false,
          error: 'User with this email or contact already exists',
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      const newUser = new this.adminModel(user);
      await newUser.save();
      return {
        success: true,
        message: 'Admin registered successfully',
        user: newUser,
      };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response.error || 'Error occured while creating user',
      });
    }
  }

  @Put("login")
  async login(@Body() user: AdminLoginDto) {
    try {
      const { email, password } = user;
      const existingUser = await this.adminModel.findOne({email});
      if (!existingUser) {
        throw new ConflictException({
          success: false,
          error: "User not found",
        });
      }
      const isPasswordValid = await bcrypt.compare(
        password,
        existingUser.password
      );
      if (!isPasswordValid) {
        throw new ConflictException({
          success: false,
          error: "Wrong Password",
        });
      }
      const payload = this.AuthService.generateToken(
        existingUser._id.toString(),
        "user"
      );
      return {
        success: true,
        message: "Login successfully",
        token: payload,
      };
    } catch (error) {
      console.error(error);
      throw new ConflictException({
        success: false,
        error: error.response.error || "Error occured while login",
      });
    }
  }
}
