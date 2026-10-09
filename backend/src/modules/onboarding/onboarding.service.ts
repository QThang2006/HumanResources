import { Injectable, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not } from 'typeorm';
import { OnboardingTask } from '../../entities/onboarding-task.entity';
import { EmployeeMood, MoodType } from '../../entities/employee-mood.entity';
import { Document } from '../../entities/document.entity';
import { EmployeeTraining, TrainingStatus } from '../../entities/employee-training.entity';
import { TrainingCourse, TrainingCourseType } from '../../entities/training-course.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { GeminiService } from '../core/ai/gemini.service';
import { VectorService } from '../core/ai/vector.service';
import { N8nService } from '../core/automation/n8n.service';

/**
 * 📌 PHÂN HỆ ONBOARDING, COPILOT RAG & TEAM MOOD
 * Phân công:
 * - Thành viên 4: Checklist thử việc 30 ngày, Khóa học L&D, Trợ lý AI Copilot RAG (Sprint 4)
 * - Thành viên 3: Check-in cảm xúc hàng ngày, Giám sát Team Mood & Can thiệp Burnout 1-on-1 (Sprint 3 & 4)
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(OnboardingTask)
    private readonly taskRepository: Repository<OnboardingTask>,
    @InjectRepository(EmployeeMood)
    private readonly moodRepository: Repository<EmployeeMood>,
    @InjectRepository(Document)
    private readonly docRepository: Repository<Document>,
    @InjectRepository(EmployeeTraining)
    private readonly trainingRepository: Repository<EmployeeTraining>,
    @InjectRepository(TrainingCourse)
    private readonly courseRepository: Repository<TrainingCourse>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly geminiService: GeminiService,
    private readonly vectorService: VectorService,
    private readonly n8nService: N8nService,
  ) { }

  // ────────────────────────────────────────────────────────────────────
  // THÀNH VIÊN 3: LỘ TRÌNH THỬ VIỆC 30 NGÀY (Bước 2)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách nhiệm vụ onboarding + tính phần trăm hoàn thành.
   * progressPercent = (số task isCompleted / tổng số task) * 100, làm tròn.
   */
  async getTasks(userId: number) {
    let tasks = await this.taskRepository.find({
      where: { userId },
      order: { dueDay: 'ASC' },
    });

    // Tự động khởi tạo lộ trình 10 nhiệm vụ mẫu cho nhân viên mới nếu chưa có
    if (tasks.length === 0) {
      await this.seedOnboardingTasks(userId);
      tasks = await this.taskRepository.find({
        where: { userId },
        order: { dueDay: 'ASC' },
      });
    }

    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      userId,
      progressPercent,
      totalTasks: total,
      completedTasks: completed,
      tasks,
      message: total === 0
        ? 'Chưa có nhiệm vụ onboarding nào. Vui lòng liên hệ HR.'
        : `Lộ trình thử việc: ${completed}/${total} nhiệm vụ hoàn thành (${progressPercent}%).`,
    };
  }

  /**
   * Toggle trạng thái hoàn thành nhiệm vụ.
   * - Nếu chưa hoàn thành → đánh dấu hoàn thành + ghi completedAt
   * - Nếu đã hoàn thành → bỏ đánh dấu + xóa completedAt
   * Trả về task đã cập nhật + progress mới.
   */
  async toggleTask(taskId: number, userId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new NotFoundException(
        `Không tìm thấy nhiệm vụ #${taskId} thuộc về người dùng #${userId}.`,
      );
    }

    // Toggle trạng thái
    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date() : null;

    const saved = await this.taskRepository.save(task);

    this.logger.log(
      `📋 Task toggled: taskId=${taskId}, userId=${userId}, isCompleted=${saved.isCompleted}`,
    );

    // Tính lại progress sau khi toggle
    const allTasks = await this.taskRepository.find({ where: { userId } });
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.isCompleted).length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      task: saved,
      progressPercent,
      totalTasks: total,
      completedTasks: completed,
      message: saved.isCompleted
        ? `✅ Đã hoàn thành: "${saved.title}"`
        : `↩️ Đã bỏ đánh dấu: "${saved.title}"`,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // THÀNH VIÊN 3: CHECK-IN CẢM XÚC HÀNG NGÀY & BURNOUT DETECTION
  // ────────────────────────────────────────────────────────────────────

  /**
   * Kiểm tra nhân viên đã check-in cảm xúc hôm nay chưa.
   * Trả về bản ghi mood nếu đã check-in, hoặc null nếu chưa.
   */
  async getTodayMood(userId: number): Promise<EmployeeMood | null> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayMood = await this.moodRepository.findOne({
      where: {
        userId,
        createdAt: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'DESC' },
    });

    return todayMood || null;
  }

  /**
   * Lấy lịch sử cảm xúc N ngày gần nhất (mặc định 7 ngày).
   * Frontend dùng để hiển thị dãy chấm tròn mood history.
   */
  async getMoodHistory(userId: number, days: number = 7): Promise<EmployeeMood[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    return this.moodRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Ghi nhận cảm xúc hàng ngày + Phát hiện kiệt sức tự động (Burnout Detection).
   *
   * Luồng xử lý:
   *   1. Chặn trùng: Mỗi nhân viên chỉ được check-in 1 lần/ngày.
   *   2. Tạo bản ghi EmployeeMood mới trong DB.
   *   3. Nếu mood = STRESSED → đếm chuỗi ngày STRESSED liên tiếp gần nhất.
   *   4. Nếu chuỗi ≥ 3 ngày → đánh cờ isBurnoutRisk = true
   *      → gọi n8nService.triggerBurnoutAlert() bắn Telegram/Email cho HR & Manager.
   *
   * Tham khảo thiết kế: Lattice (1 lần/ngày), 15Five (ngưỡng 3 tuần), WHO Burnout Framework.
   */
  async recordMood(userId: number, mood: MoodType, feedbackText?: string) {
    // ── Bước 1: Chặn check-in trùng (1 lần/ngày) ──
    const existing = await this.getTodayMood(userId);
    if (existing) {
      throw new ConflictException(
        'Bạn đã chia sẻ cảm xúc hôm nay rồi. Hẹn gặp lại ngày mai!',
      );
    }

    // ── Bước 2: Tạo bản ghi mood mới ──
    const newMood = this.moodRepository.create({
      userId,
      mood,
      feedbackText: feedbackText || null,
    });

    // ── Bước 3: Burnout Detection (chỉ khi STRESSED) ──
    if (mood === MoodType.STRESSED) {
      // Lấy 5 bản ghi mood gần nhất (trước hôm nay) để đếm chuỗi stress liên tiếp
      const recentMoods = await this.moodRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      // Đếm chuỗi STRESSED liên tiếp theo ngày làm việc thực tế (chặn đứt chuỗi nếu khoảng cách > 3 ngày)
      let consecutiveStressBefore = 0;
      let lastCheckDate = new Date();
      lastCheckDate.setHours(0, 0, 0, 0);

      for (const record of recentMoods) {
        if (record.mood !== MoodType.STRESSED) {
          break;
        }

        const recordDate = new Date(record.createdAt);
        recordDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round(
          (lastCheckDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Khoảng cách <= 3 ngày (cho phép 2 ngày cuối tuần T7, CN mà không làm đứt chuỗi)
        if (diffDays >= 1 && diffDays <= 3) {
          consecutiveStressBefore++;
          lastCheckDate = recordDate;
        } else {
          // Khoảng cách ngày quá xa (> 3 ngày) -> đứt chuỗi căng thẳng liên tục
          break;
        }
      }

      // Tổng cộng = chuỗi trước đó + 1 (hôm nay). Ngưỡng cảnh báo: ≥ 3 ngày
      const totalStressDays = consecutiveStressBefore + 1;

      if (totalStressDays >= 3) {
        newMood.isBurnoutRisk = true;

        this.logger.warn(
          `🔴 BURNOUT DETECTED: userId=${userId} — ${totalStressDays} ngày STRESSED liên tiếp!`,
        );

        // Lấy thông tin nhân viên để gửi cảnh báo có tên và phòng ban
        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['department'],
        });

        // Bắn webhook n8n → Telegram Bot / Email cho HR & Manager
        await this.n8nService.triggerBurnoutAlert({
          userId,
          employeeName: user?.fullName || 'Nhân viên',
          departmentName: user?.department?.name || 'Chưa xác định',
          stressDays: totalStressDays,
          latestFeedback: feedbackText,
        });
      }
    }

    // ── Bước 4: Lưu vào MySQL và trả kết quả ──
    const saved = await this.moodRepository.save(newMood);

    this.logger.log(
      `✅ Mood check-in: userId=${userId}, mood=${mood}, burnoutRisk=${saved.isBurnoutRisk}`,
    );

    return saved;
  }

  // ────────────────────────────────────────────────────────────────────
  // THÀNH VIÊN 3: GIÁM SÁT TEAM MOOD & CAN THIỆP BURNOUT (Bước 3)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách cảnh báo kiệt sức (burnout) chưa được xử lý.
   * JOIN user để lấy fullName, department.
   * Chỉ HR và SUPERADMIN được xem (controller đã guard).
   */
  async getBurnoutAlerts() {
    const alerts = await this.moodRepository.find({
      where: {
        isBurnoutRisk: true,
        isResolved: false,
      },
      relations: ['user', 'user.department'],
      order: { createdAt: 'DESC' },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      userId: alert.userId,
      employeeName: alert.user?.fullName || 'Không xác định',
      departmentName: alert.user?.department?.name || 'Chưa phân phòng',
      mood: alert.mood,
      feedbackText: alert.feedbackText,
      isBurnoutRisk: alert.isBurnoutRisk,
      isResolved: alert.isResolved,
      createdAt: alert.createdAt,
    }));
  }

  /**
   * Manager/HR can thiệp xử lý cảnh báo kiệt sức.
   * Đánh dấu isResolved = true, ghi lại resolvedById + resolvedNote.
   */
  async resolveBurnout(id: number, managerId: number, note?: string) {
    const mood = await this.moodRepository.findOne({
      where: { id },
      relations: ['user', 'user.department'],
    });

    if (!mood) {
      throw new NotFoundException(`Không tìm thấy bản ghi mood #${id}.`);
    }

    if (mood.isResolved) {
      return {
        id: mood.id,
        isResolved: true,
        message: 'Cảnh báo này đã được xử lý trước đó.',
      };
    }

    mood.isResolved = true;
    mood.resolvedById = managerId;
    mood.resolvedNote = note || 'Đã hẹn 1-on-1 gỡ rối với nhân viên.';

    const saved = await this.moodRepository.save(mood);

    this.logger.log(
      `🟢 Burnout resolved: moodId=${id}, resolvedBy=managerId#${managerId}`,
    );

    return {
      id: saved.id,
      userId: saved.userId,
      employeeName: saved.user?.fullName || 'Không xác định',
      isResolved: saved.isResolved,
      resolvedById: saved.resolvedById,
      resolvedNote: saved.resolvedNote,
      message: `✅ Đã can thiệp thành công cho nhân viên ${saved.user?.fullName || '#' + saved.userId}.`,
    };
  }

  /**
   * Lấy mood hôm nay của toàn bộ nhân viên theo từng phòng ban.
   * - Hỗ trợ lọc theo từng ban (departmentId) phù hợp với toàn bộ flow n8n và ATS.
   * - Hỗ trợ cả MANAGER, HR, SUPERADMIN giám sát.
   * - QUY TẮC CHUẨN: Chỉ lấy nhân viên (role = EMPLOYEE), loại bỏ SuperAdmin và chính Manager ra khỏi danh sách cấp dưới.
   * - Tổng hợp cảnh báo sớm nếu có nhân viên check-in Căng thẳng hôm nay.
   */
  async getTeamMood(userId: number, userRole?: UserRole, departmentId?: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    // Lấy tất cả phòng ban hiện có để cung cấp cho bộ lọc (Dropdown Filter)
    const allDepartments = await this.departmentRepository.find({
      order: { name: 'ASC' },
    });

    // Xác định phòng ban mục tiêu:
    // 1. Ưu tiên departmentId được chỉ định qua filter
    // 2. Nếu không có, lấy phòng ban của chính người dùng
    // 3. Nếu người dùng chưa gán phòng ban (như SuperAdmin), lấy phòng ban đầu tiên trong danh sách
    let targetDeptId = departmentId;
    if (!targetDeptId) {
      if (user?.departmentId) {
        targetDeptId = user.departmentId;
      } else if (allDepartments.length > 0) {
        targetDeptId = allDepartments[0].id;
      }
    }

    const currentDept = allDepartments.find((d) => d.id === targetDeptId) || user?.department;
    const departmentName = currentDept?.name || 'Toàn công ty';

    // Lấy danh sách nhân viên thuộc phòng ban mục tiêu:
    // CHỈ lấy nhân viên (role = EMPLOYEE), loại trừ tài khoản đang đăng nhập và các Manager/SuperAdmin
    let teamMembers: User[] = [];
    if (targetDeptId) {
      teamMembers = await this.userRepository.find({
        where: {
          departmentId: targetDeptId,
          role: UserRole.EMPLOYEE,
          isActive: true,
          id: Not(userId),
        },
        order: { fullName: 'ASC' },
      });
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy mood hôm nay của các thành viên trong phòng ban
    const memberIds = teamMembers.map((m) => m.id);
    let todayMoods: EmployeeMood[] = [];

    if (memberIds.length > 0) {
      todayMoods = await this.moodRepository.find({
        where: {
          userId: In(memberIds),
          createdAt: Between(startOfDay, endOfDay),
        },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    }

    // Lấy danh sách nguy cơ kiệt sức (Burnout Risk >= 3 ngày) chưa resolve trong phòng
    let unresolvedBurnouts: EmployeeMood[] = [];
    if (memberIds.length > 0) {
      unresolvedBurnouts = await this.moodRepository.find({
        where: {
          userId: In(memberIds),
          isBurnoutRisk: true,
          isResolved: false,
        },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    }

    // Map mood hôm nay theo userId để tra cứu nhanh
    const moodMap = new Map(todayMoods.map((m) => [m.userId, m]));

    const teamOverview = teamMembers.map((member) => {
      const todayMood = moodMap.get(member.id);
      return {
        userId: member.id,
        fullName: member.fullName,
        jobTitle: member.jobTitle,
        hasCheckedIn: !!todayMood,
        mood: todayMood?.mood || null,
        feedbackText: todayMood?.feedbackText || null,
        isBurnoutRisk: todayMood?.isBurnoutRisk || false,
      };
    });

    // Thống kê nhịp năng lượng
    const checkedInCount = teamOverview.filter((m) => m.hasCheckedIn).length;
    const stressedCount = teamOverview.filter((m) => m.mood === 'STRESSED').length;
    const greatCount = teamOverview.filter((m) => m.mood === 'GREAT').length;
    const normalCount = teamOverview.filter((m) => m.mood === 'NORMAL').length;

    // Danh sách nhân viên check-in Căng thẳng hôm nay (Cảnh báo sớm trong ngày)
    const todayStressed = teamOverview
      .filter((m) => m.mood === 'STRESSED')
      .map((m) => ({
        userId: m.userId,
        employeeName: m.fullName,
        jobTitle: m.jobTitle,
        feedbackText: m.feedbackText,
      }));

    return {
      departmentId: targetDeptId,
      departmentName,
      departments: allDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
      })),
      managerId: userId,
      totalMembers: teamMembers.length,
      checkedInCount,
      stats: {
        great: greatCount,
        normal: normalCount,
        stressed: stressedCount,
      },
      teamOverview,
      burnoutAlerts: unresolvedBurnouts.map((b) => ({
        id: b.id,
        userId: b.userId,
        employeeName: b.user?.fullName || 'Không xác định',
        mood: b.mood,
        feedbackText: b.feedbackText,
        createdAt: b.createdAt,
      })),
      todayStressed,
    };
  }

  /**
   * Lấy danh sách khóa đào tạo (L&D) được gán cho nhân viên.
   * Truy vấn từ bảng employee_trainings kết hợp training_courses.
   */
  async getTrainings(userId: number) {
    // 1. Tự động kiểm tra và liên kết các khóa học bắt buộc (MANDATORY) chưa gán cho nhân viên này
    try {
      const mandatoryCourses = await this.courseRepository.find({
        where: { type: TrainingCourseType.MANDATORY },
      });

      if (mandatoryCourses.length > 0) {
        const existingAssignments = await this.trainingRepository.find({
          where: { userId },
          select: ['courseId'],
        });
        const assignedCourseIds = new Set(existingAssignments.map((a) => a.courseId));

        const unassigned = mandatoryCourses.filter((c) => !assignedCourseIds.has(c.id));
        if (unassigned.length > 0) {
          const newAssignments = unassigned.map((c) =>
            this.trainingRepository.create({
              userId,
              courseId: c.id,
              progressPercent: 0,
              assignedByAi: false,
              status: TrainingStatus.ASSIGNED,
            }),
          );
          await this.trainingRepository.save(newAssignments);
        }
      }
    } catch (err) {
      this.logger.warn(`Không thể tự động đồng bộ khóa học bắt buộc cho user ${userId}: ${(err as Error).message}`);
    }

    // 2. Truy vấn danh sách khóa học thực tế
    const trainings = await this.trainingRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });

    return trainings.map((t) => ({
      id: t.id,
      courseId: t.courseId,
      title: t.course?.title || 'Khóa học đào tạo',
      type: t.course?.type || 'MANDATORY',
      skillsProvided: t.course?.skillsProvided || [],
      courseUrl: t.course?.courseUrl || null,
      durationHours: t.course?.durationHours || 10,
      progressPercent: t.progressPercent,
      status: t.status,
      assignedByAi: t.assignedByAi,
      aiReason: t.aiReason,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Cập nhật tiến độ học tập của nhân viên.
   */
  async updateTrainingProgress(assignmentId: number, userId: number, progressPercent: number) {
    const assignment = await this.trainingRepository.findOne({
      where: { id: assignmentId, userId },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Không tìm thấy thông tin khóa học được gán cho bạn.');
    }

    const validProgress = Math.min(100, Math.max(0, progressPercent));
    assignment.progressPercent = validProgress;
    if (validProgress === 100) {
      assignment.status = TrainingStatus.COMPLETED;
      assignment.completedAt = new Date();
    } else if (validProgress > 0) {
      assignment.status = TrainingStatus.IN_PROGRESS;
      assignment.completedAt = null;
    } else {
      assignment.status = TrainingStatus.ASSIGNED;
      assignment.completedAt = null;
    }

    const saved = await this.trainingRepository.save(assignment);
    this.logger.log(`🎓 Training progress updated: assignmentId=${assignmentId}, userId=${userId}, progress=${validProgress}%`);
    return saved;
  }

  // ────────────────────────────────────────────────────────────────────
  // THÀNH VIÊN 3: TRỢ LÝ SỔ TAY AI COPILOT (Bước 4)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Trợ lý Sổ tay AI Copilot — RAG-based chatbot.
   * Luồng xử lý:
   *   1. Lấy danh sách documents từ DB (sổ tay nhân viên, quy trình nội bộ)
   *   2. Nhúng context documents vào prompt
   *   3. Gọi GeminiService.generateText() để trả lời
   *   4. Nếu Gemini offline → trả fallback message
   */
  async chatWithCopilot(userId: number, message: string) {
    // Lấy thông tin user để personalize response
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    // Lấy documents có sẵn (sổ tay, tài liệu nội bộ) kèm các Chunks nội dung để làm RAG context
    const documents = await this.docRepository.find({
      where: { status: 'READY' as any },
      relations: ['chunks'],
      take: 20,
      order: { createdAt: 'DESC' },
    });

    const docTitles = documents.map((d) => d.title);

    // Thu thập toàn bộ chunks và liên kết thông tin document
    const allChunks: any[] = [];
    for (const doc of documents) {
      if (doc.chunks && doc.chunks.length > 0) {
        for (const chunk of doc.chunks) {
          chunk.document = doc;
          allChunks.push(chunk);
        }
      }
    }

    let sourceDocuments: string[] = [];
    let docContext = '';

    if (allChunks.length > 0) {
      let queryEmbedding: number[] = [];
      try {
        queryEmbedding = await this.vectorService.generateEmbedding(message);
      } catch (err: any) {
        this.logger.warn(`Lỗi tạo embedding câu hỏi Copilot: ${err.message}`);
      }

      // Tìm top 4 chunks sát nhất bằng hybrid search (vector cosine + BM25 keyword matching)
      const relevantResults = this.vectorService.findSimilar(
        queryEmbedding,
        allChunks,
        4,
        0.05,
        message,
      );

      if (relevantResults.length > 0) {
        const foundDocTitles = new Set<string>();
        relevantResults.forEach((r) => {
          if (r.chunk?.document?.title) {
            foundDocTitles.add(r.chunk.document.title);
          }
        });
        sourceDocuments = Array.from(foundDocTitles);

        docContext = relevantResults
          .map(
            (r, idx) =>
              `=== [TRÍCH ĐOẠN ${idx + 1} - NGUỒN: ${r.chunk?.document?.title || 'Tài liệu nội bộ'} (Độ khớp: ${Math.round(r.similarity * 100)}%)] ===\n${r.chunk.content}`,
          )
          .join('\n\n------------------------------------\n\n');
      }
    }

    // Fallback nếu không có chunk nào khớp tiêu chí tìm kiếm
    if (!docContext && documents.length > 0) {
      sourceDocuments = docTitles.slice(0, 3);
      docContext = documents
        .slice(0, 3)
        .map((d) => {
          const chunksText = (d.chunks || [])
            .slice(0, 2)
            .map((c) => c.content)
            .join('\n\n');
          return `=== [TÀI LIỆU NỘI BỘ: ${d.title}] ===\n${chunksText}`;
        })
        .join('\n\n------------------------------------\n\n');
    }

    // Kiểm tra Gemini có sẵn sàng không
    if (!this.geminiService.isAvailable()) {
      this.logger.warn('Gemini AI chưa cấu hình — trả fallback cho chatWithCopilot.');
      return {
        userId,
        reply: this.getFallbackReply(message),
        sourceDocuments: sourceDocuments.length > 0 ? sourceDocuments : docTitles.slice(0, 3),
        toolActionExecuted: null,
      };
    }

    // Xây dựng prompt RAG với system instruction chuyên sâu
    const systemInstruction = `Bạn là Trợ lý Sổ tay Nhân viên AI (HR Copilot) chính thức của công ty Enterprise HR Tech Corporation.
Nhiệm vụ: Trả lời chính xác, tận tình, đầy đủ và thân thiện các câu hỏi của nhân viên về quy trình nội bộ, chính sách thử việc, ngày phép, giờ giấc làm việc, chế độ đãi ngộ, bảo hiểm, thiết bị, và văn hóa công ty.
Nguyên tắc trả lời:
1. Sử dụng trực tiếp thông tin từ các tài liệu nội bộ và quy chế công ty được cung cấp dưới đây để trả lời câu hỏi một cách chi tiết, cụ thể (nêu rõ số ngày phép, con số %, khung giờ, quyền lợi, thiết bị, quy trình đánh giá, v.v.).
2. Tuyệt đối KHÔNG đùn đẩy hoặc trả lời qua loa bảo nhân viên "liên hệ phòng HR" khi thông tin đã có trong quy chế. Hãy giải thích cặn kẽ và giải đáp thoả đáng trước; chỉ gợi ý liên hệ HR khi nhân viên cần làm thủ tục giấy tờ nộp đơn hoặc trường hợp đặc biệt ngoài quy chế.
3. Luôn xưng hô thân thiện, lịch sự bằng tiếng Việt ("Chào bạn [Tên]", "Chúc bạn làm việc hiệu quả").
4. Định dạng câu trả lời rõ ràng bằng gạch đầu dòng Markdown dễ đọc.`;

    const prompt = `THÔNG TIN NHÂN SỰ ĐANG HỎI:
- Họ và tên: ${user?.fullName || 'Nhân viên'}
- Vị trí công tác: ${user?.jobTitle || 'Nhân sự mới'}
- Phòng ban: ${user?.department?.name || 'N/A'}

CƠ SỞ TRI THỨC VÀ QUY CHẾ CÔNG TY ĐÃ ĐƯỢC PHÊ DUYỆT (KNOWLEDGE BASE):
${docContext}

CÂU HỎI CỦA NHÂN VIÊN:
"${message}"

Hãy dựa vào quy chế nội bộ trên để giải thích và trả lời cặn kẽ, cụ thể cho bạn ${user?.fullName || 'Nhân sự'}.`;

    try {
      let reply = await this.geminiService.generateText(prompt, systemInstruction);

      if (!reply || reply.trim().length === 0 || reply.includes('sự cố kết nối')) {
        reply = `Chào bạn ${user?.fullName || 'Nhân sự'},\n\nDựa trên các quy chế và tài liệu nội bộ đã được phê duyệt (${sourceDocuments.join(', ')}):\n\n${docContext}`;
      }

      this.logger.log(`🤖 AI Copilot: userId=${userId}, question="${message.substring(0, 50)}...", gemini=OK, sources=${sourceDocuments.join(', ')}`);

      return {
        userId,
        reply,
        sourceDocuments: sourceDocuments.length > 0 ? sourceDocuments : docTitles.slice(0, 3),
        toolActionExecuted: null,
      };
    } catch (error: any) {
      this.logger.error(`AI Copilot error: ${error.message}`);
      return {
        userId,
        reply: docContext
          ? `Chào bạn ${user?.fullName || 'Nhân sự'},\n\nDựa trên các quy chế nội bộ (${sourceDocuments.join(', ')}):\n\n${docContext}`
          : 'Xin lỗi, trợ lý AI đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ phòng HR.',
        sourceDocuments: sourceDocuments.length > 0 ? sourceDocuments : docTitles.slice(0, 3),
        toolActionExecuted: null,
      };
    }
  }

  /**
   * Fallback reply khi Gemini AI không khả dụng.
   * Trả lời dựa trên keyword matching đơn giản.
   */
  private getFallbackReply(message: string): string {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('nghỉ phép') || lowerMsg.includes('ngày phép')) {
      return '📅 Theo chính sách công ty, nhân viên chính thức được hưởng 12 ngày phép năm. Nhân viên thử việc được hưởng 1 ngày/tháng. Vui lòng liên hệ HR để biết thêm chi tiết.';
    }
    if (lowerMsg.includes('lương') || lowerMsg.includes('thanh toán')) {
      return '💰 Lương được thanh toán vào ngày 5 hàng tháng qua tài khoản ngân hàng đã đăng ký. Nếu có thắc mắc về bảng lương, vui lòng liên hệ phòng HR.';
    }
    if (lowerMsg.includes('bảo hiểm')) {
      return '🏥 Công ty đóng đầy đủ BHXH, BHYT, BHTN cho nhân viên theo quy định pháp luật. Ngoài ra có gói bảo hiểm sức khỏe bổ sung. Liên hệ HR để biết thêm.';
    }
    if (lowerMsg.includes('onboarding') || lowerMsg.includes('thử việc')) {
      return '🚀 Giai đoạn thử việc kéo dài 60 ngày. Hãy hoàn thành checklist onboarding trong tab "Lộ trình 30 ngày" để được đánh giá tốt nhất!';
    }
    if (lowerMsg.includes('wifi') || lowerMsg.includes('wi-fi') || lowerMsg.includes('mạng') || lowerMsg.includes('password') || lowerMsg.includes('mật khẩu')) {
      return '📶 Thông tin WiFi văn phòng: Tên mạng "Company-Wifi", mật khẩu liên hệ IT Support. Nếu cần hỗ trợ kỹ thuật, gửi ticket qua hệ thống IT Helpdesk.';
    }

    return '🤖 Cảm ơn bạn đã hỏi! Hiện tại trợ lý AI đang ở chế độ offline. Vui lòng liên hệ phòng HR (hr@company.com) hoặc hỏi lại khi Gemini AI được kích hoạt.';
  }

  // ────────────────────────────────────────────────────────────────────
  // SEED DATA: ONBOARDING TASKS MẪU (10 nhiệm vụ onboarding)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Tạo 10 nhiệm vụ onboarding mẫu cho userId chỉ định.
   * Chỉ seed khi chưa có task nào cho user đó.
   */
  async seedOnboardingTasks(userId: number) {
    const existingCount = await this.taskRepository.count({ where: { userId } });
    if (existingCount > 0) {
      return {
        message: `User #${userId} đã có ${existingCount} nhiệm vụ onboarding, không cần seed lại.`,
        seeded: false,
      };
    }

    const sampleTasks = [
      {
        userId,
        title: 'Ký hợp đồng lao động & NDA',
        description: 'Hoàn tất ký kết hợp đồng lao động thử việc và thỏa thuận bảo mật thông tin (NDA) với phòng HR.',
        category: 'PAPERWORK' as any,
        dueDay: 1,
      },
      {
        userId,
        title: 'Nộp hồ sơ nhân sự đầy đủ',
        description: 'Nộp CMND/CCCD, bằng cấp, sơ yếu lý lịch, ảnh 3x4, giấy khám sức khỏe cho phòng HR.',
        category: 'PAPERWORK' as any,
        dueDay: 2,
      },
      {
        userId,
        title: 'Nhận laptop & thiết bị làm việc',
        description: 'Liên hệ phòng IT để nhận laptop, chuột, bàn phím, tai nghe và badge ra vào văn phòng.',
        category: 'EQUIPMENT' as any,
        dueDay: 1,
      },
      {
        userId,
        title: 'Cài đặt môi trường làm việc',
        description: 'Cài đặt các phần mềm cần thiết: IDE, Git, Docker, Slack, Google Workspace, VPN công ty.',
        category: 'EQUIPMENT' as any,
        dueDay: 3,
      },
      {
        userId,
        title: 'Hoàn thành khóa học Văn hóa Công ty',
        description: 'Xem video giới thiệu văn hóa, giá trị cốt lõi, quy tắc ứng xử và chính sách nội bộ công ty.',
        category: 'TRAINING' as any,
        dueDay: 5,
      },
      {
        userId,
        title: 'Hoàn thành khóa An toàn Thông tin',
        description: 'Tham gia khóa đào tạo bắt buộc về bảo mật thông tin, phishing awareness và password policy.',
        category: 'TRAINING' as any,
        dueDay: 7,
      },
      {
        userId,
        title: 'Gặp gỡ Trưởng phòng (1-on-1)',
        description: 'Buổi họp 1-on-1 với Trưởng phòng để trao đổi về kỳ vọng, OKRs, và lộ trình phát triển.',
        category: 'MEETING' as any,
        dueDay: 3,
      },
      {
        userId,
        title: 'Tham dự buổi Welcome Lunch Team',
        description: 'Tham gia bữa trưa chào mừng với toàn bộ team để làm quen và xây dựng kết nối.',
        category: 'MEETING' as any,
        dueDay: 5,
      },
      {
        userId,
        title: 'Hoàn thành dự án thử thách tuần 2',
        description: 'Thực hiện mini-project được giao trong tuần 2 để đánh giá năng lực kỹ thuật ban đầu.',
        category: 'TRAINING' as any,
        dueDay: 14,
      },
      {
        userId,
        title: 'Buổi đánh giá giữa kỳ thử việc',
        description: 'Tham gia buổi review giữa kỳ thử việc (ngày 30) với Manager và HR để nhận feedback.',
        category: 'MEETING' as any,
        dueDay: 30,
      },
    ];

    const tasks = sampleTasks.map((t) => this.taskRepository.create(t));
    await this.taskRepository.save(tasks);

    this.logger.log(`🌱 Seeded ${tasks.length} onboarding tasks for userId=${userId}`);

    return {
      message: `Đã tạo ${tasks.length} nhiệm vụ onboarding mẫu cho user #${userId}.`,
      seeded: true,
      count: tasks.length,
    };
  }
}
