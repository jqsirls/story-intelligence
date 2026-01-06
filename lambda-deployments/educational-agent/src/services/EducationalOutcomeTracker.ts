import { 
  EducationalOutcome, 
  LearningObjective,
  EducationalAssessmentRequest,
  EducationalAssessmentResponse,
  GradeLevel,
  SubjectArea
} from '../types';

export interface StudentProgress {
  studentId: string;
  objectiveId: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  totalTimeSpent: number;
  lastAttemptDate: Date;
  masteryLevel: 'not-started' | 'developing' | 'proficient' | 'advanced';
  trends: {
    improving: boolean;
    stagnant: boolean;
    declining: boolean;
  };
}

export interface ClassroomAnalytics {
  classroomId: string;
  totalStudents: number;
  activeStudents: number;
  averageEngagement: number;
  objectiveProgress: Array<{
    objectiveId: string;
    studentsStarted: number;
    studentsCompleted: number;
    averageScore: number;
    averageTime: number;
  }>;
  strugglingStudents: string[];
  exceedingStudents: string[];
  recommendedInterventions: string[];
}

export class EducationalOutcomeTracker {
  private outcomes: Map<string, EducationalOutcome[]> = new Map();
  private studentProgress: Map<string, StudentProgress[]> = new Map();

  /**
   * Record educational outcome for a student
   */
  async recordOutcome(outcome: EducationalOutcome): Promise<void> {
    const studentOutcomes = this.outcomes.get(outcome.studentId) || [];
    studentOutcomes.push(outcome);
    this.outcomes.set(outcome.studentId, studentOutcomes);

    // Update progress tracking
    await this.updateStudentProgress(outcome);
  }

  /**
   * Assess student responses and generate educational feedback
   */
  async assessStudent(request: EducationalAssessmentRequest): Promise<EducationalAssessmentResponse> {
    const { studentId, storyId, responses } = request;

    // Calculate overall score
    const overallScore = this.calculateOverallScore(responses);

    // Analyze objective-specific performance
    const objectiveScores = await this.analyzeObjectivePerformance(responses, storyId);

    // Generate personalized recommendations
    const recommendations = await this.generateRecommendations(studentId, objectiveScores);

    // Determine next steps
    const nextSteps = await this.determineNextSteps(studentId, objectiveScores);

    return {
      overallScore,
      objectiveScores,
      recommendations,
      nextSteps
    };
  }

  /**
   * Get student progress for specific learning objectives
   */
  async getStudentProgress(
    studentId: string, 
    objectiveIds?: string[]
  ): Promise<StudentProgress[]> {
    const allProgress = this.studentProgress.get(studentId) || [];
    
    if (objectiveIds && objectiveIds.length > 0) {
      return allProgress.filter(progress => objectiveIds.includes(progress.objectiveId));
    }
    
    return allProgress;
  }

