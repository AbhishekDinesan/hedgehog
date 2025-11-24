import * as vscode from 'vscode';
import { 
    DebugThread, 
    DebugStackFrame, 
    DebugScope, 
    DebugVariable,
    STACKTRACE_RETRIES,
    STACKTRACE_DELAY_MS
} from './types';
import { getErrorMessage, delay } from './utils';

export async function getPrimaryThreadId(session: vscode.DebugSession): Promise<number> {
    const response = await session.customRequest('threads') as { threads?: DebugThread[] };
    const threads = response?.threads ?? [];

    if (!threads.length) {
        throw new Error('Debugger has not reported any threads.');
    }

    const preferred = threads.find(thread => (thread.name ?? '').toLowerCase().includes('main')) ?? threads[0];
    return preferred.id;
}

export async function pauseThread(session: vscode.DebugSession, threadId: number): Promise<void> {
    try {
        await session.customRequest('pause', { threadId });
    } catch (error) {
        const message = getErrorMessage(error);
        if (!/pause|stopp|running|already/i.test(message)) {
            throw new Error(`Unable to pause debugger: ${message}`);
        }
    }
}

export async function waitForTopFrame(session: vscode.DebugSession, threadId: number): Promise<DebugStackFrame> {
    for (let attempt = 0; attempt < STACKTRACE_RETRIES; attempt++) {
        try {
            const response = await session.customRequest('stackTrace', {
                threadId,
                startFrame: 0,
                levels: 1
            }) as { stackFrames?: DebugStackFrame[] };

            const frames = response?.stackFrames ?? [];
            if (frames.length) {
                return frames[0];
            }
        } catch {
            // Swallow and retry.
        }

        await delay(STACKTRACE_DELAY_MS);
    }

    throw new Error('No stack frames available (is the debugger paused?).');
}

export async function getPreferredScope(session: vscode.DebugSession, frameId: number): Promise<DebugScope> {
    const response = await session.customRequest('scopes', { frameId }) as { scopes?: DebugScope[] };
    const scopes = response?.scopes ?? [];

    if (!scopes.length) {
        throw new Error('Debugger did not return any scopes.');
    }

    return scopes.find(scope => scope.presentationHint === 'locals') ?? scopes[0];
}

export async function readVariables(session: vscode.DebugSession, variablesReference: number): Promise<DebugVariable[]> {
    const response = await session.customRequest('variables', { variablesReference }) as { variables?: DebugVariable[] };
    return response?.variables ?? [];
}

export async function fetchTopLevelVariables(session: vscode.DebugSession): Promise<{ scopeName: string; variables: DebugVariable[] }> {
    const threadId = await getPrimaryThreadId(session);
    await pauseThread(session, threadId);
    const frame = await waitForTopFrame(session, threadId);
    const scope = await getPreferredScope(session, frame.id);
    const variables = await readVariables(session, scope.variablesReference);

    return {
        scopeName: scope.name ?? 'Locals',
        variables
    };
}

