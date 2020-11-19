import { Schema } from 'mongoose';

const schema = new Schema({
  text: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  image: { type: String },
  video: { type: String },
  audio: { type: String },
  location: { type: Map, of: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

schema.pre('save', (next) => {
  const currentDate = new Date();
  this.updatedAt = currentDate;
  next();
});

export const MessageSchema = schema;
