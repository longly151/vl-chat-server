import { NestFactory } from '@nestjs/core';
import * as helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use(helmet())
  // .use(rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100 // limit each IP to 100 requests per windowMs
  // }));

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
