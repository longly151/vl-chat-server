import { Document } from 'mongoose';

export interface User extends Document {
  token: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  gender: string;
  lastActiveAt: Date | null;
  role: number;
  createdAt: Date;
  updatedAt: Date;
}
