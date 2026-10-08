import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { JobStatus } from '../../entities/job.entity';
import { ApplicationStatus } from '../../entities/application.entity';
import { InterviewResult } from '../../entities/interview.entity';

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @Trim() @IsString() @MaxLength(150) q?: string;
}
export class JobsQuery extends PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) departmentId?: number;
  @IsOptional() @Trim() @IsString() @MaxLength(150) location?: string;
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
}
export class JobInput {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @Type(() => Number) @IsInt() @Min(1) departmentId: number;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20000) description: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20000) requirements: string;
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  location?: string;
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  salaryRange?: string;
}
export class JobStateInput {
  @IsEnum(JobStatus) status: JobStatus;
  @IsISO8601() expectedUpdatedAt: string;
}
export class JobUpdateInput extends JobInput {
  @IsISO8601() expectedUpdatedAt: string;
}
export class JdInput {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(100) departmentName: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) level: string;
}
export class ApplicationQuery extends PageQuery {
  @Type(() => Number) @IsInt() @Min(1) jobId: number;
  @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) minScore?: number;
}
export class JobIdQuery {
  @Type(() => Number) @IsInt() @Min(1) jobId: number;
}
export class SubmitInput {
  @Type(() => Number) @IsInt() @Min(1) jobId: number;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) candidateName: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  candidateEmail: string;
  @IsOptional() @Trim() @IsString() @MaxLength(20) candidatePhone?: string;
}
export class StateInput {
  @IsEnum(ApplicationStatus) expectedStatus: ApplicationStatus;
  @IsEnum(ApplicationStatus) status: ApplicationStatus;
}
export class ScheduleInput {
  @Type(() => Number) @IsInt() @Min(1) interviewerId: number;
  @IsISO8601() scheduledAt: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) round: number;
}
export class ResultInput {
  @IsISO8601() expectedUpdatedAt: string;
  @IsEnum(InterviewResult) expectedResult: InterviewResult;
  @IsEnum(InterviewResult) result: InterviewResult;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) score: number;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(5000) feedback: string;
}
