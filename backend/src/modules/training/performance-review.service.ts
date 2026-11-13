import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AutomationDeliveryStatus,
  PerformanceReview,
  PerformanceReviewReminder,
  RatingRank,
  ReviewReminderPhase,
  User,
  UserRole,
} from '../../entities';
import { ReviewCalendarService } from './review-calendar.service';
import { defaultReviewCalendar, reviewPhaseOnDate, vietnamDate } from './review-calendar';

type ReviewReminderResult = {
  reviewPeriod: string;
  recipientId: number;
  phase: ReviewReminderPhase;
  runId: string;
  pendingEmployeeIds: number[];
  emailNotified: boolean;
  telegramNotified: boolean;
  status: AutomationDeliveryStatus;
  detail?: string;
};

@Injectable()
export class PerformanceReviewService {
  constructor(
    @InjectRepository(PerformanceReview)
    private readonly reviewRepository: Repository<PerformanceReview>,
    @InjectRepository(PerformanceReviewReminder)
    private readonly reminderRepository: Repository<PerformanceReviewReminder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional() private readonly calendarService?: ReviewCalendarService,
  ) {}

  async getPendingReviewReminders(
    asOfInput?: string,
    phaseOverride?: ReviewReminderPhase,
    allowRepeat = false,
  ) {
    const asOf = asOfInput ? new Date(asOfInput) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Thời điểm kiểm tra không hợp lệ.');
    }

    const { year, month } = this.getVietnamDateParts(asOf);
    const reviewPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const calendar = this.calendarService ? await this.calendarService.get(reviewPeriod) : defaultReviewCalendar(reviewPeriod);
    const phase = phaseOverride ?? reviewPhaseOnDate(calendar, vietnamDate(asOf));

    if (!phase || !Object.values(ReviewReminderPhase).includes(phase)) {
      return {
        generatedAt: asOf.toISOString(),
        reviewPeriod,
        phase: null,
        deadline: calendar.deadline,
        openingDate: calendar.openingDate,
        reminderDate: calendar.reminderDate,
        pendingEmployeeCount: 0,
        count: 0,
        reminders: [],
        message: 'Hôm nay không phải ngày mở kỳ hoặc ngày nhắc hạn đánh giá.',
      };
    }

    const [employees, managers, hrUsers, submittedReviews, sentReminders] =
      await Promise.all([
        this.userRepository.find({
          where: { role: UserRole.EMPLOYEE, isActive: true },
          relations: { manager: true, department: true },
          order: { id: 'ASC' },
        }),
        this.userRepository.find({
          where: { role: UserRole.MANAGER, isActive: true },
          relations: { department: true },
          order: { id: 'ASC' },
        }),
        this.userRepository.find({
          where: { role: UserRole.HR, isActive: true },
          order: { id: 'ASC' },
        }),
        this.reviewRepository.find({ where: { reviewPeriod } }),
        this.reminderRepository.find({ where: { reviewPeriod, phase } }),
      ]);

    const submittedEmployeeIds = new Set(
      submittedReviews.map((review) => review.userId),
    );
    const deliveredRecipientIds = new Set(
      sentReminders
        .filter((reminder) => reminder.status === AutomationDeliveryStatus.SENT)
        .map((reminder) => reminder.recipientId),
    );
    const managerByDepartment = new Map<number, User>();
    managers.forEach((manager) => {
      if (manager.departmentId && !managerByDepartment.has(manager.departmentId)) {
        managerByDepartment.set(manager.departmentId, manager);
      }
    });
    const fallbackHr = hrUsers[0] ?? null;
    const grouped = new Map<
      number,
      {
        recipient: User;
        recipientSource: 'DIRECT_MANAGER' | 'DEPARTMENT_MANAGER' | 'HR_FALLBACK';
        employees: User[];
      }
    >();
    let unassignedCount = 0;

    for (const employee of employees) {
      if (submittedEmployeeIds.has(employee.id)) continue;

      const directManager = employee.manager?.isActive === false
        ? null
        : employee.manager;
      const departmentManager = employee.departmentId
        ? managerByDepartment.get(employee.departmentId) ?? null
        : null;
      const recipient = directManager ?? departmentManager ?? fallbackHr;
      if (!recipient) {
        unassignedCount += 1;
        continue;
      }

      const recipientSource = directManager
        ? 'DIRECT_MANAGER'
        : departmentManager
          ? 'DEPARTMENT_MANAGER'
          : 'HR_FALLBACK';
      const current = grouped.get(recipient.id);
      if (current) {
        current.employees.push(employee);
      } else {
        grouped.set(recipient.id, {
          recipient,
          recipientSource,
          employees: [employee],
        });
      }
    }

