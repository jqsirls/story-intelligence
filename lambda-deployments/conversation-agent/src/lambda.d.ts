import { Context } from 'aws-lambda';
interface LambdaEvent {
    body?: string | unknown;
    action?: string;
    requestContext?: {
        eventType?: string;
        connectionId?: string;
    };
}
export declare const handler: (event: LambdaEvent, context: Context) => Promise<unknown>;
export {};
//# sourceMappingURL=lambda.d.ts.map