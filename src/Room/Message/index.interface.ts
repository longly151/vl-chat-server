import { Document } from 'mongoose';
import { User } from 'src/User/index.interface';

export interface Message extends Document {
  text: string;
  image?: string;
  video?: string;
  audio?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  user: User;
  createdAt?: Date;
  updatedAt?: Date;
}
