class AgentMonitor {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.performanceMetrics = new Map();
    this.agentUsage = new Map();
    this.errorCounts = new Map();
  }

  trackAgentPerformance(agentName, operation, startTime, success = true) {
    const duration = Date.now() - startTime;
    const key = `${agentName}-${operation}`;
    
    // Initialize metrics if not exists
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        count: 0,
        successCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastUsed: null
      });
    }
    
    // Update metrics
    const metrics = this.performanceMetrics.get(key);
    metrics.count += 1;
    if (success) {
      metrics.successCount += 1;
    }
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.lastUsed = new Date();
    
    // Track agent usage
    if (!this.agentUsage.has(agentName)) {
      this.agentUsage.set(agentName, 0);
    }
    this.agentUsage.set(agentName, this.agentUsage.get(agentName) + 1);
    
    console.log(`Agent performance - ${key}: ${duration}ms (avg: ${metrics.avgDuration.toFixed(2)}ms, success rate: ${(metrics.successCount / metrics.count * 100).toFixed(2)}%)`);
  }

  trackError(agentName, operation, error) {
    const key = `${agentName}-${operation}`;
    
    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, {
        count: 0,
        errors: []
      });
    }
    
    const errorData = this.errorCounts.get(key);
    errorData.count += 1;
    errorData.errors.push({
      timestamp: new Date(),
      message: error.message,
      stack: error.stack
    });
    
    // Keep only the last 10 errors
    if (errorData.errors.length > 10) {
      errorData.errors.shift();
    }
    
    console.error(`Agent error - ${key}: ${error.message}`);
  }

  getOptimalAgent(operationType, context = {}) {
    // This is a placeholder for more sophisticated agent selection logic
    // In a real implementation, this would use performance metrics to select the best agent
    
    // For now, just return the default agent from the orchestrator
    return this.orchestrator.selectAgent(operationType);
  }

  getAgentStats() {
    const stats = {
      agents: {},
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0
    };
    
    // Calculate total requests and errors
    let totalDuration = 0;
    let totalCount = 0;
    
    // Process performance metrics
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      const [agentName, operation] = key.split('-');
      
      if (!stats.agents[agentName]) {
        stats.agents[agentName] = {
          requests: 0,
          errors: 0,
          operations: {},
          avgResponseTime: 0
        };
      }
      
      stats.agents[agentName].requests += metrics.count;
      stats.agents[agentName].operations[operation] = {
        count: metrics.count,
        successRate: (metrics.successCount / metrics.count * 100).toFixed(2) + '%',
        avgDuration: metrics.avgDuration.toFixed(2) + 'ms',
        lastUsed: metrics.lastUsed
      };
      
      totalCount += metrics.count;
      totalDuration += metrics.totalDuration;
    }
    
    // Process error counts
    for (const [key, errorData] of this.errorCounts.entries()) {
      const [agentName] = key.split('-');
      
      if (stats.agents[agentName]) {
        stats.agents[agentName].errors += errorData.count;
        stats.totalErrors += errorData.count;
      }
    }
    
    // Calculate totals
    stats.totalRequests = totalCount;
    stats.avgResponseTime = totalCount > 0 ? (totalDuration / totalCount).toFixed(2) + 'ms' : '0ms';
    
    // Calculate agent-specific averages
    for (const agentName in stats.agents) {
      const agent = stats.agents[agentName];
      let agentTotalDuration = 0;
      let agentTotalCount = 0;
      
      for (const operation in agent.operations) {
        const key = `${agentName}-${operation}`;
        const metrics = this.performanceMetrics.get(key);
        agentTotalDuration += metrics.totalDuration;
        agentTotalCount += metrics.count;
      }
      
      agent.avgResponseTime = agentTotalCount > 0 ? (agentTotalDuration / agentTotalCount).toFixed(2) + 'ms' : '0ms';
    }
    
    return stats;
  }
}

module.exports = AgentMonitor;
