export type DebugVariable = {
    name: string;
    value?: string;
    variablesReference?: number;
    type?: string;
    memoryReference?: string;
    address?: string;
};

export type DebugScope = {
    name: string;
    presentationHint?: string;
    variablesReference: number;
};

export type DebugThread = {
    id: number;
    name?: string;
};

export type DebugStackFrame = {
    id: number;
    name: string;
};

export type MemoryInfo = {
    address: string;
    offset?: number;
    size?: number;
    rawBytes?: string;
};

export type VariableWithMemory = {
    variable: DebugVariable;
    memory?: MemoryInfo;
};

export type GraphOptions = {
    showMemoryAddresses: boolean;
    memoryReadSize: number;
    hideInternalVariables: boolean;
    visualizationMode: 'memory-blocks' | 'graph';
};

export const GRAPH_NODE_LIMIT = 200;
export const STACKTRACE_RETRIES = 20;
export const STACKTRACE_DELAY_MS = 100;
export const DEFAULT_MEMORY_READ_SIZE = 64;
export const MAX_MEMORY_READ_SIZE = 256;

