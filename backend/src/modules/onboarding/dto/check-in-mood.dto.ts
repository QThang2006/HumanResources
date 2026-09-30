import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MoodType } from '../../../entities/employee-mood.entity';

export class CheckInMoodDto {
  @IsEnum(MoodType, { message: 'Tâm trạng phải thuộc: GREAT (😊), NORMAL (😐), STRESSED (😫).' })
  @IsNotEmpty({ message: 'Tâm trạng check-in không được để trống.' })
  mood: MoodType;

  @IsString()
  @IsOptional()
  feedbackText?: string;
}
