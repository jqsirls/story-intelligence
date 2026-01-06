-- A2A Tasks table for persistent task storage
-- Per A2A protocol specification for task lifecycle management

CREATE TABLE IF NOT EXISTS a2a_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('submitted', 'working', 'input-required', 'completed', 'failed', 'canceled')),
  client_agent_id TEXT NOT NULL,
  remote_agent_id TEXT NOT NULL,
  method TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_task_id ON a2a_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_state ON a2a_tasks(state);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_client_agent ON a2a_tasks(client_agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_session ON a2a_tasks(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_created_at ON a2a_tasks(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_a2a_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_a2a_tasks_updated_at
  BEFORE UPDATE ON a2a_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_a2a_tasks_updated_at();

-- RLS policies (if needed for multi-tenant)
-- Note: A2A tasks are isolated by client_agent_id
-- Uncomment if RLS is needed:
-- ALTER TABLE a2a_tasks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY a2a_tasks_isolation ON a2a_tasks
--   USING (client_agent_id = current_setting('app.current_agent_id', true));

-- Cleanup function for old tasks (30+ days)
CREATE OR REPLACE FUNCTION cleanup_old_a2a_tasks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM a2a_tasks
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND state IN ('completed', 'failed', 'canceled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE a2a_tasks IS 'A2A protocol task storage for external agent/partner integration';
COMMENT ON COLUMN a2a_tasks.task_id IS 'Unique task identifier (UUID v4)';
COMMENT ON COLUMN a2a_tasks.state IS 'Task state: submitted, working, input-required, completed, failed, canceled';
COMMENT ON COLUMN a2a_tasks.client_agent_id IS 'ID of the client agent that created the task';
COMMENT ON COLUMN a2a_tasks.remote_agent_id IS 'ID of the remote agent (Storytailor)';
COMMENT ON COLUMN a2a_tasks.method IS 'A2A method name (e.g., story.generate, emotion.checkin)';
COMMENT ON COLUMN a2a_tasks.params IS 'Method parameters (JSONB)';
COMMENT ON COLUMN a2a_tasks.result IS 'Task result/artifact (JSONB)';
COMMENT ON COLUMN a2a_tasks.error IS 'Error information if task failed (JSONB)';