  /**
   * Generate classroom analytics and insights
   */
  async generateClassroomAnalytics(
    classroomId: string,
    studentIds: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<ClassroomAnalytics> {
    const analytics: ClassroomAnalytics = {
      classroomId,
      totalStudents: studentIds.length,
      activeStudents: 0,
      averageEngagement: 0,
      objectiveProgress: [],
      strugglingStudents: [],
      exceedingStudents: [],
      recommendedInterventions: []
    };

    // Calculate active students (those with recent activity)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    for (const studentId of studentIds) {
      const studentOutcomes = this.outcomes.get(studentId) || [];
      const recentOutcomes = studentOutcomes.filter(outcome => 
        outcome.achievedAt >= recentDate
      );
      
      if (recentOutcomes.length > 0) {
        analytics.activeStudents++;
      }
    }

    // Calculate average engagement
    let totalEngagement = 0;
    let engagementCount = 0;

    for (const studentId of studentIds) {
      const studentOutcomes = this.outcomes.get(studentId) || [];
      for (const outcome of studentOutcomes) {
        const engagement = this.calculateEngagementScore(outcome.engagementMetrics);
        totalEngagement += engagement;
        engagementCount++;
      }
    }

    analytics.averageEngagement = engagementCount > 0 ? totalEngagement / engagementCount : 0;

    // Analyze objective progress across classroom
    const objectiveMap = new Map<string, {
      started: Set<string>;
      completed: Set<string>;
      scores: number[];
      times: number[];
    }>();

    for (const studentId of studentIds) {
      const studentOutcomes = this.outcomes.get(studentId) || [];
      
      for (const outcome of studentOutcomes) {
        if (!objectiveMap.has(outcome.learningObjectiveId)) {
          objectiveMap.set(outcome.learningObjectiveId, {
            started: new Set(),
            completed: new Set(),
            scores: [],
            times: []
          });
        }

        const objData = objectiveMap.get(outcome.learningObjectiveId)!;
        objData.started.add(studentId);
        
        if (outcome.assessmentScore >= 70) { // Proficiency threshold
          objData.completed.add(studentId);
        }
        
        objData.scores.push(outcome.assessmentScore);
        objData.times.push(outcome.completionTime);
      }
    }

    // Convert to analytics format
    for (const [objectiveId, data] of objectiveMap) {
      analytics.objectiveProgress.push({
        objectiveId,
        studentsStarted: data.started.size,
        studentsCompleted: data.completed.size,
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        averageTime: data.times.reduce((a, b) => a + b, 0) / data.times.length
      });
    }

    // Identify struggling and exceeding students
    for (const studentId of studentIds) {
      const progress = await this.getStudentProgress(studentId);
      const averageScore = this.calculateAverageScore(progress);
      const masteryCount = progress.filter(p => p.masteryLevel === 'proficient' || p.masteryLevel === 'advanced').length;
      
      if (averageScore < 60 || masteryCount < progress.length * 0.3) {
        analytics.strugglingStudents.push(studentId);
      } else if (averageScore > 90 && masteryCount > progress.length * 0.8) {
        analytics.exceedingStudents.push(studentId);
      }
    }

    // Generate intervention recommendations
    analytics.recommendedInterventions = this.generateInterventionRecommendations(analytics);

    return analytics;
  }

  /**
   * Generate learning objective mastery report
   */
  async generateMasteryReport(
    studentId: string,
    gradeLevel: GradeLevel,
    subjectArea: SubjectArea
  ): Promise<{
    overallMastery: number;
    objectiveMastery: Array<{
      objectiveId: string;
      masteryLevel: string;
      score: number;
      timeSpent: number;
      recommendations: string[];
    }>;
    strengths: string[];
    areasForImprovement: string[];
    nextObjectives: string[];
  }> {
    const progress = await this.getStudentProgress(studentId);
    const relevantProgress = progress.filter(p => {
      // Filter by grade level and subject area if needed
      // This would require additional metadata in the progress records
      return true;
    });

    const objectiveMastery = relevantProgress.map(p => ({
      objectiveId: p.objectiveId,
      masteryLevel: p.masteryLevel,
      score: p.bestScore,
      timeSpent: p.totalTimeSpent,
      recommendations: this.generateObjectiveRecommendations(p)
    }));

    const overallMastery = this.calculateOverallMastery(relevantProgress);
    const strengths = this.identifyStrengths(relevantProgress);
    const areasForImprovement = this.identifyAreasForImprovement(relevantProgress);
    const nextObjectives = await this.suggestNextObjectives(studentId, relevantProgress);

    return {
      overallMastery,
      objectiveMastery,
      strengths,
      areasForImprovement,
      nextObjectives
    };
  }

  // Private helper methods

  private async updateStudentProgress(outcome: EducationalOutcome): Promise<void> {
    const studentProgress = this.studentProgress.get(outcome.studentId) || [];
    
    let existingProgress = studentProgress.find(p => p.objectiveId === outcome.learningObjectiveId);
    
    if (!existingProgress) {
      existingProgress = {
        studentId: outcome.studentId,
        objectiveId: outcome.learningObjectiveId,
        attempts: 0,
        bestScore: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastAttemptDate: outcome.achievedAt,
        masteryLevel: 'not-started',
        trends: {
          improving: false,
          stagnant: false,
          declining: false
        }
      };
      studentProgress.push(existingProgress);
    }

    // Update progress metrics
    existingProgress.attempts++;
    existingProgress.bestScore = Math.max(existingProgress.bestScore, outcome.assessmentScore);
    existingProgress.averageScore = this.calculateNewAverage(
      existingProgress.averageScore,
      outcome.assessmentScore,
      existingProgress.attempts
    );
    existingProgress.totalTimeSpent += outcome.completionTime;
    existingProgress.lastAttemptDate = outcome.achievedAt;

    // Update mastery level
    existingProgress.masteryLevel = this.determineMasteryLevel(existingProgress.bestScore);

    // Update trends
    existingProgress.trends = this.analyzeTrends(outcome.studentId, outcome.learningObjectiveId);

    this.studentProgress.set(outcome.studentId, studentProgress);
  }

