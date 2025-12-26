-- =====================================================
-- GO-ESP-02 Database Schema Extension
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- =====================================================

-- =====================================================
-- ENUMS for ESP-02
-- =====================================================

CREATE TYPE esp02_route AS ENUM (
  'A_WITH_SOURCE',
  'B_NO_SOURCE'
);

CREATE TYPE esp02_step_state AS ENUM (
  'STEP_DRAFT',
  'STEP_GENERATING',
  'STEP_VALIDATING',
  'STEP_READY_FOR_QA',
  'STEP_APPROVED',
  'STEP_REJECTED',
  'STEP_ESCALATED'
);

-- =====================================================
-- TABLE: artifact_steps
-- Stores step-specific data for multi-step pipeline
-- =====================================================

CREATE TABLE artifact_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, -- 'GO-ESP-01', 'GO-ESP-02', 'GO-ESP-03', etc.
  state esp02_step_state NOT NULL DEFAULT 'STEP_DRAFT',
  route esp02_route, -- Only for ESP-02
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Step-specific output (temario, etc.)
  validation_report_json JSONB, -- Validation results
  iteration_count INTEGER NOT NULL DEFAULT 0,
  max_iterations INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each artifact can only have one record per step
  UNIQUE(artifact_id, step_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_artifact_steps_artifact_id ON artifact_steps(artifact_id);
CREATE INDEX idx_artifact_steps_step_id ON artifact_steps(step_id);
CREATE INDEX idx_artifact_steps_state ON artifact_steps(state);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER update_artifact_steps_updated_at
  BEFORE UPDATE ON artifact_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EXTEND qa_sessions for multi-step support
-- =====================================================

ALTER TABLE qa_sessions ADD COLUMN IF NOT EXISTS step_id TEXT DEFAULT 'GO-ESP-01';
ALTER TABLE qa_sessions ADD COLUMN IF NOT EXISTS artifact_step_id UUID REFERENCES artifact_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qa_sessions_step_id ON qa_sessions(step_id);

-- =====================================================
-- TABLE: source_files (for Ruta A)
-- Stores uploaded source files metadata
-- =====================================================

CREATE TABLE source_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_step_id UUID NOT NULL REFERENCES artifact_steps(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  storage_path TEXT, -- Path in Supabase Storage
  extraction_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  extracted_text TEXT, -- Extracted content for RAG
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_files_artifact_step ON source_files(artifact_step_id);

-- =====================================================
-- EXTEND pipeline_events for ESP-02
-- =====================================================

-- Add step_id to pipeline_events for multi-step tracking
ALTER TABLE pipeline_events ADD COLUMN IF NOT EXISTS step_id TEXT DEFAULT 'GO-ESP-01';

CREATE INDEX IF NOT EXISTS idx_pipeline_events_step_id ON pipeline_events(step_id);

-- =====================================================
-- ROW LEVEL SECURITY for new tables
-- =====================================================

ALTER TABLE artifact_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_files ENABLE ROW LEVEL SECURITY;

-- Artifact Steps policies
CREATE POLICY "Users can view artifact steps"
  ON artifact_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create artifact steps for own artifacts"
  ON artifact_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_steps.artifact_id
      AND (artifacts.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('qa_reviewer', 'admin')
      ))
    )
  );

CREATE POLICY "Users can update own artifact steps"
  ON artifact_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = artifact_steps.artifact_id
      AND (artifacts.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('qa_reviewer', 'admin')
      ))
    )
  );

-- Source Files policies
CREATE POLICY "Users can view source files"
  ON source_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload source files"
  ON source_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- REALTIME for artifact_steps
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE artifact_steps;

-- =====================================================
-- HELPER FUNCTION: Get step progress
-- =====================================================

CREATE OR REPLACE FUNCTION get_artifact_progress(p_artifact_id UUID)
RETURNS TABLE (
  step_id TEXT,
  state esp02_step_state,
  is_complete BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.step_id,
    s.state,
    (s.state = 'STEP_APPROVED') AS is_complete
  FROM artifact_steps s
  WHERE s.artifact_id = p_artifact_id
  ORDER BY
    CASE s.step_id
      WHEN 'GO-ESP-01' THEN 1
      WHEN 'GO-ESP-02' THEN 2
      WHEN 'GO-ESP-03' THEN 3
      ELSE 99
    END;
END;
$$ LANGUAGE plpgsql;
