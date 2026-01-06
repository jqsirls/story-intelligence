export { EducationalAgent } from './EducationalAgent';
export { CurriculumAlignmentEngine } from './services/CurriculumAlignmentEngine';
export { EducationalOutcomeTracker } from './services/EducationalOutcomeTracker';
export { ClassroomManager } from './services/ClassroomManager';

export * from './types';

export type {
  Student,
  Teacher,
  BulkStudentCreationRequest,
  GroupStorytellingSession,
  ParentTeacherCommunication,
  TeacherDashboardData,
  StudentProgress,
  ClassroomAnalytics
} from './services/ClassroomManager';

export type {
  EducationalAgentConfig
} from './EducationalAgent';