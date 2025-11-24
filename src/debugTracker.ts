import * as vscode from 'vscode';
import { WebviewPanelManager } from './webview';
import { buildDeepGraph } from './graphBuilder';
import { getGraphOptions } from './config';

export class DebugTrackerManager {
    private trackerSuppressionDepth = 0;

    public isTrackerSuppressed(): boolean {
        return this.trackerSuppressionDepth > 0;
    }

    public async runWithTrackerSuppressed<T>(cb: () => Promise<T>): Promise<T> {
        this.trackerSuppressionDepth++;
        try {
            return await cb();
        } finally {
            this.trackerSuppressionDepth = Math.max(0, this.trackerSuppressionDepth - 1);
        }
    }

    public registerDebugAdapterTracker(
        panelManager: WebviewPanelManager
    ): vscode.Disposable {
        return vscode.debug.registerDebugAdapterTrackerFactory('*', {
            createDebugAdapterTracker: (session: vscode.DebugSession) => {
                return {
                    onDidSendMessage: (message: any) => {
                        if (
                            this.isTrackerSuppressed() ||
                            !panelManager.getPanel() ||
                            message.type !== 'response' ||
                            message.command !== 'variables' ||
                            !message.success
                        ) {
                            return;
                        }

                        void this.runWithTrackerSuppressed(async () => {
                            const graphOptions = getGraphOptions();
                            const graph = await buildDeepGraph(
                                session,
                                'Locals',
                                message.body?.variables ?? [],
                                graphOptions
                            );
                            panelManager.getPanel()?.webview.postMessage({
                                command: 'update',
                                content: graph
                            });
                        });
                    }
                };
            }
        });
    }
}

