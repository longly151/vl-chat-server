import { Module, HttpModule } from '@nestjs/common';
import { UserModule } from '../User/index.module';
import { RoomModule } from '../Room/index.module';
import { ChatGateway } from './index.gateway';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    }),
    RoomModule,
    UserModule
  ],
  providers: [ChatGateway]
})
export class ChatModule {}
