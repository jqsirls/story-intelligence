-- Educational Integration Platform Database Schema

-- Curriculum frameworks and standards
CREATE TABLE curriculum_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  region TEXT NOT NULL, -- US, UK, Canada, etc.
  type TEXT CHECK (type IN ('common-core', 'ngss', 'national-curriculum', 'state-standards', 'custom')) NOT NULL,
  grade_range_min TEXT NOT NULL,
  grade_range_max TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning objectives within frameworks
CREATE TABLE learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID REFERENCES curriculum_frameworks NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_area TEXT NOT NULL,
  standards TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  assessment_criteria TEXT[] NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) NOT NULL,
  estimated_duration INTEGER NOT NULL, -- minutes
  prerequisites TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story templates aligned to curriculum
CREATE TABLE story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_area TEXT NOT NULL,
  learning_objectives TEXT[] NOT NULL, -- IDs of learning objectives
  story_structure JSONB NOT NULL,
  character_guidelines JSONB NOT NULL,
  assessment_questions JSONB NOT NULL,
  vocabulary JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schools and educational institutions
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT,
  address JSONB,
  contact_info JSONB,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users,
  school_id UUID REFERENCES schools NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  subjects TEXT[] NOT NULL,
  grade_levels TEXT[] NOT NULL,
  certifications TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers NOT NULL,
  school_id UUID REFERENCES schools NOT NULL,
  grade_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  curriculum_framework_id UUID REFERENCES curriculum_frameworks,
  settings JSONB DEFAULT '{
    "contentFiltering": "moderate",
    "collaborativeMode": true,
    "parentNotifications": true,
    "assessmentMode": "both"
  }',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students (extends base users table)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  grade_level TEXT NOT NULL,
  parent_email TEXT,
  special_needs TEXT[] DEFAULT '{}',
  learning_preferences JSONB DEFAULT '{}',
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom enrollment (many-to-many relationship)
CREATE TABLE classroom_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms NOT NULL,
  student_id UUID REFERENCES students NOT NULL,
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(classroom_id, student_id)
);

-- Educational outcomes and assessments
CREATE TABLE educational_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students NOT NULL,
  story_id UUID REFERENCES stories,
  learning_objective_id UUID REFERENCES learning_objectives NOT NULL,
  assessment_score NUMERIC CHECK (assessment_score BETWEEN 0 AND 100) NOT NULL,
  completion_time INTEGER NOT NULL, -- minutes
  engagement_metrics JSONB NOT NULL,
  teacher_notes TEXT,
  parent_feedback TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group storytelling sessions
CREATE TABLE group_storytelling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  facilitator_id UUID REFERENCES teachers NOT NULL,
  story_prompt TEXT NOT NULL,
  learning_objectives TEXT[] NOT NULL,
  max_participants INTEGER DEFAULT 6,
  session_type TEXT CHECK (session_type IN ('collaborative', 'turn-based', 'guided')) DEFAULT 'collaborative',
  status TEXT CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')) DEFAULT 'scheduled',
  scheduled_start TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  story_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES group_storytelling_sessions NOT NULL,
  student_id UUID REFERENCES students NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Participant contributions to group stories
CREATE TABLE participant_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES group_storytelling_sessions NOT NULL,
  student_id UUID REFERENCES students NOT NULL,
  contribution TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-teacher communications
CREATE TABLE parent_teacher_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students NOT NULL,
  teacher_id UUID REFERENCES teachers NOT NULL,
  parent_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('progress_update', 'concern', 'achievement', 'general', 'assignment')) DEFAULT 'general',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  attachments JSONB DEFAULT '[]',
  parent_response TEXT,
  response_date TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student progress tracking
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students NOT NULL,
  learning_objective_id UUID REFERENCES learning_objectives NOT NULL,
  attempts INTEGER DEFAULT 0,
  best_score NUMERIC DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- minutes
  last_attempt_date TIMESTAMPTZ,
  mastery_level TEXT CHECK (mastery_level IN ('not-started', 'developing', 'proficient', 'advanced')) DEFAULT 'not-started',
  trends JSONB DEFAULT '{"improving": false, "stagnant": true, "declining": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, learning_objective_id)
);

-- Curriculum alignment analysis results
CREATE TABLE curriculum_alignment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories,
  content_hash TEXT NOT NULL, -- Hash of analyzed content for caching
  grade_level TEXT NOT NULL,
  subject_area TEXT NOT NULL,
  alignment_score NUMERIC CHECK (alignment_score BETWEEN 0 AND 100) NOT NULL,
  matched_objectives TEXT[] NOT NULL,
  vocabulary_level TEXT CHECK (vocabulary_level IN ('below', 'appropriate', 'above')) NOT NULL,
  readability_score NUMERIC NOT NULL,
  suggested_modifications TEXT[] DEFAULT '{}',
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Educational content filtering logs
CREATE TABLE content_filtering_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms,
  original_content_hash TEXT NOT NULL,
  filtered_content_hash TEXT NOT NULL,
  filter_level TEXT CHECK (filter_level IN ('strict', 'moderate', 'standard')) NOT NULL,
  modifications TEXT[] NOT NULL,
  filtered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_learning_objectives_framework ON learning_objectives(framework_id);
