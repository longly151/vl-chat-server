import { Schema } from 'mongoose';
import { MessageSchema } from './Message/index.schema';

const room = new Schema({
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  currentUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  typingUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

room.pre('save', (next) => {
  const currentDate = new Date();
  this.updatedAt = currentDate;
  next();
});

export const RoomSchema = room;
