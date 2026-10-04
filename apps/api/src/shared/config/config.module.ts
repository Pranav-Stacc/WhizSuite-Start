import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateAppConfig } from './app.config';

export const APP_CONFIG = 'APP_CONFIG';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateAppConfig,
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
