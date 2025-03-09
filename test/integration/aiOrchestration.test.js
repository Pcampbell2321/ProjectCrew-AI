const AiOrchestrator = require('../../src/services/aiOrchestrator');
const GeminiHandler = require('../../src/services/geminiHandler');
const ClaudeHandler = require('../../src/services/claudeHandler');
const DeepseekHandler = require('../../src/services/deepseekHandler');
const ComplexityScorer = require('../../src/services/complexityScorer');

// Mock the handlers
jest.mock('../../src/services/geminiHandler');
jest.mock('../../src/services/claudeHandler');
jest.mock('../../src/services/deepseekHandler');
jest.mock('../../src/services/complexityScorer');

describe('AI Orchestration Integration Tests', () => {
  let orchestrator;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    ComplexityScorer.prototype.scoreTask.mockImplementation(async (task) => {
      // Simple mock that returns different scores based on task content
      const text = typeof task === 'string' ? task : 
                  (task.content || JSON.stringify(task));
      
      if (text.includes('simple')) {
        return { score: 20, breakdown: { components: { context: 30 } } };
      } else if (text.includes('medium')) {
        return { score: 50, breakdown: { components: { context: 50 } } };
      } else if (text.includes('complex')) {
        return { score: 80, breakdown: { components: { context: 70 } } };
      } else if (text.includes('very complex')) {
        return { score: 95, breakdown: { components: { context: 90 } } };
      } else if (text.includes('reasoning')) {
        return { score: 70, breakdown: { components: { context: 85 } } };
      }
      
      return { score: 30, breakdown: { components: { context: 40 } } };
    });
    
    GeminiHandler.prototype.processSimpleTask.mockResolvedValue({
      content: 'Gemini Flash response',
      model: 'gemini-1.5-flash',
      type: 'gemini'
    });
    
    GeminiHandler.prototype.processTask.mockResolvedValue({
      content: 'Gemini Pro response',
      model: 'gemini-1.5-pro',
      type: 'gemini'
    });
    
    ClaudeHandler.prototype.processTask.mockResolvedValue({
      content: 'Claude Sonnet response',
      model: 'claude-3-sonnet',
      type: 'claude'
    });
    
    ClaudeHandler.prototype.processComplexTask.mockResolvedValue({
      content: 'Claude Opus response',
      model: 'claude-3-opus',
      type: 'claude'
    });
    
    DeepseekHandler.prototype.processReasoningTask.mockResolvedValue({
      content: 'DeepSeek reasoning response',
      model: 'deepseek-coder-v2',
      type: 'deepseek',
      reasoning: ['Step 1', 'Step 2', 'Conclusion']
    });
    
    // Create orchestrator instance
    orchestrator = new AiOrchestrator();
  });
  
  test('should route simple task to Gemini Flash', async () => {
    const task = { content: 'This is a simple task' };
    const result = await orchestrator.processTask(task);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(GeminiHandler.prototype.processSimpleTask).toHaveBeenCalledWith(task, {});
    expect(result.model).toBe('gemini-1.5-flash');
  });
  
  test('should route medium complexity task to Gemini Pro', async () => {
    const task = { content: 'This is a medium complexity task' };
    const result = await orchestrator.processTask(task);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(GeminiHandler.prototype.processTask).toHaveBeenCalledWith(task, {});
    expect(result.model).toBe('gemini-1.5-pro');
  });
  
  test('should route complex task to Claude Sonnet', async () => {
    const task = { content: 'This is a complex task' };
    const result = await orchestrator.processTask(task);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(ClaudeHandler.prototype.processTask).toHaveBeenCalledWith(task, {});
    expect(result.model).toBe('claude-3-sonnet');
  });
  
  test('should route very complex task to Claude Opus', async () => {
    const task = { content: 'This is a very complex task' };
    const result = await orchestrator.processTask(task);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(ClaudeHandler.prototype.processComplexTask).toHaveBeenCalledWith(task, {});
    expect(result.model).toBe('claude-3-opus');
  });
  
  test('should route reasoning task to DeepSeek', async () => {
    const task = { content: 'This task requires reasoning' };
    const context = { requiresReasoning: true };
    const result = await orchestrator.processTask(task, context);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(DeepseekHandler.prototype.processReasoningTask).toHaveBeenCalledWith(task, context);
    expect(result.model).toBe('deepseek-coder-v2');
    expect(result.reasoning).toEqual(['Step 1', 'Step 2', 'Conclusion']);
  });
  
  test('should apply dynamic thresholds for high priority tasks', async () => {
    const task = { content: 'This is a simple task but high priority' };
    const context = { priority: 'high' };
    
    // Override the score to test threshold adjustment
    ComplexityScorer.prototype.scoreTask.mockResolvedValueOnce({
      score: 35, // Would normally go to Gemini Pro, but with high priority should go to Claude
      breakdown: { components: { context: 40 } }
    });
    
    await orchestrator.processTask(task, context);
    
    // With high priority, the simple threshold is lowered, so this should go to Gemini Pro
    expect(GeminiHandler.prototype.processTask).toHaveBeenCalledWith(task, context);
  });
  
  test('should fall back to Gemini Flash when primary model fails', async () => {
    const task = { content: 'This is a complex task' };
    
    // Make Claude handler throw an error
    ClaudeHandler.prototype.processTask.mockRejectedValueOnce(new Error('API quota exceeded'));
    
    const result = await orchestrator.processTask(task);
    
    expect(ComplexityScorer.prototype.scoreTask).toHaveBeenCalledWith(task);
    expect(ClaudeHandler.prototype.processTask).toHaveBeenCalledWith(task, {});
    expect(GeminiHandler.prototype.processSimpleTask).toHaveBeenCalledWith(task, {});
    expect(result.model).toBe('gemini-1.5-flash');
  });
});
