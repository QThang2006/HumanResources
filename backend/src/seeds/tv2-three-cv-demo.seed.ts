import { DataSource } from 'typeorm';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { Department } from '../entities/department.entity';
import { Job, JobStatus } from '../entities/job.entity';
import { User, UserRole } from '../entities/user.entity';
import { CvStorageService } from '../modules/applications/cv-storage.service';
import { DemoJobSpec } from './recruitment-demo.catalog';
import { demoCv } from './recruitment-demo.pdf';

export const TV2_THREE_CV_JOB_TITLE = '[TV2 DEMO] Backend Developer - 3 CV ứng tuyển';

const candidates = [
  {
    name: 'Nguyễn Minh An (demo)',
    email: 'tv2.threecv.an@example.test',
    years: 4,
    skills: ['TypeScript', 'NestJS', 'MySQL', 'REST API', 'JWT', 'Docker'],
    project: 'HR recruitment REST API with private CV storage and automated tests',
  },
  {
    name: 'Trần Hoàng Bình (demo)',
    email: 'tv2.threecv.binh@example.test',
    years: 2,
    skills: ['JavaScript', 'Node.js', 'Express', 'MySQL', 'Git'],
    project: 'Inventory management API with MySQL and role-based permissions',
  },
  {
    name: 'Lê Thu Chi (demo)',
    email: 'tv2.threecv.chi@example.test',
    years: 1,
    skills: ['React', 'HTML', 'CSS', 'JavaScript', 'Git'],
    project: 'Responsive careers portal with job filters and application forms',
  },
] as const;

const cvJob: DemoJobSpec = {
  key: 'tv2-three-cv',
  title: 'Backend Developer - TV2 demo',
  location: 'Đà Nẵng',
  salary: '20 - 35 triệu VND',
  summary: 'Synthetic job used for the TV2 ATS demonstration.',
  responsibilities: ['Build REST APIs', 'Design MySQL schemas', 'Write automated tests'],
  requirements: ['TypeScript', 'NestJS', 'MySQL'],
  skills: ['TypeScript', 'NestJS', 'MySQL', 'REST API'],
  project: 'A synthetic recruitment project used for the TV2 ATS demonstration',
};

export interface Tv2ThreeCvSeedOptions {
  creatorId?: number;
  departmentId?: number;
  dryRun?: boolean;
}

export async function seedTv2ThreeCvDemo(
  db: DataSource,
  options: Tv2ThreeCvSeedOptions = {},
  storage = new CvStorageService(),
) {
  const users = db.getRepository(User);
  const departments = db.getRepository(Department);
  const jobs = db.getRepository(Job);
  const applications = db.getRepository(Application);

  const creator = options.creatorId
    ? await users.findOneBy({ id: options.creatorId, role: UserRole.HR, isActive: true })
    : await users.findOne({ where: { role: UserRole.HR, isActive: true }, order: { id: 'ASC' } });
  if (!creator) throw new Error('Không tìm thấy tài khoản HR đang hoạt động để tạo job demo.');

  const department = options.departmentId
    ? await departments.findOneBy({ id: options.departmentId })
    : await departments.findOne({ order: { id: 'ASC' } });
  if (!department) throw new Error('Không tìm thấy phòng ban để tạo job demo.');

  const existingJob = await jobs.findOneBy({ title: TV2_THREE_CV_JOB_TITLE });
  const report = {
    mode: options.dryRun ? 'DRY_RUN' : 'APPLY',
    job: { id: existingJob?.id ?? null, created: false },
    applications: { created: 0, existing: 0, cvs: 0 },
  };

  if (options.dryRun) {
    report.job.created = !existingJob;
    if (existingJob) {
      for (const candidate of candidates) {
        if (await applications.findOneBy({ jobId: existingJob.id, candidateEmail: candidate.email }))
          report.applications.existing++;
        else report.applications.created++;
      }
    } else {
      report.applications.created = candidates.length;
    }
    return report;
  }

  const job =
    existingJob ||
    (await jobs.save(
      jobs.create({
        departmentId: department.id,
        createdBy: creator.id,
        title: TV2_THREE_CV_JOB_TITLE,
        location: 'Đà Nẵng',
        salaryRange: '20 - 35 triệu VND',
        description:
          'Phát triển REST API cho hệ thống quản lý nhân sự. Thiết kế database MySQL, tích hợp webhook và viết kiểm thử. Dữ liệu mẫu TV2 để demo tuyển dụng.',
        requirements:
          'Từ 2 năm kinh nghiệm TypeScript, Node.js và NestJS. Thành thạo MySQL, REST API, JWT và Git. Biết Docker và kiểm thử API.',
        status: JobStatus.OPEN,
      }),
    ));
  report.job.id = job.id;
  report.job.created = !existingJob;

  for (const candidate of candidates) {
    const exists = await applications.findOneBy({ jobId: job.id, candidateEmail: candidate.email });
    if (exists) {
      report.applications.existing++;
      continue;
    }
    const cv = demoCv(candidate.name, candidate.email, cvJob, candidate.years);
    const cvFileUrl = await storage.save({
      buffer: cv.buffer,
      originalname: candidate.email.replace(/[^a-z0-9]+/gi, '-') + '.pdf',
      mimetype: 'application/pdf',
      size: cv.buffer.length,
    } as Express.Multer.File);
    try {
      await applications.save(
        applications.create({
          jobId: job.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          candidatePhone: null,
          cvFileUrl,
          rawCvText: cv.rawText,
          status: ApplicationStatus.APPLIED,
        }),
      );
      report.applications.created++;
      report.applications.cvs++;
    } catch (error) {
      await storage.remove(cvFileUrl);
      throw error;
    }
  }
  return report;
}
