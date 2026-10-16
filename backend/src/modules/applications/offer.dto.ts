import { IsArray, IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class CreateOfferInput {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    salary: string;
    @IsDateString({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    startDate: string;
    @IsNotEmpty()
    @IsString()
    @MaxLength(200)
    roleTitle: string;
}
export class OfferDeliveryInput {
    @IsIn(['CLAIM', 'SENT', 'REMIND', 'REMINDED', 'EXPIRE', 'EXPIRY_NOTIFIED'])
    action: string;
    @IsOptional()
    @Matches(/^[a-f0-9]{64}$/)
    responseToken?: string;
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    accepted?: string[];
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(998)
    @Matches(/^[^\r\n]+$/)
    messageId?: string;
}
