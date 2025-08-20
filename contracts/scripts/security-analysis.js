const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAnalyzer {
  constructor() {
    this.contractsDir = path.join(__dirname, '..', 'contracts');
    this.reportsDir = path.join(__dirname, '..', 'security-reports');
    this.artifactsDir = path.join(__dirname, '..', 'artifacts');
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Run comprehensive security analysis
   */
  async runFullAnalysis() {
    console.log('🔒 Starting comprehensive security analysis...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {},
      recommendations: []
    };

    try {
      // 1. Compile contracts first
      console.log('📋 Compiling contracts...');
      this.compileContracts();
      
      // 2. Run Slither analysis
      console.log('🐍 Running Slither analysis...');
      const slitherReport = await this.runSlitherAnalysis();
      report.details.slither = slitherReport;
      
      // 3. Run MythX analysis
      console.log('🔮 Running MythX analysis...');
      const mythxReport = await this.runMythXAnalysis();
      report.details.mythx = mythxReport;
      
      // 4. Run Echidna fuzzing
      console.log('🦔 Running Echidna fuzzing...');
      const echidnaReport = await this.runEchidnaAnalysis();
      report.details.echidna = echidnaReport;
      
      // 5. Run Manticore symbolic execution
      console.log('🧠 Running Manticore analysis...');
      const manticoreReport = await this.runManticoreAnalysis();
      report.details.manticore = manticoreReport;
      
      // 6. Generate summary and recommendations
      report.summary = this.generateSummary(report.details);
      report.recommendations = this.generateRecommendations(report.details);
      
      // 7. Save comprehensive report
      this.saveReport(report);
      
      console.log('\n✅ Security analysis completed successfully!');
      console.log(`📊 Report saved to: ${this.reportsDir}/security-analysis-${Date.now()}.json`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Security analysis failed:', error);
      throw error;
    }
  }

  /**
   * Compile contracts using Hardhat
   */
  compileContracts() {
    try {
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('✅ Contracts compiled successfully');
    } catch (error) {
      throw new Error(`Contract compilation failed: ${error.message}`);
    }
  }

  /**
   * Run Slither static analysis
   */
  async runSlitherAnalysis() {
    try {
      const output = execSync('slither . --json -', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      const slitherResults = JSON.parse(output);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        results: slitherResults,
        summary: {
          detectors: slitherResults.results?.detectors || [],
          vulnerabilities: this.categorizeSlitherVulnerabilities(slitherResults.results?.detectors || []),
          score: this.calculateSlitherScore(slitherResults.results?.detectors || [])
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Slither analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run MythX analysis
   */
  async runMythXAnalysis() {
    try {
      // Check if MythX CLI is available
      try {
        execSync('mythx --version', { stdio: 'ignore' });
      } catch {
        console.warn('⚠️ MythX CLI not found, skipping MythX analysis');
        return {
          success: false,
          error: 'MythX CLI not installed',
          timestamp: new Date().toISOString()
        };
      }

      const output = execSync('mythx analyze --mode full --output json', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      const mythxResults = JSON.parse(output);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        results: mythxResults,
        summary: {
          issues: mythxResults.issues || [],
          vulnerabilities: this.categorizeMythXVulnerabilities(mythxResults.issues || []),
          score: this.calculateMythXScore(mythxResults.issues || [])
        }
      };
      
    } catch (error) {
      console.warn('⚠️ MythX analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run Echidna fuzzing analysis
   */
  async runEchidnaAnalysis() {
    try {
      // Check if Echidna is available
      try {
        execSync('echidna-test --version', { stdio: 'ignore' });
      } catch {
        console.warn('⚠️ Echidna not found, skipping fuzzing analysis');
        return {
          success: false,
          error: 'Echidna not installed',
          timestamp: new Date().toISOString()
        };
      }

      // Create Echidna configuration
      const echidnaConfig = this.createEchidnaConfig();
      const configPath = path.join(this.reportsDir, 'echidna.config.yml');
      fs.writeFileSync(configPath, echidnaConfig);

      const output = execSync(`echidna-test ${configPath}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 300000 // 5 minutes timeout
      });
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        output: output,
        summary: {
          fuzzingCompleted: true,
          vulnerabilitiesFound: this.parseEchidnaOutput(output)
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Echidna analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run Manticore symbolic execution
   */
  async runManticoreAnalysis() {
    try {
      // Check if Manticore is available
      try {
        execSync('manticore --version', { stdio: 'ignore' });
      } catch {
        console.warn('⚠️ Manticore not found, skipping symbolic execution analysis');
        return {
          success: false,
          error: 'Manticore not installed',
          timestamp: new Date().toISOString()
        };
      }

      // Run Manticore on compiled contracts
      const output = execSync('manticore --workspace mcore_output --contracts ElectionFactoryUpgradeable', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 600000 // 10 minutes timeout
      });
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        output: output,
        summary: {
          symbolicExecutionCompleted: true,
          pathsExplored: this.parseManticoreOutput(output)
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Manticore analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create Echidna configuration
   */
  createEchidnaConfig() {
    return `
testMode: assertion
testLimit: 50000
corpusDir: corpus
coverage: true
contract: ElectionFactoryUpgradeable
deployer: "0x10000"
sender: ["0x10000", "0x20000"]
psender: "0x10000"
psenders: ["0x10000", "0x20000"]
    `.trim();
  }

  /**
   * Categorize Slither vulnerabilities
   */
  categorizeSlitherVulnerabilities(detectors) {
    const categories = {
      HIGH: [],
      MEDIUM: [],
      LOW: [],
      INFORMATIONAL: []
    };

    detectors.forEach(detector => {
      const severity = detector.impact || 'INFORMATIONAL';
      if (categories[severity]) {
        categories[severity].push({
          name: detector.check,
          description: detector.description,
          elements: detector.elements
        });
      }
    });

    return categories;
  }

  /**
   * Categorize MythX vulnerabilities
   */
  categorizeMythXVulnerabilities(issues) {
    const categories = {
      HIGH: [],
      MEDIUM: [],
      LOW: [],
      INFORMATIONAL: []
    };

    issues.forEach(issue => {
      const severity = issue.severity || 'INFORMATIONAL';
      if (categories[severity]) {
        categories[severity].push({
          title: issue.title,
          description: issue.description,
          locations: issue.locations
        });
      }
    });

    return categories;
  }

  /**
   * Calculate Slither security score
   */
  calculateSlitherScore(detectors) {
    let score = 100;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    detectors.forEach(detector => {
      switch (detector.impact) {
        case 'HIGH':
          score -= 20;
          highCount++;
          break;
        case 'MEDIUM':
          score -= 10;
          mediumCount++;
          break;
        case 'LOW':
          score -= 5;
          lowCount++;
          break;
      }
    });

    return {
      score: Math.max(0, score),
      highVulnerabilities: highCount,
      mediumVulnerabilities: mediumCount,
      lowVulnerabilities: lowCount
    };
  }

  /**
   * Calculate MythX security score
   */
  calculateMythXScore(issues) {
    let score = 100;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'High':
          score -= 20;
          highCount++;
          break;
        case 'Medium':
          score -= 10;
          mediumCount++;
          break;
        case 'Low':
          score -= 5;
          lowCount++;
          break;
      }
    });

    return {
      score: Math.max(0, score),
      highVulnerabilities: highCount,
      mediumVulnerabilities: mediumCount,
      lowVulnerabilities: lowCount
    };
  }

  /**
   * Parse Echidna output
   */
  parseEchidnaOutput(output) {
    const vulnerabilities = [];
    
    if (output.includes('FAILED')) {
      vulnerabilities.push({
        type: 'ASSERTION_FAILURE',
        description: 'Echidna found assertion failures during fuzzing'
      });
    }
    
    if (output.includes('Exception')) {
      vulnerabilities.push({
        type: 'EXCEPTION',
        description: 'Echidna found exceptions during execution'
      });
    }
    
    return vulnerabilities;
  }

  /**
   * Parse Manticore output
   */
  parseManticoreOutput(output) {
    const pathsExplored = [];
    
    if (output.includes('paths explored')) {
      const match = output.match(/(\d+) paths explored/);
      if (match) {
        pathsExplored.push({
          type: 'PATHS_EXPLORED',
          count: parseInt(match[1])
        });
      }
    }
    
    return pathsExplored;
  }

  /**
   * Generate security summary
   */
  generateSummary(details) {
    const summary = {
      overallScore: 100,
      totalVulnerabilities: 0,
      highVulnerabilities: 0,
      mediumVulnerabilities: 0,
      lowVulnerabilities: 0,
      toolsUsed: [],
      recommendations: []
    };

    // Aggregate results from all tools
    Object.keys(details).forEach(tool => {
      if (details[tool].success && details[tool].summary) {
        summary.toolsUsed.push(tool);
        
        if (details[tool].summary.vulnerabilities) {
          summary.highVulnerabilities += details[tool].summary.vulnerabilities.HIGH?.length || 0;
          summary.mediumVulnerabilities += details[tool].summary.vulnerabilities.MEDIUM?.length || 0;
          summary.lowVulnerabilities += details[tool].summary.vulnerabilities.LOW?.length || 0;
        }
        
        if (details[tool].summary.score) {
          summary.overallScore = Math.min(summary.overallScore, details[tool].summary.score.score);
        }
      }
    });

    summary.totalVulnerabilities = summary.highVulnerabilities + summary.mediumVulnerabilities + summary.lowVulnerabilities;
    
    return summary;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(details) {
    const recommendations = [];

    // High severity recommendations
    if (details.slither?.summary?.vulnerabilities?.HIGH?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'STATIC_ANALYSIS',
        description: 'Address high-severity vulnerabilities identified by Slither',
        actions: [
          'Review and fix reentrancy vulnerabilities',
          'Check for integer overflow/underflow',
          'Verify access control mechanisms',
          'Review delegatecall usage'
        ]
      });
    }

    if (details.mythx?.summary?.vulnerabilities?.HIGH?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'SYMBOLIC_ANALYSIS',
        description: 'Address high-severity vulnerabilities identified by MythX',
        actions: [
          'Review symbolic execution results',
          'Fix identified security issues',
          'Add additional security checks',
          'Consider formal verification'
        ]
      });
    }

    // Medium severity recommendations
    if (details.slither?.summary?.vulnerabilities?.MEDIUM?.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'CODE_QUALITY',
        description: 'Improve code quality and security practices',
        actions: [
          'Add more comprehensive input validation',
          'Implement proper error handling',
          'Add events for important state changes',
          'Review gas optimization'
        ]
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'MEDIUM',
      category: 'TESTING',
      description: 'Enhance testing and security measures',
      actions: [
        'Implement comprehensive unit tests',
        'Add integration tests for edge cases',
        'Consider formal verification tools',
        'Regular security audits'
      ]
    });

    return recommendations;
  }

  /**
   * Save security report
   */
  saveReport(report) {
    const filename = `security-analysis-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Also save a human-readable version
    const humanReadable = this.generateHumanReadableReport(report);
    const humanReadablePath = path.join(this.reportsDir, `security-analysis-${Date.now()}.md`);
    fs.writeFileSync(humanReadablePath, humanReadable);
    
    console.log(`📄 Detailed report: ${filepath}`);
    console.log(`📖 Human-readable report: ${humanReadablePath}`);
  }

  /**
   * Generate human-readable report
   */
  generateHumanReadableReport(report) {
    let markdown = `# Security Analysis Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    // Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Overall Security Score:** ${report.summary.overallScore}/100\n`;
    markdown += `- **Total Vulnerabilities:** ${report.summary.totalVulnerabilities}\n`;
    markdown += `- **High Severity:** ${report.summary.highVulnerabilities}\n`;
    markdown += `- **Medium Severity:** ${report.summary.mediumVulnerabilities}\n`;
    markdown += `- **Low Severity:** ${report.summary.lowVulnerabilities}\n\n`;
    
    // Tools used
    markdown += `## Tools Used\n\n`;
    report.summary.toolsUsed.forEach(tool => {
      markdown += `- ${tool.charAt(0).toUpperCase() + tool.slice(1)}\n`;
    });
    markdown += `\n`;
    
    // Recommendations
    markdown += `## Recommendations\n\n`;
    report.recommendations.forEach(rec => {
      markdown += `### ${rec.priority} Priority - ${rec.category}\n\n`;
      markdown += `${rec.description}\n\n`;
      markdown += `**Actions:**\n`;
      rec.actions.forEach(action => {
        markdown += `- ${action}\n`;
      });
      markdown += `\n`;
    });
    
    return markdown;
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new SecurityAnalyzer();
  analyzer.runFullAnalysis()
    .then(report => {
      console.log('\n📊 Analysis Summary:');
      console.log(`Overall Score: ${report.summary.overallScore}/100`);
      console.log(`Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityAnalyzer;
