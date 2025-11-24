import * as vscode from 'vscode';
import { getCPURegisters, getMemoryRegions, readProcessMemory, CPURegisters, MemoryRegion } from './nativeDebugger';

export class SystemDebugPanel {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'hedgehogSystemDebug',
            'System Debugger',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        this.panel.webview.html = this.getWebviewContent();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'readMemory') {
                    const data = await readProcessMemory(
                        message.pid,
                        message.address,
                        message.size
                    );
                    this.panel?.webview.postMessage({
                        command: 'memoryData',
                        address: message.address,
                        data: data ? Array.from(data) : null
                    });
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    public async captureSnapshot(pid: number) {
        if (!this.panel) {
            this.show();
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Capturing system state...',
                cancellable: false
            }, async () => {
                const registers = await getCPURegisters(pid);
                const memoryRegions = await getMemoryRegions(pid);

                this.panel?.webview.postMessage({
                    command: 'update',
                    pid,
                    registers,
                    memoryRegions
                });
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Snapshot failed: ${error.message}`);
        }
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Consolas', 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            font-size: 13px;
        }
        h1 { color: #4ec9b0; margin-bottom: 20px; font-size: 20px; }
        h2 { color: #569cd6; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 1px solid #3c3c3c; padding-bottom: 5px; }
        .section { margin-bottom: 30px; }
        .register-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 10px;
        }
        .register {
            background: #252526;
            border: 1px solid #3c3c3c;
            padding: 8px;
            border-radius: 4px;
        }
        .register-name { color: #9cdcfe; font-weight: bold; }
        .register-value { color: #ce9178; margin-left: 10px; font-family: 'Consolas', monospace; }
        .flag { display: inline-block; margin: 4px 8px 4px 0; }
        .flag.set { color: #4ec9b0; }
        .flag.clear { color: #666; }
        .memory-region {
            background: #252526;
            border-left: 3px solid #569cd6;
            padding: 10px;
            margin: 5px 0;
            cursor: pointer;
        }
        .memory-region:hover { background: #2d2d30; }
        .memory-region.code { border-left-color: #4ec9b0; }
        .memory-region.data { border-left-color: #ce9178; }
        .memory-region.stack { border-left-color: #c586c0; }
        .addr { color: #569cd6; font-family: 'Consolas', monospace; }
        .perm { color: #4ec9b0; margin-left: 10px; }
        .type { color: #ce9178; margin-left: 10px; }
        .size { color: #858585; margin-left: 10px; }
        .hex-dump {
            background: #1e1e1e;
            border: 1px solid #3c3c3c;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Consolas', monospace;
            font-size: 12px;
            overflow-x: auto;
        }
        .hex-line { margin: 2px 0; }
        .hex-offset { color: #858585; }
        .hex-bytes { color: #569cd6; margin: 0 20px; }
        .hex-ascii { color: #ce9178; }
        #status { color: #858585; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>🦔 Hedgehog System Debugger</h1>
    <div id="status">Waiting for snapshot...</div>

    <div class="section" id="registers-section" style="display:none">
        <h2>CPU Registers</h2>
        <div id="registers"></div>
    </div>

    <div class="section" id="flags-section" style="display:none">
        <h2>Flags Register</h2>
        <div id="flags"></div>
    </div>

    <div class="section" id="debug-regs-section" style="display:none">
        <h2>Hardware Debug Registers (DR0-DR7)</h2>
        <div id="debug-registers"></div>
    </div>

    <div class="section" id="memory-section" style="display:none">
        <h2>Memory Regions</h2>
        <div id="memory-regions"></div>
    </div>

    <div class="section" id="hex-section" style="display:none">
        <h2>Memory Dump</h2>
        <div id="hex-dump"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentPid = null;

        window.addEventListener('message', event => {
            const message = event.data;

            if (message.command === 'update') {
                currentPid = message.pid;
                document.getElementById('status').textContent = 
                    'Process ID: ' + message.pid + ' | Last update: ' + new Date().toLocaleTimeString();
                
                if (message.registers) {
                    renderRegisters(message.registers);
                }
                if (message.memoryRegions) {
                    renderMemoryRegions(message.memoryRegions);
                }
            } else if (message.command === 'memoryData') {
                renderHexDump(message.address, message.data);
            }
        });

        function renderRegisters(regs) {
            const gpr = regs.generalPurpose;
            const html = Object.keys(gpr).map(name => 
                '<div class="register"><span class="register-name">' + name.toUpperCase() + 
                '</span><span class="register-value">0x' + gpr[name].toString(16).padStart(16, '0') + 
                '</span></div>'
            ).join('');
            document.getElementById('registers').innerHTML = '<div class="register-grid">' + html + '</div>';
            document.getElementById('registers-section').style.display = 'block';

            const flags = regs.flags;
            const flagHtml = Object.keys(flags).filter(f => f !== 'value').map(f => 
                '<span class="flag ' + (flags[f] ? 'set' : 'clear') + '">' + f + 
                '=' + (flags[f] ? '1' : '0') + '</span>'
            ).join('');
            document.getElementById('flags').innerHTML = flagHtml;
            document.getElementById('flags-section').style.display = 'block';

            const debug = regs.debug;
            let debugHtml = '<div class="register-grid">';
            debugHtml += '<div class="register"><span class="register-name">DR0</span><span class="register-value">0x' + 
                debug.dr0.toString(16).padStart(16, '0') + '</span></div>';
            debugHtml += '<div class="register"><span class="register-name">DR1</span><span class="register-value">0x' + 
                debug.dr1.toString(16).padStart(16, '0') + '</span></div>';
            debugHtml += '<div class="register"><span class="register-name">DR2</span><span class="register-value">0x' + 
                debug.dr2.toString(16).padStart(16, '0') + '</span></div>';
            debugHtml += '<div class="register"><span class="register-name">DR3</span><span class="register-value">0x' + 
                debug.dr3.toString(16).padStart(16, '0') + '</span></div>';
            debugHtml += '<div class="register"><span class="register-name">DR6</span><span class="register-value">0x' + 
                debug.dr6.toString(16).padStart(16, '0') + '</span></div>';
            debugHtml += '<div class="register"><span class="register-name">DR7</span><span class="register-value">0x' + 
                debug.dr7.toString(16).padStart(16, '0') + '</span></div>';
            
            Object.keys(debug.dr7Decoded).forEach(bpName => {
                const bp = debug.dr7Decoded[bpName];
                if (bp.enabled) {
                    debugHtml += '<div class="register" style="border-left: 3px solid #4ec9b0"><span class="register-name">' + 
                        bpName.toUpperCase() + '</span><span class="register-value">' + bp.condition + 
                        ' (' + bp.size + 'B)</span></div>';
                }
            });
            debugHtml += '</div>';
            document.getElementById('debug-registers').innerHTML = debugHtml;
            document.getElementById('debug-regs-section').style.display = 'block';
        }

        function renderMemoryRegions(regions) {
            const html = regions.map(r => {
                const sizeKB = (r.size / 1024).toFixed(0);
                let cls = 'memory-region';
                if (r.protection.includes('x')) cls += ' code';
                else if (r.type === 'private') cls += ' stack';
                else cls += ' data';
                
                return '<div class="' + cls + '" onclick="loadMemory(' + r.baseAddress + ')">' +
                    '<span class="addr">0x' + r.baseAddress.toString(16).padStart(16, '0') + '</span>' +
                    '<span class="perm">' + r.protection + '</span>' +
                    '<span class="type">' + r.type + '</span>' +
                    '<span class="size">' + sizeKB + ' KB</span>' +
                    '</div>';
            }).join('');
            document.getElementById('memory-regions').innerHTML = html;
            document.getElementById('memory-section').style.display = 'block';
        }

        function loadMemory(address) {
            vscode.postMessage({
                command: 'readMemory',
                pid: currentPid,
                address: address,
                size: 256
            });
        }

        function renderHexDump(address, data) {
            if (!data) {
                document.getElementById('hex-dump').innerHTML = '<div style="color:#f48771">Failed to read memory</div>';
                return;
            }

            let html = '';
            for (let i = 0; i < data.length; i += 16) {
                const offset = (address + i).toString(16).padStart(16, '0');
                const bytes = data.slice(i, i + 16).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const ascii = data.slice(i, i + 16).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
                html += '<div class="hex-line">' +
                    '<span class="hex-offset">' + offset + '</span>' +
                    '<span class="hex-bytes">' + bytes + '</span>' +
                    '<span class="hex-ascii">' + ascii + '</span>' +
                    '</div>';
            }
            document.getElementById('hex-dump').innerHTML = html;
            document.getElementById('hex-section').style.display = 'block';
        }
    </script>
</body>
</html>`;
    }
}

