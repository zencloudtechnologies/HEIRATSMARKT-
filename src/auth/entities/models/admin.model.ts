import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
export type AdminDocument = HydratedDocument<Admin>;

@Schema()
export class Admin {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