    const deadline = calendar.deadline;
    const reminders = [...grouped.values()]
      .filter((group) => allowRepeat === true || !deliveredRecipientIds.has(group.recipient.id))
      .map((group) => ({
        notificationKey: `${reviewPeriod}:${phase}:${group.recipient.id}`,
        reviewPeriod,
        reviewPeriodLabel: `Tháng ${String(month).padStart(2, '0')}/${year}`,
        phase,
        deadline,
        recipient: {
          id: group.recipient.id,
          fullName: group.recipient.fullName,
          email: group.recipient.email,
          role: group.recipient.role,
        },
        recipientSource: group.recipientSource,
        pendingCount: group.employees.length,
        employees: group.employees.map((employee) => ({
          id: employee.id,
          fullName: employee.fullName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          departmentName: employee.department?.name ?? 'Chưa có phòng ban',
        })),
      }));

    return {
      generatedAt: asOf.toISOString(),
      reviewPeriod,
      phase,
      deadline,
      openingDate: calendar.openingDate,
      reminderDate: calendar.reminderDate,
      count: reminders.length,
      pendingEmployeeCount: reminders.reduce(
        (sum, reminder) => sum + reminder.pendingCount,
        0,
      ),
      unassignedCount,
      reminders,
    };
  }

  async recordReviewReminderResult(data: ReviewReminderResult) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.reviewPeriod || '')) {
      throw new BadRequestException('Kỳ đánh giá không hợp lệ.');
    }
    if (!Number.isInteger(data.recipientId) || data.recipientId <= 0) {
      throw new BadRequestException('Mã người nhận không hợp lệ.');
    }
    if (!Object.values(ReviewReminderPhase).includes(data.phase)) {
      throw new BadRequestException('Đợt nhắc đánh giá không hợp lệ.');
    }
    if (!Object.values(AutomationDeliveryStatus).includes(data.status)) {
      throw new BadRequestException('Trạng thái gửi thông báo không hợp lệ.');
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(data.runId || '')) {
      throw new BadRequestException('Mã lần chạy không hợp lệ.');
    }

    const recipient = await this.userRepository.findOne({
      where: { id: data.recipientId },
    });
    if (!recipient) {
      throw new NotFoundException('Không tìm thấy người nhận nhắc đánh giá.');
    }

    let reminder = await this.reminderRepository.findOne({
      where: {
        reviewPeriod: data.reviewPeriod,
        recipientId: data.recipientId,
        phase: data.phase,
      },
    });
    if (reminder?.lastRunId === data.runId) {
      return { recorded: true, duplicate: true, id: reminder.id };
    }

    reminder = reminder ?? this.reminderRepository.create({
      reviewPeriod: data.reviewPeriod,
      recipientId: data.recipientId,
      phase: data.phase,
    });
    reminder.pendingEmployeeIds = (data.pendingEmployeeIds ?? [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    reminder.lastRunId = data.runId;
    reminder.emailNotified = Boolean(data.emailNotified);
    reminder.telegramNotified = Boolean(data.telegramNotified);
    reminder.status = data.status;
    reminder.detail = data.detail?.slice(0, 4000) || null;
    reminder.sentAt = reminder.emailNotified || reminder.telegramNotified
      ? new Date()
      : null;
    const saved = await this.reminderRepository.save(reminder);

    return {
      recorded: true,
      duplicate: false,
      id: saved.id,
      status: saved.status,
      emailNotified: saved.emailNotified,
      telegramNotified: saved.telegramNotified,
    };
  }

  async getCalendarBoard(viewerId: number, period: string) {
    const calendar = this.calendarService ? await this.calendarService.get(period) : { ...defaultReviewCalendar(period), version: 0, configured: false, updatedAt: null };
    const [roster, history] = await Promise.all([
      this.getPendingReviewsForReviewer(viewerId, period),
      this.reminderRepository.find({ where: { reviewPeriod: period }, order: { sentAt: 'DESC' } }),
    ]);
    const delivery = (employeeId: number, phase: ReviewReminderPhase) => {
      const rows = history.filter(row => row.phase === phase && (row.pendingEmployeeIds || []).includes(employeeId));
      const row = rows.find(row => row.status === AutomationDeliveryStatus.SENT) || rows[0];
      return row ? { status: row.status, sentAt: row.sentAt, emailNotified: row.emailNotified, telegramNotified: row.telegramNotified } : null;
    };
    return {
      calendar,
      today: vietnamDate(new Date()),
      count: roster.count,
      submittedCount: roster.submittedCount,
      employees: roster.employees.map(employee => ({
        ...employee,
        openingDelivery: delivery(employee.id, ReviewReminderPhase.OPENING),
        followUpDelivery: delivery(employee.id, ReviewReminderPhase.SECOND_REMINDER),
      })),
    };
  }

  async getPendingReviewsForReviewer(reviewerId: number, reviewPeriod?: string) {
    const reviewer = await this.userRepository.findOne({
      where: { id: reviewerId },
    });
    if (!reviewer) throw new NotFoundException('Không tìm thấy người đánh giá.');

    const period = reviewPeriod || this.currentReviewPeriod();
    this.validateReviewPeriod(period);
    const employees = await this.userRepository.find({
      where: { role: UserRole.EMPLOYEE, isActive: true },
      relations: { department: true },
      order: { fullName: 'ASC' },
    });
    const visibleEmployees = reviewer.role === UserRole.MANAGER
      ? employees.filter((employee) =>
          employee.managerId === reviewer.id ||
          Boolean(reviewer.departmentId && employee.departmentId === reviewer.departmentId),
        )
      : employees;
    const reviews = await this.reviewRepository.find({
      where: { reviewPeriod: period },
    });
    const reviewByEmployee = new Map(reviews.map((review) => [review.userId, review]));

    return {
      reviewPeriod: period,
      count: visibleEmployees.length,
      submittedCount: visibleEmployees.filter((employee) => reviewByEmployee.has(employee.id)).length,
      employees: visibleEmployees.map((employee) => {
        const review = reviewByEmployee.get(employee.id);
        return {
          id: employee.id,
          fullName: employee.fullName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          departmentName: employee.department?.name ?? null,
          submitted: Boolean(review),
          review: review
            ? {
                id: review.id,
                kpiScore: Number(review.kpiScore),
                ratingRank: review.ratingRank,
                managerComment: review.managerComment,
                submittedAt: review.createdAt,
              }
            : null,
        };
      }),
    };
  }

  async submitReview(
    reviewerId: number,
    data: {
      userId: number;
      reviewPeriod?: string;
      kpiScore: number;
      managerComment?: string;
      ratingRank: RatingRank;
    },
  ) {
    const reviewPeriod = data.reviewPeriod || this.currentReviewPeriod();
    this.validateReviewPeriod(reviewPeriod);
    const kpiScore = Number(data.kpiScore);
    if (!Number.isFinite(kpiScore) || kpiScore < 0 || kpiScore > 100) {
      throw new BadRequestException('Điểm KPI phải nằm trong khoảng từ 0 đến 100.');
    }
    if (!Object.values(RatingRank).includes(data.ratingRank)) {
      throw new BadRequestException('Xếp loại đánh giá không hợp lệ.');
    }

    const [reviewer, employee] = await Promise.all([
      this.userRepository.findOne({ where: { id: reviewerId } }),
      this.userRepository.findOne({
        where: { id: data.userId, role: UserRole.EMPLOYEE, isActive: true },
      }),
    ]);
    if (!reviewer) throw new NotFoundException('Không tìm thấy người đánh giá.');
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên cần đánh giá.');
    if (
      reviewer.role === UserRole.MANAGER &&
      employee.managerId !== reviewer.id &&
      (!reviewer.departmentId || employee.departmentId !== reviewer.departmentId)
    ) {
      throw new ForbiddenException('Bạn chỉ được đánh giá nhân viên thuộc đội ngũ của mình.');
    }

    let review = await this.reviewRepository.findOne({
      where: { userId: employee.id, reviewPeriod },
    });
    review = review ?? this.reviewRepository.create({
      userId: employee.id,
      reviewPeriod,
    });
    review.reviewerId = reviewer.id;
    review.kpiScore = kpiScore;
    review.managerComment = data.managerComment?.trim() || null;
    review.ratingRank = data.ratingRank;
    const saved = await this.reviewRepository.save(review);

    return {
      message: `Đã lưu đánh giá ${reviewPeriod} cho ${employee.fullName}.`,
      review: saved,
    };
  }

  private currentReviewPeriod() {
    const parts = this.getVietnamDateParts(new Date());
    return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
  }

  private validateReviewPeriod(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) {
      throw new BadRequestException('Kỳ đánh giá phải có định dạng YYYY-MM.');
    }
  }

  private getVietnamDateParts(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  }
}
