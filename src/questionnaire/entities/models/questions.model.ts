import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
export type QuestionsDocument = HydratedDocument<Questions>;

@Schema()
export class Questions {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'  })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: Number, required: true })
  questionNo: number;

  @Prop({ type: Number, required: true })
  optionNo: number;

  @Prop({ required: true })
  answer: string;

  @Prop()
  optionNo2: number;

  @Prop()
  answer2: string;

  @Prop()
  optionNo3: number;

  @Prop()
  answer3: string;

  @Prop()
  optionNo4: number;

  @Prop()
  answer4: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}

export const QuestionsSchema = SchemaFactory.createForClass(Questions);
