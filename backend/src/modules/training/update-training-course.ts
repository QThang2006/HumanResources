import { BadRequestException } from '@nestjs/common';
import { TrainingCourseType } from '../../entities/training-course.entity';

export interface UpdateTrainingCourse {
    title?: string;
    type?: TrainingCourseType;
    skillsProvided?: string[];
    courseUrl?: string | null;
    durationHours?: number;
}

export function validateCourseUpdate(input: unknown): UpdateTrainingCourse {
    const fail = (message: string): never => { throw new BadRequestException(message); };
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Dữ liệu chỉnh sửa khóa học không hợp lệ.');
    const value = input as Record<string, unknown>;
    const allowed = ['title', 'type', 'skillsProvided', 'courseUrl', 'durationHours'];
    if (!Object.keys(value).length || Object.keys(value).some(key => !allowed.includes(key))) {
        fail('Chỉ được chỉnh sửa thông tin khóa học.');
    }
    const update: UpdateTrainingCourse = {};
    if ('title' in value) {
        if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 255) {
            fail('Tên khóa học phải có từ 1 đến 255 ký tự.');
        }
        update.title = (value.title as string).trim();
    }
    if ('type' in value) {
        if (!Object.values(TrainingCourseType).includes(value.type as TrainingCourseType)) fail('Phân loại khóa học không hợp lệ.');
        update.type = value.type as TrainingCourseType;
    }
    if ('skillsProvided' in value) {
        if (!Array.isArray(value.skillsProvided) || !value.skillsProvided.length ||
            value.skillsProvided.some(skill => typeof skill !== 'string' || !skill.trim())) {
            fail('Vui lòng nhập ít nhất một kỹ năng hợp lệ.');
        }
        update.skillsProvided = [...new Set((value.skillsProvided as string[]).map(skill => skill.trim()))];
    }
    if ('courseUrl' in value) {
        if (value.courseUrl !== null && typeof value.courseUrl !== 'string') fail('Đường dẫn khóa học không hợp lệ.');
        const url = typeof value.courseUrl === 'string' ? value.courseUrl.trim() : '';
        if (url) {
            try {
                if (url.length > 500 || !['https:', 'http:'].includes(new URL(url).protocol)) throw Error();
            } catch { fail('Đường dẫn khóa học phải là URL http/https, tối đa 500 ký tự.'); }
        }
        update.courseUrl = url || null;
    }
    if ('durationHours' in value) {
        if (!Number.isInteger(value.durationHours) || (value.durationHours as number) < 1 || (value.durationHours as number) > 2147483647) {
            fail('Thời lượng phải là số giờ nguyên lớn hơn 0.');
        }
        update.durationHours = value.durationHours as number;
    }
    return update;
}
