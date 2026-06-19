import type { AgentFactoryMap, AgentTeam, RecordCallback } from "coding-agent-forge";

import { memoryAggregate, type MemoryAggregateOptions } from "./aggregate.js";
import { memoryClean, type MemoryCleanOptions } from "./cleaner.js";
import { memoryDispatch, type MemoryDispatchOptions } from "./dispatch.js";
import { MemoryCleanerAgent } from "./cleaner.js";
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
import type { MemoryCleanerVariables } from "./cleaner.js";
import type { MemoryCreatorVariables } from "./creator.js";

export type MemoryAgentNames = {
  reader: string;
  modifyPlanner: string;
  modifier: string;
  createPlanner: string;
  creator: string;
  cleaner: string;
};

export const memoryAgentNames = {
  reader: "memory-reader",
  modifyPlanner: "memory-modify-planner",
  modifier: "memory-modifier",
  createPlanner: "memory-create-planner",
  creator: "memory-creator",
  cleaner: "memory-cleaner",
} as const satisfies MemoryAgentNames;

export type MemoryAggregateAgentVariablesByName<
  Names extends Pick<MemoryAgentNames, "reader"> = typeof memoryAgentNames,
> = Record<Names["reader"], MemoryReaderVariables>;

export type MemoryDispatchAgentVariablesByName<
  Names extends Omit<MemoryAgentNames, "reader" | "cleaner"> = typeof memoryAgentNames,
> = Record<Names["modifyPlanner"], MemoryModifyPlannerVariables> &
  Record<Names["modifier"], MemoryModifierVariables> &
  Record<Names["createPlanner"], MemoryCreatePlannerVariables> &
  Record<Names["creator"], MemoryCreatorVariables>;

export type MemoryCleanAgentVariablesByName<
  Names extends Pick<MemoryAgentNames, "cleaner"> = typeof memoryAgentNames,
> = Record<Names["cleaner"], MemoryCleanerVariables>;

export type MemoryAgentVariablesByName<Names extends MemoryAgentNames = typeof memoryAgentNames> =
  MemoryAggregateAgentVariablesByName<Names> &
    MemoryDispatchAgentVariablesByName<Names> &
    MemoryCleanAgentVariablesByName<Names>;

export function createMemoryAggregateAgentFactories(
  agentNames: Pick<MemoryAgentNames, "reader"> = memoryAgentNames,
): AgentFactoryMap {
  return {
    [agentNames.reader]: (thread, constants) => new MemoryReaderAgent(thread, constants),
  };
}

export function createMemoryDispatchAgentFactories(
  agentNames: Omit<MemoryAgentNames, "reader" | "cleaner"> = memoryAgentNames,
): AgentFactoryMap {
  return {
    [agentNames.modifyPlanner]: (thread, constants) =>
      new MemoryModifyPlannerAgent(thread, constants),
    [agentNames.modifier]: (thread, constants) => new MemoryModifierAgent(thread, constants),
    [agentNames.createPlanner]: (thread, constants) =>
      new MemoryCreatePlannerAgent(thread, constants),
    [agentNames.creator]: (thread, constants) => new MemoryCreatorAgent(thread, constants),
  };
}

export function createMemoryCleanAgentFactories(
  agentNames: Pick<MemoryAgentNames, "cleaner"> = memoryAgentNames,
): AgentFactoryMap {
  return {
    [agentNames.cleaner]: (thread, constants) => new MemoryCleanerAgent(thread, constants),
  };
}

export function createMemoryAgentFactories(
  agentNames: MemoryAgentNames = memoryAgentNames,
): AgentFactoryMap {
  return {
    ...createMemoryAggregateAgentFactories(agentNames),
    ...createMemoryDispatchAgentFactories(agentNames),
    ...createMemoryCleanAgentFactories(agentNames),
  };
}

export const memoryAggregateAgentFactories = createMemoryAggregateAgentFactories();

export const memoryDispatchAgentFactories = createMemoryDispatchAgentFactories();

export const memoryCleanAgentFactories = createMemoryCleanAgentFactories();

export const agentFactories = createMemoryAgentFactories();

/**
 * Small facade over the recall-side memory agent team.
 */
export class MemoryAggregator<
  Names extends Pick<MemoryAgentNames, "reader"> = typeof memoryAgentNames,
> {
  constructor(
    private readonly team: AgentTeam<MemoryAggregateAgentVariablesByName<Names>>,
    private readonly agentNames: Names = memoryAgentNames as unknown as Names,
  ) {}

  aggregate(options: MemoryAggregateOptions, onRecord?: RecordCallback): Promise<MemoryFraction[]> {
    return memoryAggregate(
      async () => (await this.team.createAgent(this.agentNames.reader)) as MemoryReaderAgent,
      options,
      onRecord,
    );
  }
}

/**
 * Small facade over the remember-side memory agent team.
 */
export class MemoryDispatcher<
  Names extends Omit<MemoryAgentNames, "reader" | "cleaner"> = typeof memoryAgentNames,
> {
  constructor(
    private readonly team: AgentTeam<MemoryDispatchAgentVariablesByName<Names>>,
    private readonly agentNames: Names = memoryAgentNames as unknown as Names,
  ) {}

  dispatch(options: MemoryDispatchOptions, onRecord?: RecordCallback): Promise<void> {
    return memoryDispatch(
      async () =>
        (await this.team.createAgent(this.agentNames.modifyPlanner)) as MemoryModifyPlannerAgent,
      async () =>
        (await this.team.createAgent(this.agentNames.createPlanner)) as MemoryCreatePlannerAgent,
      async () => (await this.team.createAgent(this.agentNames.modifier)) as MemoryModifierAgent,
      async () => (await this.team.createAgent(this.agentNames.creator)) as MemoryCreatorAgent,
      options,
      onRecord,
    );
  }
}

/**
 * Small facade over the memory maintenance agent team.
 */
export class MemoryCleaner<
  Names extends Pick<MemoryAgentNames, "cleaner"> = typeof memoryAgentNames,
> {
  constructor(
    private readonly team: AgentTeam<MemoryCleanAgentVariablesByName<Names>>,
    private readonly agentNames: Names = memoryAgentNames as unknown as Names,
  ) {}

  clean(options: MemoryCleanOptions, onRecord?: RecordCallback): Promise<void> {
    return memoryClean(
      async () => (await this.team.createAgent(this.agentNames.cleaner)) as MemoryCleanerAgent,
      options,
      onRecord,
    );
  }
}