  private calculateOverallScore(responses: Array<{ questionId: string; answer: string; timeSpent: number }>): number {
    if (responses.length === 0) return 0;
    
    // Simplified scoring - in real implementation would use rubrics
    let totalScore = 0;
    for (const response of responses) {
      // Basic scoring based on response length and time spent
      const lengthScore = Math.min(response.answer.length / 10, 10) * 5;
      const timeScore = Math.min(response.timeSpent / 60, 5) * 10; // Up to 5 minutes
      totalScore += Math.min(lengthScore + timeScore, 100);
    }
    
    return totalScore / responses.length;
  }

  private async analyzeObjectivePerformance(
    responses: Array<{ questionId: string; answer: string; timeSpent: number }>,
    storyId: string
  ): Promise<Array<{ objectiveId: string; score: number; feedback: string }>> {
    // This would map questions to learning objectives
    // Simplified implementation
    return responses.map((response, index) => ({
      objectiveId: `objective_${index + 1}`,
      score: Math.min(response.answer.length * 2, 100),
      feedback: response.answer.length > 20 ? 'Good detailed response' : 'Consider providing more detail'
    }));
  }

  private async generateRecommendations(
    studentId: string,
    objectiveScores: Array<{ objectiveId: string; score: number; feedback: string }>
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    const lowScores = objectiveScores.filter(obj => obj.score < 70);
    const highScores = objectiveScores.filter(obj => obj.score >= 90);
    
    if (lowScores.length > 0) {
      recommendations.push('Focus on practicing the concepts that need improvement');
      recommendations.push('Try creating stories that specifically address challenging areas');
    }
    
    if (highScores.length > 0) {
      recommendations.push('Great work! Consider exploring more advanced concepts');
      recommendations.push('Help classmates who might be struggling with these topics');
    }
    
    return recommendations;
  }

  private async determineNextSteps(
    studentId: string,
    objectiveScores: Array<{ objectiveId: string; score: number; feedback: string }>
  ): Promise<string[]> {
    const nextSteps: string[] = [];
    
    const averageScore = objectiveScores.reduce((sum, obj) => sum + obj.score, 0) / objectiveScores.length;
    
    if (averageScore < 60) {
      nextSteps.push('Review foundational concepts before moving forward');
      nextSteps.push('Work with teacher or tutor for additional support');
    } else if (averageScore >= 80) {
      nextSteps.push('Ready to advance to more challenging objectives');
      nextSteps.push('Consider peer tutoring opportunities');
    } else {
      nextSteps.push('Continue practicing current objectives');
      nextSteps.push('Focus on areas needing improvement');
    }
    
    return nextSteps;
  }

  private calculateEngagementScore(metrics: any): number {
    const { interactionCount, choicesMade, questionsAsked, vocabularyUsed } = metrics;
    
    // Weighted engagement calculation
    const interactionScore = Math.min(interactionCount * 2, 30);
    const choiceScore = Math.min(choicesMade * 5, 25);
    const questionScore = Math.min(questionsAsked * 10, 25);
    const vocabularyScore = Math.min(vocabularyUsed.length * 2, 20);
    
    return interactionScore + choiceScore + questionScore + vocabularyScore;
  }

  private calculateAverageScore(progress: StudentProgress[]): number {
    if (progress.length === 0) return 0;
    return progress.reduce((sum, p) => sum + p.averageScore, 0) / progress.length;
  }

  private generateInterventionRecommendations(analytics: ClassroomAnalytics): string[] {
    const recommendations: string[] = [];
    
    if (analytics.strugglingStudents.length > analytics.totalStudents * 0.3) {
      recommendations.push('Consider reviewing foundational concepts with the entire class');
      recommendations.push('Implement small group instruction for struggling students');
    }
    
    if (analytics.averageEngagement < 60) {
      recommendations.push('Increase interactive elements in storytelling activities');
      recommendations.push('Consider gamification elements to boost engagement');
    }
    
    if (analytics.exceedingStudents.length > 0) {
      recommendations.push('Provide enrichment activities for advanced students');
      recommendations.push('Consider peer tutoring programs');
    }
    
    return recommendations;
  }

