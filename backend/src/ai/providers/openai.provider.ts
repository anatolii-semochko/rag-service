import { Injectable } from '@nestjs/common';
import { LLMProvider, EmbeddingResult } from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables');
    }
  }

  async generate(input: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: input,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embeddings API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0]?.embedding || [];
    } catch (error) {
      console.error('Error generating embeddings with OpenAI:', error);
      throw error;
    }
  }

  async embeddingsWithTokens(text: string): Promise<EmbeddingResult> {
    const embedding = await this.embeddings(text);
    // Simple token count (approximately 1 token = 4 characters for English)
    const tokens = Math.ceil(text.length / 4);

    return {
      embedding,
      tokens,
    };
  }
}