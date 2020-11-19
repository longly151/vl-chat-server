import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './Chat/index.module';
import { RoomModule } from './Room/index.module';
import { APP_CONFIG } from './config';

@Module({
  imports: [
    MongooseModule.forRoot(APP_CONFIG.databaseURL, { useFindAndModify: false }),
    ChatModule,
    RoomModule
  ]
})
export class AppModule {}
