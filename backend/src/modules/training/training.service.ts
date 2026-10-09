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

import { User, UserRole } from '../../entities/user.entity';
import { GeminiService } from '../core/ai/gemini.service';

@Injectable()
export class TrainingService {
    constructor(
        @InjectRepository(TrainingCourse)
        private readonly courseRepository: Repository<TrainingCourse>,

        @InjectRepository(EmployeeTraining)
        private readonly employeeTrainingRepository: Repository<EmployeeTraining>,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly geminiService: GeminiService,
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

        const savedCourse = await this.courseRepository.save(course);

if (data.type === TrainingCourseType.MANDATORY) {
    const employees = await this.userRepository.find({
        where: {
            role: UserRole.EMPLOYEE,
        },
    });

    if (employees.length > 0) {
        const assignments = employees.map((employee) =>
            this.employeeTrainingRepository.create({
                userId: employee.id,
                courseId: savedCourse.id,
                progressPercent: 0,
                assignedByAi: false,
                aiReason: null,
                status: TrainingStatus.ASSIGNED,
            }),
        );

        await this.employeeTrainingRepository.save(assignments);
        }
}

return savedCourse;
}

async suggestCourseForEmployee(userId: number) {
    const employee = await this.userRepository.findOne({
        where: {
            id: userId,
            role: UserRole.EMPLOYEE,
        },
        relations: {
            department: true,
            trainings: {
                course: true,
            },
            performanceReviews: true,
        },
    });

    if (!employee) {
        throw new NotFoundException('Không tìm thấy nhân viên.');
    }

    const allCourses = await this.courseRepository.find({
        order: {
            createdAt: 'DESC',
        },
    });

    if (allCourses.length === 0) {
        throw new BadRequestException(
            'Chưa có khóa học nào trong kho để AI đề xuất.',
        );
    }

    const assignedCourseIds = new Set(
        (employee.trainings ?? []).map((training) => training.courseId),
    );

    const availableCourses = allCourses.filter(
        (course) => !assignedCourseIds.has(course.id),
    );

    if (availableCourses.length === 0) {
        throw new BadRequestException(
            'Nhân viên này đã được gán toàn bộ khóa học hiện có.',
        );
    }

    const latestReviews = [...(employee.performanceReviews ?? [])]
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        )
        .slice(0, 3);

    const completedCourses = (employee.trainings ?? [])
        .filter(
            (training) =>
                training.status === TrainingStatus.COMPLETED,
        )
        .map((training) => ({
            title: training.course?.title,
            skillsProvided: training.course?.skillsProvided ?? [],
        }));

    const profileForAi = {
        fullName: employee.fullName,
        jobTitle: employee.jobTitle || 'Chưa cập nhật chức danh',
        department:
            employee.department?.name || 'Chưa cập nhật phòng ban',
        completedCourses,
        performanceReviews: latestReviews.map((review) => ({
            reviewPeriod: review.reviewPeriod,
            kpiScore: review.kpiScore,
            ratingRank: review.ratingRank,
            managerComment: review.managerComment,
            aiSummaryFeedback: review.aiSummaryFeedback,
        })),
    };

    const skillAnalysis = await this.geminiService.generateJson<{
        missingSkills: string[];
        summary: string;
    }>(
        `
Phân tích hồ sơ nhân viên sau và xác định các kỹ năng còn thiếu
hoặc cần phát triển thêm.

HỒ SƠ NHÂN VIÊN:
${JSON.stringify(profileForAi, null, 2)}

Chỉ trả về JSON:
{
  "missingSkills": ["kỹ năng 1", "kỹ năng 2"],
  "summary": "Nhận xét ngắn gọn về khoảng cách năng lực"
}

Yêu cầu:
- Không suy đoán vô căn cứ.
- Ưu tiên dữ liệu KPI, nhận xét quản lý và lịch sử đào tạo.
- missingSkills phải là các kỹ năng có thể cải thiện bằng đào tạo.
        `.trim(),
        'Bạn là chuyên gia Đào tạo & Phát triển và phân tích Skill Gap trong doanh nghiệp.',
    );

