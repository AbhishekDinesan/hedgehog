import * as vscode from 'vscode';
import { SystemDebugPanel } from './systemDebugPanel';
import { isNativeDebuggerAvailable, getProcessId } from './nativeDebugger';

export function activate(context: vscode.ExtensionContext) {
    if (!isNativeDebuggerAvailable()) {
        vscode.window.showErrorMessage(
            'Hedgehog: Native debugger module not built. Run: npm run build:native'
        );
        return;
    }

    console.log('✅ Hedgehog: Low-level system debugger active');

    const systemPanel = new SystemDebugPanel(context);

    const startCommand = vscode.commands.registerCommand('hedgehog.start', () => {
        systemPanel.show();
    });

    const snapshotCommand = vscode.commands.registerCommand('hedgehog.snapshot', async () => {
        const session = vscode.debug.activeDebugSession;
        if (!session) {
            vscode.window.showErrorMessage('No active debug session');
            return;
        }

        const pid = await getProcessId(session);
        if (!pid) {
            vscode.window.showErrorMessage('Could not get process ID');
            return;
        }

        await systemPanel.captureSnapshot(pid);
    });

    const debugStartListener = vscode.debug.onDidStartDebugSession(async (session) => {
        const config = vscode.workspace.getConfiguration('hedgehog');
        const autoOpen = config.get<boolean>('autoOpenPanel', true);

        if (autoOpen) {
            setTimeout(() => systemPanel.show(), 500);
        }
    });

    const debugStopListener = vscode.debug.onDidChangeActiveStackItem(async () => {
        const session = vscode.debug.activeDebugSession;
        if (!session) return;

        const config = vscode.workspace.getConfiguration('hedgehog');
        const autoSnapshot = config.get<boolean>('autoSnapshot', true);

        if (autoSnapshot) {
            const pid = await getProcessId(session);
            if (pid) {
                await systemPanel.captureSnapshot(pid);
            }
        }
    });

    context.subscriptions.push(
        startCommand,
        snapshotCommand,
        debugStartListener,
        debugStopListener
    );
}

export function deactivate() {}
