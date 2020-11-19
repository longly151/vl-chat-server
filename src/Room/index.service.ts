/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'src/core/utils/aqp';
import * as _ from 'lodash';
import { Room } from './index.interface';
import { Message } from './Message/index.interface';

@Injectable()
export class RoomService {
  constructor(@InjectModel('Room') private readonly model: Model<Room>) {}

  async createOne(dto: Room): Promise<Room> {
    const created = new this.model(dto);
    return created.save();
  }

  async updateOne(id: string, newValue: Room): Promise<Room | null> {
    return this.model.findByIdAndUpdate(id, newValue).exec();
  }

  async findAll(query: any): Promise<Room[]> {
    const { filter, skip, limit, sort, projection, population } = aqp(query);
    return this.model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .select(projection)
      .populate(population)
      .exec();
  }

  async findOne(
    options: any,
    fields?: any
  ): Promise<Room | null> {
    return this.model.findOne(options, fields).exec();
  }

  async findById(id: string, query?: any): Promise<Model<Room> | null> {
    if (query) {
      const message_limit = Number.parseInt(query.message_limit) || 10;
      const message_offset = Number.parseInt(query.message_offset) || 0;

      const messages = await this.model.aggregate([
        { $unwind: '$messages' },
        { $group: { _id: '$id', count: { $sum: 1 } } }
      ]);

      const messageCount = _.isEmpty(messages) ? 0 : messages[0].count;
      const reverse_message_offset = messageCount - message_limit - message_offset;
      const result = await this.model.findById(id)
        .populate('users', { _id: 1, name: 1, email: 1, avatar: 1, phone: 1 })
        .slice('messages', reverse_message_offset, message_limit)
        .populate('messages.user', { _id: 1 }).lean()
        .exec();
      if (!result) return null;
      result.messages = _.reverse(result.messages);

      return { ...result, message_count: messageCount };
    }

    return this.model.findById(id)
      .populate('users', { _id: 1, name: 1, email: 1, avatar: 1, phone: 1 })
      .exec();
  }

  async findWithLimit(query: any): Promise<Room[] | null> {
    const { filter, skip, limit, sort, projection, population } = aqp(query);
    const newFilter = _.omit(filter, ['message_limit', 'message_offset']);
    const message_limit = Number.parseInt(query.message_limit) || 10;
    const message_offset = Number.parseInt(query.message_offset) || 0;

    return this.model.find(newFilter)
      .skip(skip)
      .limit(limit)
      .slice('messages', message_offset, message_limit)
      .populate('users', { _id: 1, name: 1, email: 1, avatar: 1, phone: 1 })
      .populate('messages.user', { _id: 1 })
      .sort(sort)
      .select(projection)
      .populate(population)
      .exec();
  }

  async total() {
    return this.model.find({}).count();
  }

  async addMessage(message: Message, id: string) {
    const room = await this.findById(id);
    const newMessage = message;
    // eslint-disable-next-line prefer-destructuring
    const user: any = message.user;
    newMessage.user = user._id;
    room.messages.push(message);
    const result = await room.save();

    return _.last(result.messages)._id;
  }
}
