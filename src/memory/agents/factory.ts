import type { AgentFactoryMap, AgentTeam, RecordCallback } from "coding-agent-forge";

import { memoryAggregation, type MemoryAggregationOptions } from "./aggregation.js";
import { memoryDispatch, type MemoryDispatchOptions } from "./dispatch.js";
import { MemoryReaderAgent } from "./reader.js";
import { MemoryModifyPlannerAgent } from "./modify-planner.js";
import { MemoryModifierAgent } from "./modifier.js";
import { MemoryCreatePlannerAgent } from "./create-planner.js";
import { MemoryCreatorAgent } from "./creator.js";
import type { MemoryFraction } from "./types.js";
import type { MemoryReaderVariables } from "./reader.js";
import type { MemoryModifyPlannerVariables } from "./modify-planner.js";
import type { MemoryModifierVariables } from "./modifier.js";
import type { MemoryCreatePlannerVariables } from "./create-planner.js";
import type { MemoryCreatorVariables } from "./creator.js";

export type MemoryAgentVariablesByName = {
  "memory-reader": MemoryReaderVariables;
  "memory-modify-planner": MemoryModifyPlannerVariables;
  "memory-modifier": MemoryModifierVariables;
  "memory-create-planner": MemoryCreatePlannerVariables;
  "memory-creator": MemoryCreatorVariables;
};

export const agentFactories: AgentFactoryMap = {
  "memory-reader": (thread, constants) => new MemoryReaderAgent(thread, constants),
  "memory-modify-planner": (thread, constants) => new MemoryModifyPlannerAgent(thread, constants),
  "memory-modifier": (thread, constants) => new MemoryModifierAgent(thread, constants),
  "memory-create-planner": (thread, constants) => new MemoryCreatePlannerAgent(thread, constants),
  "memory-creator": (thread, constants) => new MemoryCreatorAgent(thread, constants),
};

/**
 * Small facade over the memory agent team. It keeps agent construction in one
 * place so callers only choose between recall and remember orchestration.
 */
export class Memory {
  constructor(private readonly team: AgentTeam<MemoryAgentVariablesByName>) {}

  recall(options: MemoryAggregationOptions, onRecord?: RecordCallback): Promise<MemoryFraction[]> {
    return memoryAggregation(
      async () => (await this.team.createAgent("memory-reader")) as MemoryReaderAgent,
      options,
      onRecord,
    );
  }

  remember(options: MemoryDispatchOptions, onRecord?: RecordCallback): Promise<void> {
    return memoryDispatch(
      async () =>
        (await this.team.createAgent("memory-modify-planner")) as MemoryModifyPlannerAgent,
      async () =>
        (await this.team.createAgent("memory-create-planner")) as MemoryCreatePlannerAgent,
      async () => (await this.team.createAgent("memory-modifier")) as MemoryModifierAgent,
      async () => (await this.team.createAgent("memory-creator")) as MemoryCreatorAgent,
      options,
      onRecord,
    );
  }
}
