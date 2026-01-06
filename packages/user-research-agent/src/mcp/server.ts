/**
 * Fieldnotes MCP Server
 * Exposes research agent capabilities via Model Context Protocol
 */

// MCP SDK imports
// @ts-ignore - MCP SDK module resolution
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// @ts-ignore
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// @ts-ignore
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ResearchEngine } from '../core/ResearchEngine';
import { Event, Feature } from '../types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: 'fieldnotes_analyze',
    description: 'Analyze user behavior patterns and surface insights from Fieldnotes research intelligence',
    inputSchema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of events to analyze'
        },
        timeframe: {
          type: 'string',
          description: 'Time period to analyze (e.g., "7 days", "30 days")',
          default: '7 days'
        },
        focus: {
          type: 'string',
          enum: ['buyer', 'user', 'all'],
          description: 'Analysis focus: buyer persona, user persona, or both',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'fieldnotes_challenge_decision',
    description: 'Run adversarial pre-mortem analysis on a proposed feature before shipping',
    inputSchema: {
      type: 'object',
      properties: {
        feature: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            targetAudience: { type: 'string' },
            successMetrics: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['name', 'description', 'targetAudience'],
          description: 'Feature specification to analyze'
        }
      },
      required: ['feature']
    }
  },
  {
    name: 'fieldnotes_generate_brief',
    description: 'Generate research brief with insights from all five tracks',
    inputSchema: {
      type: 'object',
      properties: {
        tracks: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'continuous_insight_mining',
              'buyer_reality_check',
              'user_experience_guardrails',
              'concept_interrogation',
              'brand_consistency'
            ]
          },
          description: 'Tracks to include in brief (default: all)'
        },
        format: {
          type: 'string',
          enum: ['markdown', 'json'],
          description: 'Output format',
          default: 'markdown'
        }
      }
    }
  },
  {
    name: 'fieldnotes_interrogate_agent',
    description: 'Challenge another agent with a data-backed question',
    inputSchema: {
      type: 'object',
      properties: {
        agentName: {
          type: 'string',
          description: 'Name of the agent to challenge (e.g., "content-agent")'
        },
        question: {
          type: 'string',
          description: 'Data-backed question to ask the agent'
        }
      },
      required: ['agentName', 'question']
    }
  }
];

/**
 * Start MCP server
 */
async function main() {
  // Initialize research engine
  const engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);
  await engine.initialize();

  // Create MCP server
  const server = new Server(
    {
      name: 'fieldnotes-research-agent',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools
  // @ts-ignore - MCP SDK types
  server.setRequestHandler('tools/list', async () => ({
    tools: TOOLS
  }));

  // Handle tool calls
  // @ts-ignore - MCP SDK types
  server.setRequestHandler('tools/call', async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'fieldnotes_analyze': {
          const result = await engine.analyzeOnDemand({
            tenantId: 'storytailor', // Default to storytailor for now
            timeframe: args.timeframe || '7 days',
            focus: args.focus,
            events: args.events
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'fieldnotes_challenge_decision': {
          const feature: Feature = args.feature;
          const memo = await engine.generatePreLaunchMemo('storytailor', feature);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(memo, null, 2)
              }
            ]
          };
        }

        case 'fieldnotes_generate_brief': {
          const brief = await engine.generateWeeklyBrief('storytailor');

          return {
            content: [
              {
                type: 'text',
                text: args.format === 'json' ? 
                  JSON.stringify(brief, null, 2) : 
                  brief.content
              }
            ]
          };
        }

        case 'fieldnotes_interrogate_agent': {
          const challenge = await engine.challengeAgent(
            'storytailor',
            args.agentName,
            args.question
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(challenge, null, 2)
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Fieldnotes MCP server running');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  process.exit(0);
});

// Start server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
