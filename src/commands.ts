import * as vscode from 'vscode';
import { WebviewPanelManager } from './webview';
import { fetchTopLevelVariables } from './debugAdapter';
import { buildDeepGraph } from './graphBuilder';
import { getErrorMessage } from './utils';
import { getGraphOptions } from './config';

export function registerStartCommand(
    context: vscode.ExtensionContext,
    panelManager: WebviewPanelManager
): vscode.Disposable {
    return vscode.commands.registerCommand('hedgehog.start', () => {
        const panel = panelManager.ensurePanel();
        panel.reveal(vscode.ViewColumn.Two);
    });
}

export function registerSnapshotCommand(
    context: vscode.ExtensionContext,
    panelManager: WebviewPanelManager,
    runWithTrackerSuppressed: <T>(cb: () => Promise<T>) => Promise<T>
): vscode.Disposable {
    return vscode.commands.registerCommand('llm-gdb.snapshot', async () => {
        const session = vscode.debug.activeDebugSession;
        if (!session) {
            vscode.window.showErrorMessage('No active debug session to snapshot.');
            return;
        }

        try {
            await runWithTrackerSuppressed(async () => {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'hedgehog',
                    cancellable: false
                }, async progress => {
                    progress.report({ message: 'Pausing debugger...' });
                    const { scopeName, variables } = await fetchTopLevelVariables(session);

                    progress.report({ message: 'Building deep graph...' });
                    const graphOptions = getGraphOptions();
                    const graph = await buildDeepGraph(session, scopeName, variables, graphOptions);

                    const panel = panelManager.ensurePanel();
                    panel.webview.postMessage({
                        command: 'update',
                        content: graph
                    });
                });
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Snapshot failed: ${getErrorMessage(error)}`);
        }
    });
}

