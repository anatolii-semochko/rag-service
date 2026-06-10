import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { RetrievalMode } from '../enums/retrieval-mode.enum';

@Injectable()
export class RetrievalService {
  private strategies = new Map<RetrievalMode, RetrievalStrategy>();

  registerStrategy(mode: RetrievalMode, strategy: RetrievalStrategy): void {
    this.strategies.set(mode, strategy);
  }

  async retrieve(
    query: string,
    options: RetrievalOptions = {},
  ): Promise<RetrievalResult> {
    const mode = options.mode || RetrievalMode.HYBRID;
    const strategy = this.strategies.get(mode);

    if (!strategy) {
      throw new Error(`Retrieval strategy for mode '${mode}' not found`);
    }

    const startTime = Date.now();
    const result = await strategy.retrieve(query, options);
    const processingTime = Date.now() - startTime;

    return {
      ...result,
      metadata: {
        ...result.metadata,
        processingTime,
        mode,
      },
    };
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}