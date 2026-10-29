CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  run_id uuid PRIMARY KEY,
  scenario_id varchar(40) NOT NULL,
  language varchar(8) NOT NULL,
  mode varchar(20) NOT NULL CHECK (mode IN ('fixture','meta','meta-tools')),
  risk_level varchar(24) NOT NULL CHECK (risk_level IN ('high_risk','suspicious','inconclusive')),
  verification_status varchar(32) NOT NULL CHECK (verification_status IN ('verified','pending_human_approval','rejected')),
  indicator_codes jsonb NOT NULL CHECK (jsonb_typeof(indicator_codes)='array'),
  report jsonb NOT NULL CHECK (jsonb_typeof(report)='object'),
  country_code varchar(8) NOT NULL CHECK (country_code IN ('GLOBAL','AE','IN')),
  approval_status varchar(24) NOT NULL CHECK (approval_status IN ('none','pending','approved_locally','declined','expired')),
  approval_token_hash char(64),
  approval_expires_at timestamptz,
  decision_at timestamptz,
  referral jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((approval_status='pending' AND approval_token_hash IS NOT NULL AND approval_expires_at IS NOT NULL) OR approval_status<>'pending')
);

CREATE TABLE IF NOT EXISTS audit_events (
  sequence bigint PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES assessments(run_id),
  event_type varchar(20) NOT NULL CHECK (event_type IN ('assessment','decision')),
  event_json text NOT NULL,
  previous_hash char(64) NOT NULL,
  entry_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id,event_type)
);

INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
