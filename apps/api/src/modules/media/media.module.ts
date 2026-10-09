import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { MediaFoldersService } from './application/services/media-folders.service';
import { MediaService } from './application/services/media.service';
import { MediaRepository } from './infrastructure/repositories/media.repository';
import { MediaFoldersController } from './interface/http/controllers/media-folders.controller';
import { MediaResourceController } from './interface/http/controllers/media-resource.controller';

@Module({
  imports: [SharedModule],
  controllers: [MediaResourceController, MediaFoldersController],
  providers: [MediaService, MediaFoldersService, MediaRepository],
  exports: [MediaService, MediaFoldersService],
})
export class MediaModule {}
