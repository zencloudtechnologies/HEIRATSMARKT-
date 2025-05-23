import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Admin, AdminSchema } from './entities/models/admin.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecretKey',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, AuthModule],
})
export class AuthModule {}
