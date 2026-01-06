/**
 * Role-Specific Dashboard Views
 * Customized data presentation for each care circle role
 */

// Define CareCircleRole enum locally to avoid cross-package import issues
export enum CareCircleRole {
  PARENT = 'parent',
  TEACHER = 'teacher',
  THERAPIST = 'therapist',
  PEDIATRICIAN = 'pediatrician',
  DAYCARE_PROVIDER = 'daycare_provider',
  FAMILY_MEMBER = 'family_member',
  EMERGENCY_CONTACT = 'emergency_contact',
  CHILD_LIFE_SPECIALIST = 'child_life_specialist'
}

export class RoleDashboardViews {
  
  /**
   * Generate dashboard view data for role
   */
  async generateDashboardView(
    role: CareCircleRole,
    childData: any,
    insights: any,
    timeframe: string
  ): Promise<any> {
    switch (role) {
      case CareCircleRole.PARENT:
        return this.generateParentView(childData, insights, timeframe);
      
      case CareCircleRole.TEACHER:
        return this.generateTeacherView(childData, insights, timeframe);
      
      case CareCircleRole.THERAPIST:
        return this.generateTherapistView(childData, insights, timeframe);
      
      case CareCircleRole.PEDIATRICIAN:
        return this.generatePediatricianView(childData, insights, timeframe);
      
      case CareCircleRole.CHILD_LIFE_SPECIALIST:
        return this.generateChildLifeView(childData, insights, timeframe);
      
      case CareCircleRole.DAYCARE_PROVIDER:
        return this.generateDaycareView(childData, insights, timeframe);
      
      case CareCircleRole.FAMILY_MEMBER:
        return this.generateFamilyMemberView(childData);
      
      default:
        return this.generateBasicView(childData, insights);
    }
  }

  /**
   * Parent Dashboard (Full Access)
   */
  private generateParentView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'parent',
      childName: childData.childName,
      timeframe,
      
      summary: {
        storiesCreated: insights.summary.storyCount,
        dominantMood: insights.summary.dominantMood,
        engagementLevel: insights.summary.engagementLevel,
        overallTrend: insights.summary.overallTrend
      },
      
      emotionalTrends: insights.emotionalTrends,
      
      insights: {
        strengths: insights.insights.filter((i: any) => i.type === 'strength'),
        concerns: insights.insights.filter((i: any) => i.type === 'concern'),
        celebrations: insights.insights.filter((i: any) => i.type === 'celebration')
      },
      
      recommendations: insights.recommendations,
      
      careCircle: {
        members: insights.careCircleMembers || [],
        pending: insights.pendingInvites || []
      },
      
