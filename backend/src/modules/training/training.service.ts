import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
    TrainingCourse,
    TrainingCourseType,
} from '../../entities/training-course.entity';
import {
    EmployeeTraining,
    TrainingStatus,
} from '../../entities/employee-training.entity';

import { User } from '../../entities/user.entity';

@Injectable()
export class TrainingService {
    constructor(
        @InjectRepository(TrainingCourse)
        private readonly courseRepository: Repository<TrainingCourse>,

        @InjectRepository(EmployeeTraining)
        private readonly employeeTrainingRepository: Repository<EmployeeTraining>,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async findAllCourses() {
        const courses = await this.courseRepository.find({
            relations: {
                assignments: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });

        return courses.map((course) => ({
            id: course.id,
            title: course.title,
            type: course.type,
            skillsProvided: course.skillsProvided,
            courseUrl: course.courseUrl,
            durationHours: course.durationHours,
            assignmentCount: course.assignments?.length ?? 0,
            createdAt: course.createdAt,
        }));
    }
    async createCourse(data: {
        title: string;
        type: TrainingCourseType;
        skillsProvided: string[];
        courseUrl?: string;
        durationHours?: number;
    }) {
        const course = this.courseRepository.create({
            title: data.title.trim(),
            type: data.type,
            skillsProvided: data.skillsProvided,
            courseUrl: data.courseUrl?.trim() || null,
            durationHours: data.durationHours ?? 10,
        });

        return this.courseRepository.save(course);
    }
    async assignCourse(data: {
        userId: number;
        courseId: number;
        assignedByAi?: boolean;
        aiReason?: string;
    }) {
        const user = await this.userRepository.findOne({
            where: { id: data.userId },
        });

        if (!user) {
            throw new NotFoundException('Không tìm thấy nhân viên.');
        }

        const course = await this.courseRepository.findOne({
            where: { id: data.courseId },
        });

        if (!course) {
            throw new NotFoundException('Không tìm thấy khóa học.');
        }

        const existing = await this.employeeTrainingRepository.findOne({
            where: {
                userId: data.userId,
                courseId: data.courseId,
            },
        });

        if (existing) {
            throw new ConflictException(
                'Nhân viên đã được gán khóa học này.',
            );
        }

        const assignment = this.employeeTrainingRepository.create({
            userId: data.userId,
            courseId: data.courseId,
            progressPercent: 0,
            assignedByAi: data.assignedByAi ?? false,
            aiReason: data.aiReason?.trim() || null,
            status: TrainingStatus.ASSIGNED,
        });

        return this.employeeTrainingRepository.save(assignment);
    }
    async findAllAssignments() {
        const assignments =
            await this.employeeTrainingRepository.find({
                relations: {
                    user: true,
                    course: true,
                },
                order: {
                    createdAt: 'DESC',
                },
            });

        return assignments.map((assignment) => ({
            id: assignment.id,

            user: {
                id: assignment.user.id,
                fullName: assignment.user.fullName,
                email: assignment.user.email,
            },

            course: {
                id: assignment.course.id,
                title: assignment.course.title,
                type: assignment.course.type,
            },

            progressPercent: assignment.progressPercent,
            assignedByAi: assignment.assignedByAi,
            aiReason: assignment.aiReason,
            status: assignment.status,
            completedAt: assignment.completedAt,
            createdAt: assignment.createdAt,
        }));
    }

    async updateProgress(
        assignmentId: number,
        progressPercent: number,
    ) {
        if (
            progressPercent < 0 ||
            progressPercent > 100
        ) {
            throw new BadRequestException(
                'Tiến độ phải nằm trong khoảng từ 0 đến 100.',
            );
        }

        const assignment =
            await this.employeeTrainingRepository.findOne({
                where: {
                    id: assignmentId,
                },
            });

        if (!assignment) {
            throw new NotFoundException(
                'Không tìm thấy thông tin đào tạo.',
            );
        }

        assignment.progressPercent = progressPercent;

        if (progressPercent === 100) {
            assignment.status = TrainingStatus.COMPLETED;
            assignment.completedAt = new Date();
        } else if (progressPercent > 0) {
            assignment.status = TrainingStatus.IN_PROGRESS;
            assignment.completedAt = null;
        } else {
            assignment.status = TrainingStatus.ASSIGNED;
            assignment.completedAt = null;
        }

        return this.employeeTrainingRepository.save(
            assignment,
        );
    }
    async getTrainingSummary() {
        const assignments =
            await this.employeeTrainingRepository.find();

        const totalAssignments = assignments.length;

        const assigned = assignments.filter(
            (item) => item.status === TrainingStatus.ASSIGNED,
        ).length;

        const inProgress = assignments.filter(
            (item) => item.status === TrainingStatus.IN_PROGRESS,
        ).length;

        const completed = assignments.filter(
            (item) => item.status === TrainingStatus.COMPLETED,
        ).length;

        const averageProgress =
            totalAssignments === 0
                ? 0
                : Math.round(
                    assignments.reduce(
                        (sum, item) => sum + item.progressPercent,
                        0,
                    ) / totalAssignments,
                );

        return {
            totalAssignments,
            assigned,
            inProgress,
            completed,
            averageProgress,
            completionRate:
                totalAssignments === 0
                    ? 0
                    : Number(
                        ((completed / totalAssignments) * 100).toFixed(2),
                    ),
        };
    }
}