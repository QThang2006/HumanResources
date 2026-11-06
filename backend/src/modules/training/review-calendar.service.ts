import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceReviewSchedule } from './performance-review-schedule.entity';
import { defaultReviewCalendar, validateReviewCalendar, validateReviewPeriod } from './review-calendar';

export interface UpdateReviewCalendar {
  openingDate: string;
  reminderDate: string;
  deadline: string;
  version: number;
}

@Injectable()
export class ReviewCalendarService {
  constructor(@InjectRepository(PerformanceReviewSchedule) private readonly schedules: Repository<PerformanceReviewSchedule>) {}

  async get(period: string) {
    validateReviewPeriod(period);
    const stored = await this.schedules.findOne({ where: { reviewPeriod: period } });
    return stored ? { ...stored, configured: true } : { ...defaultReviewCalendar(period), version: 0, updatedAt: null, configured: false };
  }

  async update(period: string, body: UpdateReviewCalendar, actorId: number) {
    const dates = validateReviewCalendar(period, body);
    if (!Number.isInteger(body?.version) || body.version < 0) throw new BadRequestException('Phiên bản lịch không hợp lệ. Hãy tải lại dữ liệu.');
    const values = { ...dates, version: body.version + 1, updatedById: actorId };
    try {
      if (body.version === 0) await this.schedules.insert(values);
      else {
        const result = await this.schedules.update({ reviewPeriod: period, version: body.version }, values);
        if (result.affected !== 1) throw new ConflictException('Lịch đã được cập nhật ở phiên khác. Hãy tải lại trước khi lưu.');
      }
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.driverError?.code === 'ER_DUP_ENTRY') throw new ConflictException('Lịch đã được cập nhật ở phiên khác. Hãy tải lại trước khi lưu.');
      throw error;
    }
    return this.get(period);
  }
}