  private calculateNewAverage(currentAverage: number, newScore: number, totalAttempts: number): number {
    return ((currentAverage * (totalAttempts - 1)) + newScore) / totalAttempts;
  }

  private determineMasteryLevel(score: number): 'not-started' | 'developing' | 'proficient' | 'advanced' {
    if (score >= 90) return 'advanced';
    if (score >= 70) return 'proficient';
    if (score >= 50) return 'developing';
    return 'not-started';
  }

  private analyzeTrends(studentId: string, objectiveId: string): {
    improving: boolean;
    stagnant: boolean;
    declining: boolean;
  } {
    const outcomes = this.outcomes.get(studentId) || [];
    const objectiveOutcomes = outcomes
      .filter(o => o.learningObjectiveId === objectiveId)
      .sort((a, b) => a.achievedAt.getTime() - b.achievedAt.getTime());

    if (objectiveOutcomes.length < 2) {
      return { improving: false, stagnant: true, declining: false };
    }

    const recent = objectiveOutcomes.slice(-3);
    const scores = recent.map(o => o.assessmentScore);
    
    const isImproving = scores.every((score, i) => i === 0 || score >= scores[i - 1]);
    const isDeclining = scores.every((score, i) => i === 0 || score <= scores[i - 1]);
    const isStagnant = !isImproving && !isDeclining;

    return {
      improving: isImproving,
      stagnant: isStagnant,
      declining: isDeclining
    };
  }

  private generateObjectiveRecommendations(progress: StudentProgress): string[] {
    const recommendations: string[] = [];
    
    if (progress.masteryLevel === 'developing') {
      recommendations.push('Continue practicing this objective');
      recommendations.push('Try different story types to reinforce learning');
    } else if (progress.masteryLevel === 'proficient') {
      recommendations.push('Great progress! Consider more challenging variations');
    } else if (progress.masteryLevel === 'advanced') {
      recommendations.push('Excellent mastery! Help others or explore related concepts');
    }
    
    if (progress.trends.declining) {
      recommendations.push('Review recent work to identify areas of confusion');
    }
    
    return recommendations;
  }

  private calculateOverallMastery(progress: StudentProgress[]): number {
    if (progress.length === 0) return 0;
    
    const masteryScores = progress.map(p => {
      switch (p.masteryLevel) {
        case 'advanced': return 100;
        case 'proficient': return 80;
        case 'developing': return 60;
        default: return 0;
      }
    });
    
    return masteryScores.reduce((sum, score) => sum + score, 0) / masteryScores.length;
  }

  private identifyStrengths(progress: StudentProgress[]): string[] {
    const strengths: string[] = [];
    const masteredObjectives = progress.filter(p => 
      p.masteryLevel === 'proficient' || p.masteryLevel === 'advanced'
    );
    
    if (masteredObjectives.length > 0) {
      strengths.push(`Strong performance in ${masteredObjectives.length} learning objectives`);
    }
    
    const improvingObjectives = progress.filter(p => p.trends.improving);
    if (improvingObjectives.length > 0) {
      strengths.push(`Showing improvement in ${improvingObjectives.length} areas`);
    }
    
    return strengths;
  }

  private identifyAreasForImprovement(progress: StudentProgress[]): string[] {
    const areas: string[] = [];
    const strugglingObjectives = progress.filter(p => 
      p.masteryLevel === 'not-started' || p.masteryLevel === 'developing'
    );
    
    if (strugglingObjectives.length > 0) {
      areas.push(`Need additional practice in ${strugglingObjectives.length} objectives`);
    }
    
    const decliningObjectives = progress.filter(p => p.trends.declining);
    if (decliningObjectives.length > 0) {
      areas.push(`Review needed for ${decliningObjectives.length} previously mastered concepts`);
    }
    
    return areas;
  }

  private async suggestNextObjectives(studentId: string, progress: StudentProgress[]): Promise<string[]> {
    // This would use curriculum sequencing logic
    // Simplified implementation
    const masteredCount = progress.filter(p => 
      p.masteryLevel === 'proficient' || p.masteryLevel === 'advanced'
    ).length;
    
    return [
      `Next objective based on current progress level ${masteredCount}`,
      'Continue building on current strengths',
      'Address any gaps in foundational skills'
    ];
  }
}