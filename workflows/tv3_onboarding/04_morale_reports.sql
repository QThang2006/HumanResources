-- Bảng lưu lịch sử Morale hằng tuần cho WF-04 (chạy 1 lần trên hr_enterprise_db)
CREATE TABLE IF NOT EXISTS morale_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_start DATE NOT NULL,
  company_score INT NULL,
  total_checkins INT NOT NULL DEFAULT 0,
  participation_pct INT NULL,
  great_pct INT NOT NULL DEFAULT 0,
  normal_pct INT NOT NULL DEFAULT 0,
  stressed_pct INT NOT NULL DEFAULT 0,
  overdue_tasks INT NOT NULL DEFAULT 0,
  burnout_flags INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_week_start (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;