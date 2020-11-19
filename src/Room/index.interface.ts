import { Document } from 'mongoose';
import { Message } from 'src/Room/Message/index.interface';
import { User } from 'src/User/index.interface';

export interface Room extends Document {
  users?: User[];
  currentUsers?: User[];
  typingUsers?: User[];
  messages?: Message[];
  createdAt: Date;
  updatedAt: Date;
}
