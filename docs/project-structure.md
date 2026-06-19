# Project structure

```
src/
├── main/           # Electron main process (window, DB, HTTP, IPC)
├── preload/        # contextBridge API exposed to the renderer
├── renderer/       # React UI
└── shared/         # Shared TypeScript types
```

The renderer talks to the main process through IPC handlers registered in `src/main/ipc.ts`. HTTP requests are executed in the main process (`src/main/http.ts`) so the UI stays responsive and request logic stays out of the renderer sandbox.
