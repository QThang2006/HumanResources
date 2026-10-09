import { createHash } from 'crypto';
import { DataSource, In, Like } from 'typeorm';
import { Application, ApplicationStatus, AiRecommendation } from '../entities/application.entity';
import { Department } from '../entities/department.entity';
import { Interview, InterviewResult } from '../entities/interview.entity';
import { Job, JobStatus } from '../entities/job.entity';
import { User, UserRole } from '../entities/user.entity';
import { CvStorageService } from '../modules/applications/cv-storage.service';
import {
  DEMO_EMAIL_PREFIX,
  DEMO_JOBS,
  DEMO_MARKER,
  demoCandidateName,
  demoDescription,
  DemoJobSpec,
} from './recruitment-demo.catalog';
import { demoCv } from './recruitment-demo.pdf';

const DAY = 86_400_000;
export interface DemoSeedOptions {
  creatorId?: number;
  managerId?: number;
  departmentId?: number;
  now?: Date;
  dryRun?: boolean;
}
export class DemoSeedError extends Error {}

function saigonDay(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new DemoSeedError('Thời điểm demo không hợp lệ.');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+07:00`).getTime();
}
function questions(job: DemoJobSpec) {
  return [
    `${DEMO_MARKER} Bạn đã sử dụng ${job.skills[0]} trong dự án nào? Hãy mô tả một quyết định kỹ thuật và cách kiểm chứng kết quả.`,
    `Khi một tính năng liên quan ${job.skills[1]} gặp lỗi, bạn sẽ thu thập bằng chứng và xác định nguyên nhân như thế nào?`,
    'Bạn sẽ phối hợp với Product, Developer và QA ra sao khi yêu cầu thay đổi sát thời điểm bàn giao?',
    `Bạn sẽ kiểm thử và theo dõi chất lượng của dự án "${job.project}" như thế nào?`,
  ];
}

/** Inserts only TV2 recruitment rows and generated private CVs. Never invokes AI or automation. */
export async function seedRecruitmentDemo(
  db: DataSource,
  options: DemoSeedOptions = {},
  files = new CvStorageService(),
) {
  for (const value of [options.creatorId, options.managerId, options.departmentId]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
      throw new DemoSeedError('ID cấu hình seed phải là số nguyên dương.');
  }
  const anchor = saigonDay(options.now || new Date());
  const query = db.createQueryRunner();
  const lockName =
    'tv2-demo-' +
    createHash('sha256').update(String(db.options.database)).digest('hex').slice(0, 32);
  const newFiles: string[] = [];
  let locked = false;
  const report = {
    dataset: 'tv2-recruitment-v1',
    mode: options.dryRun ? 'DRY_RUN' : 'DEMO',
    departmentId: 0,
    creatorId: 0,
    managerId: 0,
    created: { jobs: 0, applications: 0, interviews: 0, cvs: 0 },
    existing: { jobs: 0, applications: 0 },
    jobs: [] as { id: number | null; title: string; candidates: number }[],
  };
  await query.connect();
  try {
    const [lock] = await query.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
    if (Number(lock.acquired) !== 1)
      throw new DemoSeedError('Một lượt seed TV2 khác đang chạy. Hãy thử lại sau.');
    locked = true;
    await query.startTransaction();
    const users = query.manager.getRepository(User);
    const creator = await users.findOne({
      where: {
        ...(options.creatorId ? { id: options.creatorId } : {}),
        isActive: true,
        role: In([UserRole.HR, UserRole.SUPERADMIN]),
      },
      order: { id: 'ASC' },
    });
    if (!creator)
      throw new DemoSeedError(
        'Cần một tài khoản HR hoặc SUPERADMIN đang hoạt động. Seed TV2 không tạo hoặc sửa tài khoản.',
      );
    const manager = await users.findOne({
      where: {
        ...(options.managerId ? { id: options.managerId } : {}),
        ...(options.departmentId ? { departmentId: options.departmentId } : {}),
        isActive: true,
        role: UserRole.MANAGER,
      },
      order: { id: 'ASC' },
    });
    if (!manager?.departmentId)
      throw new DemoSeedError('Cần Manager đang hoạt động thuộc phòng ban được chọn.');
    const department = await query.manager
      .getRepository(Department)
      .findOneBy({ id: manager.departmentId });
    if (!department) throw new DemoSeedError('Phòng ban của Manager không tồn tại.');
    Object.assign(report, {
      departmentId: department.id,
      creatorId: creator.id,
      managerId: manager.id,
    });
    const jobs = query.manager.getRepository(Job);
    const applications = query.manager.getRepository(Application);
    const interviews = query.manager.getRepository(Interview);
    const owned = await jobs.find({
      where: { description: Like('%[TV2-SEED:%') },
      order: { id: 'ASC' },
    });
    // Preflight all ownership collisions before making any row/file changes.
    for (const spec of DEMO_JOBS) {
      const matches = owned.filter((job) => job.description.includes(`[TV2-SEED:${spec.key}]`));
      if (matches.length > 1 || matches.some((job) => job.departmentId !== department.id))
        throw new DemoSeedError(
          'Bộ demo hiện có trùng mã hoặc thuộc phòng ban khác. Không thay đổi dữ liệu.',
        );
    }
    let nameIndex = 0;
    for (const [jobIndex, spec] of DEMO_JOBS.entries()) {
      const candidateCount = jobIndex === 0 ? 42 : 6;
      let job = owned.find((row) => row.description.includes(`[TV2-SEED:${spec.key}]`));
      if (job) report.existing.jobs++;
      else {
        report.created.jobs++;
        const createdAt = new Date(anchor - (33 + jobIndex) * DAY);
        const values = {
          departmentId: department.id,
          createdBy: creator.id,
          title: spec.title,
          location: spec.location,
          salaryRange: spec.salary,
          description: demoDescription(spec),
          requirements: spec.requirements.map((s) => '- ' + s).join('\n'),
          status: spec.closed ? JobStatus.CLOSED : JobStatus.OPEN,
          createdAt,
          updatedAt: createdAt,
        };
        if (!options.dryRun) job = await jobs.save(jobs.create(values));
      }
      report.jobs.push({
        id: job?.id || null,
        title: job?.title || spec.title,
        candidates: candidateCount,
      });
      for (let slot = 0; slot < candidateCount; slot++, nameIndex++) {
        const email = `${DEMO_EMAIL_PREFIX}${spec.key}.${String(slot + 1).padStart(3, '0')}@example.test`;
        const phase = slot % 6;
        const countRounds = phase === 3 ? 2 : phase >= 2 ? 1 : 0;
        if (job && (await applications.findOneBy({ jobId: job.id, candidateEmail: email }))) {
          report.existing.applications++;
          continue;
        }
        report.created.applications++;
        report.created.cvs++;
        report.created.interviews += countRounds;
        if (options.dryRun) continue;
        const name = demoCandidateName(nameIndex);
        const status = [
          ApplicationStatus.APPLIED,
          ApplicationStatus.APPLIED,
          ApplicationStatus.INTERVIEWING,
          ApplicationStatus.INTERVIEWING,
          ApplicationStatus.OFFERED,
          ApplicationStatus.REJECTED,
        ][phase];
        const matchScore =
          phase === 0
            ? null
            : phase === 1
              ? 60 + (slot % 14)
              : phase === 5
                ? 42 + (slot % 15)
                : phase === 4
                  ? 89 + (slot % 9)
                  : 75 + (slot % 15);
        const cv = demoCv(name, email, spec, 1 + (nameIndex % 7));
        const key = await files.save({ buffer: cv.buffer } as Express.Multer.File);
        newFiles.push(key);
        const createdAt = new Date(
          (job.createdAt?.getTime() || anchor - 33 * DAY) +
            (1 + (slot % 16)) * DAY +
            (slot % 8) * 3_600_000,
        );
        const app = await applications.save(
          applications.create({
            jobId: job.id,
            candidateName: name,
            candidateEmail: email,
            candidatePhone: null,
            cvFileUrl: key,
            rawCvText: cv.rawText,
            status,
            hiredUserId: null,
            matchScore,
            skillsDetected:
              phase === 0 ? null : spec.skills.slice(0, phase === 1 || phase === 5 ? 3 : 5),
            aiSummary:
              matchScore === null
                ? null
                : `${DEMO_MARKER} Đánh giá mẫu mô phỏng, không phải kết quả AI LIVE. ${phase === 5 ? 'Kinh nghiệm chưa đáp ứng cấp bậc; cần bổ sung bằng chứng thực hành và cách kiểm thử.' : phase === 4 ? 'Kinh nghiệm và kỹ năng phù hợp; trình bày rõ quyết định kỹ thuật, có ví dụ về kiểm thử và phối hợp đội nhóm.' : 'Có nền tảng phù hợp; cần trao đổi thêm về chiều sâu kỹ thuật, xử lý lỗi và khả năng bàn giao công việc.'}`,
            aiRecommendation:
              matchScore === null
                ? null
                : matchScore >= 90
                  ? AiRecommendation.STRONG_HIRE
                  : matchScore >= 80
                    ? AiRecommendation.HIRE
                    : matchScore >= 60
                      ? AiRecommendation.CONSIDER
                      : AiRecommendation.REJECT,
            createdAt,
            updatedAt: new Date(anchor - DAY),
          }),
        );
        for (let round = 1; round <= countRounds; round++) {
          const pending = status === ApplicationStatus.INTERVIEWING && round === countRounds;
          let scheduledAt: Date;
          const hours = [9, 10.5, 14, 15.5];
          if (pending) {
            // Stable slots also survive a partial rerun without overlapping another demo round.
            const ordinal = Math.floor(nameIndex / 6) * 2 + phase - 2;
            scheduledAt = new Date(
              anchor + (1 + Math.floor(ordinal / 4)) * DAY + hours[ordinal % 4] * 3_600_000,
            );
          } else {
            const ordinal = Math.floor(nameIndex / 6) * 3 + phase - 3;
            scheduledAt = new Date(
              anchor - (15 - Math.floor(ordinal / 4)) * DAY + hours[ordinal % 4] * 3_600_000,
            );
          }
          const failed = status === ApplicationStatus.REJECTED;
          await interviews.save(
            interviews.create({
              applicationId: app.id,
              interviewerId: manager.id,
              round,
              scheduledAt,
              meetingLink: null,
              googleCalendarEventId: null,
              aiSuggestedQuestions: questions(spec),
              score: pending ? null : failed ? 52 + (slot % 10) : 82 + (slot % 14),
              result: pending
                ? InterviewResult.PENDING
                : failed
                  ? InterviewResult.FAILED
                  : InterviewResult.PASSED,
              interviewerFeedback: pending
                ? null
                : `${DEMO_MARKER} Nhận xét mẫu. ${failed ? 'Chưa giải thích được cách kiểm tra các trường hợp lỗi; cần củng cố kiến thức và ví dụ dự án.' : 'Trình bày dự án rõ ràng, biết phân tích yêu cầu và kiểm tra các trường hợp biên. Phối hợp tốt với Product và QA.'}`,
              createdAt,
              updatedAt: new Date(anchor - DAY),
            }),
          );
        }
      }
    }
    await query.commitTransaction();
    return report;
  } catch (error) {
    if (query.isTransactionActive) await query.rollbackTransaction();
    await Promise.all(newFiles.map((key) => files.remove(key)));
    throw error;
  } finally {
    try {
      if (locked) await query.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } finally {
      await query.release();
    }
  }
}
