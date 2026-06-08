import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app-minimal.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // Allow all origins for testing
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Private RAG Service')
    .setDescription('API for private document-based RAG system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 RAG Service API running on: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://0.0.0.0:${port}/api`);
}

bootstrap().catch(console.error);