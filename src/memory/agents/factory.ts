import type { AgentFactoryMap } from "coding-agent-forge";

import { MemoryReaderAgent } from "./reader.js";
import { MemoryModifyPlannerAgent } from "./modify-planner.js";
import { MemoryModifierAgent } from "./modifier.js";
import { MemoryCreatePlannerAgent } from "./create-planner.js";
import { MemoryCreatorAgent } from "./creator.js";
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
