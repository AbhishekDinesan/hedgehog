import * as vscode from 'vscode';
import { WebviewPanelManager } from './webview';
import { DebugTrackerManager } from './debugTracker';
import { registerStartCommand, registerSnapshotCommand } from './commands';
import { isNativeDebuggerAvailable, isCppDebugSession } from './nativeDebugger';

export function activate(context: vscode.ExtensionContext) {
    // Check if native debugger is available
    const hasNativeDebugger = isNativeDebuggerAvailable();
    if (hasNativeDebugger) {
        console.log('✅ Hedgehog: Native Windows debugger loaded - C++ low-level debugging enabled');
    } else {
        console.log('ℹ️  Hedgehog: Native debugger not available - Application-level debugging only');
        console.log('   To enable C++ low-level debugging, run: npm run build:native');
    }
    
    const panelManager = new WebviewPanelManager(context);
    const trackerManager = new DebugTrackerManager();

    const startCommand = registerStartCommand(context, panelManager);
    const snapshotCommand = registerSnapshotCommand(
        context,
        panelManager,
        (cb) => trackerManager.runWithTrackerSuppressed(cb)
    );
    const trackerDisposable = trackerManager.registerDebugAdapterTracker(panelManager);

    // Auto-open panel when debugging starts
    const debugStartListener = vscode.debug.onDidStartDebugSession((session) => {
        const config = vscode.workspace.getConfiguration('hedgehog');
        const autoOpen = config.get<boolean>('autoOpenPanel', true);
        
        // Detect debugging mode
        const isCpp = isCppDebugSession(session);
        const mode = isCpp && hasNativeDebugger ? 'C++ Low-Level' : 'Application-Level';
        
        console.log(`🦔 Hedgehog: Debug session started (${mode} mode)`);
        
        if (autoOpen) {
            // Small delay to let debugger settle
            setTimeout(() => {
                const panel = panelManager.ensurePanel();
                panel.reveal(vscode.ViewColumn.Two);
            }, 500);
        }
    });

    // Auto-snapshot when debugger stops (at breakpoint)
    const debugStopListener = vscode.debug.onDidChangeActiveStackItem(async (stackItem) => {
        if (!stackItem) return;
        
        const config = vscode.workspace.getConfiguration('hedgehog');
        const autoSnapshot = config.get<boolean>('autoSnapshot', true);
        
        if (autoSnapshot && vscode.debug.activeDebugSession) {
            // Trigger snapshot command programmatically
            await vscode.commands.executeCommand('llm-gdb.snapshot');
        }
    });

    context.subscriptions.push(
        startCommand, 
        snapshotCommand, 
        trackerDisposable, 
        debugStartListener,
        debugStopListener
    );
}

export function deactivate() {}
