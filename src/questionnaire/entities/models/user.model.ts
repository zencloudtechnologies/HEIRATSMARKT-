import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true, unique: true })
  badgeNumber: number;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  age: string;

  @Prop({ required: true })
  partnerAge: string;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  partnerGender: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
