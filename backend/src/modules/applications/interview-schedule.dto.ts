import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { InterviewResult } from '../../entities/interview.entity';
import { PageQuery } from '../jobs/recruitment.dto';

export class InterviewScheduleQuery extends PageQuery {
  @IsISO8601({ strict: true }) from: string;
  @IsISO8601({ strict: true }) to: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) jobId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) interviewerId?: number;
  @IsOptional() @IsEnum(InterviewResult) result?: InterviewResult;
}

export class InterviewScheduleId {
  @Type(() => Number) @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) id: number;
}
