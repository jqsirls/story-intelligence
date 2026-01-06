import { z } from 'zod';
export declare const GradeLevelSchema: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
export declare const SubjectAreaSchema: z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>;
export declare const LearningObjectiveSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    gradeLevel: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
    subjectArea: z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>;
    standards: z.ZodArray<z.ZodString, "many">;
    skills: z.ZodArray<z.ZodString, "many">;
    assessmentCriteria: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    estimatedDuration: z.ZodNumber;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    title: string;
    description: string;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    standards: string[];
    skills: string[];
    assessmentCriteria: string[];
    difficulty: "advanced" | "intermediate" | "beginner";
    estimatedDuration: number;
    updatedAt: Date;
    prerequisites?: string[] | undefined;
}, {
    id: string;
    createdAt: Date;
    title: string;
    description: string;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    standards: string[];
    skills: string[];
    assessmentCriteria: string[];
    difficulty: "advanced" | "intermediate" | "beginner";
    estimatedDuration: number;
    updatedAt: Date;
    prerequisites?: string[] | undefined;
}>;
export declare const CurriculumFrameworkSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    region: z.ZodString;
    type: z.ZodEnum<["common-core", "ngss", "national-curriculum", "state-standards", "custom"]>;
    gradeRange: z.ZodObject<{
        min: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
        max: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
    }, "strip", z.ZodTypeAny, {
        min: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        max: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    }, {
        min: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        max: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    }>;
    subjects: z.ZodArray<z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>, "many">;
    learningObjectives: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        gradeLevel: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
        subjectArea: z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>;
        standards: z.ZodArray<z.ZodString, "many">;
        skills: z.ZodArray<z.ZodString, "many">;
        assessmentCriteria: z.ZodArray<z.ZodString, "many">;
        difficulty: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        estimatedDuration: z.ZodNumber;
        prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
        standards: string[];
        skills: string[];
        assessmentCriteria: string[];
        difficulty: "advanced" | "intermediate" | "beginner";
        estimatedDuration: number;
        updatedAt: Date;
        prerequisites?: string[] | undefined;
    }, {
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
        standards: string[];
        skills: string[];
        assessmentCriteria: string[];
        difficulty: "advanced" | "intermediate" | "beginner";
        estimatedDuration: number;
        updatedAt: Date;
        prerequisites?: string[] | undefined;
    }>, "many">;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: "custom" | "common-core" | "ngss" | "national-curriculum" | "state-standards";
    id: string;
    name: string;
    createdAt: Date;
    isActive: boolean;
    learningObjectives: {
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
        standards: string[];
        skills: string[];
        assessmentCriteria: string[];
        difficulty: "advanced" | "intermediate" | "beginner";
        estimatedDuration: number;
        updatedAt: Date;
        prerequisites?: string[] | undefined;
    }[];
    description: string;
    updatedAt: Date;
    region: string;
    gradeRange: {
        min: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        max: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    };
    subjects: ("music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language")[];
}, {
    type: "custom" | "common-core" | "ngss" | "national-curriculum" | "state-standards";
    id: string;
    name: string;
    createdAt: Date;
    isActive: boolean;
    learningObjectives: {
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
        standards: string[];
        skills: string[];
        assessmentCriteria: string[];
        difficulty: "advanced" | "intermediate" | "beginner";
        estimatedDuration: number;
        updatedAt: Date;
        prerequisites?: string[] | undefined;
    }[];
    description: string;
    updatedAt: Date;
    region: string;
    gradeRange: {
        min: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        max: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    };
    subjects: ("music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language")[];
}>;
export declare const StoryTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    gradeLevel: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
    subjectArea: z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>;
    learningObjectives: z.ZodArray<z.ZodString, "many">;
    storyStructure: z.ZodObject<{
        introduction: z.ZodString;
        conflict: z.ZodString;
        resolution: z.ZodString;
        educationalElements: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        resolution: string;
        introduction: string;
        conflict: string;
        educationalElements: string[];
    }, {
        resolution: string;
        introduction: string;
        conflict: string;
        educationalElements: string[];
    }>;
    characterGuidelines: z.ZodObject<{
        ageAppropriate: z.ZodBoolean;
        diversityRequirements: z.ZodArray<z.ZodString, "many">;
        roleModels: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        ageAppropriate: boolean;
        diversityRequirements: string[];
        roleModels: string[];
    }, {
        ageAppropriate: boolean;
        diversityRequirements: string[];
        roleModels: string[];
    }>;
    assessmentQuestions: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        type: z.ZodEnum<["multiple-choice", "open-ended", "true-false"]>;
        correctAnswer: z.ZodOptional<z.ZodString>;
        rubric: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "multiple-choice" | "open-ended" | "true-false";
        question: string;
        correctAnswer?: string | undefined;
        rubric?: string | undefined;
    }, {
        type: "multiple-choice" | "open-ended" | "true-false";
        question: string;
        correctAnswer?: string | undefined;
        rubric?: string | undefined;
    }>, "many">;
    vocabulary: z.ZodArray<z.ZodObject<{
        word: z.ZodString;
        definition: z.ZodString;
        gradeLevel: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
    }, "strip", z.ZodTypeAny, {
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        word: string;
        definition: string;
    }, {
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        word: string;
        definition: string;
    }>, "many">;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    isActive: boolean;
    learningObjectives: string[];
    title: string;
    description: string;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    updatedAt: Date;
    storyStructure: {
        resolution: string;
        introduction: string;
        conflict: string;
        educationalElements: string[];
    };
    characterGuidelines: {
        ageAppropriate: boolean;
        diversityRequirements: string[];
        roleModels: string[];
    };
    assessmentQuestions: {
        type: "multiple-choice" | "open-ended" | "true-false";
        question: string;
        correctAnswer?: string | undefined;
        rubric?: string | undefined;
    }[];
    vocabulary: {
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        word: string;
        definition: string;
    }[];
}, {
    id: string;
    createdAt: Date;
    isActive: boolean;
    learningObjectives: string[];
    title: string;
    description: string;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    subjectArea: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    updatedAt: Date;
    storyStructure: {
        resolution: string;
        introduction: string;
        conflict: string;
        educationalElements: string[];
    };
    characterGuidelines: {
        ageAppropriate: boolean;
        diversityRequirements: string[];
        roleModels: string[];
    };
    assessmentQuestions: {
        type: "multiple-choice" | "open-ended" | "true-false";
        question: string;
        correctAnswer?: string | undefined;
        rubric?: string | undefined;
    }[];
    vocabulary: {
        gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
        word: string;
        definition: string;
    }[];
}>;
export declare const EducationalOutcomeSchema: z.ZodObject<{
    id: z.ZodString;
    studentId: z.ZodString;
    storyId: z.ZodString;
    learningObjectiveId: z.ZodString;
    assessmentScore: z.ZodNumber;
    completionTime: z.ZodNumber;
    engagementMetrics: z.ZodObject<{
        interactionCount: z.ZodNumber;
        choicesMade: z.ZodNumber;
        questionsAsked: z.ZodNumber;
        vocabularyUsed: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        interactionCount: number;
        choicesMade: number;
        questionsAsked: number;
        vocabularyUsed: string[];
    }, {
        interactionCount: number;
        choicesMade: number;
        questionsAsked: number;
        vocabularyUsed: string[];
    }>;
    teacherNotes: z.ZodOptional<z.ZodString>;
    parentFeedback: z.ZodOptional<z.ZodString>;
    achievedAt: z.ZodDate;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    storyId: string;
    createdAt: Date;
    studentId: string;
    learningObjectiveId: string;
    assessmentScore: number;
    completionTime: number;
    engagementMetrics: {
        interactionCount: number;
        choicesMade: number;
        questionsAsked: number;
        vocabularyUsed: string[];
    };
    achievedAt: Date;
    teacherNotes?: string | undefined;
    parentFeedback?: string | undefined;
}, {
    id: string;
    storyId: string;
    createdAt: Date;
    studentId: string;
    learningObjectiveId: string;
    assessmentScore: number;
    completionTime: number;
    engagementMetrics: {
        interactionCount: number;
        choicesMade: number;
        questionsAsked: number;
        vocabularyUsed: string[];
    };
    achievedAt: Date;
    teacherNotes?: string | undefined;
    parentFeedback?: string | undefined;
}>;
export declare const ClassroomSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    teacherId: z.ZodString;
    schoolId: z.ZodString;
    gradeLevel: z.ZodEnum<["pre-k", "kindergarten", "grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]>;
    subject: z.ZodEnum<["language-arts", "mathematics", "science", "social-studies", "art", "music", "physical-education", "health", "technology", "foreign-language"]>;
    students: z.ZodArray<z.ZodString, "many">;
    curriculumFramework: z.ZodString;
    settings: z.ZodObject<{
        contentFiltering: z.ZodEnum<["strict", "moderate", "standard"]>;
        collaborativeMode: z.ZodBoolean;
        parentNotifications: z.ZodBoolean;
        assessmentMode: z.ZodEnum<["formative", "summative", "both"]>;
    }, "strip", z.ZodTypeAny, {
        contentFiltering: "standard" | "moderate" | "strict";
        collaborativeMode: boolean;
        parentNotifications: boolean;
        assessmentMode: "formative" | "summative" | "both";
    }, {
        contentFiltering: "standard" | "moderate" | "strict";
        collaborativeMode: boolean;
        parentNotifications: boolean;
        assessmentMode: "formative" | "summative" | "both";
    }>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: Date;
    isActive: boolean;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    updatedAt: Date;
    teacherId: string;
    schoolId: string;
    subject: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    students: string[];
    curriculumFramework: string;
    settings: {
        contentFiltering: "standard" | "moderate" | "strict";
        collaborativeMode: boolean;
        parentNotifications: boolean;
        assessmentMode: "formative" | "summative" | "both";
    };
}, {
    id: string;
    name: string;
    createdAt: Date;
    isActive: boolean;
    gradeLevel: "pre-k" | "kindergarten" | "grade-1" | "grade-2" | "grade-3" | "grade-4" | "grade-5" | "grade-6" | "grade-7" | "grade-8" | "grade-9" | "grade-10" | "grade-11" | "grade-12";
    updatedAt: Date;
    teacherId: string;
    schoolId: string;
    subject: "music" | "art" | "language-arts" | "mathematics" | "science" | "social-studies" | "physical-education" | "health" | "technology" | "foreign-language";
    students: string[];
    curriculumFramework: string;
    settings: {
        contentFiltering: "standard" | "moderate" | "strict";
        collaborativeMode: boolean;
        parentNotifications: boolean;
        assessmentMode: "formative" | "summative" | "both";
    };
}>;
export type GradeLevel = z.infer<typeof GradeLevelSchema>;
export type SubjectArea = z.infer<typeof SubjectAreaSchema>;
export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;
export type CurriculumFramework = z.infer<typeof CurriculumFrameworkSchema>;
export type StoryTemplate = z.infer<typeof StoryTemplateSchema>;
export type EducationalOutcome = z.infer<typeof EducationalOutcomeSchema>;
export type Classroom = z.infer<typeof ClassroomSchema>;
export interface CurriculumAlignmentRequest {
    storyContent: string;
    gradeLevel: GradeLevel;
    subjectArea: SubjectArea;
    learningObjectives?: string[];
}
export interface CurriculumAlignmentResponse {
    alignmentScore: number;
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
//# sourceMappingURL=types.d.ts.map