    const missingSkills =
        skillAnalysis?.missingSkills?.filter(Boolean) ?? [];

    if (missingSkills.length === 0) {
        throw new BadRequestException(
            'AI chưa xác định được Skill Gap rõ ràng cho nhân viên này.',
        );
    }

    const catalog = availableCourses.map((course) => ({
        id: course.id,
        title: course.title,
        skillsProvided: course.skillsProvided ?? [],
        durationHours: course.durationHours,
        courseUrl: course.courseUrl ?? undefined,
    }));

    const recommendation =
        await this.geminiService.recommendSkillGapCourse(
            missingSkills,
            catalog,
            employee.jobTitle || 'Nhân viên',
            `Nâng cao năng lực cho vị trí ${
                employee.jobTitle || 'hiện tại'
            }`,
        );

    const normalize = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');

    const resolvedRecommendations = recommendation.recommendedCourses
        .map((item) => {
            let matchedCourse = item.courseId
                ? availableCourses.find(
                    (course) => course.id === item.courseId,
                )
                : undefined;

            if (!matchedCourse && item.courseTitle) {
                matchedCourse = availableCourses.find(
                    (course) =>
                        normalize(course.title) ===
                        normalize(item.courseTitle),
                );
            }

            if (!matchedCourse) {
                return null;
            }

            return {
                ...item,
                courseId: matchedCourse.id,
                courseTitle: matchedCourse.title,
            };
        })
        .filter(
            (
                item,
            ): item is NonNullable<typeof item> => item !== null,
        );

    let best = resolvedRecommendations.sort(
        (a, b) => a.learningPathOrder - b.learningPathOrder,
    )[0];

    if (!best) {
        const skillGaps = [
            ...missingSkills,
            ...(recommendation.skillGapsIdentified ?? []),
        ].map(normalize);

        const rankedCourses = availableCourses
            .map((course) => {
                const matchedSkills = (course.skillsProvided ?? []).filter(
                    (skill) => {
                        const normalizedSkill = normalize(skill);

                        return skillGaps.some(
                            (gap) =>
                                gap.includes(normalizedSkill) ||
                                normalizedSkill.includes(gap),
                        );
                    },
                );

                return {
                    course,
                    matchedSkills,
                    score: matchedSkills.length,
                };
            })
            .sort((a, b) => b.score - a.score);

        const fallback = rankedCourses.find(
            (item) => item.score > 0,
        );

        if (!fallback) {
            throw new BadRequestException(
                'AI chưa tìm thấy khóa học phù hợp trong kho hiện tại.',
            );
        }

        best = {
            courseId: fallback.course.id,
            courseTitle: fallback.course.title,
            matchedMissingSkills:
                fallback.matchedSkills.length > 0
                    ? fallback.matchedSkills
                    : missingSkills.slice(0, 3),
            priority: 'HIGH',
            estimatedTimeToComplete: `${
                fallback.course.durationHours ?? 10
            } giờ`,
            whyRecommended:
                recommendation.summary ||
                `Khóa học ${fallback.course.title} phù hợp với nhu cầu phát triển kỹ năng hiện tại của nhân viên.`,
            learningPathOrder: 1,
        };
    }

    return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    skillGaps: recommendation.skillGapsIdentified,
    readinessScore: recommendation.readinessScore,
    summary: skillAnalysis?.summary || recommendation.summary,

    courseId: best.courseId,
    courseTitle: best.courseTitle,
    matchedMissingSkills: best.matchedMissingSkills,
    priority: best.priority,
    estimatedTimeToComplete: best.estimatedTimeToComplete,

    reason: best.whyRecommended,
    careerAdvice: recommendation.careerAdvice,

    assignedByAi: true,
    aiGenerated: recommendation.aiGenerated,
};
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