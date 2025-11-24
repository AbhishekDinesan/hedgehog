import type * as vscode from 'vscode';

import { readVariables } from './debugAdapter';
import { readMemoryBlock } from './memoryReader';
import { buildHTMLVisualization } from './htmlRenderer';
import {
    DebugVariable,
    GraphOptions,
    GRAPH_NODE_LIMIT,
    MemoryInfo
} from './types';
import { sanitizeLabel } from './utils';

export async function buildDeepGraph(
    session: vscode.DebugSession,
    rootLabel: string,
    variables: DebugVariable[],
    options: GraphOptions
): Promise<string> {
    // Route to appropriate renderer based on visualization mode
    if (options.visualizationMode === 'memory-blocks') {
        return await buildHTMLVisualization(session, rootLabel, variables, options);
    }
    
    // Otherwise use Mermaid graph mode
    return await buildMermaidGraph(session, rootLabel, variables, options);
}

async function buildMermaidGraph(
    session: vscode.DebugSession,
    rootLabel: string,
    variables: DebugVariable[],
    options: GraphOptions
): Promise<string> {
    const lines: string[] = ['graph TD;'];
    const nodeDefinitions: string[] = [];
    const edges: string[] = [];
    const visitedReferences = new Set<number>();
    const memoryCache = new Map<string, Promise<MemoryInfo | undefined>>();
    let nodeCount = 0;
    let truncated = false;

    const rootId = 'Scope';
    const sanitizedRootLabel = sanitizeLabel(rootLabel) || 'Locals';
    nodeDefinitions.push(`    ${rootId}["${sanitizedRootLabel}"];`);

    const getMemoryInfo = (memoryReference: string) => {
        if (!memoryReference) {
            return undefined;
        }

        if (!memoryCache.has(memoryReference)) {
            memoryCache.set(
                memoryReference,
                readMemoryBlock(session, memoryReference, options.memoryReadSize)
            );
        }
        return memoryCache.get(memoryReference);
    };

    const visit = async (variable: DebugVariable, parentId: string): Promise<void> => {
        if (nodeCount >= GRAPH_NODE_LIMIT) {
            truncated = true;
            return;
        }

        // Skip internal/special variables
        if (shouldSkipVariable(variable, options.hideInternalVariables)) {
            return;
        }

        const nodeId = `Node${nodeCount++}`;
        const memoryInfo = options.showMemoryAddresses && variable.memoryReference
            ? await getMemoryInfo(variable.memoryReference)
            : undefined;
        const address = extractAddress(variable, memoryInfo);
        const label = formatVariableLabel(variable, address, options.showMemoryAddresses);
        const isContainerVar = isContainer(variable);
        const nodeShape = isContainerVar
            ? `${nodeId}((${label}))`
            : `${nodeId}["${label}"]`;

        nodeDefinitions.push(`    ${nodeShape};`);
        edges.push(`    ${parentId} --> ${nodeId};`);

        if (options.showMemoryAddresses && memoryInfo) {
            const detailNodeId = `${nodeId}Mem`;
            nodeDefinitions.push(`    ${detailNodeId}{{${formatMemoryNode(memoryInfo)}}};`);
            edges.push(`    ${nodeId} -.-> ${detailNodeId};`);
        }

        if (!isContainerVar) {
            return;
        }

        const reference = variable.variablesReference ?? 0;
        if (reference <= 0 || visitedReferences.has(reference)) {
            return;
        }

        visitedReferences.add(reference);
        const children = await readVariables(session, reference);

        for (const child of children) {
            await visit(child, nodeId);
            if (nodeCount >= GRAPH_NODE_LIMIT) {
                truncated = true;
                break;
            }
        }
    };

    for (const variable of variables) {
        await visit(variable, rootId);
        if (nodeCount >= GRAPH_NODE_LIMIT) {
            truncated = true;
            break;
        }
    }

    if (truncated) {
        const noteId = `Node${nodeCount + 1}`;
        nodeDefinitions.push(`    ${noteId}{{Graph truncated after ${GRAPH_NODE_LIMIT} nodes}};`);
        edges.push(`    ${rootId} --> ${noteId};`);
    }

    return [...lines, ...nodeDefinitions, ...edges].join('\n');
}

function shouldSkipVariable(variable: DebugVariable, hideInternal: boolean): boolean {
    if (!hideInternal) {
        return false;
    }
    
    const name = variable.name;
    
    // Skip Python special/magic variables
    if (name.startsWith('__') && name.endsWith('__')) {
        return true;
    }
    
    // Skip "special variables" group
    if (name === 'special variables') {
        return true;
    }
    
    // Skip common internal Python attributes
    const skipNames = [
        '__dict__', '__weakref__', '__module__', '__doc__',
        '__class__', '__bases__', '__mro__', '__subclasses__',
        'function variables', 'class variables', 'special variables'
    ];
    
    if (skipNames.includes(name)) {
        return true;
    }
    
    return false;
}

function isContainer(variable: DebugVariable): boolean {
    if ((variable.variablesReference ?? 0) > 0) {
        return true;
    }

    const type = variable.type ?? '';
    return /pointer|\*|array|list|dict|map/i.test(type);
}

function formatVariableLabel(
    variable: DebugVariable,
    address: string | undefined,
    showAddress: boolean
): string {
    const name = sanitizeLabel(variable.name) || 'unknown';
    const value = sanitizeLabel(variable.value ?? '');
    
    // Limit value length to prevent syntax errors with very long strings
    const truncatedValue = value.length > 100 ? value.substring(0, 97) + '...' : value;
    
    let label = truncatedValue ? `${name}: ${truncatedValue}` : name;

    if (showAddress && address) {
        label = `${label} @${sanitizeLabel(address)}`;
    }

    return label;
}

function extractAddress(variable: DebugVariable, memoryInfo?: MemoryInfo): string | undefined {
    if (memoryInfo?.address) {
        return memoryInfo.address;
    }

    if (variable.address) {
        return variable.address;
    }

    if (variable.memoryReference) {
        return variable.memoryReference;
    }

    const value = variable.value ?? '';
    const match = value.match(/0x[0-9a-fA-F]+/);
    return match?.[0];
}

function formatMemoryNode(memory: MemoryInfo): string {
    const parts: string[] = [`@${sanitizeLabel(memory.address)}`];

    if (typeof memory.size === 'number') {
        parts.push(`${memory.size} bytes`);
    }

    if (memory.rawBytes) {
        const preview = memory.rawBytes.split('\n').slice(0, 3).join(' | ');
        parts.push(preview);
    }

    return sanitizeLabel(parts.join(' • '));
}

