import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as entities from '../entities';
import { seedTv2ThreeCvDemo } from './tv2-three-cv-demo.seed';

async function main() {
  await ConfigModule.forRoot({ envFilePath: resolve(__dirname, '../../.env') });
  const config = new ConfigService();
  process.env.ATS_UPLOAD_DIR = resolve(
    __dirname,
    '../..',
    config.get('ATS_UPLOAD_DIR', '.ats-private/cv'),
  );
  const options: { creatorId?: number; departmentId?: number; dryRun?: boolean } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const match = arg.match(/^--(creator-id|department-id)=([1-9]\d*)$/);
    if (!match) throw new Error('Dùng --dry-run, --creator-id=N hoặc --department-id=N.');
    options[match[1] === 'creator-id' ? 'creatorId' : 'departmentId'] = Number(match[2]);
  }
  if (config.get('NODE_ENV') === 'production')
    throw new Error('Seed demo chỉ được phép chạy ở môi trường development/test.');
  const db = new DataSource({
    type: 'mysql',
    host: config.get('DB_HOST', 'localhost'),
    port: Number(config.get('DB_PORT', 3306)),
    username: config.get('DB_USERNAME', 'root'),
    password: config.get('DB_PASSWORD', 'rootpassword'),
    database: config.get('DB_DATABASE', 'hr_enterprise_db'),
    entities: Object.values(entities).filter((value) => typeof value === 'function'),
    synchronize: false,
    logging: false,
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
  });
  try {
    await db.initialize();
    console.log(JSON.stringify(await seedTv2ThreeCvDemo(db, options), null, 2));
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}

main().catch((error) => {
  console.error(error.message || 'Không seed được dữ liệu demo TV2.');
  process.exitCode = 1;
});
