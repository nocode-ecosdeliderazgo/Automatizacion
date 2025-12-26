-- =====================================================
-- GO-ESP-01 Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE artifact_state AS ENUM (
  'DRAFT',
  'GENERATING',
  'VALIDATING',
  'READY_FOR_QA',
  'APPROVED',
  'REJECTED',
  'ESCALATED'
);

CREATE TYPE qa_decision AS ENUM (
  'APPROVED',
  'REJECTED',
  'NEEDS_REVISION'
);

CREATE TYPE user_role AS ENUM (
  'operator',
  'qa_reviewer',
  'admin'
);

-- =====================================================
-- TABLES
-- =====================================================

-- User Roles Table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Artifacts Table (main entity)
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT,
  course_id TEXT,
  idea_central TEXT NOT NULL,
  nombres JSONB NOT NULL DEFAULT '[]'::jsonb,
  objetivos JSONB NOT NULL DEFAULT '[]'::jsonb,
  descripcion JSONB NOT NULL DEFAULT '{}'::jsonb,
  state artifact_state NOT NULL DEFAULT 'DRAFT',
  validation_report JSONB,
  semantic_result JSONB,
  auto_retry_count INTEGER NOT NULL DEFAULT 0,
  iteration_count INTEGER NOT NULL DEFAULT 0,
  generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QA Sessions Table
CREATE TABLE qa_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision qa_decision,
  feedback TEXT,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Pipeline Events Table (for tracking progress)
CREATE TABLE pipeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_artifacts_state ON artifacts(state);
CREATE INDEX idx_artifacts_created_by ON artifacts(created_by);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);
CREATE INDEX idx_qa_sessions_artifact_id ON qa_sessions(artifact_id);
CREATE INDEX idx_qa_sessions_reviewer_id ON qa_sessions(reviewer_id);
CREATE INDEX idx_pipeline_events_artifact_id ON pipeline_events(artifact_id);
CREATE INDEX idx_pipeline_events_created_at ON pipeline_events(created_at DESC);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for artifacts
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to assign default role on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-assigning role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Artifacts policies
CREATE POLICY "Users can view all artifacts"
  ON artifacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create artifacts"
  ON artifacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own artifacts"
  ON artifacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('qa_reviewer', 'admin')
  ));

-- QA Sessions policies
CREATE POLICY "Users can view all QA sessions"
  ON qa_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "QA reviewers can create sessions"
  ON qa_sessions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('qa_reviewer', 'admin')
  ));

CREATE POLICY "QA reviewers can update own sessions"
  ON qa_sessions FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ));

-- Pipeline Events policies
CREATE POLICY "Users can view pipeline events"
  ON pipeline_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create pipeline events"
  ON pipeline_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User Roles policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ));

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for artifacts and pipeline_events
ALTER PUBLICATION supabase_realtime ADD TABLE artifacts;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_events;
