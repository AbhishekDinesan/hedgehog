#ifdef _WIN32

#include <napi.h>
#include <windows.h>
#include <vector>
#include <sstream>

struct MemoryRegion {
    uint64_t baseAddress;
    uint64_t size;
    std::string protection;
    std::string type;
    std::string state;
};

Napi::Value ReadProcessMemoryRegion(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected: pid, address, size").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    uint64_t address = info[1].As<Napi::Number>().Int64Value();
    size_t size = info[2].As<Napi::Number>().Uint32Value();
    
    HANDLE hProcess = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, FALSE, pid);
    if (hProcess == NULL) {
        Napi::Error::New(env, "Failed to open process. Run as Administrator or check permissions.").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::vector<BYTE> buffer(size);
    SIZE_T bytesRead = 0;
    
    BOOL success = ReadProcessMemory(
        hProcess,
        reinterpret_cast<LPCVOID>(address),
        buffer.data(),
        size,
        &bytesRead
    );
    
    CloseHandle(hProcess);
    
    if (!success) {
        Napi::Error::New(env, "Failed to read memory at address").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(env, bytesRead);
    memcpy(arrayBuffer.Data(), buffer.data(), bytesRead);
    
    Napi::Uint8Array result = Napi::Uint8Array::New(env, bytesRead, arrayBuffer, 0);
    return result;
}

Napi::Value GetMemoryRegions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected: pid").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (hProcess == NULL) {
        Napi::Error::New(env, "Failed to open process").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::vector<MemoryRegion> regions;
    MEMORY_BASIC_INFORMATION mbi;
    uint64_t address = 0;
    
    while (VirtualQueryEx(hProcess, reinterpret_cast<LPCVOID>(address), &mbi, sizeof(mbi)) == sizeof(mbi)) {
        if (mbi.State == MEM_COMMIT) {
            MemoryRegion region;
            region.baseAddress = reinterpret_cast<uint64_t>(mbi.BaseAddress);
            region.size = mbi.RegionSize;
            
            std::stringstream protection;
            if (mbi.Protect & PAGE_EXECUTE) protection << "x";
            if (mbi.Protect & PAGE_EXECUTE_READ) protection << "rx";
            if (mbi.Protect & PAGE_EXECUTE_READWRITE) protection << "rwx";
            if (mbi.Protect & PAGE_EXECUTE_WRITECOPY) protection << "rwx(cow)";
            if (mbi.Protect & PAGE_READONLY) protection << "r";
            if (mbi.Protect & PAGE_READWRITE) protection << "rw";
            if (mbi.Protect & PAGE_WRITECOPY) protection << "rw(cow)";
            region.protection = protection.str();
            
            if (mbi.Type == MEM_IMAGE) region.type = "image";
            else if (mbi.Type == MEM_MAPPED) region.type = "mapped";
            else if (mbi.Type == MEM_PRIVATE) region.type = "private";
            else region.type = "unknown";
            
            region.state = "committed";
            regions.push_back(region);
        }
        
        address = reinterpret_cast<uint64_t>(mbi.BaseAddress) + mbi.RegionSize;
    }
    
    CloseHandle(hProcess);
    
    Napi::Array result = Napi::Array::New(env, regions.size());
    for (size_t i = 0; i < regions.size(); i++) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("baseAddress", Napi::Number::New(env, regions[i].baseAddress));
        obj.Set("size", Napi::Number::New(env, regions[i].size));
        obj.Set("protection", Napi::String::New(env, regions[i].protection));
        obj.Set("type", Napi::String::New(env, regions[i].type));
        obj.Set("state", Napi::String::New(env, regions[i].state));
        result[i] = obj;
    }
    
    return result;
}

Napi::Object InitMemoryReader(Napi::Env env, Napi::Object exports) {
    exports.Set("readMemory", Napi::Function::New(env, ReadProcessMemoryRegion));
    exports.Set("getMemoryRegions", Napi::Function::New(env, GetMemoryRegions));
    return exports;
}

#endif // _WIN32

