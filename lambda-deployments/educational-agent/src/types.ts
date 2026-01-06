import { z } from 'zod';

// Educational Framework Types
export const GradeLevelSchema = z.enum([
  'pre-k', 'kindergarten', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5',
  'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'
]);

export const SubjectAreaSchema = z.enum([
  'language-arts', 'mathematics', 'science', 'social-studies', 'art', 'music',
  'physical-education', 'health', 'technology', 'foreign-language'
]);

export const LearningObjectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  gradeLevel: GradeLevelSchema,
  subjectArea: SubjectAreaSchema,
  standards: z.array(z.string()), // Common Core, NGSS, etc.
  skills: z.array(z.string()),
  assessmentCriteria: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedDuration: z.number(), // minutes
  prerequisites: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CurriculumFrameworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  region: z.string(), // US, UK, Canada, etc.
  type: z.enum(['common-core', 'ngss', 'national-curriculum', 'state-standards', 'custom']),
  gradeRange: z.object({
    min: GradeLevelSchema,
    max: GradeLevelSchema
  }),
  subjects: z.array(SubjectAreaSchema),
  learningObjectives: z.array(LearningObjectiveSchema),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const StoryTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  gradeLevel: GradeLevelSchema,
  subjectArea: SubjectAreaSchema,
  learningObjectives: z.array(z.string()), // IDs of learning objectives
  storyStructure: z.object({
    introduction: z.string(),
    conflict: z.string(),
    resolution: z.string(),
    educationalElements: z.array(z.string())
  }),
  characterGuidelines: z.object({
    ageAppropriate: z.boolean(),
    diversityRequirements: z.array(z.string()),
    roleModels: z.array(z.string())
  }),
  assessmentQuestions: z.array(z.object({
    question: z.string(),
    type: z.enum(['multiple-choice', 'open-ended', 'true-false']),
    correctAnswer: z.string().optional(),
    rubric: z.string().optional()
  })),
  vocabulary: z.array(z.object({
    word: z.string(),
    definition: z.string(),
    gradeLevel: GradeLevelSchema
  })),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const EducationalOutcomeSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  storyId: z.string(),
  learningObjectiveId: z.string(),
  assessmentScore: z.number().min(0).max(100),
  completionTime: z.number(), // minutes
  engagementMetrics: z.object({
    interactionCount: z.number(),
    choicesMade: z.number(),
    questionsAsked: z.number(),
    vocabularyUsed: z.array(z.string())
  }),
  teacherNotes: z.string().optional(),
  parentFeedback: z.string().optional(),
  achievedAt: z.date(),
  createdAt: z.date()
});

export const ClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  teacherId: z.string(),
  schoolId: z.string(),
  gradeLevel: GradeLevelSchema,
  subject: SubjectAreaSchema,
  students: z.array(z.string()), // student IDs
  curriculumFramework: z.string(), // framework ID
  settings: z.object({
    contentFiltering: z.enum(['strict', 'moderate', 'standard']),
    collaborativeMode: z.boolean(),
    parentNotifications: z.boolean(),
    assessmentMode: z.enum(['formative', 'summative', 'both'])
  }),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Type exports
export type GradeLevel = z.infer<typeof GradeLevelSchema>;
export type SubjectArea = z.infer<typeof SubjectAreaSchema>;
export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;
export type CurriculumFramework = z.infer<typeof CurriculumFrameworkSchema>;
export type StoryTemplate = z.infer<typeof StoryTemplateSchema>;
export type EducationalOutcome = z.infer<typeof EducationalOutcomeSchema>;
export type Classroom = z.infer<typeof ClassroomSchema>;

// API Request/Response Types
export interface CurriculumAlignmentRequest {
  storyContent: string;
  gradeLevel: GradeLevel;
  subjectArea: SubjectArea;
  learningObjectives?: string[];
}

export interface CurriculumAlignmentResponse {
  alignmentScore: number; // 0-100
  matchedObjectives: LearningObjective[];
  suggestedModifications: string[];
  vocabularyLevel: 'below' | 'appropriate' | 'above';
  readabilityScore: number;
}

export interface EducationalAssessmentRequest {
  studentId: string;
  storyId: string;
  responses: Array<{
    questionId: string;
    answer: string;
    timeSpent: number;
  }>;
}

export interface EducationalAssessmentResponse {
  overallScore: number;
  objectiveScores: Array<{
    objectiveId: string;
    score: number;
    feedback: string;
  }>;
  recommendations: string[];
  nextSteps: string[];
}