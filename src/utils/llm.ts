// src/utils/llm.ts
import { config } from './config';

interface LLMOptions {
  model: string;
  prompt: string;
  content: string;
}

// Extract provider and model from model string
// e.g., "anthropic:messages:claude-3-7-sonnet-latest" -> { provider: "anthropic", modelType: "messages", modelName: "claude-3-7-sonnet-latest" }
function parseModelString(modelString: string) {
  const parts = modelString.split(':');

  // Default values for backward compatibility
  let provider = parts[0] || 'anthropic';
  let modelType = parts.length > 2 ? parts[1] : 'messages';
  let modelName =
    parts.length > 2 ? parts[2] : parts[1] || 'claude-3-7-sonnet-latest';

  return { provider, modelType, modelName };
}

export async function callLLM({
  model,
  prompt,
  content
}: LLMOptions): Promise<string> {
  const { provider, modelType, modelName } = parseModelString(model);

  // Prepare the combined content with prompt
  const fullPrompt = prompt.replace('{{CONTENT}}', content);

  try {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return await callAnthropic(modelName, fullPrompt);
      case 'openai':
        return await callOpenAI(modelName, fullPrompt);
      case 'google':
        return await callGemini(modelName, fullPrompt);
      case 'deepseek':
        return await callDeepseek(modelName, fullPrompt);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error calling LLM: ${error.message}`);
    }
    throw error;
  }
}

async function callAnthropic(model: string, prompt: string): Promise<string> {
  const apiKey = config.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment');
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.content[0].text;
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  const apiKey = config.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment');
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!resp.ok) {
    throw new Error(`OpenAI API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const apiKey = config.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in environment');
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 4000
        }
      })
    }
  );

  if (!resp.ok) {
    throw new Error(`Google API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.candidates[0].content.parts[0].text;
}

async function callDeepseek(model: string, prompt: string): Promise<string> {
  const apiKey = config.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set in environment');
  }

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!resp.ok) {
    throw new Error(`Deepseek API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}
