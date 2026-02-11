/**
 * AI Orchestrator
 * Main entry point for AI interactions
 */

import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { defaultAIConfig, systemPrompts, getProviderApiKey } from './config';
import { buildContext, formatContextForPrompt } from './context-builder';
import { getAllTools, type ToolContext } from './tools';
import type { ChatMessage, AIContext } from '@jeniferai/types';

// Import tool registrations
import './tools/calendar';
import './tools/tasks';
import './tools/approvals';
import './tools/contacts';
import './tools/generation';
import './tools/insights';

export interface ChatOptions {
  userId: string;
  orgId: string;
  executiveId?: string;
  timezone: string;
  conversationId?: string;
}

export interface ChatResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
}

function getModel(provider: 'anthropic' | 'openai', modelName: string) {
  if (provider === 'anthropic') {
    return anthropic(modelName);
  }
  return openai(modelName);
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const config = defaultAIConfig.chat;
  
  // Build context
  const context = await buildContext({
    userId: options.userId,
    orgId: options.orgId,
    executiveId: options.executiveId,
    timezone: options.timezone,
  });
  
  const contextPrompt = formatContextForPrompt(context);
  const systemMessage = `${systemPrompts.assistant}\n\n--- Current Context ---\n${contextPrompt}`;
  
  const toolContext: ToolContext = {
    userId: options.userId,
    orgId: options.orgId,
    executiveId: options.executiveId,
    timezone: options.timezone,
  };
  
  // Convert tools to Vercel AI format
  const tools = getAllTools().reduce((acc, tool) => {
    acc[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
      execute: async (params: unknown) => tool.execute(params, toolContext),
    };
    return acc;
  }, {} as Record<string, unknown>);
  
  const model = getModel(config.provider, config.model);
  
  const result = await generateText({
    model,
    system: systemMessage,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    tools: tools as any,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  
  return {
    content: result.text,
    toolCalls: result.toolCalls?.map((tc: { toolName: string; args: unknown; result?: unknown }) => ({
      name: tc.toolName,
      arguments: tc.args as Record<string, unknown>,
      result: tc.result,
    })),
  };
}

export async function* streamChat(
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<string> {
  const config = defaultAIConfig.chat;
  
  const context = await buildContext({
    userId: options.userId,
    orgId: options.orgId,
    executiveId: options.executiveId,
    timezone: options.timezone,
  });
  
  const contextPrompt = formatContextForPrompt(context);
  const systemMessage = `${systemPrompts.assistant}\n\n--- Current Context ---\n${contextPrompt}`;
  
  const model = getModel(config.provider, config.model);
  
  const result = streamText({
    model,
    system: systemMessage,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  
  for await (const chunk of result.textStream) {
    yield chunk;
  }
}

export async function generateMeetingBrief(
  meetingId: string,
  options: ChatOptions
): Promise<string> {
  const config = defaultAIConfig.generation;
  
  // TODO: Fetch meeting data and attendee info
  const meetingData = { id: meetingId };
  
  const model = getModel(config.provider, config.model);
  
  const result = await generateText({
    model,
    system: systemPrompts.briefGenerator,
    messages: [{
      role: 'user',
      content: `Generate a meeting brief for the following meeting:\n${JSON.stringify(meetingData, null, 2)}`,
    }],
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  
  return result.text;
}

export async function analyzeForInsights(
  data: Record<string, unknown>,
  options: ChatOptions
): Promise<string> {
  const config = defaultAIConfig.analysis;
  
  const model = getModel(config.provider, config.model);
  
  const result = await generateText({
    model,
    system: systemPrompts.insightAnalyzer,
    messages: [{
      role: 'user',
      content: `Analyze the following data and provide actionable insights:\n${JSON.stringify(data, null, 2)}`,
    }],
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  
  return result.text;
}
