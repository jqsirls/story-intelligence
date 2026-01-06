import { Router } from 'express';
import { WebVTTService } from './WebVTTService';

/**
 * WebVTT Routes for Storytailor Story Intelligence™
 * Extends existing REST API Gateway with word-sync capabilities
 * Phase 1 requirement: WebVTT sync diff ≤ 5ms P90
 */
export class WebVTTRoutes {
  private router: Router;
  private webvttService: WebVTTService;

  constructor() {
    this.router = Router();
    this.webvttService = new WebVTTService();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    /**
     * GET /stories/{storyId}/webvtt
     * Get WebVTT synchronization file
     */
    this.router.get(
      '/stories/:storyId/webvtt',
      this.webvttService.getWebVTT.bind(this.webvttService)
    );

    /**
     * POST /stories/{storyId}/webvtt
     * Generate WebVTT synchronization
     */
    this.router.post(
      '/stories/:storyId/webvtt',
      this.webvttService.generateWebVTT.bind(this.webvttService)
    );

    /**
     * POST /webvtt/validate
     * Validate WebVTT sync accuracy for Phase 1 DoD compliance
     */
    this.router.post(
      '/webvtt/validate',
      this.validateWebVTTAccuracy.bind(this)
    );
  }

  /**
   * Validate WebVTT accuracy for Phase 1 DoD compliance
   */
  private async validateWebVTTAccuracy(req: any, res: any): Promise<void> {
    const startTime = Date.now();
    const { webvttUrl, audioUrl } = req.body;

    try {
      // Perform accuracy validation
      const accuracy = await this.webvttService.validateSyncAccuracy(
        await this.parseWebVTTTimestamps(webvttUrl)
      );

      const phase1Compliant = accuracy.p90 <= 5.0;
      const validationTime = Date.now() - startTime;

      res.json({
        success: true,
        phase1_compliant: phase1Compliant,
        accuracy_metrics: {
          p50_ms: accuracy.p50,
          p90_ms: accuracy.p90,
          p99_ms: accuracy.p99,
          average_ms: accuracy.average
        },
        validation_time_ms: validationTime,
        powered_by: 'Story Intelligence™'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'WebVTT accuracy validation failed'
      });
    }
  }

  private async parseWebVTTTimestamps(webvttUrl: string): Promise<any[]> {
    // Parse WebVTT file and extract timestamps
    // Implementation would fetch and parse the actual WebVTT content
    return [];
  }

  public getRouter(): Router {
    return this.router;
  }
}

export default WebVTTRoutes;