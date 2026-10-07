-- Additive TV2 schema for deployments with TypeORM synchronize disabled.
-- Dev/test synchronize already creates this table. No existing table is dropped.
CREATE TABLE IF NOT EXISTS interview_deliveries (
  interview_id INT NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NULL,
  payload_snapshot JSON NOT NULL,
  expected_event_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  calendar_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  email_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  smtp_message_id VARCHAR(998) NULL,
  failure_stage VARCHAR(20) NULL,
  failure_code VARCHAR(32) NULL,
  claimed_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (interview_id),
  UNIQUE KEY uq_interview_delivery_request (request_id),
  CONSTRAINT fk_interview_delivery_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
