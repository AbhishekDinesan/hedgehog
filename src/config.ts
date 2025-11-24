import * as vscode from 'vscode';

import { DEFAULT_MEMORY_READ_SIZE, GraphOptions, MAX_MEMORY_READ_SIZE } from './types';

export function getGraphOptions(): GraphOptions {
    const config = vscode.workspace.getConfiguration('hedgehog');
    const showMemoryAddresses = config.get<boolean>('showMemoryAddresses', false);
    const requestedSize = config.get<number>('memoryReadSize', DEFAULT_MEMORY_READ_SIZE);
    const memoryReadSize = clampMemoryReadSize(requestedSize);
    const hideInternalVariables = config.get<boolean>('hideInternalVariables', true);
    const visualizationMode = config.get<'memory-blocks' | 'graph'>('visualizationMode', 'memory-blocks');

    return {
        showMemoryAddresses,
        memoryReadSize,
        hideInternalVariables,
        visualizationMode
    };
}

function clampMemoryReadSize(value?: number): number {
    if (!value || Number.isNaN(value)) {
        return DEFAULT_MEMORY_READ_SIZE;
    }

    const clamped = Math.max(1, Math.min(value, MAX_MEMORY_READ_SIZE));
    return Math.floor(clamped);
}

