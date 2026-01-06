"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassroomSchema = exports.EducationalOutcomeSchema = exports.StoryTemplateSchema = exports.CurriculumFrameworkSchema = exports.LearningObjectiveSchema = exports.SubjectAreaSchema = exports.GradeLevelSchema = void 0;
const zod_1 = require("zod");
// Educational Framework Types
exports.GradeLevelSchema = zod_1.z.enum([
    'pre-k', 'kindergarten', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5',
    'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'
]);
exports.SubjectAreaSchema = zod_1.z.enum([
    'language-arts', 'mathematics', 'science', 'social-studies', 'art', 'music',
    'physical-education', 'health', 'technology', 'foreign-language'
]);
exports.LearningObjectiveSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    gradeLevel: exports.GradeLevelSchema,
    subjectArea: exports.SubjectAreaSchema,
    standards: zod_1.z.array(zod_1.z.string()), // Common Core, NGSS, etc.
    skills: zod_1.z.array(zod_1.z.string()),
    assessmentCriteria: zod_1.z.array(zod_1.z.string()),
    difficulty: zod_1.z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedDuration: zod_1.z.number(), // minutes
    prerequisites: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CurriculumFrameworkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    region: zod_1.z.string(), // US, UK, Canada, etc.
    type: zod_1.z.enum(['common-core', 'ngss', 'national-curriculum', 'state-standards', 'custom']),
    gradeRange: zod_1.z.object({
        min: exports.GradeLevelSchema,
        max: exports.GradeLevelSchema
    }),
    subjects: zod_1.z.array(exports.SubjectAreaSchema),
    learningObjectives: zod_1.z.array(exports.LearningObjectiveSchema),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.StoryTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    gradeLevel: exports.GradeLevelSchema,
    subjectArea: exports.SubjectAreaSchema,
    learningObjectives: zod_1.z.array(zod_1.z.string()), // IDs of learning objectives
    storyStructure: zod_1.z.object({
        introduction: zod_1.z.string(),
        conflict: zod_1.z.string(),
        resolution: zod_1.z.string(),
        educationalElements: zod_1.z.array(zod_1.z.string())
    }),
    characterGuidelines: zod_1.z.object({
        ageAppropriate: zod_1.z.boolean(),
        diversityRequirements: zod_1.z.array(zod_1.z.string()),
        roleModels: zod_1.z.array(zod_1.z.string())
    }),
    assessmentQuestions: zod_1.z.array(zod_1.z.object({
        question: zod_1.z.string(),
        type: zod_1.z.enum(['multiple-choice', 'open-ended', 'true-false']),
        correctAnswer: zod_1.z.string().optional(),
        rubric: zod_1.z.string().optional()
    })),
    vocabulary: zod_1.z.array(zod_1.z.object({
        word: zod_1.z.string(),
        definition: zod_1.z.string(),
        gradeLevel: exports.GradeLevelSchema
    })),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.EducationalOutcomeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    studentId: zod_1.z.string(),
    storyId: zod_1.z.string(),
    learningObjectiveId: zod_1.z.string(),
    assessmentScore: zod_1.z.number().min(0).max(100),
    completionTime: zod_1.z.number(), // minutes
    engagementMetrics: zod_1.z.object({
        interactionCount: zod_1.z.number(),
        choicesMade: zod_1.z.number(),
        questionsAsked: zod_1.z.number(),
        vocabularyUsed: zod_1.z.array(zod_1.z.string())
    }),
    teacherNotes: zod_1.z.string().optional(),
    parentFeedback: zod_1.z.string().optional(),
    achievedAt: zod_1.z.date(),
    createdAt: zod_1.z.date()
});
exports.ClassroomSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    teacherId: zod_1.z.string(),
    schoolId: zod_1.z.string(),
    gradeLevel: exports.GradeLevelSchema,
    subject: exports.SubjectAreaSchema,
    students: zod_1.z.array(zod_1.z.string()), // student IDs
    curriculumFramework: zod_1.z.string(), // framework ID
    settings: zod_1.z.object({
        contentFiltering: zod_1.z.enum(['strict', 'moderate', 'standard']),
        collaborativeMode: zod_1.z.boolean(),
        parentNotifications: zod_1.z.boolean(),
        assessmentMode: zod_1.z.enum(['formative', 'summative', 'both'])
    }),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
//# sourceMappingURL=types.js.map