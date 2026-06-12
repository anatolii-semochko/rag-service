import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { RetrievalMode } from '../enums/retrieval-mode.enum';
import { ChatTraceService } from '../../../chat/services/chat-trace.service';

@Injectable()
export class RetrievalService {
  private strategies = new Map<RetrievalMode, RetrievalStrategy>();

  registerStrategy(mode: RetrievalMode, strategy: RetrievalStrategy): void {
    this.strategies.set(mode, strategy);
  }

  async retrieve(
    query: string,
    options: RetrievalOptions = {},
    trace?: ChatTraceService,
  ): Promise<RetrievalResult> {
    const mode = options.mode || RetrievalMode.HYBRID;
    const strategy = this.strategies.get(mode);

    if (!strategy) {
      throw new Error(`Retrieval strategy for mode '${mode}' not found`);
    }

    if (trace) {
      trace.addStep('strategy_selection', {
        selectedStrategy: mode,
        availableStrategies: this.getAvailableStrategies(),
        options: {
          limit: options.limit,
          threshold: options.threshold,
          collectionIds: options.collectionIds?.length,
        }
      });
    }

    const startTime = Date.now();
    const result = await strategy.retrieve(query, options);
    const processingTime = Date.now() - startTime;

    if (trace) {
      trace.addStep('strategy_execution', {
        strategy: mode,
        processingTime,
        chunksRetrieved: result.chunks.length,
        chunks: result.chunks.map(chunk => ({
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          score: chunk.score,
          contentPreview: chunk.content.substring(0, 100) + '...',
          metadata: chunk.metadata
        }))
      });
    }

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