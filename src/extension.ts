import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let currentPanel: vscode.WebviewPanel | undefined = undefined;
	let visualizerCommand = vscode.commands.registerCommand('hedgehog.start',  () =>{
		const panel = vscode.window.createWebviewPanel(
            'hedgehogVisualizer', 
            'Memory Visualizing', 
            vscode.ViewColumn.Two, 
            {
                enableScripts: true 
            }
        );

		currentPanel = panel;
		panel.webview.html = getWebviewContent();

		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
		}, null, context.subscriptions);

	});
	context.subscriptions.push(visualizerCommand);
	
	vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                onDidSendMessage: m => {
                    if (m.type === 'response' && m.command === 'variables' && m.success) {
                        if (currentPanel) {
                            const variables = m.body.variables;
                            const mermaidGraph = jsonToMermaid(variables);
                            console.log('Sending to UI:', mermaidGraph);
                            currentPanel.webview.postMessage({ 
                                command: 'update', 
                                content: mermaidGraph 
                            });
                        }
					}
				}
            };
		}
	})

}

export function deactivate() {}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memory Visualizer</title>
    </head>
    <body>
        <h1>Heap Visualization</h1>
        <div id="status">Waiting for data...</div>

        <div id="graph-div" class="mermaid">
            graph TD;
            Init[Waiting] --> ...
        </div>

        <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ startOnLoad: true });

            window.addEventListener('message', async event => {
                const message = event.data; 
                
                if (message.command === 'update') {
                    const graphDiv = document.getElementById('graph-div');
                    const statusDiv = document.getElementById('status');
                    
                    statusDiv.innerText = "Last updated: " + new Date().toLocaleTimeString();
                    graphDiv.innerHTML = message.content;
                    
                    graphDiv.removeAttribute('data-processed');
                    await mermaid.run({
                        nodes: [graphDiv]
                    });
                }
            });
        </script>
    </body>
    </html>`;
}

function jsonToMermaid(variables: any[]): string {
    let graph = 'graph TD;\n';
    graph += `    Scope[Local Variables];\n`;
    variables.forEach((v, index) => {
        const safeName = v.name.replace(/[^a-zA-Z0-9]/g, ''); 
        const safeValue = v.value.replace(/"/g, "'"); 
        
        const nodeId = `Var${index}`;
        graph += `    ${nodeId}["${v.name}: ${safeValue}"];\n`;
        
        graph += `    Scope --> ${nodeId};\n`;
    });

    return graph;
}
