import { Module, Global } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { VectorService } from './vector.service';

@Global()
@Module({
  providers: [GeminiService, VectorService],
  exports: [GeminiService, VectorService],
})
export class AiModule {}
