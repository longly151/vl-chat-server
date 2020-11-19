import { Schema } from 'mongoose';

const schema = new Schema({
  token: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  avatar: { type: String, required: true },
  gender: { type: String, required: true },
  role: { type: String, required: true },
  lastActiveAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

schema.pre('save', (next) => {
  const currentDate = new Date();
  this.updatedAt = currentDate;
  next();
});

export const UserSchema = schema;
