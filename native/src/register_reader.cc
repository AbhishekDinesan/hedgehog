#ifdef _WIN32

#include <napi.h>
#include <windows.h>
#include <string>

Napi::Value GetThreadContext(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected: threadId").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD threadId = info[0].As<Napi::Number>().Uint32Value();
    
    HANDLE hThread = OpenThread(THREAD_GET_CONTEXT | THREAD_QUERY_INFORMATION, FALSE, threadId);
    if (hThread == NULL) {
        Napi::Error::New(env, "Failed to open thread").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    CONTEXT context;
    ZeroMemory(&context, sizeof(CONTEXT));
    context.ContextFlags = CONTEXT_FULL | CONTEXT_DEBUG_REGISTERS;
    
    BOOL success = GetThreadContext(hThread, &context);
    CloseHandle(hThread);
    
    if (!success) {
        Napi::Error::New(env, "Failed to get thread context").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Object result = Napi::Object::New(env);
    Napi::Object gpr = Napi::Object::New(env);
    
#ifdef _WIN64
    gpr.Set("rax", Napi::Number::New(env, context.Rax));
    gpr.Set("rbx", Napi::Number::New(env, context.Rbx));
    gpr.Set("rcx", Napi::Number::New(env, context.Rcx));
    gpr.Set("rdx", Napi::Number::New(env, context.Rdx));
    gpr.Set("rsi", Napi::Number::New(env, context.Rsi));
    gpr.Set("rdi", Napi::Number::New(env, context.Rdi));
    gpr.Set("rbp", Napi::Number::New(env, context.Rbp));
    gpr.Set("rsp", Napi::Number::New(env, context.Rsp));
    gpr.Set("r8", Napi::Number::New(env, context.R8));
    gpr.Set("r9", Napi::Number::New(env, context.R9));
    gpr.Set("r10", Napi::Number::New(env, context.R10));
    gpr.Set("r11", Napi::Number::New(env, context.R11));
    gpr.Set("r12", Napi::Number::New(env, context.R12));
    gpr.Set("r13", Napi::Number::New(env, context.R13));
    gpr.Set("r14", Napi::Number::New(env, context.R14));
    gpr.Set("r15", Napi::Number::New(env, context.R15));
    gpr.Set("rip", Napi::Number::New(env, context.Rip));
#else
    gpr.Set("eax", Napi::Number::New(env, context.Eax));
    gpr.Set("ebx", Napi::Number::New(env, context.Ebx));
    gpr.Set("ecx", Napi::Number::New(env, context.Ecx));
    gpr.Set("edx", Napi::Number::New(env, context.Edx));
    gpr.Set("esi", Napi::Number::New(env, context.Esi));
    gpr.Set("edi", Napi::Number::New(env, context.Edi));
    gpr.Set("ebp", Napi::Number::New(env, context.Ebp));
    gpr.Set("esp", Napi::Number::New(env, context.Esp));
    gpr.Set("eip", Napi::Number::New(env, context.Eip));
#endif
    
    result.Set("generalPurpose", gpr);
    
    Napi::Object flags = Napi::Object::New(env);
    flags.Set("value", Napi::Number::New(env, context.EFlags));
    flags.Set("CF", Napi::Boolean::New(env, (context.EFlags & 0x0001) != 0));
    flags.Set("PF", Napi::Boolean::New(env, (context.EFlags & 0x0004) != 0));
    flags.Set("AF", Napi::Boolean::New(env, (context.EFlags & 0x0010) != 0));
    flags.Set("ZF", Napi::Boolean::New(env, (context.EFlags & 0x0040) != 0));
    flags.Set("SF", Napi::Boolean::New(env, (context.EFlags & 0x0080) != 0));
    flags.Set("TF", Napi::Boolean::New(env, (context.EFlags & 0x0100) != 0));
    flags.Set("IF", Napi::Boolean::New(env, (context.EFlags & 0x0200) != 0));
    flags.Set("DF", Napi::Boolean::New(env, (context.EFlags & 0x0400) != 0));
    flags.Set("OF", Napi::Boolean::New(env, (context.EFlags & 0x0800) != 0));
    result.Set("flags", flags);
    
    Napi::Object debug = Napi::Object::New(env);
    debug.Set("dr0", Napi::Number::New(env, context.Dr0));
    debug.Set("dr1", Napi::Number::New(env, context.Dr1));
    debug.Set("dr2", Napi::Number::New(env, context.Dr2));
    debug.Set("dr3", Napi::Number::New(env, context.Dr3));
    debug.Set("dr6", Napi::Number::New(env, context.Dr6));
    debug.Set("dr7", Napi::Number::New(env, context.Dr7));
    
    Napi::Object dr7Decoded = Napi::Object::New(env);
    for (int i = 0; i < 4; i++) {
        Napi::Object bp = Napi::Object::New(env);
        bp.Set("enabled", Napi::Boolean::New(env, (context.Dr7 & (1 << (i * 2))) != 0));
        bp.Set("global", Napi::Boolean::New(env, (context.Dr7 & (1 << (i * 2 + 1))) != 0));
        
        int condition = (context.Dr7 >> (16 + i * 4)) & 0x3;
        std::string condStr;
        switch (condition) {
            case 0: condStr = "execute"; break;
            case 1: condStr = "write"; break;
            case 2: condStr = "io"; break;
            case 3: condStr = "read/write"; break;
        }
        bp.Set("condition", Napi::String::New(env, condStr));
        
        int size = (context.Dr7 >> (18 + i * 4)) & 0x3;
        bp.Set("size", Napi::Number::New(env, (size == 0 ? 1 : (size == 1 ? 2 : (size == 3 ? 4 : 8)))));
        
        dr7Decoded.Set("bp" + std::to_string(i), bp);
    }
    debug.Set("dr7Decoded", dr7Decoded);
    
    result.Set("debug", debug);
    
    Napi::Object segments = Napi::Object::New(env);
    segments.Set("cs", Napi::Number::New(env, context.SegCs));
    segments.Set("ds", Napi::Number::New(env, context.SegDs));
    segments.Set("es", Napi::Number::New(env, context.SegEs));
    segments.Set("fs", Napi::Number::New(env, context.SegFs));
    segments.Set("gs", Napi::Number::New(env, context.SegGs));
    segments.Set("ss", Napi::Number::New(env, context.SegSs));
    result.Set("segments", segments);
    
    return result;
}

Napi::Value GetMainThreadId(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected: pid").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Failed to create thread snapshot").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    THREADENTRY32 te32;
    te32.dwSize = sizeof(THREADENTRY32);
    
    DWORD threadId = 0;
    if (Thread32First(hSnapshot, &te32)) {
        do {
            if (te32.th32OwnerProcessID == pid) {
                threadId = te32.th32ThreadID;
                break;
            }
        } while (Thread32Next(hSnapshot, &te32));
    }
    
    CloseHandle(hSnapshot);
    
    if (threadId == 0) {
        Napi::Error::New(env, "No thread found for process").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    return Napi::Number::New(env, threadId);
}

Napi::Object InitRegisterReader(Napi::Env env, Napi::Object exports) {
    exports.Set("getThreadContext", Napi::Function::New(env, GetThreadContext));
    exports.Set("getMainThreadId", Napi::Function::New(env, GetMainThreadId));
    return exports;
}

#endif // _WIN32