      quickActions: [
        { action: 'grant_access', label: 'Invite Teacher/Therapist' },
        { action: 'export_report', label: 'Export Full Report' },
        { action: 'view_library', label: 'View Story Library' },
        { action: 'manage_children', label: 'Manage Children' }
      ]
    };
  }

  /**
   * Teacher Dashboard (SEL Focus)
   */
  private generateTeacherView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'teacher',
      studentName: childData.childName,
      grade: childData.grade,
      timeframe,
      
      selCompetencies: {
        selfAwareness: insights.sel.selfAwareness,
        selfManagement: insights.sel.selfManagement,
        socialAwareness: insights.sel.socialAwareness,
        relationshipSkills: insights.sel.relationshipSkills,
        responsibleDecisionMaking: insights.sel.responsibleDecisionMaking
      },
      
      storyPatterns: {
        themes: insights.themes,
        characterChoices: insights.characterTypes,
        problemSolvingApproach: insights.problemSolving
      },
      
      classroomRecommendations: [
        'Try collaborative story activities',
        'Encourage peer storytelling',
        'Use brave character themes for confidence building'
      ],
      
      parentCommunication: {
        strengths: insights.strengths,
        suggestions: insights.teacherSuggestions,
        conferenceNotes: insights.conferenceReady
      },
      
      quickActions: [
        { action: 'add_story', label: 'Add Story for Student' },
        { action: 'export_sel', label: 'Export SEL Report' },
        { action: 'conference_prep', label: 'Prepare for Conference' }
      ]
    };
  }

  /**
   * Therapist Dashboard (Clinical Focus)
   */
  private generateTherapistView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'therapist',
      clientName: childData.childName,
      ageAtIntake: childData.ageAtIntake,
      currentAge: childData.age,
      timeframe,
      
      clinicalSummary: {
        baselineMood: insights.clinical.baseline,
        currentMood: insights.clinical.current,
        moodStability: insights.clinical.stability,
        affectRange: insights.clinical.affectRange,
        regulationCapacity: insights.clinical.regulation
      },
      
      treatmentProgress: {
        goals: insights.treatmentGoals.map((g: any) => ({
          goal: g.description,
          progress: g.progress,
          evidence: g.evidence,
          status: g.status
        })),
        interventions: insights.interventions,
        clientResponse: insights.clientResponse
      },
      
      emotionalThemes: insights.narrativeThemes,
      
      copingMechanisms: insights.copingMechanisms,
      
      crisisIndicators: {
        current: insights.crisis.current || [],
        historical: insights.crisis.historical || [],
        riskLevel: insights.crisis.riskLevel
      },
      
      developmentalObservations: insights.developmental,
      
      quickActions: [
        { action: 'export_session_notes', label: 'Export Session Notes' },
        { action: 'export_progress', label: 'Generate Progress Report' },
        { action: 'insurance_doc', label: 'Insurance Documentation' }
      ]
    };
  }

  /**
   * Pediatrician Dashboard (Medical/Development Focus)
   */
  private generatePediatricianView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'pediatrician',
      patientName: childData.childName,
      age: childData.age,
      timeframe,
      
      developmentalScreen: {
        language: insights.development.language,
        socialEmotional: insights.development.socialEmotional,
        cognitive: insights.development.cognitive,
        overall: insights.development.overall
      },
      
      aapMilestones: insights.milestones.map((m: any) => ({
        milestone: m.description,
        achieved: m.achieved,
        ageAppropriate: m.ageAppropriate
      })),
      
      emotionalHealth: {
        baselineMood: insights.emotional.baseline,
        stability: insights.emotional.stability,
        concerns: insights.emotional.concerns
      },
      
      parentReportAlignment: {
        concordance: insights.alignment.percentage,
        discrepancies: insights.alignment.discrepancies
      },
      
      screeningResults: {
        autism: insights.screening.autism,
        adhd: insights.screening.adhd,
        anxiety: insights.screening.anxiety,
        depression: insights.screening.depression
      },
      
      recommendations: insights.recommendations,
      
      quickActions: [
        { action: 'export_well_visit', label: 'Export Well-Visit Summary' },
        { action: 'export_ehr', label: 'Export to EHR' },
        { action: 'development_screen', label: 'Full Development Screen' }
      ]
    };
  }

  /**
   * Child Life Specialist Dashboard (Hospital/Trauma Focus)
   */
  private generateChildLifeView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'child_life_specialist',
      patientName: childData.childName,
      admissionDate: childData.admissionDate,
      diagnosis: childData.diagnosis,
      timeframe,
      
      anxietyAssessment: {
        preProcedure: insights.anxiety.preProcedure,
        current: insights.anxiety.current,
        trend: insights.anxiety.trend,
        interventionsUsed: insights.anxiety.interventions
      },
      
      copingStrategies: insights.coping.map((c: any) => ({
        strategy: c.name,
        effectiveness: c.effectiveness,
        evidence: c.evidence,
        recommendContinue: c.recommend
      })),
      
      distractionPreferences: {
        stories: insights.distractions.stories,
        characters: insights.distractions.characters,
        frankie: insights.distractions.frankieEngagement
      },
      
      familySupport: {
        needs: insights.family.needs,
        resources: insights.family.resources,
        coping: insights.family.coping
      },
      
      dischargeReadiness: {
        emotional: insights.discharge.emotional,
        concerns: insights.discharge.concerns,
        homePlan: insights.discharge.homePlan
      },
      
      quickActions: [
        { action: 'add_calming_story', label: 'Add Calming Story' },
        { action: 'export_care_plan', label: 'Export Care Plan' },
        { action: 'discharge_summary', label: 'Discharge Summary' }
      ]
    };
  }

  /**
   * Daycare Provider Dashboard (Daily Care Focus)
   */
  private generateDaycareView(childData: any, insights: any, timeframe: string): any {
    return {
      role: 'daycare_provider',
      childName: childData.childName,
      age: childData.age,
      timeframe,
      
      dailyMoods: insights.daily.moods, // Last 7 days
      
      routineInsights: {
        napTime: {
          favoriteStories: insights.routines.nap.favorites,
          avgTimeToSleep: insights.routines.nap.avgTime,
          mood: insights.routines.nap.mood
        },
        transitions: {
          strategies: insights.routines.transitions.strategies,
          effectiveness: insights.routines.transitions.effectiveness
        },
        mealTime: {
          mood: insights.routines.meals.mood,
          engagement: insights.routines.meals.engagement
        }
      },
      
      storyPreferences: {
        themes: insights.preferences.themes,
        characters: insights.preferences.characters,
        length: insights.preferences.length
      },
      
      socialInteractions: insights.social,
      
      parentCommunication: {
        highlights: insights.highlights,
        concerns: insights.concerns,
        suggestions: insights.suggestions
      },
      
      quickActions: [
        { action: 'log_mood', label: 'Log Today\'s Mood' },
        { action: 'add_nap_story', label: 'Add Nap Story' },
        { action: 'daily_report', label: 'Generate Daily Report' },
        { action: 'message_parents', label: 'Message Parents' }
      ]
    };
  }

  /**
   * Family Member Dashboard (Simple Access)
   */
  private generateFamilyMemberView(childData: any): any {
    return {
      role: 'family_member',
      childName: childData.childName,
      
      recentStories: childData.stories.slice(0, 10).map((s: any) => ({
        title: s.title,
        theme: s.theme,
        createdAt: s.createdAt
      })),
      
      favorites: childData.favorites,
      
      currentMood: childData.currentMood,
      
      themes: childData.topThemes,
      
      quickActions: [
        { action: 'read_story', label: 'Read Story Together' },
        { action: 'view_characters', label: 'See Characters' }
      ]
    };
  }

  /**
   * Basic view fallback
   */
  private generateBasicView(childData: any, insights: any): any {
    return {
      role: 'basic',
      childName: childData.childName,
      summary: insights.summary,
      recentStories: childData.stories.slice(0, 5)
    };
  }
}

