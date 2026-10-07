import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as entities from '../entities';
import { DemoSeedError, DemoSeedOptions, seedRecruitmentDemo } from './recruitment-demo.seed';

async function main() {
  await ConfigModule.forRoot({ envFilePath: resolve(__dirname, '../../.env') });
  const config = new ConfigService();
  // Match backend uploads even if this CLI is launched from a different directory.
  process.env.ATS_UPLOAD_DIR = resolve(__dirname, '../..', config.get('ATS_UPLOAD_DIR', '.ats-private/cv'));
  const options: DemoSeedOptions = {};
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    const match = arg.match(/^--(creator-id|manager-id|department-id)=([1-9]\d*)$/);
    if (!match) throw new DemoSeedError('Dùng --dry-run, --creator-id=N, --manager-id=N hoặc --department-id=N.');
    options[{ 'creator-id': 'creatorId', 'manager-id': 'managerId', 'department-id': 'departmentId' }[match[1]]] = Number(match[2]);
  }
  if (config.get('NODE_ENV') === 'production') throw new DemoSeedError('Seed này dành cho môi trường demo/dev. Không chạy với NODE_ENV=production.');
  const db = new DataSource({
    type: 'mysql', host: config.get('DB_HOST', 'localhost'), port: Number(config.get('DB_PORT', 3306)),
    username: config.get('DB_USERNAME', 'root'), password: config.get('DB_PASSWORD', 'rootpassword'),
    database: config.get('DB_DATABASE', 'hr_enterprise_db'),
    entities: Object.values(entities).filter(value => typeof value === 'function'),
    synchronize: false, logging: false, timezone: 'Z', charset: 'utf8mb4_unicode_ci',
  });
  try {
    await db.initialize();
    console.log(JSON.stringify(await seedRecruitmentDemo(db, options), null, 2));
  } finally { if (db.isInitialized) await db.destroy(); }
}

if (require.main === module) main().catch(error => {
  // Database/provider errors may contain credentials or SQL; print only our own messages.
  const hints: Record<string, string> = {
    ER_ACCESS_DENIED_ERROR: 'MySQL từ chối tài khoản. Kiểm tra DB_USERNAME và DB_PASSWORD trong backend/.env.',
    ECONNREFUSED: 'Không kết nối được MySQL. Kiểm tra DB_HOST, DB_PORT và dịch vụ database.',
    ER_BAD_DB_ERROR: 'Database chưa tồn tại. Khởi tạo database của backend trước khi seed.',
    ER_NO_SUCH_TABLE: 'Schema chưa đầy đủ. Khởi tạo schema của backend trước khi seed.',
  };
  console.error(error instanceof DemoSeedError ? error.message : hints[error?.code || error?.driverError?.code] || 'Không seed được dữ liệu TV2. Kiểm tra kết nối MySQL, schema đã khởi tạo và quyền ghi thư mục CV.');
  process.exitCode = 1;
});
