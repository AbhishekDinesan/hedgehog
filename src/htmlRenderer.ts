import type * as vscode from 'vscode';
import { DebugVariable, GraphOptions, GRAPH_NODE_LIMIT } from './types';
import { sanitizeLabel } from './utils';
import { readVariables } from './debugAdapter';

interface MemoryBlock {
    id: string;
    name: string;
    type: 'root' | 'object' | 'primitive';
    address?: string;
    fields: Array<{
        name: string;
        value: string;
        isPointer: boolean;
        targetId?: string;
    }>;
}

export async function buildHTMLVisualization(
    session: vscode.DebugSession,
    rootLabel: string,
    variables: DebugVariable[],
    options: GraphOptions
): Promise<string> {
    const blocks: MemoryBlock[] = [];
    let blockIdCounter = 0;
    const visitedRefs = new Set<number>();
    let nodeCount = 0;
    let truncated = false;

    // Create root block
    const rootId = `block_${blockIdCounter++}`;
    const rootBlock: MemoryBlock = {
        id: rootId,
        name: rootLabel,
        type: 'root',
        fields: []
    };

    function shouldSkip(variable: DebugVariable): boolean {
        if (!options.hideInternalVariables) {
            return false;
        }
        const name = variable.name;
        if (name.startsWith('__') && name.endsWith('__')) return true;
        if (name === 'special variables') return true;
        const skipNames = ['__dict__', '__weakref__', '__module__', '__doc__', '__class__'];
        if (skipNames.includes(name)) return true;
        return false;
    }

    async function processVariable(variable: DebugVariable, parentBlock: MemoryBlock, depth = 0): Promise<string | undefined> {
        if (nodeCount >= GRAPH_NODE_LIMIT) {
            truncated = true;
            return undefined;
        }

        if (shouldSkip(variable)) {
            return undefined;
        }

        const varName = variable.name;
        const varType = variable.type || '';
        
        // Skip function/method objects entirely - they're not useful in memory visualization
        if (varType.includes('function') || varType.includes('method') || varType.includes('builtin')) {
            return undefined;
        }

        nodeCount++;

        const varRef = variable.variablesReference ?? 0;
        const isContainer = varRef > 0;
        
        if (!isContainer) {
            // Primitive value - add directly to parent block
            parentBlock.fields.push({
                name: sanitizeLabel(varName),
                value: truncateValue(sanitizeLabel(variable.value ?? 'undefined')),
                isPointer: false
            });
            return undefined;
        }

        // Check if already visited (cycle detection)
        if (visitedRefs.has(varRef)) {
            parentBlock.fields.push({
                name: sanitizeLabel(varName),
                value: '↻ circular',
                isPointer: false
            });
            return undefined;
        }

        visitedRefs.add(varRef);

        // Fetch children to determine if this should be a separate block or inline
        let children: DebugVariable[] = [];
        try {
            children = await readVariables(session, varRef);
        } catch (error) {
            parentBlock.fields.push({
                name: sanitizeLabel(varName),
                value: 'Error reading',
                isPointer: false
            });
            return undefined;
        }

        // Filter out functions from children
        const meaningfulChildren = children.filter(child => {
            const childType = child.type || '';
            return !childType.includes('function') && !childType.includes('method') && !childType.includes('builtin');
        });

        // Decide: create new block or inline?
        // Create new block for: pointers to other objects, arrays, user-defined types
        // Inline for: simple structs with only primitives
        const shouldCreateBlock = 
            varType.includes('*') ||  // Pointer types
            varType.includes('Node') || // Common data structure nodes
            varType.includes('List') ||
            varType.includes('Tree') ||
            depth === 0 || // Always create block for top-level
            meaningfulChildren.length > 3; // Or if it has many fields

        if (!shouldCreateBlock && depth > 0) {
            // Inline the fields
            for (const child of meaningfulChildren) {
                if (nodeCount >= GRAPH_NODE_LIMIT) {
                    truncated = true;
                    break;
                }
                parentBlock.fields.push({
                    name: sanitizeLabel(`${varName}.${child.name}`),
                    value: truncateValue(sanitizeLabel(child.value ?? '')),
                    isPointer: false
                });
            }
            return undefined;
        }

        // Create a new block for this object
        const blockId = `block_${blockIdCounter++}`;
        const newBlock: MemoryBlock = {
            id: blockId,
            name: `${sanitizeLabel(varName)} (${truncateValue(varType)})`,
            type: 'object',
            address: variable.memoryReference || extractAddressFromValue(variable.value),
            fields: []
        };

        blocks.push(newBlock);

        // Add pointer field in parent
        parentBlock.fields.push({
            name: sanitizeLabel(varName),
            value: truncateValue(varType),
            isPointer: true,
            targetId: blockId
        });

        // Recursively process meaningful children
        for (const child of meaningfulChildren) {
            if (nodeCount >= GRAPH_NODE_LIMIT) {
                truncated = true;
                break;
            }
            await processVariable(child, newBlock, depth + 1);
        }

        return blockId;
    }

    // Process all root variables
    for (const variable of variables) {
        if (nodeCount >= GRAPH_NODE_LIMIT) {
            truncated = true;
            break;
        }
        await processVariable(variable, rootBlock);
    }

    blocks.unshift(rootBlock);

    if (truncated) {
        rootBlock.fields.push({
            name: '⚠️',
            value: `Visualization truncated at ${GRAPH_NODE_LIMIT} nodes`,
            isPointer: false
        });
    }

    return renderBlocks(blocks, options);
}

function truncateValue(value: string, maxLength = 50): string {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength - 3) + '...';
}

function extractAddressFromValue(value?: string): string | undefined {
    if (!value) return undefined;
    const match = value.match(/0x[0-9a-fA-F]+/);
    return match?.[0];
}

function renderBlocks(blocks: MemoryBlock[], options: GraphOptions): string {
    const html: string[] = [];
    
    html.push('<div class="container">');
    
    for (const block of blocks) {
        html.push(`<div class="memory-block ${block.type}" id="${block.id}">`);
        
        // Header
        html.push(`<div class="block-header ${block.type}">`);
        html.push(escapeHtml(block.name));
        if (block.type !== 'root') {
            html.push(`<span class="type-badge">${block.type}</span>`);
        }
        html.push('</div>');
        
        // Address (if available and enabled)
        if (options.showMemoryAddresses && block.address) {
            html.push(`<div class="block-address">@ ${escapeHtml(block.address)}</div>`);
        }
        
        // Fields
        for (const field of block.fields) {
            html.push('<div class="block-field">');
            html.push(`<span class="field-name">${escapeHtml(field.name)}:</span>`);
            
            if (field.isPointer && field.targetId) {
                // Don't use onclick - the webview will attach event listeners
                html.push(`<span class="field-pointer" data-target="${field.targetId}">→ ${escapeHtml(field.value)}</span>`);
            } else if (field.value === 'null' || field.value === 'None' || field.value === 'nullptr') {
                html.push(`<span class="field-value null-value">${escapeHtml(field.value)}</span>`);
            } else {
                html.push(`<span class="field-value">${escapeHtml(field.value)}</span>`);
            }
            
            html.push('</div>');
        }
        
        html.push('</div>');
    }
    
    html.push('</div>');
    
    // No inline scripts needed - the webview template handles all interactivity
    return html.join('\n');
}

function escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

