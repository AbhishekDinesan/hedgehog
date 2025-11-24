import * as vscode from 'vscode';
import { Buffer } from 'buffer';

import { MemoryInfo, MAX_MEMORY_READ_SIZE } from './types';
import { getErrorMessage } from './utils';

export async function readMemoryBlock(
    session: vscode.DebugSession,
    memoryReference: string,
    size: number,
    offset = 0
): Promise<MemoryInfo | undefined> {
    if (!memoryReference) {
        return undefined;
    }

    const clampedSize = Math.max(1, Math.min(size, MAX_MEMORY_READ_SIZE));

    try {
        const response = await session.customRequest('readMemory', {
            memoryReference,
            offset,
            count: clampedSize
        }) as { address?: string; data?: string; unreadableBytes?: number };

        if (!response || !response.address) {
            return undefined;
        }

        const rawData = response.data ?? '';
        const buffer = rawData ? Buffer.from(rawData, 'base64') : Buffer.alloc(0);

        return {
            address: response.address,
            offset,
            size: buffer.length,
            rawBytes: bufferToHexDump(buffer)
        };
    } catch (error) {
        console.warn('readMemory failed', getErrorMessage(error));
        return undefined;
    }
}

function bufferToHexDump(buffer: Buffer, bytesPerRow = 8): string {
    if (!buffer.length) {
        return '(no data)';
    }

    const rows: string[] = [];
    for (let i = 0; i < buffer.length; i += bytesPerRow) {
        const slice = buffer.subarray(i, i + bytesPerRow);
        const hexValues = Array.from(slice.values()).map(byte => byte.toString(16).padStart(2, '0'));
        rows.push(hexValues.join(' '));
    }

    return rows.join('\n');
}