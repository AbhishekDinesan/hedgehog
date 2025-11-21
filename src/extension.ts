// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "hedgehog" is now active!');
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('hedgehog.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Hello World from hedgehog!');
	});
	context.subscriptions.push(disposable);
	vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                onWillReceiveMessage: m => {
                    // Traffic: VS Code -> GDB
                    // console.log(`> [TO GDB] ${m.command}`, m);
                },
                onDidSendMessage: m => {
                    // Traffic: GDB -> VS Code
                    // We only care about 'variables' for now to avoid spamming the console
                    if (m.type === 'response' && m.command === 'variables') {
                        console.log('<<< [FROM Debugger] Variables:', JSON.stringify(m.body, null, 2));
                    }
                }
            };
		}
	})

}

// This method is called when your extension is deactivated
export function deactivate() {}
