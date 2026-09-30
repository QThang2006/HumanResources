import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingTask } from '../../entities/onboarding-task.entity';
import { EmployeeMood, MoodType } from '../../entities/employee-mood.entity';
import { Document } from '../../entities/document.entity';
import { EmployeeTraining } from '../../entities/employee-training.entity';
import { GeminiService } from '../core/ai/gemini.service';
import { N8nService } from '../core/automation/n8n.service';

/**
 * 📌 PHÂN HỆ ONBOARDING, COPILOT RAG & TEAM MOOD
 * Phân công:
 * - Thành viên 4: Checklist thử việc 30 ngày, Khóa học L&D, Trợ lý AI Copilot RAG (Sprint 4)
 * - Thành viên 3: Check-in cảm xúc hàng ngày, Giám sát Team Mood & Can thiệp Burnout 1-on-1 (Sprint 3 & 4)
 */
@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingTask)
    private readonly taskRepository: Repository<OnboardingTask>,
    @InjectRepository(EmployeeMood)
    private readonly moodRepository: Repository<EmployeeMood>,
    @InjectRepository(Document)
    private readonly docRepository: Repository<Document>,
    @InjectRepository(EmployeeTraining)
    private readonly trainingRepository: Repository<EmployeeTraining>,
    private readonly geminiService: GeminiService,
    private readonly n8nService: N8nService,
  ) {}

  // TODO: Thành viên 4 sẽ hoàn thiện truy vấn checklist 30 ngày của nhân viên
  async getTasks(userId: number) {
    const tasks = await this.taskRepository.find({
      where: { userId },
      order: { dueDay: 'ASC' },
    });
    return {
      userId,
      progressPercent: 0,
      tasks,
      message: 'Khung sườn đã sẵn sàng. Thành viên 4 sẽ hoàn thiện logic gán task tại đây.',
    };
  }

  // TODO: Thành viên 4 sẽ hoàn thiện toggle hoàn thành nhiệm vụ
  async toggleTask(taskId: number, userId: number) {
    return {
      taskId,
      userId,
      message: 'Khung sườn đã sẵn sàng. Thành viên 4 sẽ hoàn thiện toggle task tại đây.',
    };
  }

  // TODO: Thành viên 3 & 4 sẽ hoàn thiện check-in cảm xúc & gọi this.n8nService.triggerBurnoutAlert nếu stress
  async recordMood(userId: number, mood: MoodType, feedbackText?: string) {
    return {
      userId,
      mood,
      feedbackText,
      message: 'Khung sườn đã sẵn sàng. Thành viên 3 & 4 sẽ hoàn thiện ghi nhận cảm xúc tại đây.',
    };
  }

  // TODO: Thành viên 3 & HR sẽ hoàn thiện danh sách cảnh báo kiệt sức
  async getBurnoutAlerts() {
    return [];
  }

  // TODO: Thành viên 3 sẽ hoàn thiện API can thiệp 1-on-1 đóng cảnh báo kiệt sức
  async resolveBurnout(id: number, managerId: number, note?: string) {
    return {
      id,
      managerId,
      note,
      isResolved: true,
      message: 'Khung sườn đã sẵn sàng. Thành viên 3 sẽ hoàn thiện đóng cảnh báo burnout tại đây.',
    };
  }

  // TODO: Thành viên 4 sẽ hoàn thiện truy vấn khóa đào tạo AI chỉ định
  async getTrainings(userId: number) {
    return [];
  }

  // TODO: Thành viên 4 sẽ gọi this.geminiService.generateText(...) để làm Trợ lý Sổ tay RAG
  async chatWithCopilot(userId: number, message: string) {
    return {
      userId,
      reply: `[Khung Sườn AI Copilot] Đã nhận: "${message}". (Gemini Status: ${this.geminiService.isAvailable() ? 'ONLINE' : 'OFFLINE'}). Thành viên 4 sẽ hoàn thiện prompt RAG tại đây.`,
      sourceDocuments: [],
      toolActionExecuted: null,
    };
  }
}
