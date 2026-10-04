import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { MediaService } from './application/services/media.service';
import { MediaRepository } from './infrastructure/repositories/media.repository';
import { MediaResourceController } from './interface/http/controllers/media-resource.controller';

@Module({
  imports: [SharedModule],
  controllers: [MediaResourceController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
