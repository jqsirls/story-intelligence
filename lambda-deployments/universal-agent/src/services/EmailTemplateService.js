"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class EmailTemplateService {
    constructor() {
        this.templateDir = path.join(__dirname, '../templates/emails');
    }
    /**
     * Render inactivity warning email
     */
    async renderInactivityWarning(data) {
        // Determine which template to use
        let templateName = 'inactivity-warning-threshold.html';
        if (data.daysUntilDeletion <= 7) {
            templateName = 'inactivity-warning-final.html';
        }
        else if (data.daysUntilDeletion <= 30) {
            templateName = 'inactivity-warning-7-days.html';
        }
        const template = await this.loadTemplate(templateName);
        return this.replacePlaceholders(template, {
            daysInactive: data.daysInactive.toString(),
            daysUntilDeletion: data.daysUntilDeletion.toString(),
            tier: data.tier,
            engagementToken: data.engagementToken,
            trackingPixel: this.generateTrackingPixel(data.engagementToken, 'open'),
            APP_URL: process.env.APP_URL || 'https://storytailor.com'
        });
    }
    /**
     * Render deletion warning email
     */
    async renderDeletionWarning(data) {
        const template = await this.loadTemplate('account-deletion-reminders.html');
        return this.replacePlaceholders(template, {
            deletionType: data.deletionType,
            scheduledDeletionAt: data.scheduledDeletionAt.toLocaleDateString(),
            cancellationToken: data.cancellationToken,
            cancelUrl: `${process.env.APP_URL || 'https://storytailor.com'}/account/delete/cancel?token=${data.cancellationToken}`,
            trackingPixel: this.generateTrackingPixel(data.cancellationToken, 'open'),
            APP_URL: process.env.APP_URL || 'https://storytailor.com'
        });
    }
    /**
     * Render deletion confirmation email
     */
    async renderDeletionConfirmation(data) {
        const template = await this.loadTemplate('account-deletion-complete.html');
        return this.replacePlaceholders(template, {
            deletionType: data.deletionType
        });
    }
    /**
     * Render hibernation notification
     */
    async renderHibernationNotification(data) {
        const template = await this.loadTemplate('account-hibernated.html');
        return this.replacePlaceholders(template, {
            restoreUrl: `${process.env.APP_URL || 'https://storytailor.com'}/account/restore`,
            APP_URL: process.env.APP_URL || 'https://storytailor.com'
        });
    }
    /**
     * Load template file
     */
    async loadTemplate(filename) {
        const templatePath = path.join(this.templateDir, filename);
        try {
            return await fs.promises.readFile(templatePath, 'utf-8');
        }
        catch (error) {
            // Return default template if file doesn't exist
            return this.getDefaultTemplate(filename);
        }
    }
    /**
     * Replace placeholders in template
     */
    replacePlaceholders(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    }
    /**
     * Generate tracking pixel URL
     */
    generateTrackingPixel(token, type) {
        const baseUrl = process.env.APP_URL || 'https://storytailor.com';
        return `${baseUrl}/api/v1/email/track?token=${token}&type=${type}`;
    }
    /**
     * Get default template if file doesn't exist
     */
    getDefaultTemplate(filename) {
        // Return basic HTML template
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Storytailor</title>
      </head>
      <body>
        <h1>Storytailor</h1>
        <p>This is a default email template for ${filename}</p>
        <img src="{{trackingPixel}}" width="1" height="1" style="display:none;" />
      </body>
      </html>
    `;
    }
}
exports.EmailTemplateService = EmailTemplateService;
//# sourceMappingURL=EmailTemplateService.js.map