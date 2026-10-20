import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { N8nAiGuard } from './n8n-ai.guard';

@Controller('automation/ai')
@UseGuards(N8nAiGuard)
export class N8nAiController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('applications/:id/context')
  scoreContext(@Param('id', ParseIntPipe) id: number) {
    return this.applications.aiScoreContext(id);
  }

  @Post('applications/:id/processing')
  scoreProcessing(@Param('id', ParseIntPipe) id: number, @Body() input: { requestId: string }) {
    return this.applications.markAiScoreProcessing(id, input.requestId);
  }

  @Post('applications/:id/result')
  scoreResult(@Param('id', ParseIntPipe) id: number, @Body() input: Record<string, unknown>) {
    return this.applications.saveAiScore(id, input);
  }

  @Get('interviews/:id/context')
  questionsContext(@Param('id', ParseIntPipe) id: number) {
    return this.applications.aiQuestionsContext(id);
  }

  @Post('interviews/:id/processing')
  questionsProcessing(@Param('id', ParseIntPipe) id: number, @Body() input: { requestId: string }) {
    return this.applications.markAiQuestionsProcessing(id, input.requestId);
  }

  @Post('interviews/:id/result')
  questionsResult(@Param('id', ParseIntPipe) id: number, @Body() input: Record<string, unknown>) {
    return this.applications.saveAiQuestions(id, input);
  }
}