CREATE INDEX idx_learning_objectives_grade_subject ON learning_objectives(grade_level, subject_area);
CREATE INDEX idx_story_templates_grade_subject ON story_templates(grade_level, subject_area);
CREATE INDEX idx_classroom_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX idx_classroom_enrollments_student ON classroom_enrollments(student_id);
CREATE INDEX idx_educational_outcomes_student ON educational_outcomes(student_id);
CREATE INDEX idx_educational_outcomes_objective ON educational_outcomes(learning_objective_id);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_objective ON student_progress(learning_objective_id);
CREATE INDEX idx_parent_communications_student ON parent_teacher_communications(student_id);
CREATE INDEX idx_parent_communications_teacher ON parent_teacher_communications(teacher_id);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_student ON session_participants(student_id);

-- Row Level Security Policies
ALTER TABLE curriculum_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_storytelling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_teacher_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Curriculum frameworks - readable by all authenticated users
CREATE POLICY curriculum_frameworks_read ON curriculum_frameworks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Learning objectives - readable by all authenticated users
CREATE POLICY learning_objectives_read ON learning_objectives
  FOR SELECT USING (auth.role() = 'authenticated');

-- Story templates - readable by all authenticated users
CREATE POLICY story_templates_read ON story_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Teachers can only see their own data
CREATE POLICY teachers_own_data ON teachers
  FOR ALL USING (auth.uid() = user_id);

-- Classrooms - teachers can see their own classrooms
CREATE POLICY classrooms_teacher_access ON classrooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.id = classrooms.teacher_id 
      AND teachers.user_id = auth.uid()
    )
  );

-- Students - can see their own data, teachers can see their students
CREATE POLICY students_access ON students
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM classroom_enrollments ce
      JOIN classrooms c ON ce.classroom_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE ce.student_id = students.id
      AND t.user_id = auth.uid()
    )
  );

-- Classroom enrollments - students and their teachers can access
CREATE POLICY classroom_enrollments_access ON classroom_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = classroom_enrollments.student_id
      AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = classroom_enrollments.classroom_id
      AND t.user_id = auth.uid()
    )
  );

-- Educational outcomes - students and teachers can access
CREATE POLICY educational_outcomes_access ON educational_outcomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = educational_outcomes.student_id
      AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s
      JOIN classroom_enrollments ce ON s.id = ce.student_id
      JOIN classrooms c ON ce.classroom_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE s.id = educational_outcomes.student_id
      AND t.user_id = auth.uid()
    )
  );

-- Group storytelling sessions - classroom teachers and enrolled students can access
CREATE POLICY group_sessions_access ON group_storytelling_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = group_storytelling_sessions.classroom_id
      AND t.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM session_participants sp
      JOIN students s ON sp.student_id = s.id
      WHERE sp.session_id = group_storytelling_sessions.id
      AND s.user_id = auth.uid()
    )
  );

-- Session participants - teachers and participating students can access
CREATE POLICY session_participants_access ON session_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = session_participants.student_id
      AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM group_storytelling_sessions gss
      JOIN classrooms c ON gss.classroom_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE gss.id = session_participants.session_id
      AND t.user_id = auth.uid()
    )
  );

-- Parent-teacher communications - teachers and parents can access
CREATE POLICY parent_communications_access ON parent_teacher_communications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = parent_teacher_communications.teacher_id
      AND t.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_teacher_communications.student_id
      AND (s.user_id = auth.uid() OR s.parent_email = auth.email())
    )
  );

-- Student progress - students and their teachers can access
CREATE POLICY student_progress_access ON student_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_progress.student_id
      AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s
      JOIN classroom_enrollments ce ON s.id = ce.student_id
      JOIN classrooms c ON ce.classroom_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE s.id = student_progress.student_id
      AND t.user_id = auth.uid()
    )
  );

-- Insert sample data
INSERT INTO curriculum_frameworks (name, description, region, type, grade_range_min, grade_range_max, subjects) VALUES
('Common Core State Standards', 'US Common Core State Standards for Mathematics and English Language Arts', 'US', 'common-core', 'kindergarten', 'grade-12', ARRAY['language-arts', 'mathematics']);

INSERT INTO learning_objectives (framework_id, title, description, grade_level, subject_area, standards, skills, assessment_criteria, difficulty, estimated_duration) VALUES
((SELECT id FROM curriculum_frameworks WHERE name = 'Common Core State Standards'),
 'Demonstrate understanding of spoken words and syllables',
 'Students will identify and manipulate syllables in spoken words',
 'kindergarten',
 'language-arts',
 ARRAY['CCSS.ELA-LITERACY.RF.K.2.A'],
 ARRAY['phonological awareness', 'syllable identification', 'word segmentation'],
 ARRAY['correctly identifies syllables', 'segments words accurately'],
 'beginner',
 30);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_curriculum_frameworks_updated_at BEFORE UPDATE ON curriculum_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_objectives_updated_at BEFORE UPDATE ON learning_objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_story_templates_updated_at BEFORE UPDATE ON story_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_sessions_updated_at BEFORE UPDATE ON group_storytelling_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();