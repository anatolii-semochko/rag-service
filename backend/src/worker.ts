import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FileProcessingQueueService } from './queue/services/file-processing-queue.service';

async function bootstrap() {
  console.log('🚀 Starting worker process...');

  const app = await NestFactory.create(AppModule);

  // Get the queue service
  const queueService = app.get(FileProcessingQueueService);

  console.log('✅ Worker process started and ready to process files');

  // Keep the worker running
  process.on('SIGTERM', async () => {
    console.log('📴 Worker shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📴 Worker shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  console.error('❌ Worker failed to start:', err);
  process.exit(1);
});