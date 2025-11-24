import * as vscode from 'vscode';

export function getWebviewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memory Visualizer</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 20px;
                overflow-x: auto;
            }
            
            #header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #3c3c3c;
            }
            
            h1 {
                font-size: 24px;
                color: #4ec9b0;
            }
            
            #status {
                font-size: 12px;
                color: #858585;
            }
            
            
            #visualization {
                min-width: fit-content;
            }
            
            .memory-block {
                display: inline-block;
                vertical-align: top;
                margin: 10px;
                border: 2px solid #569cd6;
                border-radius: 8px;
                background: #252526;
                padding: 12px;
                min-width: 180px;
                position: relative;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            
            .memory-block.root {
                border-color: #4ec9b0;
                background: #2a3b2e;
            }
            
            .memory-block.primitive {
                border-color: #ce9178;
                background: #2d2a2e;
            }
            
            .block-header {
                font-weight: bold;
                color: #569cd6;
                margin-bottom: 8px;
                font-size: 14px;
                border-bottom: 1px solid #3c3c3c;
                padding-bottom: 4px;
            }
            
            .block-header.root {
                color: #4ec9b0;
            }
            
            .block-header.primitive {
                color: #ce9178;
            }
            
            .block-address {
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 11px;
                color: #858585;
                margin-bottom: 8px;
            }
            
            .block-field {
                margin: 6px 0;
                padding: 4px;
                border-radius: 3px;
            }
            
            .field-name {
                color: #9cdcfe;
                font-size: 13px;
            }
            
            .field-value {
                color: #ce9178;
                margin-left: 8px;
                font-family: 'Consolas', 'Courier New', monospace;
            }
            
            .field-pointer {
                color: #569cd6;
                cursor: pointer;
                text-decoration: underline;
                margin-left: 8px;
            }
            
            .field-pointer:hover {
                color: #7eb6e3;
            }
            
            .pointer-arrow {
                position: absolute;
                pointer-events: none;
            }
            
            .pointer-arrow line {
                stroke: #569cd6;
                stroke-width: 2;
                marker-end: url(#arrowhead);
            }
            
            .pointer-arrow.highlight {
                stroke-width: 3;
            }
            
            .container {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                align-items: flex-start;
            }
            
            .type-badge {
                display: inline-block;
                background: #0e639c;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 6px;
            }
            
            .null-value {
                color: #808080;
                font-style: italic;
            }
            
            #legend {
                margin-top: 20px;
                padding: 12px;
                background: #252526;
                border-radius: 6px;
                font-size: 12px;
            }
            
            .legend-item {
                display: inline-block;
                margin-right: 20px;
                margin-bottom: 8px;
            }
            
            .legend-color {
                display: inline-block;
                width: 16px;
                height: 16px;
                border-radius: 3px;
                margin-right: 6px;
                vertical-align: middle;
            }
            
            #error-display {
                background: #5a1d1d;
                border: 2px solid #f48771;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
                display: none;
            }
            
            #error-display.show {
                display: block;
            }
            
            .zoom-controls {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #252526;
                border: 1px solid #3c3c3c;
                border-radius: 6px;
                padding: 8px;
            }
            
            .zoom-controls button {
                width: 36px;
                height: 36px;
                margin: 2px;
                font-size: 18px;
                padding: 0;
            }
        </style>
    </head>
    <body>
        <div id="header">
            <h1>🦔 Hedgehog Memory Visualizer</h1>
            <div id="status">Waiting for debugger data...</div>
        </div>
        
        <!-- Controls removed for cleaner UI -->
        
        <div id="error-display"></div>
        
        <svg id="arrow-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#569cd6" />
                </marker>
            </defs>
        </svg>
        
        <div id="visualization"></div>
        
        <div id="legend">
            <div class="legend-item">
                <span class="legend-color" style="background: #2a3b2e; border: 2px solid #4ec9b0;"></span>
                Stack Variables
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #252526; border: 2px solid #569cd6;"></span>
                Heap Objects
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #2d2a2e; border: 2px solid #ce9178;"></span>
                Primitive Values
            </div>
            <div class="legend-item">
                <span style="color: #569cd6;">→</span> Pointer References
            </div>
        </div>
        
        <div class="zoom-controls">
            <button onclick="zoom(1.2)" title="Zoom In">+</button>
            <button onclick="zoom(0.8)" title="Zoom Out">−</button>
            <button onclick="zoom(1, true)" title="Reset">⟲</button>
        </div>
        
        <script>
            let currentData = null;
            let currentLayout = 'horizontal';
            let showAddresses = true;
            let zoomLevel = 1;
            let currentHighlight = null;
            
            // Global function for highlighting blocks (called from dynamically inserted HTML)
            window.highlightBlock = function(id) {
                console.log('highlightBlock called with id:', id);
                
                // Remove previous highlight
                if (currentHighlight) {
                    currentHighlight.style.boxShadow = '';
                    currentHighlight.style.transform = '';
                    currentHighlight.style.zIndex = '';
                }
                
                // Find and highlight target
                const target = document.getElementById(id);
                if (target) {
                    console.log('Found target block:', target);
                    
                    // Smooth scroll to target
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'center' 
                    });
                    
                    // Apply highlight effect
                    setTimeout(() => {
                        target.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                        target.style.boxShadow = '0 0 0 3px #1177bb, 0 8px 24px rgba(17, 119, 187, 0.5)';
                        target.style.transform = 'scale(1.05)';
                        target.style.zIndex = '1000';
                        currentHighlight = target;
                        
                        // Pulse effect
                        let pulseCount = 0;
                        const pulseInterval = setInterval(() => {
                            pulseCount++;
                            if (pulseCount % 2 === 0) {
                                target.style.boxShadow = '0 0 0 3px #1177bb, 0 8px 24px rgba(17, 119, 187, 0.5)';
                            } else {
                                target.style.boxShadow = '0 0 0 5px #4ec9b0, 0 12px 32px rgba(78, 201, 176, 0.6)';
                            }
                            
                            if (pulseCount >= 4) {
                                clearInterval(pulseInterval);
                                // Keep the highlight but reduce it
                                setTimeout(() => {
                                    if (currentHighlight === target) {
                                        target.style.boxShadow = '0 0 0 2px #569cd6';
                                        target.style.transform = 'scale(1.02)';
                                    }
                                }, 200);
                            }
                        }, 300);
                    }, 100);
                } else {
                    console.error('Target block not found:', id);
                }
            };
            
            function changeLayout(layout) {
                currentLayout = layout;
                if (currentData) renderVisualization(currentData);
            }
            
            function toggleAddresses() {
                showAddresses = !showAddresses;
                if (currentData) renderVisualization(currentData);
            }
            
            function zoom(factor, reset = false) {
                if (reset) {
                    zoomLevel = 1;
                } else {
                    zoomLevel *= factor;
                    zoomLevel = Math.max(0.5, Math.min(zoomLevel, 3));
                }
                document.getElementById('visualization').style.transform = 'scale(' + zoomLevel + ')';
                document.getElementById('visualization').style.transformOrigin = 'top left';
            }
            
            function setupPointerHandlers() {
                console.log('Setting up pointer handlers...');
                const pointers = document.querySelectorAll('.field-pointer');
                console.log('Found', pointers.length, 'pointers');
                
                pointers.forEach(el => {
                    el.style.cursor = 'pointer';
                    
                    const sourceBlock = el.closest('.memory-block');
                    const targetId = el.getAttribute('data-target');
                    
                    // Add click listener
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Pointer clicked, target:', targetId);
                        if (targetId) {
                            window.highlightBlock(targetId);
                        }
                    });
                    
                    // Add hover effects
                    el.addEventListener('mouseenter', () => {
                        el.style.textDecoration = 'underline';
                        el.style.color = '#7eb6e3';
                        
                        // Highlight corresponding arrow
                        if (sourceBlock && targetId) {
                            const arrows = document.querySelectorAll('.pointer-arrow');
                            arrows.forEach(arrow => {
                                if (arrow.getAttribute('data-source') === sourceBlock.id && 
                                    arrow.getAttribute('data-target') === targetId) {
                                    arrow.setAttribute('stroke', '#4ec9b0');
                                    arrow.setAttribute('stroke-width', '3');
                                    arrow.setAttribute('opacity', '1');
                                }
                            });
                        }
                    });
                    
                    el.addEventListener('mouseleave', () => {
                        el.style.textDecoration = 'none';
                        el.style.color = '#569cd6';
                        
                        // Reset arrows
                        const arrows = document.querySelectorAll('.pointer-arrow');
                        arrows.forEach(arrow => {
                            arrow.setAttribute('stroke', '#569cd6');
                            arrow.setAttribute('stroke-width', '2');
                            arrow.setAttribute('opacity', '0.6');
                        });
                    });
                });
            }
            
            function renderVisualization(data) {
                console.log('Rendering visualization...');
                const viz = document.getElementById('visualization');
                viz.innerHTML = data;
                
                // Apply layout
                viz.className = currentLayout;
                
                // Hide/show addresses
                document.querySelectorAll('.block-address').forEach(el => {
                    el.style.display = showAddresses ? 'block' : 'none';
                });
                
                // Setup pointer click handlers
                setTimeout(() => {
                    setupPointerHandlers();
                    drawArrows();
                }, 100);
            }
            
            function drawArrows() {
                const svg = document.getElementById('arrow-svg');
                const viz = document.getElementById('visualization');
                if (!svg || !viz) return;
                
                // Clear existing arrows
                const existingArrows = svg.querySelectorAll('line, path');
                existingArrows.forEach(el => el.remove());
                
                // Resize SVG to cover entire visualization area
                const vizRect = viz.getBoundingClientRect();
                svg.style.height = Math.max(viz.scrollHeight, window.innerHeight) + 'px';
                svg.style.width = Math.max(viz.scrollWidth, window.innerWidth) + 'px';
                
                // Draw arrows for each pointer
                document.querySelectorAll('.field-pointer').forEach(pointerEl => {
                    const targetId = pointerEl.getAttribute('data-target');
                    if (!targetId) return;
                    
                    const targetBlock = document.getElementById(targetId);
                    if (!targetBlock) return;
                    
                    // Get the memory block containing this pointer
                    const sourceBlock = pointerEl.closest('.memory-block');
                    if (!sourceBlock) return;
                    
                    // Calculate positions
                    const sourceRect = sourceBlock.getBoundingClientRect();
                    const targetRect = targetBlock.getBoundingClientRect();
                    const svgRect = svg.getBoundingClientRect();
                    
                    // Start from right edge of source block
                    const startX = sourceRect.right - svgRect.left;
                    const startY = sourceRect.top + sourceRect.height / 2 - svgRect.top;
                    
                    // End at left edge of target block
                    const endX = targetRect.left - svgRect.left;
                    const endY = targetRect.top + targetRect.height / 2 - svgRect.top;
                    
                    // Create curved arrow path
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    
                    // Control points for bezier curve
                    const dx = endX - startX;
                    const dy = endY - startY;
                    const controlX1 = startX + dx * 0.5;
                    const controlY1 = startY;
                    const controlX2 = startX + dx * 0.5;
                    const controlY2 = endY;
                    
                    const pathData = 'M ' + startX + ' ' + startY + ' C ' + controlX1 + ' ' + controlY1 + ', ' + controlX2 + ' ' + controlY2 + ', ' + endX + ' ' + endY;
                    
                    path.setAttribute('d', pathData);
                    path.setAttribute('stroke', '#569cd6');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    path.setAttribute('marker-end', 'url(#arrowhead)');
                    path.setAttribute('opacity', '0.6');
                    path.classList.add('pointer-arrow');
                    
                    // Store association for hover effects
                    path.setAttribute('data-source', sourceBlock.id);
                    path.setAttribute('data-target', targetId);
                    
                    svg.appendChild(path);
                });
            }
            
            window.addEventListener('message', event => {
                const message = event.data;
                
                if (message.command === 'update') {
                    const statusDiv = document.getElementById('status');
                    const errorDiv = document.getElementById('error-display');
                    
                    try {
                        statusDiv.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                        statusDiv.style.color = '#4ec9b0';
                        errorDiv.classList.remove('show');
                        
                        currentData = message.content;
                        renderVisualization(message.content);
                        
                    } catch (error) {
                        statusDiv.textContent = 'Error rendering visualization';
                        statusDiv.style.color = '#f48771';
                        errorDiv.textContent = 'Error: ' + error.message;
                        errorDiv.classList.add('show');
                        console.error('Visualization error:', error);
                    }
                }
            });
            
            // Initialize
            document.getElementById('status').textContent = 'Ready. Run "LLM-GDB Snapshot" to visualize memory.';
            
            // Redraw arrows on window resize or scroll
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(drawArrows, 100);
            });
            
            // Redraw on scroll (for better arrow positioning)
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(drawArrows, 50);
            });
        </script>
    </body>
    </html>`;
}

export class WebviewPanelManager {
    private currentPanel: vscode.WebviewPanel | undefined;

    constructor(private context: vscode.ExtensionContext) {}

    public ensurePanel(): vscode.WebviewPanel {
        if (this.currentPanel) {
            return this.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'hedgehogVisualizer',
            'Memory Visualizing',
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();
        this.currentPanel = panel;

        this.currentPanel.onDidDispose(() => {
            this.currentPanel = undefined;
        }, null, this.context.subscriptions);

        return panel;
    }

    public getPanel(): vscode.WebviewPanel | undefined {
        return this.currentPanel;
    }

    public reveal(): void {
        if (this.currentPanel) {
            this.currentPanel.reveal(vscode.ViewColumn.Two);
        }
    }
}

