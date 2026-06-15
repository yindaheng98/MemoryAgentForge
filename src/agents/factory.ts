import type { AgentFactoryMap, AgentTeam, RecordCallback } from "coding-agent-forge";

import { memoryAggregate, type MemoryAggregateOptions } from "./aggregate.js";
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

export type MemoryAggregateAgentVariablesByName = {
  "memory-reader": MemoryReaderVariables;
};

export type MemoryDispatchAgentVariablesByName = {
  "memory-modify-planner": MemoryModifyPlannerVariables;
  "memory-modifier": MemoryModifierVariables;
  "memory-create-planner": MemoryCreatePlannerVariables;
  "memory-creator": MemoryCreatorVariables;
};

export type MemoryAgentVariablesByName = MemoryAggregateAgentVariablesByName &
  MemoryDispatchAgentVariablesByName;

export const memoryAggregateAgentFactories: AgentFactoryMap = {
  "memory-reader": (thread, constants) => new MemoryReaderAgent(thread, constants),
};

export const memoryDispatchAgentFactories: AgentFactoryMap = {
  "memory-modify-planner": (thread, constants) => new MemoryModifyPlannerAgent(thread, constants),
  "memory-modifier": (thread, constants) => new MemoryModifierAgent(thread, constants),
  "memory-create-planner": (thread, constants) => new MemoryCreatePlannerAgent(thread, constants),
  "memory-creator": (thread, constants) => new MemoryCreatorAgent(thread, constants),
};

export const agentFactories: AgentFactoryMap = {
  ...memoryAggregateAgentFactories,
  ...memoryDispatchAgentFactories,
};

/**
 * Small facade over the recall-side memory agent team.
 */
export class MemoryAggregator {
  constructor(private readonly team: AgentTeam<MemoryAggregateAgentVariablesByName>) {}

  aggregate(options: MemoryAggregateOptions, onRecord?: RecordCallback): Promise<MemoryFraction[]> {
    return memoryAggregate(
      async () => (await this.team.createAgent("memory-reader")) as MemoryReaderAgent,
      options,
      onRecord,
    );
  }
}

/**
 * Small facade over the remember-side memory agent team.
 */
export class MemoryDispatcher {
  constructor(private readonly team: AgentTeam<MemoryDispatchAgentVariablesByName>) {}

  dispatch(options: MemoryDispatchOptions, onRecord?: RecordCallback): Promise<void> {
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
