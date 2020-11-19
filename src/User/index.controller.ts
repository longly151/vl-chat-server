import {
  Controller,
  Get,
  Query
} from '@nestjs/common';
import _ from 'lodash';
import { UserService } from './index.service';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  async index(@Query() query): Promise<any> {
    const data = await this.service.findWithLimit(query);
    const total = await this.service.total();
    return {
      data,
      total
    };
  }
}
