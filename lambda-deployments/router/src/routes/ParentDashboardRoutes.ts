/**
 * Parent Dashboard API Routes
 * Accessed via adult verification gate
 * Returns emotional insights, trends, and recommendations
 */

import { Router } from 'express';

export class ParentDashboardRoutes {
  private router: Router;

  constructor(
    private emotionAgent: any,
    private libraryAgent: any
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get all children for family
    this.router.get('/children/:parentLibraryId', this.getChildren.bind(this));

    // Individual child insights
    this.router.get('/insights/child/:childLibraryId', this.getChildInsights.bind(this));

    // Family aggregate insights
    this.router.get('/insights/family/:familyLibraryId', this.getFamilyInsights.bind(this));

    // Full emotional intelligence report
    this.router.get('/report/:childLibraryId', this.getFullReport.bind(this));

    // Grant teacher/therapist access
    this.router.post('/permissions/grant', this.grantPermission.bind(this));

    // Revoke access
    this.router.delete('/permissions/:permissionId', this.revokePermission.bind(this));

    // Export insights
    this.router.get('/export/:childLibraryId', this.exportInsights.bind(this));
  }

  /**
   * GET /parent/children/:parentLibraryId
   * List all children in family
   */
  private async getChildren(req: any, res: any): Promise<void> {
    try {
      const { parentLibraryId } = req.params;
      const userId = req.user?.id; // From auth middleware

      // Get sub-libraries
      const children = await this.libraryAgent.getSubLibraries(parentLibraryId, {
        user_id: userId,
        session_id: req.headers['x-session-id'],
        correlation_id: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          parentLibraryId,
          children: children.map((lib: any) => ({
            libraryId: lib.id,
            firstName: lib.name,
            storiesCount: lib.stats?.story_count || 0,
            lastActive: lib.stats?.last_story_created || lib.created_at
          }))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /parent/insights/child/:childLibraryId?timeframe=week
   * Individual child insights
   */
  private async getChildInsights(req: any, res: any): Promise<void> {
    try {
      const { childLibraryId } = req.params;
      const timeframe = req.query.timeframe || 'week'; // day, week, month, quarter, year
      const userId = req.user?.id;

      const timeRange = this.getTimeRange(timeframe);

      // Generate parental report
      const report = await this.emotionAgent.generateParentalReport(
        userId,
        childLibraryId,
        timeRange
      );

      // Get story stats
      const stories = await this.libraryAgent.getLibraryStories(childLibraryId, {
        user_id: userId,
        session_id: req.headers['x-session-id'],
        correlation_id: req.headers['x-request-id']
      });

      res.json({
        success: true,
        data: {
          childLibraryId,
          timeframe,
          insights: report,
          stats: {
            storiesCreated: stories.length,
            timeRange
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /parent/insights/family/:familyLibraryId?breakdown=per_child
   * Aggregate family insights
   */
  private async getFamilyInsights(req: any, res: any): Promise<void> {
    try {
      const { familyLibraryId } = req.params;
      const breakdown = req.query.breakdown === 'per_child';
      const timeframe = req.query.timeframe || 'month';
      const userId = req.user?.id;

      const timeRange = this.getTimeRange(timeframe);

      // Get all children
      const children = await this.libraryAgent.getSubLibraries(familyLibraryId, {
        user_id: userId,
        session_id: req.headers['x-session-id'],
        correlation_id: req.headers['x-request-id']
      });

      if (breakdown) {
        // Per-child breakdown
        const childInsights = await Promise.all(
          children.map(async (child: any) => {
            const report = await this.emotionAgent.generateParentalReport(
              userId,
              child.id,
              timeRange
            );
            return {
              childName: child.name,
              libraryId: child.id,
              insights: report
            };
          })
        );

        res.json({
          success: true,
          data: {
            familyLibraryId,
            timeframe,
            breakdown: childInsights,
            summary: this.generateFamilySummary(childInsights)
          }
        });
      } else {
        // Aggregate insights
        const allReports = await Promise.all(
          children.map((child: any) =>
            this.emotionAgent.generateParentalReport(userId, child.id, timeRange)
          )
        );

        const aggregate = this.aggregateInsights(allReports, children);

        res.json({
          success: true,
          data: {
            familyLibraryId,
            timeframe,
            aggregate
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /parent/report/:childLibraryId
   * Full emotional intelligence report
   */
  private async getFullReport(req: any, res: any): Promise<void> {
    try {
      const { childLibraryId } = req.params;
      const timeframe = req.query.timeframe || 'month';
      const userId = req.user?.id;

      const timeRange = this.getTimeRange(timeframe);

      const report = await this.emotionAgent.generateEmotionalIntelligenceReport(
        userId,
        timeRange
      );

      res.json({
        success: true,
        data: {
          childLibraryId,
          timeframe,
          report,
          exportOptions: {
            pdf: `/parent/export/${childLibraryId}?format=pdf`,
            json: `/parent/export/${childLibraryId}?format=json`,
            therapist: `/parent/export/${childLibraryId}?format=therapist`
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /parent/permissions/grant
   * Grant teacher/therapist access
   */
  private async grantPermission(req: any, res: any): Promise<void> {
    try {
      const { childLibraryId, email, role, scope, expiresAt } = req.body;
      const userId = req.user?.id;

      // Create permission (would integrate with LibraryAgent.PermissionService)
      const permission = await this.libraryAgent.grantPermission(
        childLibraryId,
        {
          user_id: email, // Email-based invitation
          role: role || 'Viewer', // Viewer, Editor
          scope: scope || 'insights_only', // insights_only, stories, full
          expires_at: expiresAt
        },
        {
          user_id: userId,
          session_id: req.headers['x-session-id'],
          correlation_id: req.headers['x-request-id']
        }
      );

      res.json({
        success: true,
        data: {
          permissionId: permission.id,
          message: `Access granted to ${email}`,
          expiresAt
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /parent/permissions/:permissionId
   * Revoke access
   */
  private async revokePermission(req: any, res: any): Promise<void> {
    try {
      const { permissionId } = req.params;
      const userId = req.user?.id;

      // Would integrate with LibraryAgent.PermissionService
      await this.libraryAgent.revokePermission(permissionId, {
        user_id: userId,
        session_id: req.headers['x-session-id'],
        correlation_id: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'Access revoked'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /parent/export/:childLibraryId?format=pdf
   * Export insights
   */
  private async exportInsights(req: any, res: any): Promise<void> {
    try {
      const { childLibraryId } = req.params;
      const format = req.query.format || 'json'; // json, pdf, therapist
      const timeframe = req.query.timeframe || 'month';
      const userId = req.user?.id;

      const timeRange = this.getTimeRange(timeframe);

      const report = await this.emotionAgent.generateEmotionalIntelligenceReport(
        userId,
        timeRange
      );

      if (format === 'json') {
        res.json({
          success: true,
          data: report
        });
      } else if (format === 'pdf') {
        // Would generate PDF (future enhancement)
        res.json({
          success: true,
          message: 'PDF export coming soon',
          data: { downloadUrl: '#' }
        });
      } else if (format === 'therapist') {
        // Professional format with clinical language
        res.json({
          success: true,
          data: {
            ...report,
            clinicalNotes: this.formatForTherapist(report)
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Helper: Convert timeframe to date range
   */
  private getTimeRange(timeframe: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();

    switch (timeframe) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        start.setDate(now.getDate() - 90);
        break;
      case 'year':
        start.setDate(now.getDate() - 365);
        break;
      case 'all':
        start.setFullYear(2020); // Beginning of time
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  }

  /**
   * Helper: Aggregate insights from multiple children
   */
  private aggregateInsights(reports: any[], children: any[]): any {
    return {
      totalChildren: children.length,
      overallTrend: this.calculateOverallTrend(reports),
      childSummaries: reports.map((report, idx) => ({
        name: children[idx].name,
        dominantMood: report.summary.dominantMood,
        storyCount: report.summary.storyCount || 0,
        topTheme: report.insights[0]?.type || 'exploration'
      })),
      familyHighlights: this.extractFamilyHighlights(reports),
      recommendations: this.generateFamilyRecommendations(reports)
    };
  }

  /**
   * Helper: Generate family summary
   */
  private generateFamilySummary(childInsights: any[]): any {
    return {
      totalStories: childInsights.reduce((sum, child) => 
        sum + (child.insights.emotionalTrends?.length || 0), 0),
      overallMood: 'positive', // Would calculate from all children
      highlights: [
        `${childInsights.length} children actively creating`,
        'All children showing positive engagement',
        'Strong creativity across the family'
      ]
    };
  }

  private calculateOverallTrend(reports: any[]): string {
    // Calculate aggregate mood trend
    return 'positive'; // Would aggregate from all reports
  }

  private extractFamilyHighlights(reports: any[]): string[] {
    return [
      'Family loves adventure stories',
      'Strong creativity and imagination',
      'Positive emotional engagement'
    ];
  }

  private generateFamilyRecommendations(reports: any[]): string[] {
    return [
      'Try collaborative stories where siblings work together',
      'Each child has unique preferences - celebrate their individuality',
      'Consider family story nights to share creations'
    ];
  }

  private formatForTherapist(report: any): any {
    return {
      clinicalSummary: 'Professional formatted insights for therapeutic use',
      observedPatterns: report.summary.developmentalInsights,
      recommendations: report.interventionRecommendations,
      disclaimer: 'This report is generated by AI and should be reviewed by licensed professionals'
    };
  }

  getRouter(): Router {
    return this.router;
  }
}

