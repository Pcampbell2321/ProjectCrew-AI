/**
 * Reasoning Analyzer Service
 * Analyzes tasks to determine reasoning requirements and characteristics
 */
class ReasoningAnalyzer {
  constructor() {
    // Reasoning type classifications
    this.reasoningTypes = {
      DEDUCTIVE: 'deductive',
      INDUCTIVE: 'inductive',
      ABDUCTIVE: 'abductive',
      ANALOGICAL: 'analogical',
      CAUSAL: 'causal',
      COUNTERFACTUAL: 'counterfactual',
      TEMPORAL: 'temporal',
      SPATIAL: 'spatial',
      MATHEMATICAL: 'mathematical',
      LOGICAL: 'logical',
      ETHICAL: 'ethical',
      NONE: 'none'
    };
    
    // Keywords that suggest different reasoning types
    this.typeKeywords = {
      [this.reasoningTypes.DEDUCTIVE]: ['if-then', 'therefore', 'must be', 'necessarily', 'deduce'],
      [this.reasoningTypes.INDUCTIVE]: ['pattern', 'trend', 'likely', 'probably', 'infer', 'generalize'],
      [this.reasoningTypes.ABDUCTIVE]: ['best explanation', 'diagnose', 'most likely cause', 'hypothesis'],
      [this.reasoningTypes.ANALOGICAL]: ['similar to', 'like', 'analogy', 'comparison', 'resembles'],
      [this.reasoningTypes.CAUSAL]: ['because', 'cause', 'effect', 'impact', 'leads to', 'results in'],
      [this.reasoningTypes.COUNTERFACTUAL]: ['if only', 'what if', 'had', 'would have', 'could have'],
      [this.reasoningTypes.TEMPORAL]: ['before', 'after', 'during', 'when', 'timeline', 'sequence'],
      [this.reasoningTypes.SPATIAL]: ['above', 'below', 'next to', 'arrangement', 'layout'],
      [this.reasoningTypes.MATHEMATICAL]: ['calculate', 'compute', 'solve', 'equation', 'formula'],
      [this.reasoningTypes.LOGICAL]: ['valid', 'invalid', 'fallacy', 'argument', 'premise', 'conclusion'],
      [this.reasoningTypes.ETHICAL]: ['right', 'wrong', 'moral', 'ethical', 'should', 'ought']
    };
    
    // Stepwise reasoning indicators
    this.stepwiseIndicators = [
      'step by step',
      'explain your reasoning',
      'show your work',
      'break down',
      'walk through',
      'reasoning process',
      'chain of thought',
      'think through'
    ];
  }

  /**
   * Determine reasoning requirements for a task
   * @param {Object} task - The task to analyze
   * @returns {Object} - Reasoning requirements analysis
   */
  async determineReasoningRequirements(task) {
    const taskText = this._extractTaskText(task);
    
    // Analyze for reasoning type
    const typeAnalysis = this._analyzeReasoningType(taskText);
    
    // Analyze for stepwise reasoning requirement
    const requiresStepwise = this._requiresStepwiseReasoning(taskText);
    
    // Analyze context dependency
    const contextDependency = this._analyzeContextDependency(task);
    
    // Analyze temporal aspects
    const temporalAspect = this._hasTemporalAspect(taskText);
    
    return {
      type: typeAnalysis.primaryType,
      typeConfidence: typeAnalysis.confidence,
      secondaryTypes: typeAnalysis.secondaryTypes,
      stepwise: requiresStepwise,
      contextDependency,
      temporalAspect
    };
  }

  /**
   * Extract text content from task object
   * @param {Object} task - The task object
   * @returns {string} - Extracted text
   */
  _extractTaskText(task) {
    if (typeof task === 'string') return task;
    
    if (task.prompt) return task.prompt;
    if (task.content) return typeof task.content === 'string' ? task.content : JSON.stringify(task.content);
    if (task.text) return task.text;
    if (task.query) return task.query;
    
    return JSON.stringify(task);
  }

  /**
   * Analyze text to determine primary reasoning type
   * @param {string} text - The text to analyze
   * @returns {Object} - Reasoning type analysis
   */
  _analyzeReasoningType(text) {
    const textLower = text.toLowerCase();
    const scores = {};
    
    // Score each reasoning type based on keyword matches
    Object.entries(this.typeKeywords).forEach(([type, keywords]) => {
      scores[type] = keywords.reduce((score, keyword) => {
        return score + (textLower.includes(keyword) ? 1 : 0);
      }, 0);
    });
    
    // Find primary and secondary types
    const sortedTypes = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0);
    
    const primaryType = sortedTypes.length > 0 ? sortedTypes[0][0] : this.reasoningTypes.NONE;
    const secondaryTypes = sortedTypes.slice(1, 3).map(([type, _]) => type);
    
    // Calculate confidence
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? scores[primaryType] / totalScore : 0;
    
    return {
      primaryType,
      secondaryTypes,
      confidence
    };
  }

  /**
   * Determine if task requires stepwise reasoning
   * @param {string} text - The task text
   * @returns {boolean} - Whether stepwise reasoning is required
   */
  _requiresStepwiseReasoning(text) {
    const textLower = text.toLowerCase();
    
    // Check for explicit stepwise indicators
    for (const indicator of this.stepwiseIndicators) {
      if (textLower.includes(indicator)) return true;
    }
    
    // Check for mathematical or logical reasoning tasks
    const mathLogicalScore = this.typeKeywords[this.reasoningTypes.MATHEMATICAL]
      .concat(this.typeKeywords[this.reasoningTypes.LOGICAL])
      .reduce((score, keyword) => {
        return score + (textLower.includes(keyword) ? 1 : 0);
      }, 0);
    
    return mathLogicalScore >= 2;
  }

  /**
   * Analyze context dependency of a task
   * @param {Object} task - The task object
   * @returns {number} - Context dependency score (0-1)
   */
  _analyzeContextDependency(task) {
    // Check if task has context property
    if (task.context && typeof task.context === 'object' && Object.keys(task.context).length > 0) {
      return 0.8;
    }
    
    const text = this._extractTaskText(task);
    const textLower = text.toLowerCase();
    
    // Check for references to previous information
    const contextualReferences = [
      'previous', 'earlier', 'before', 'above', 'mentioned',
      'as stated', 'refer to', 'based on', 'according to'
    ];
    
    const referenceCount = contextualReferences.reduce((count, ref) => {
      return count + (textLower.includes(ref) ? 1 : 0);
    }, 0);
    
    return Math.min(referenceCount * 0.2, 1);
  }

  /**
   * Check if task has temporal aspects
   * @param {string} text - The task text
   * @returns {boolean} - Whether task has temporal aspects
   */
  _hasTemporalAspect(text) {
    const textLower = text.toLowerCase();
    
    // Check for temporal keywords
    const temporalKeywords = this.typeKeywords[this.reasoningTypes.TEMPORAL];
    const hasTemporalKeywords = temporalKeywords.some(keyword => textLower.includes(keyword));
    
    // Check for time-related words
    const timeWords = ['time', 'duration', 'period', 'schedule', 'timeline', 'chronological'];
    const hasTimeWords = timeWords.some(word => textLower.includes(word));
    
    return hasTemporalKeywords || hasTimeWords;
  }
}

module.exports = ReasoningAnalyzer;
