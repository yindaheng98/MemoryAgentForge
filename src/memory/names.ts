import type { MemoryAgentNames } from "../agents/index.js";

const memoryAgentSuffixByRole = {
  reader: "reader",
  modifyPlanner: "modify-planner",
  modifier: "modifier",
  createPlanner: "create-planner",
  creator: "creator",
} as const satisfies Record<keyof MemoryAgentNames, string>;

type MemoryAgentSuffixByRole = typeof memoryAgentSuffixByRole;

export type MemoryAgentNamesForPrefix<Prefix extends string> = {
  [Role in keyof MemoryAgentNames]: `${Prefix}-${MemoryAgentSuffixByRole[Role]}`;
};

export function createMemoryAgentNamesForPrefix<const Prefix extends string>(
  prefix: Prefix,
): MemoryAgentNamesForPrefix<Prefix> {
  return {
    reader: `${prefix}-${memoryAgentSuffixByRole.reader}`,
    modifyPlanner: `${prefix}-${memoryAgentSuffixByRole.modifyPlanner}`,
    modifier: `${prefix}-${memoryAgentSuffixByRole.modifier}`,
    createPlanner: `${prefix}-${memoryAgentSuffixByRole.createPlanner}`,
    creator: `${prefix}-${memoryAgentSuffixByRole.creator}`,
  };
}
