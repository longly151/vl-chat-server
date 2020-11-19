import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Request,
  HttpException,
  HttpStatus,
  Put,
  Param,
  Query
} from '@nestjs/common';
import _ from 'lodash';
import { RoomService } from './index.service';
import { Room } from './index.interface';

@Controller('rooms')
export class RoomController {
  constructor(private readonly service: RoomService) {}

  @Get()
  async index(@Query() query): Promise<any> {
    const data = await this.service.findWithLimit(query);
    const total = await this.service.total();
    return {
      data,
      total
    };
  }

  @Get(':id')
  async show(@Request() req, @Query() query): Promise<Room> {
    const { id } = req.params;
    if (!id)
      throw new HttpException(
        'ID parameter is missing',
        HttpStatus.BAD_REQUEST
      );

    const data = await this.service.findById(id, query);

    if (!data)
      throw new HttpException(
        `The user with the id: ${id} does not exists`,
        HttpStatus.BAD_REQUEST
      );

    return data;
  }
}
