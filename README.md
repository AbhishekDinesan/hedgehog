# Hedgehog Summary

A VS Code extension with **dual-mode debugging**:
- **Python/High-Level**: Visualize data structures (linked lists, trees, graphs)
- **C++/Low-Level**: Read RAM, CPU registers, and hardware debug registers (DR0-DR7)

Automatically detects your language and switches modes!

## Features

### Application-Level Mode (Python, JavaScript, etc.)
-**Interactive Memory Blocks** - Click through pointers to navigate data structures
-  **Real-time Visualization** - See memory layout update as you debug
-  **Smart Filtering** - Automatically hides language internals
-  **Auto-snapshot** - Updates on every breakpoint

### Low-Level Mode (C++ on Windows) 🆕
-  **CPU Registers** - View RAX, RBX, RCX, RDX, RSI, RDI, RBP, RSP, RIP
-  **Flag Register** - Decoded CF, PF, AF, ZF, SF, TF, IF, DF, OF flags
- **Hardware Breakpoints** - Read DR0-DR7 debug registers
-  **Memory Map** - See all process memory regions (code, data, stack, heap)
- **Raw Memory** - Read process RAM in hex dump format
- **READ ONLY** - No write permissions, completely safe

## What You See

**Currently:** Extension works for Python/application-level debugging out of the box!

**For C++ low-level mode (registers/RAM):**
1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with "Desktop development with C++" workload
2. Run: `npm run build:native`
3. See [BUILD_NATIVE.md](./BUILD_NATIVE.md) for detailed instructions

