import { IsNotEmpty, IsString } from 'class-validator';

export class ChatCopilotDto {
  @IsString({ message: 'Tin nhắn gửi tới Copilot phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống.' })
  message: string;
}
