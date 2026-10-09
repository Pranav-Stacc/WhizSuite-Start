import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/errors/problem-details.filter';
import type { AppConfig } from './shared/config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('PORT');
  const apiPrefix = config.get('API_PREFIX');

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((o: string) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());

  const swagger = new DocumentBuilder()
    .setTitle('Agency OS API')
    .setDescription(
      'Social Media Agency Operating System — modular monolith API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-organization-id', in: 'header' })
    .build();
  SwaggerModule.setup(
    `${apiPrefix}/docs`,
    app,
    SwaggerModule.createDocument(app, swagger),
  );

  await app.listen(port);
  app.get(Logger).log(`API listening on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
