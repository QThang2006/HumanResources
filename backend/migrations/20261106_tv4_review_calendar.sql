-- TV4 only. Additive migration; does not alter reviews or delivery history.
CREATE TABLE IF NOT EXISTS performance_review_schedules (
  review_period VARCHAR(7) NOT NULL,
  opening_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  deadline DATE NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by_id INT NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (review_period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
