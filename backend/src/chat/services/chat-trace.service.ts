import { Injectable } from '@nestjs/common';

export interface TraceStep {
  step: string;
  timestamp: number;
  duration?: number;
  data: any;
  metadata?: {
    strategy?: string;
    resultsCount?: number;
    errorMessage?: string;
  };
}

export interface TraceData {
  query: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: TraceStep[];
  finalContext?: any[];
  generatedPrompt?: string;
  llmResponse?: string;
  error?: string;
}

@Injectable()
export class ChatTraceService {
  private traceData: TraceData;
  private enabled: boolean = false;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  static create(enabled: boolean = false): ChatTraceService {
    return new ChatTraceService(enabled);
  }

  initialize(query: string, sessionId: string): void {
    if (!this.enabled) return;

    this.traceData = {
      query,
      sessionId,
      startTime: Date.now(),
      steps: [],
    };
  }

  addStep(step: string, data: any, metadata?: any): void {
    if (!this.enabled || !this.traceData) return;

    const stepData: TraceStep = {
      step,
      timestamp: Date.now(),
      data,
      metadata,
    };

    // Calculate duration from previous step
    if (this.traceData.steps.length > 0) {
      const prevStep = this.traceData.steps[this.traceData.steps.length - 1];
      stepData.duration = stepData.timestamp - prevStep.timestamp;
    } else {
      stepData.duration = stepData.timestamp - this.traceData.startTime;
    }

    this.traceData.steps.push(stepData);
  }

  setFinalContext(context: any[]): void {
    if (!this.enabled || !this.traceData) return;
    this.traceData.finalContext = context;
  }

  setGeneratedPrompt(prompt: string): void {
    if (!this.enabled || !this.traceData) return;
    this.traceData.generatedPrompt = prompt;
  }

  setLLMResponse(response: string): void {
    if (!this.enabled || !this.traceData) return;
    this.traceData.llmResponse = response;
  }

  setError(error: string): void {
    if (!this.enabled || !this.traceData) return;
    this.traceData.error = error;
  }

  finalize(): TraceData | null {
    if (!this.enabled || !this.traceData) return null;

    this.traceData.endTime = Date.now();
    this.traceData.totalDuration = this.traceData.endTime - this.traceData.startTime;

    return this.traceData;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getTrace(): TraceData | null {
    return this.enabled ? this.traceData : null;
  }
}