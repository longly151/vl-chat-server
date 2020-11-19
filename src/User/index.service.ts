import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import aqp from 'src/core/utils/aqp';
import { User } from './index.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly model: Model<User>
  ) {}

  async createOne(user: User): Promise<User> {
    const createdUser = new this.model(user);
    return createdUser.save();
  }

  async findAll(options?: any): Promise<User[]> {
    return this.model.find(options).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.model.findById(id).exec();
  }

  async findOne(
    options: any,
    fields?: any
  ): Promise<User | null> {
    return this.model.findOne(options, fields).exec();
  }

  async updateOne(id: number, newValue: any): Promise<User | null> {
    return this.model.findByIdAndUpdate(id, newValue).exec();
  }

  async deleteOne(data: any): Promise<User | null> {
    return this.model.deleteOne(data).exec();
  }

  async total() {
    return this.model.find({}).count();
  }

  async findWithLimit(query: any): Promise<User[] | null> {
    const { filter, skip, limit, sort, projection, population } = aqp(query);
    const newProjection = {
      ...projection,
      token: 0
    };
    return this.model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .select({ token: 0 })
      .select(newProjection)
      .populate(population)
      .exec();
  }
}
