export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unknown error';
}

export function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function sanitizeLabel(value: string): string {
    return value
        .replace(/[\r\n]+/g, ' ')          // Replace newlines with spaces
        .replace(/"/g, '\'')                // Replace double quotes with single quotes
        .replace(/[<>]/g, '')               // Remove angle brackets
        .replace(/[()]/g, '')               // Remove parentheses (conflicts with Mermaid syntax)
        .replace(/[\[\]]/g, '')             // Remove square brackets (conflicts with Mermaid syntax)
        .replace(/[{}]/g, '')               // Remove curly braces (conflicts with Mermaid syntax)
        .replace(/[|]/g, '/')               // Replace pipes with slashes
        .replace(/[#]/g, '')                // Remove hash symbols
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .trim();
}

