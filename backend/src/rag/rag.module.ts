import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chunk } from '../documents/entities/chunk.entity';
import { Document } from '../documents/entities/document.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Category } from '../entities/category.entity';

// Services
import { RetrievalService } from './retrieval/services/retrieval.service';
import { KeywordSearchService } from './retrieval/services/keyword-search.service';
import { QueryExpansionService } from './retrieval/services/query-expansion.service';
import { RerankingService } from './retrieval/services/reranking.service';

// Strategies
import { VectorRetrievalStrategy } from './retrieval/strategies/vector.strategy';
import { HybridRetrievalStrategy } from './retrieval/strategies/hybrid.strategy';
import { GraphRetrievalStrategy } from './retrieval/strategies/graph.strategy';
import { AgentRetrievalStrategy } from './retrieval/strategies/agent.strategy';

// External dependencies
import { VectorStorageService } from '../ai/services/vector-storage.service';
import { OpenAIProvider } from '../ai/providers/openai.provider';
import { RetrievalMode } from './retrieval/enums/retrieval-mode.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chunk, Document, Collection, Category]),
  ],
  providers: [
    RetrievalService,
    KeywordSearchService,
    QueryExpansionService,
    RerankingService,
    VectorRetrievalStrategy,
    HybridRetrievalStrategy,
    GraphRetrievalStrategy,
    AgentRetrievalStrategy,
    VectorStorageService,
    OpenAIProvider,
    {
      provide: 'RETRIEVAL_STRATEGY_SETUP',
      useFactory: (
        retrievalService: RetrievalService,
        vectorStrategy: VectorRetrievalStrategy,
        hybridStrategy: HybridRetrievalStrategy,
        graphStrategy: GraphRetrievalStrategy,
        agentStrategy: AgentRetrievalStrategy,
      ) => {
        // Register all strategies
        retrievalService.registerStrategy(RetrievalMode.VECTOR, vectorStrategy);
        retrievalService.registerStrategy(RetrievalMode.HYBRID, hybridStrategy);
        retrievalService.registerStrategy(RetrievalMode.GRAPH, graphStrategy);
        retrievalService.registerStrategy(RetrievalMode.AGENT, agentStrategy);
        return retrievalService;
      },
      inject: [RetrievalService, VectorRetrievalStrategy, HybridRetrievalStrategy, GraphRetrievalStrategy, AgentRetrievalStrategy],
    },
  ],
  exports: [
    RetrievalService,
    KeywordSearchService,
    QueryExpansionService,
    RerankingService,
    VectorRetrievalStrategy,
    HybridRetrievalStrategy,
    GraphRetrievalStrategy,
    AgentRetrievalStrategy,
  ],
})
export class RagModule {}