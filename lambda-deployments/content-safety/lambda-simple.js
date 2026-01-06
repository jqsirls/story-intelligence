"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    let body = {};
    if (event.body) {
        try {
            body = JSON.parse(event.body);
        }
        catch (e) {
            body = event.body;
        }
    }
    const action = body.action || event.action;
    if (action === 'health') {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName: 'content-safety',
                success: true,
                data: {
                    status: 'healthy',
                    service: 'content-safety-agent',
                    features: {
                        moderationFilters: true,
                        biasDetection: true,
                        safetyScoring: true,
                    },
                },
            }),
        };
    }
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agentName: 'content-safety',
            success: true,
            data: {
                message: 'Content safety agent operational',
                availableActions: ['health', 'validate_content'],
            },
        }),
    };
};
exports.handler = handler;
//# sourceMappingURL=lambda-simple.js.map