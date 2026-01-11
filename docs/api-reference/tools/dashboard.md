# Developer Dashboard

The Storytailor Developer Dashboard provides comprehensive tools for managing your API keys, monitoring usage, analyzing performance, and accessing developer resources.

> **Product REST API note**: “API keys” in dashboard docs refer to SDK/partner surfaces and are not the product REST API contract.  
> For product REST (JWT auth, `/api/v1` routes), use `docs/api/REST_API_EXPERIENCE_MASTER.md`.

## 🚀 Access the Dashboard

**[Launch Developer Dashboard →](https://dashboard.storytailor.com)**

## 📊 Dashboard Overview

### Main Dashboard Features

**API Management**
- API key creation and management
- Usage monitoring and analytics
- Rate limiting and quota management
- Webhook configuration

**Analytics and Insights**
- Real-time usage metrics
- Performance analytics
- Error tracking and debugging
- User engagement insights

**Developer Tools**
- Interactive API explorer
- Code generation tools
- Testing environments
- Documentation access

**Account Management**
- Billing and subscription management
- Team member access control
- Support ticket management
- Account settings

## 🔑 API Key Management

### Creating API Keys

#### Generate New API Key

```javascript
// Dashboard API for programmatic key management
const dashboard = new StorytellerDashboard({
  authToken: 'your-auth-token'
});

// Create new API key
const apiKey = await dashboard.apiKeys.create({
  name: 'Production App',
  environment: 'production',
  permissions: ['conversations', 'stories', 'voice'],
  rateLimit: {
    requestsPerMinute: 1000,
    requestsPerDay: 50000
  },
  restrictions: {
    allowedDomains: ['yourapp.com', '*.yourapp.com'],
    allowedIPs: ['192.168.1.0/24'],
    expiresAt: '2024-12-31T23:59:59Z'
  }
});

console.log('API Key:', apiKey.key);
console.log('Secret:', apiKey.secret);
```

#### API Key Types

**Public Keys (pk_...)**
- Safe for client-side use
- Limited permissions
- Domain and IP restrictions
- Read-only operations

**Secret Keys (sk_...)**
- Server-side use only
- Full API access
- Administrative operations
- Billing and account management

**Restricted Keys (rk_...)**
- Custom permission sets
- Specific endpoint access
- Time-limited access
- Audit trail tracking

## 📈 Usage Analytics

### Real-Time Metrics

```javascript
// Real-time usage monitoring
const usageMonitor = new UsageMonitor({
  apiKey: 'your-api-key',
  realTime: true
});

// Subscribe to real-time updates
usageMonitor.on('usage-update', (data) => {
  updateDashboard({
    requestsPerSecond: data.rps,
    activeUsers: data.activeUsers,
    errorRate: data.errorRate,
    responseTime: data.avgResponseTime
  });
});

// Get historical usage data
const usageData = await usageMonitor.getUsage({
  timeframe: '7d',
  granularity: 'hour',
  metrics: ['requests', 'errors', 'response_time', 'unique_users']
});
```

## 🔧 Webhook Management

### Webhook Configuration

```javascript
// Configure webhooks through the dashboard
const webhookConfig = {
  endpoints: [
    {
      name: 'Production Webhook',
      url: 'https://yourapp.com/webhooks/storytailor',
      events: [
        'story.completed',
        'character.created',
        'user.registered',
        'subscription.updated'
      ],
      secret: 'your-webhook-secret',
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    }
  ]
};

await DashboardAPI.webhooks.configure(webhookConfig);
```

## 💰 Billing and Usage Management

### Subscription Management

```javascript
// Billing dashboard functionality
const billingDashboard = {
  // Get current subscription
  getSubscription: async () => {
    return await DashboardAPI.billing.getSubscription();
  },

  // Get current usage
  getCurrentUsage: async () => {
    return await DashboardAPI.billing.getCurrentUsage();
  },

  // Upgrade plan
  upgradePlan: async (planId) => {
    return await DashboardAPI.billing.upgradePlan(planId);
  },

  // Get invoices
  getInvoices: async () => {
    return await DashboardAPI.billing.getInvoices();
  }
};
```

## 👥 Team Management

### Team Access Control

```javascript
// Team management functionality
const teamManagement = {
  // Add team member
  addMember: async (email, role, permissions) => {
    return await DashboardAPI.team.invite({
      email,
      role, // 'admin', 'developer', 'viewer'
      permissions: {
        apiKeys: permissions.includes('api-keys'),
        billing: permissions.includes('billing'),
        analytics: permissions.includes('analytics'),
        webhooks: permissions.includes('webhooks')
      }
    });
  },

  // Update member permissions
  updateMember: async (memberId, updates) => {
    return await DashboardAPI.team.updateMember(memberId, updates);
  },

  // Remove team member
  removeMember: async (memberId) => {
    return await DashboardAPI.team.removeMember(memberId);
  }
};
```

## 🔍 Debugging and Troubleshooting

### Error Tracking

```javascript
// Error tracking and debugging tools
const debugTools = {
  // Get error logs
  getErrorLogs: async (filters = {}) => {
    return await DashboardAPI.debug.getErrorLogs({
      timeframe: filters.timeframe || '24h',
      severity: filters.severity || 'all',
      endpoint: filters.endpoint,
      userId: filters.userId
    });
  },

  // Get request trace
  getRequestTrace: async (requestId) => {
    return await DashboardAPI.debug.getRequestTrace(requestId);
  },

  // Replay request
  replayRequest: async (requestId) => {
    return await DashboardAPI.debug.replayRequest(requestId);
  }
};
```

## 📞 Support Integration

### Support Ticket Management

```javascript
// Integrated support system
const supportSystem = {
  // Create support ticket
  createTicket: async (ticketData) => {
    return await DashboardAPI.support.createTicket({
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority, // 'low', 'medium', 'high', 'urgent'
      category: ticketData.category, // 'technical', 'billing', 'feature-request'
      attachments: ticketData.attachments
    });
  },

  // Get support tickets
  getTickets: async (filters = {}) => {
    return await DashboardAPI.support.getTickets(filters);
  },

  // Update ticket
  updateTicket: async (ticketId, updates) => {
    return await DashboardAPI.support.updateTicket(ticketId, updates);
  }
};
```

## 🚀 Quick Actions and Shortcuts

### Dashboard Shortcuts

```javascript
// Keyboard shortcuts and quick actions
const dashboardShortcuts = {
  // Global shortcuts
  'cmd+k': () => openCommandPalette(),
  'cmd+/': () => openHelpCenter(),
  'cmd+n': () => createNewAPIKey(),
  'cmd+t': () => openAPIExplorer(),
  
  // Navigation shortcuts
  'g h': () => navigateTo('/dashboard'),
  'g a': () => navigateTo('/analytics'),
  'g k': () => navigateTo('/api-keys'),
  'g w': () => navigateTo('/webhooks'),
  'g b': () => navigateTo('/billing'),
  'g s': () => navigateTo('/support')
};
```

---

## Quick Links

- 📊 **[Launch Dashboard](https://dashboard.storytailor.com)**
- 🔑 **[API Key Management](https://dashboard.storytailor.com/api-keys)**
- 📈 **[Analytics](https://dashboard.storytailor.com/analytics)**
- 🔧 **[Webhooks](https://dashboard.storytailor.com/webhooks)**
- 💰 **[Billing](https://dashboard.storytailor.com/billing)**
- 👥 **[Team Management](https://dashboard.storytailor.com/team)**
- 🆘 **[Support](https://dashboard.storytailor.com/support)**

The Developer Dashboard is your central hub for managing your Storytailor integration. Monitor usage, track performance, manage your team, and get the insights you need to build successful applications with our Story Intelligence™ powered storytelling platform.