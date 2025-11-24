#include <napi.h>

#ifdef _WIN32
extern Napi::Object InitMemoryReader(Napi::Env env, Napi::Object exports);
extern Napi::Object InitRegisterReader(Napi::Env env, Napi::Object exports);

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    InitMemoryReader(env, exports);
    InitRegisterReader(env, exports);
    return exports;
}
#else
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return exports;
}
#endif

NODE_API_MODULE(native_debugger, Init)

