const mysql = require('mysql2/promise');

// TV4 only. Retain the user FK's supporting index before changing the composite
// index's nullable course column; MySQL otherwise rejects TypeORM's index rebuild.
async function migrateTrainingHistory(connection) {
  const [columns] = await connection.query(
    'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['employee_trainings'],
  );
  if (columns.length === 0) return { existingTable: false };
  const courseColumn = columns.find(column => column.COLUMN_NAME === 'course_id');
  if (!courseColumn || !/^int(?:\(\d+\))?(?: unsigned)?$/i.test(courseColumn.COLUMN_TYPE)) {
    throw Error('Unexpected TV4 course_id schema; no migration applied.');
  }
  const [indexes] = await connection.query(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    ['employee_trainings', 'IDX_tv4_training_user_id'],
  );
  if (indexes.length === 0) {
    await connection.query('CREATE INDEX IDX_tv4_training_user_id ON employee_trainings (user_id)');
  }
  if (!columns.some(column => column.COLUMN_NAME === 'course_snapshot')) {
    await connection.query('ALTER TABLE employee_trainings ADD COLUMN course_snapshot JSON NULL');
  }
  if (!columns.some(column => column.COLUMN_NAME === 'course_deleted_at')) {
    await connection.query('ALTER TABLE employee_trainings ADD COLUMN course_deleted_at DATETIME NULL');
  }
  const [foreignKeys] = await connection.query(
    `SELECT k.CONSTRAINT_NAME, r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
     WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ? AND k.COLUMN_NAME = ? AND k.REFERENCED_TABLE_NAME = ?`,
    ['employee_trainings', 'course_id', 'training_courses'],
  );
  if (courseColumn.IS_NULLABLE !== 'YES' || foreignKeys.length !== 1 || foreignKeys[0].DELETE_RULE !== 'SET NULL') {
    for (const key of foreignKeys) {
      const name = '`' + key.CONSTRAINT_NAME.replace(/`/g, '``') + '`';
      await connection.query('ALTER TABLE employee_trainings DROP FOREIGN KEY ' + name);
    }
    if (courseColumn.IS_NULLABLE !== 'YES') {
      await connection.query('ALTER TABLE employee_trainings MODIFY COLUMN course_id ' + courseColumn.COLUMN_TYPE + ' NULL');
    }
    await connection.query('ALTER TABLE employee_trainings ADD CONSTRAINT FK_tv4_training_course FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE SET NULL ON UPDATE NO ACTION');
  }
  return { existingTable: true, historyRetentionReady: true };
}

module.exports = { migrateTrainingHistory };

if (require.main === module) {
  const fs = require('node:fs');
  const path = require('node:path');
  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? require('dotenv').parse(fs.readFileSync(envPath)) : {};
  const config = key => process.env[key] ?? env[key];
  (async () => {
    const connection = await mysql.createConnection({
      host: config('DB_HOST') || '127.0.0.1', port: Number(config('DB_PORT') || 3307),
      user: config('DB_USERNAME') || 'hr_user', password: config('DB_PASSWORD'),
      database: config('DB_DATABASE') || 'hr_enterprise_db',
    });
    try { console.log(JSON.stringify(await migrateTrainingHistory(connection))); }
    finally { await connection.end(); }
  })().catch(error => {
    console.error('TV4 history migration failed:', error.code || error.name);
    process.exitCode = 1;
  });
}
