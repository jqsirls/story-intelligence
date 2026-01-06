-- WebVTT Synchronization Tables for Phase 1
-- Supports word-level audio synchronization with ≤ 5ms P90 accuracy
-- Powered by Story Intelligence™

-- WebVTT files table
CREATE TABLE IF NOT EXISTS webvtt_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WebVTT file metadata
    file_url TEXT NOT NULL,
    file_size INTEGER,
    word_count INTEGER NOT NULL DEFAULT 0,
    
    -- Sync accuracy metrics (Phase 1 DoD requirement)
    sync_accuracy_p50_ms DECIMAL(5,2),
    sync_accuracy_p90_ms DECIMAL(5,2) NOT NULL,
    sync_accuracy_p99_ms DECIMAL(5,2),
    sync_accuracy_average_ms DECIMAL(5,2),
    
    -- Processing metadata
    processing_time_ms INTEGER,
    audio_url TEXT NOT NULL,
    text_content TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT webvtt_files_story_user_unique UNIQUE(story_id, user_id),
    CONSTRAINT webvtt_sync_accuracy_p90_check CHECK (sync_accuracy_p90_ms <= 5.0) -- Phase 1 DoD requirement
);

-- Word-level timestamps table for detailed synchronization
CREATE TABLE IF NOT EXISTS webvtt_word_timestamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webvtt_file_id UUID NOT NULL REFERENCES webvtt_files(id) ON DELETE CASCADE,
    
    -- Word data
    word_text TEXT NOT NULL,
    word_index INTEGER NOT NULL,
    
    -- Timing data (milliseconds)
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    duration_ms INTEGER GENERATED ALWAYS AS (end_time_ms - start_time_ms) STORED,
    
    -- Quality metrics
    confidence_score DECIMAL(3,2) DEFAULT 0.95,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT webvtt_word_timestamps_file_index_unique UNIQUE(webvtt_file_id, word_index),
    CONSTRAINT webvtt_word_timing_check CHECK (end_time_ms > start_time_ms),
    CONSTRAINT webvtt_confidence_check CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- WebVTT generation metrics for Phase 1 monitoring
CREATE TABLE IF NOT EXISTS webvtt_generation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webvtt_file_id UUID NOT NULL REFERENCES webvtt_files(id) ON DELETE CASCADE,
    
    -- Performance metrics
    generation_time_ms INTEGER NOT NULL,
    validation_time_ms INTEGER,
    
    -- Quality metrics
    phase1_compliant BOOLEAN NOT NULL DEFAULT FALSE,
    accuracy_deviation_ms DECIMAL(5,2),
    
    -- System metadata
    generated_by TEXT DEFAULT 'Story Intelligence™',
    api_version TEXT DEFAULT '1.0.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webvtt_files_story_id ON webvtt_files(story_id);
CREATE INDEX IF NOT EXISTS idx_webvtt_files_user_id ON webvtt_files(user_id);
CREATE INDEX IF NOT EXISTS idx_webvtt_files_sync_accuracy ON webvtt_files(sync_accuracy_p90_ms);
CREATE INDEX IF NOT EXISTS idx_webvtt_files_created_at ON webvtt_files(created_at);

CREATE INDEX IF NOT EXISTS idx_webvtt_word_timestamps_file_id ON webvtt_word_timestamps(webvtt_file_id);
CREATE INDEX IF NOT EXISTS idx_webvtt_word_timestamps_timing ON webvtt_word_timestamps(start_time_ms, end_time_ms);

CREATE INDEX IF NOT EXISTS idx_webvtt_metrics_file_id ON webvtt_generation_metrics(webvtt_file_id);
CREATE INDEX IF NOT EXISTS idx_webvtt_metrics_phase1_compliant ON webvtt_generation_metrics(phase1_compliant);

-- Row Level Security (RLS) policies
ALTER TABLE webvtt_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE webvtt_word_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE webvtt_generation_metrics ENABLE ROW LEVEL SECURITY;

-- WebVTT files policies
CREATE POLICY "Users can view their own WebVTT files" ON webvtt_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create WebVTT files for their stories" ON webvtt_files
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can update their own WebVTT files" ON webvtt_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WebVTT files" ON webvtt_files
    FOR DELETE USING (auth.uid() = user_id);

-- Word timestamps policies
CREATE POLICY "Users can view word timestamps for their WebVTT files" ON webvtt_word_timestamps
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM webvtt_files WHERE id = webvtt_file_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can create word timestamps for their WebVTT files" ON webvtt_word_timestamps
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM webvtt_files WHERE id = webvtt_file_id AND user_id = auth.uid())
    );

-- Generation metrics policies
CREATE POLICY "Users can view metrics for their WebVTT files" ON webvtt_generation_metrics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM webvtt_files WHERE id = webvtt_file_id AND user_id = auth.uid())
    );

CREATE POLICY "System can create generation metrics" ON webvtt_generation_metrics
    FOR INSERT WITH CHECK (true); -- Allow system to insert metrics

-- Functions for WebVTT management
CREATE OR REPLACE FUNCTION update_webvtt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_webvtt_files_updated_at
    BEFORE UPDATE ON webvtt_files
    FOR EACH ROW
    EXECUTE FUNCTION update_webvtt_updated_at();

-- Function to validate Phase 1 DoD compliance
CREATE OR REPLACE FUNCTION validate_phase1_webvtt_compliance(file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    p90_accuracy DECIMAL(5,2);
BEGIN
    SELECT sync_accuracy_p90_ms INTO p90_accuracy
    FROM webvtt_files
    WHERE id = file_id;
    
    RETURN p90_accuracy IS NOT NULL AND p90_accuracy <= 5.0;
END;
$$ LANGUAGE plpgsql;

-- Function to get WebVTT statistics for monitoring
CREATE OR REPLACE FUNCTION get_webvtt_phase1_stats()
RETURNS TABLE (
    total_files BIGINT,
    phase1_compliant_files BIGINT,
    average_p90_accuracy DECIMAL(5,2),
    compliance_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE sync_accuracy_p90_ms <= 5.0) as phase1_compliant_files,
        AVG(sync_accuracy_p90_ms) as average_p90_accuracy,
        (COUNT(*) FILTER (WHERE sync_accuracy_p90_ms <= 5.0) * 100.0 / NULLIF(COUNT(*), 0)) as compliance_rate
    FROM webvtt_files
    WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE webvtt_files IS 'WebVTT synchronization files for Phase 1 - word-level audio sync with ≤5ms P90 accuracy';
COMMENT ON TABLE webvtt_word_timestamps IS 'Individual word timestamps for karaoke-style highlighting';
COMMENT ON TABLE webvtt_generation_metrics IS 'Performance and quality metrics for WebVTT generation monitoring';

COMMENT ON COLUMN webvtt_files.sync_accuracy_p90_ms IS 'Phase 1 DoD requirement: P90 sync accuracy must be ≤ 5ms';
COMMENT ON COLUMN webvtt_generation_metrics.phase1_compliant IS 'Whether the WebVTT file meets Phase 1 DoD requirements';

-- Grant permissions for API access
GRANT SELECT, INSERT, UPDATE, DELETE ON webvtt_files TO authenticated;
GRANT SELECT, INSERT ON webvtt_word_timestamps TO authenticated;
GRANT SELECT, INSERT ON webvtt_generation_metrics TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;