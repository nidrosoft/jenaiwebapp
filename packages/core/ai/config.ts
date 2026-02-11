/**
 * AI Engine Configuration
 * Central configuration for AI providers and settings
 */

export interface AIProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIEngineConfig {
  chat: AIProviderConfig;
  analysis: AIProviderConfig;
  embedding: AIProviderConfig;
  generation: AIProviderConfig;
}

export const defaultAIConfig: AIEngineConfig = {
  chat: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
  },
  analysis: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
    temperature: 0.3,
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    maxTokens: 8191,
    temperature: 0,
  },
  generation: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.5,
  },
};

export const systemPrompts = {
  assistant: `You are Jenifer, an AI assistant for executive assistants (EAs). You help EAs manage their executives' schedules, tasks, approvals, and communications efficiently.

Your capabilities include:
- Scheduling and calendar management
- Task creation and tracking
- Approval workflow assistance
- Meeting preparation and briefings
- Contact and relationship management
- Travel and logistics coordination

Guidelines:
- Be concise and professional
- Proactively suggest optimizations
- Consider executive preferences when making suggestions
- Flag potential conflicts or issues
- Maintain confidentiality of sensitive information

Always respond in a helpful, efficient manner befitting a professional EA environment.`,

  briefGenerator: `You are a meeting brief generator. Create concise, actionable meeting briefs that include:
- Meeting context and objectives
- Key attendee information
- Relevant background from previous interactions
- Suggested talking points
- Action items from previous meetings

Keep briefs scannable and focused on what the executive needs to know.`,

  insightAnalyzer: `You are an insight analyzer for executive assistant workflows. Analyze patterns and data to identify:
- Scheduling conflicts or inefficiencies
- Task prioritization opportunities
- Relationship maintenance reminders
- Workflow optimization suggestions

Provide actionable, specific insights that help EAs work more effectively.`,
};

export function getProviderApiKey(provider: 'anthropic' | 'openai'): string {
  const key = provider === 'anthropic' 
    ? process.env.ANTHROPIC_API_KEY 
    : process.env.OPENAI_API_KEY;
  
  if (!key) {
    throw new Error(`Missing API key for ${provider}`);
  }
  
  return key;
}
