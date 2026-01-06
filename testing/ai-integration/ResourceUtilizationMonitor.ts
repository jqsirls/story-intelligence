/**
 * Resource Utilization Monitor for AI Integration Load Testing
 * 
 * Monitors system resources (CPU, memory, network, disk) during load testing
 * to identify resource bottlenecks and performance degradation patterns.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ResourceMonitorConfig {
  monitoringInterval: number; // milliseconds
  alertThresholds: ResourceThresholds;
  enableDetailedMetrics: boolean;
  saveMetricsToFile: boolean;
  metricsFilePath?: string;
}

export interface ResourceThresholds {
  cpu: {
    warning: number; // percentage
    critical: number; // percentage
  };
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  disk: {
    warning: number; // percentage
    critical: number; // percentage
  };
  network: {
    warningBytesPerSec: number;
    criticalBytesPerSec: number;
  };
}

export interface ResourceSnapshot {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  process: ProcessMetrics;
  system: SystemMetrics;
}

export interface CpuMetrics {
  usage: number; // percentage
  loadAverage: number[];
  cores: number;
  userTime: number;
  systemTime: number;
  idleTime: number;
  processes: number;
  threads: number;
}

export interface MemoryMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  available: number; // bytes
  percentage: number;
  swap: {
    total: number;
    used: number;
    free: number;
  };
  heap: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface DiskMetrics {
  usage: {
    total: number; // bytes
    used: number; // bytes
    free: number; // bytes
    percentage: number;
  };
  io: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
    readTime: number;
    writeTime: number;
  };
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[];
  totalBytesIn: number;
  totalBytesOut: number;
  totalPacketsIn: number;
  totalPacketsOut: number;
  connections: {
    established: number;
    listening: number;
    timeWait: number;
    closeWait: number;
  };
}

export interface NetworkInterface {
  name: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errorsIn: number;
  errorsOut: number;
  droppedIn: number;
  droppedOut: number;
}

export interface ProcessMetrics {
  pid: number;
  cpuUsage: number;
  memoryUsage: number;
  handles: number;
  threads: number;
  uptime: number;
}

export interface SystemMetrics {
  platform: string;
  arch: string;
  hostname: string;
  uptime: number;
  version: string;
}

export interface ResourceAlert {
  timestamp: number;
  severity: 'warning' | 'critical';
  resource: 'cpu' | 'memory' | 'disk' | 'network';
  message: string;
  currentValue: number;
  threshold: number;
  recommendations: string[];
}

export interface ResourceTrend {
  resource: string;
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  rate: number; // change per second
  confidence: number; // 0-1
}

export class ResourceUtilizationMonitor extends EventEmitter {
  private config: ResourceMonitorConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private snapshots: ResourceSnapshot[] = [];
  private alerts: ResourceAlert[] = [];
  private baselineSnapshot?: ResourceSnapshot;
  private previousSnapshot?: ResourceSnapshot;

  constructor(config: ResourceMonitorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start resource monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Resource monitoring is already running');
    }

    this.isMonitoring = true;
    this.snapshots = [];
    this.alerts = [];
    
    console.log('Starting resource utilization monitoring...');
    
    // Take baseline snapshot
    this.baselineSnapshot = await this.takeResourceSnapshot();
    this.previousSnapshot = this.baselineSnapshot;
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitoringCycle();
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
        this.emit('monitoringError', error);
      }
    }, this.config.monitoringInterval);

    this.emit('monitoringStarted', this.baselineSnapshot);
  }

  /**
   * Stop resource monitoring
   */
  async stopMonitoring(): Promise<ResourceSnapshot[]> {
    if (!this.isMonitoring) {
      return this.snapshots;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Take final snapshot
    const finalSnapshot = await this.takeResourceSnapshot();
    this.snapshots.push(finalSnapshot);

    // Save metrics to file if configured
    if (this.config.saveMetricsToFile) {
      await this.saveMetricsToFile();
    }

    console.log('Resource monitoring stopped');
    this.emit('monitoringStopped', {
      totalSnapshots: this.snapshots.length,
      totalAlerts: this.alerts.length,
      finalSnapshot
    });

    return this.snapshots;
  }

  /**
   * Get current resource snapshot
   */
  async getCurrentSnapshot(): Promise<ResourceSnapshot> {
    return await this.takeResourceSnapshot();
  }

  /**
   * Get all collected snapshots
   */
  getSnapshots(): ResourceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get all alerts
   */
  getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get resource trends
   */
  getResourceTrends(): ResourceTrend[] {
    if (this.snapshots.length < 10) {
      return []; // Need sufficient data for trend analysis
    }

    const trends: ResourceTrend[] = [];
    
    // Analyze CPU trend
    trends.push(this.analyzeTrend('cpu', 'usage', this.snapshots.map(s => s.cpu.usage)));
    
    // Analyze memory trend
    trends.push(this.analyzeTrend('memory', 'percentage', this.snapshots.map(s => s.memory.percentage)));
    
    // Analyze disk trend
    trends.push(this.analyzeTrend('disk', 'percentage', this.snapshots.map(s => s.disk.usage.percentage)));
    
    // Analyze network trend
    trends.push(this.analyzeTrend('network', 'totalBytesIn', this.snapshots.map(s => s.network.totalBytesIn)));

    return trends;
  }

  /**
   * Execute monitoring cycle
   */
  private async monitoringCycle(): Promise<void> {
    const snapshot = await this.takeResourceSnapshot();
    this.snapshots.push(snapshot);

    // Check for threshold violations
    await this.checkThresholds(snapshot);

    // Detect performance degradation
    if (this.previousSnapshot) {
      this.detectPerformanceDegradation(this.previousSnapshot, snapshot);
    }

    this.previousSnapshot = snapshot;
    this.emit('snapshotTaken', snapshot);
  }

  /**
   * Take a comprehensive resource snapshot
   */
  private async takeResourceSnapshot(): Promise<ResourceSnapshot> {
    const timestamp = performance.now();

    const [cpu, memory, disk, network, process, system] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getDiskMetrics(),
      this.getNetworkMetrics(),
      this.getProcessMetrics(),
      this.getSystemMetrics()
    ]);

    return {
      timestamp,
      cpu,
      memory,
      disk,
      network,
      process,
      system
    };
  }

  /**
   * Get CPU metrics
   */
  private async getCpuMetrics(): Promise<CpuMetrics> {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    // Get process and thread counts (platform-specific)
    let processes = 0;
    let threads = 0;
    
    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('ps aux | wc -l');
        processes = parseInt(stdout.trim()) - 1; // Subtract header line
        
        const { stdout: threadStdout } = await execAsync('ps -eLf | wc -l');
        threads = parseInt(threadStdout.trim()) - 1;
      } else if (process.platform === 'darwin') {
        const { stdout } = await execAsync('ps aux | wc -l');
        processes = parseInt(stdout.trim()) - 1;
        threads = processes; // Simplified for macOS
      }
    } catch (error) {
      // Fallback values if commands fail
      processes = 0;
      threads = 0;
    }

    return {
      usage,
      loadAverage: loadAvg,
      cores: cpus.length,
      userTime: 0, // Would need more detailed implementation
      systemTime: 0, // Would need more detailed implementation
      idleTime: idle,
      processes,
      threads
    };
  }

  /**
   * Get memory metrics
   */
  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = (usedMem / totalMem) * 100;

    // Get process memory usage
    const processMemory = process.memoryUsage();

    // Get swap information (platform-specific)
    let swap = { total: 0, used: 0, free: 0 };
    
    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('free -b | grep Swap');
        const swapLine = stdout.trim().split(/\s+/);
        if (swapLine.length >= 3) {
          swap.total = parseInt(swapLine[1]);
          swap.used = parseInt(swapLine[2]);
          swap.free = parseInt(swapLine[3]);
        }
      } else if (process.platform === 'darwin') {
        const { stdout } = await execAsync('sysctl vm.swapusage');
        // Parse macOS swap usage (simplified)
        const match = stdout.match(/total = ([\d.]+)M.*used = ([\d.]+)M/);
        if (match) {
          swap.total = parseFloat(match[1]) * 1024 * 1024;
          swap.used = parseFloat(match[2]) * 1024 * 1024;
          swap.free = swap.total - swap.used;
        }
      }
    } catch (error) {
      // Keep default values if commands fail
    }

    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      available: freeMem, // Simplified
      percentage,
      swap,
      heap: {
        used: processMemory.heapUsed,
        total: processMemory.heapTotal,
        limit: processMemory.rss
      }
    };
  }

  /**
   * Get disk metrics
   */
  private async getDiskMetrics(): Promise<DiskMetrics> {
    let usage = { total: 0, used: 0, free: 0, percentage: 0 };
    let io = { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0, readTime: 0, writeTime: 0 };

    try {
      if (process.platform === 'linux') {
        // Get disk usage
        const { stdout: dfOutput } = await execAsync('df -B1 / | tail -1');
        const dfParts = dfOutput.trim().split(/\s+/);
        if (dfParts.length >= 4) {
          usage.total = parseInt(dfParts[1]);
          usage.used = parseInt(dfParts[2]);
          usage.free = parseInt(dfParts[3]);
          usage.percentage = (usage.used / usage.total) * 100;
        }

        // Get disk I/O stats
        const { stdout: iostatOutput } = await execAsync('cat /proc/diskstats | head -1');
        const iostatParts = iostatOutput.trim().split(/\s+/);
        if (iostatParts.length >= 14) {
          io.readOps = parseInt(iostatParts[3]);
          io.writeOps = parseInt(iostatParts[7]);
          io.readBytes = parseInt(iostatParts[5]) * 512; // Sectors to bytes
          io.writeBytes = parseInt(iostatParts[9]) * 512;
        }
      } else if (process.platform === 'darwin') {
        // Get disk usage
        const { stdout: dfOutput } = await execAsync('df -b / | tail -1');
        const dfParts = dfOutput.trim().split(/\s+/);
        if (dfParts.length >= 4) {
          usage.total = parseInt(dfParts[1]);
          usage.used = parseInt(dfParts[2]);
          usage.free = parseInt(dfParts[3]);
          usage.percentage = (usage.used / usage.total) * 100;
        }
      }
    } catch (error) {
      // Keep default values if commands fail
    }

    return { usage, io };
  }

  /**
   * Get network metrics
   */
  private async getNetworkMetrics(): Promise<NetworkMetrics> {
    const interfaces: NetworkInterface[] = [];
    let totalBytesIn = 0;
    let totalBytesOut = 0;
    let totalPacketsIn = 0;
    let totalPacketsOut = 0;
    let connections = { established: 0, listening: 0, timeWait: 0, closeWait: 0 };

    try {
      const networkInterfaces = os.networkInterfaces();
      
      for (const [name, addrs] of Object.entries(networkInterfaces)) {
        if (!addrs) continue;
        
        // This is a simplified implementation
        // In a real scenario, you'd need to read from /proc/net/dev on Linux
        // or use system-specific commands to get actual network statistics
        const iface: NetworkInterface = {
          name,
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          errorsIn: 0,
          errorsOut: 0,
          droppedIn: 0,
          droppedOut: 0
        };
        
        interfaces.push(iface);
      }

      // Get connection statistics (platform-specific)
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('netstat -an | grep tcp | awk \'{print $6}\' | sort | uniq -c');
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const count = parseInt(parts[0]);
            const state = parts[1];
            
            switch (state) {
              case 'ESTABLISHED':
                connections.established = count;
                break;
              case 'LISTEN':
                connections.listening = count;
                break;
              case 'TIME_WAIT':
                connections.timeWait = count;
                break;
              case 'CLOSE_WAIT':
                connections.closeWait = count;
                break;
            }
          }
        }
      }
    } catch (error) {
      // Keep default values if commands fail
    }

    return {
      interfaces,
      totalBytesIn,
      totalBytesOut,
      totalPacketsIn,
      totalPacketsOut,
      connections
    };
  }

  /**
   * Get process metrics
   */
  private async getProcessMetrics(): Promise<ProcessMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      pid: process.pid,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memoryUsage: memUsage.rss,
      handles: 0, // Would need platform-specific implementation
      threads: 1, // Simplified
      uptime: process.uptime()
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      version: os.release()
    };
  }

  /**
   * Check resource thresholds and generate alerts
   */
  private async checkThresholds(snapshot: ResourceSnapshot): Promise<void> {
    const alerts: ResourceAlert[] = [];

    // Check CPU thresholds
    if (snapshot.cpu.usage >= this.config.alertThresholds.cpu.critical) {
      alerts.push({
        timestamp: snapshot.timestamp,
        severity: 'critical',
        resource: 'cpu',
        message: `Critical CPU usage: ${snapshot.cpu.usage.toFixed(2)}%`,
        currentValue: snapshot.cpu.usage,
        threshold: this.config.alertThresholds.cpu.critical,
        recommendations: [
          'Scale horizontally to distribute CPU load',
          'Optimize CPU-intensive operations',
          'Implement request throttling'
        ]
      });
    } else if (snapshot.cpu.usage >= this.config.alertThresholds.cpu.warning) {
      alerts.push({
        timestamp: snapshot.timestamp,
        severity: 'warning',
        resource: 'cpu',
        message: `High CPU usage: ${snapshot.cpu.usage.toFixed(2)}%`,
        currentValue: snapshot.cpu.usage,
        threshold: this.config.alertThresholds.cpu.warning,
        recommendations: [
          'Monitor CPU usage trends',
          'Consider scaling if usage continues to increase'
        ]
      });
    }

    // Check memory thresholds
    if (snapshot.memory.percentage >= this.config.alertThresholds.memory.critical) {
      alerts.push({
        timestamp: snapshot.timestamp,
        severity: 'critical',
        resource: 'memory',
        message: `Critical memory usage: ${snapshot.memory.percentage.toFixed(2)}%`,
        currentValue: snapshot.memory.percentage,
        threshold: this.config.alertThresholds.memory.critical,
        recommendations: [
          'Implement memory pooling',
          'Add memory-based circuit breakers',
          'Scale vertically or horizontally'
        ]
      });
    } else if (snapshot.memory.percentage >= this.config.alertThresholds.memory.warning) {
      alerts.push({
        timestamp: snapshot.timestamp,
        severity: 'warning',
        resource: 'memory',
        message: `High memory usage: ${snapshot.memory.percentage.toFixed(2)}%`,
        currentValue: snapshot.memory.percentage,
        threshold: this.config.alertThresholds.memory.warning,
        recommendations: [
          'Monitor memory usage patterns',
          'Review memory allocation strategies'
        ]
      });
    }

    // Check disk thresholds
    if (snapshot.disk.usage.percentage >= this.config.alertThresholds.disk.critical) {
      alerts.push({
        timestamp: snapshot.timestamp,
        severity: 'critical',
        resource: 'disk',
        message: `Critical disk usage: ${snapshot.disk.usage.percentage.toFixed(2)}%`,
        currentValue: snapshot.disk.usage.percentage,
        threshold: this.config.alertThresholds.disk.critical,
        recommendations: [
          'Clean up temporary files',
          'Implement log rotation',
          'Add additional storage capacity'
        ]
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emit('resourceAlert', alert);
    }
  }

  /**
   * Detect performance degradation between snapshots
   */
  private detectPerformanceDegradation(previous: ResourceSnapshot, current: ResourceSnapshot): void {
    const degradations: string[] = [];

    // Check CPU degradation
    const cpuIncrease = current.cpu.usage - previous.cpu.usage;
    if (cpuIncrease > 20) { // 20% increase
      degradations.push(`CPU usage increased by ${cpuIncrease.toFixed(2)}%`);
    }

    // Check memory degradation
    const memoryIncrease = current.memory.percentage - previous.memory.percentage;
    if (memoryIncrease > 15) { // 15% increase
      degradations.push(`Memory usage increased by ${memoryIncrease.toFixed(2)}%`);
    }

    // Check load average degradation
    const loadIncrease = current.cpu.loadAverage[0] - previous.cpu.loadAverage[0];
    if (loadIncrease > 2) {
      degradations.push(`Load average increased by ${loadIncrease.toFixed(2)}`);
    }

    if (degradations.length > 0) {
      this.emit('performanceDegradation', {
        timestamp: current.timestamp,
        degradations,
        previousSnapshot: previous,
        currentSnapshot: current
      });
    }
  }

  /**
   * Analyze trend for a specific metric
   */
  private analyzeTrend(resource: string, metric: string, values: number[]): ResourceTrend {
    if (values.length < 5) {
      return {
        resource,
        metric,
        trend: 'stable',
        rate: 0,
        confidence: 0
      };
    }

    // Simple linear regression to determine trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient for confidence
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
    const correlation = numerator / (denomX * denomY);
    const confidence = Math.abs(correlation);

    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      resource,
      metric,
      trend,
      rate: slope,
      confidence
    };
  }

  /**
   * Save metrics to file
   */
  private async saveMetricsToFile(): Promise<void> {
    if (!this.config.metricsFilePath) {
      this.config.metricsFilePath = path.join(
        process.cwd(),
        'testing',
        'ai-integration',
        'results',
        `resource-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
    }

    const metricsData = {
      config: this.config,
      baseline: this.baselineSnapshot,
      snapshots: this.snapshots,
      alerts: this.alerts,
      trends: this.getResourceTrends(),
      summary: {
        totalSnapshots: this.snapshots.length,
        totalAlerts: this.alerts.length,
        monitoringDuration: this.snapshots.length > 0 
          ? this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp
          : 0
      }
    };

    try {
      const dir = path.dirname(this.config.metricsFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.config.metricsFilePath, JSON.stringify(metricsData, null, 2));
      console.log(`Resource metrics saved to: ${this.config.metricsFilePath}`);
    } catch (error) {
      console.error('Failed to save metrics to file:', error);
    }
  }
}