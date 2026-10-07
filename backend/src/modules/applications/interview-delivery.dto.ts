import { IsEmail, IsEnum, IsInt, IsISO8601, IsString, IsUUID, Matches, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum DeliveryEvent { CALENDAR_CONFIRMED = 'CALENDAR_CONFIRMED', SMTP_ACCEPTED = 'SMTP_ACCEPTED', FAILED = 'FAILED' }
export class DeliveryClaimInput {
  @IsUUID('4') requestId: string;
}
export class DeliveryCallbackInput extends DeliveryClaimInput {
  @Type(() => Number) @IsInt() @Min(1) applicationId: number;
  @IsEnum(DeliveryEvent) event: DeliveryEvent;
  @ValidateIf(o => o.event === DeliveryEvent.CALENDAR_CONFIRMED || o.event === DeliveryEvent.SMTP_ACCEPTED)
  @IsString() @Matches(/^[a-v0-9]{5,64}$/) eventId: string;
  @ValidateIf(o => o.event === DeliveryEvent.CALENDAR_CONFIRMED)
  @IsString() @Matches(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/) meetingLink: string;
  @ValidateIf(o => o.event === DeliveryEvent.CALENDAR_CONFIRMED) @IsISO8601() scheduledAt: string;
  @ValidateIf(o => o.event === DeliveryEvent.SMTP_ACCEPTED) @IsEmail() @MaxLength(255) recipient: string;
  @ValidateIf(o => o.event === DeliveryEvent.SMTP_ACCEPTED) @IsString() @Matches(/^[^\r\n]+$/) @MaxLength(998) messageId: string;
  @ValidateIf(o => o.event === DeliveryEvent.FAILED) @IsEnum(['CALENDAR', 'EMAIL']) stage: 'CALENDAR' | 'EMAIL';
  @ValidateIf(o => o.event === DeliveryEvent.FAILED) @IsEnum(['CALENDAR_ERROR', 'MEET_NOT_READY', 'SMTP_ERROR']) code: string;
}
