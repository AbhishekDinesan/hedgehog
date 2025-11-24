# Hedgehog - Low-Level System Debugger 🦔

Windows system debugger for reading RAM, CPU registers, and hardware debug registers
using Natural Language.

## Why Hedgehog?

Agentic IDE are all the rage right now, and market leaders have decided to focus
on application-level debugging. There is a sizable niche where integrations between LLM's
and low-level systems can provide genuine value for debugging purposes. The long term
vision is to integrate this application with on-premise LLM's allowing enterprises 
to secure their firmware code while boosting developer productivity.


## Features

- **CPU Registers**: RAX, RBX, RCX, RDX, RSI, RDI, RBP, RSP, RIP, R8-R15
- **Flag Register**: CF, PF, AF, ZF, SF, TF, IF, DF, OF (decoded)
- **Hardware Debug Registers**: DR0-DR7 with breakpoint decoding
- **Memory Map**: All process regions (code, data, stack, heap) with permissions
- **Hex Dump**: Click any memory region to view raw bytes

## Setup

1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) - select "Desktop development with C++"
2. Build native module:
```powershell
npm install
npm run build:native
```

## Usage

1. Start debugging a C/C++ program (F5)
2. Panel opens automatically showing CPU registers and memory map
3. Auto-updates on every breakpoint
4. Click memory regions to see hex dumps

## Commands

- `Hedgehog: Open System Debugger` - Open panel
- `Hedgehog: Capture System Snapshot` - Manual snapshot

## Settings

- `hedgehog.autoOpenPanel` (default: true) - Auto-open on debug start
- `hedgehog.autoSnapshot` (default: true) - Auto-capture on breakpoints

## Requirements

- Windows OS
- Visual Studio C++ Build Tools
- Administrator privileges (for hardware register access)
