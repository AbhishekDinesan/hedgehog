import * as vscode from 'vscode';

// Native module will be loaded dynamically
let nativeDebugger: any = null;

try {
    // Try to load native addon (only works after building)
    nativeDebugger = require('../build/Release/native_debugger.node');
} catch (error) {
    console.log('Native debugger not available (not built yet or not on Windows)');
}

export interface MemoryRegion {
    baseAddress: number;
    size: number;
    protection: string;
    type: string;
    state: string;
}

export interface CPURegisters {
    generalPurpose: {
        [key: string]: number;
    };
    flags: {
        value: number;
        CF: boolean;
        PF: boolean;
        AF: boolean;
        ZF: boolean;
        SF: boolean;
        TF: boolean;
        IF: boolean;
        DF: boolean;
        OF: boolean;
    };
    debug: {
        dr0: number;
        dr1: number;
        dr2: number;
        dr3: number;
        dr6: number;
        dr7: number;
        dr7Decoded: {
            [key: string]: {
                enabled: boolean;
                global: boolean;
                condition: string;
                size: number;
            };
        };
    };
    segments: {
        cs: number;
        ds: number;
        es: number;
        fs: number;
        gs: number;
        ss: number;
    };
}

export function isNativeDebuggerAvailable(): boolean {
    return nativeDebugger !== null;
}

export async function readProcessMemory(
    pid: number,
    address: number,
    size: number
): Promise<Uint8Array | null> {
    if (!nativeDebugger) {
        throw new Error('Native debugger not available');
    }
    
    try {
        return nativeDebugger.readMemory(pid, address, size);
    } catch (error: any) {
        console.error('Failed to read memory:', error.message);
        return null;
    }
}

export async function getMemoryRegions(pid: number): Promise<MemoryRegion[]> {
    if (!nativeDebugger) {
        throw new Error('Native debugger not available');
    }
    
    try {
        return nativeDebugger.getMemoryRegions(pid);
    } catch (error: any) {
        console.error('Failed to get memory regions:', error.message);
        return [];
    }
}

export async function getCPURegisters(pid: number): Promise<CPURegisters | null> {
    if (!nativeDebugger) {
        throw new Error('Native debugger not available');
    }
    
    try {
        // Get main thread ID
        const threadId = nativeDebugger.getMainThreadId(pid);
        // Get thread context (registers)
        return nativeDebugger.getThreadContext(threadId);
    } catch (error: any) {
        console.error('Failed to get CPU registers:', error.message);
        return null;
    }
}

// Detect if we're debugging C/C++ (for low-level mode)
export function isCppDebugSession(session: vscode.DebugSession): boolean {
    const type = session.type;
    const name = session.name.toLowerCase();
    
    // Check debug adapter type
    if (type === 'cppdbg' || type === 'cppvsdbg' || type === 'lldb' || type === 'gdb') {
        return true;
    }
    
    // Check session name patterns
    if (name.includes('c++') || name.includes('cpp') || name.includes('gdb') || name.includes('lldb')) {
        return true;
    }
    
    return false;
}

// Get process ID from debug session
export async function getProcessId(session: vscode.DebugSession): Promise<number | null> {
    try {
        // Try to get PID via custom request
        const response = await session.customRequest('evaluate', {
            expression: '$processId',
            context: 'repl'
        });
        
        if (response && response.result) {
            const pid = parseInt(response.result, 10);
            if (!isNaN(pid)) {
                return pid;
            }
        }
    } catch (error) {
        console.log('Could not get PID via evaluate');
    }
    
    // Fallback: parse from session configuration
    const config = session.configuration;
    if (config.processId) {
        return config.processId;
    }
    
    return null;
}

