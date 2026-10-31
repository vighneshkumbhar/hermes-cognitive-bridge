# Architecture

```text
User-selected/entered prompt -> MV3 in-page panel -> paired loopback gateway
                                                      -> Hermes --ipc TUI
User-controlled copy <- MV3 panel <- gateway <- Hermes interactive response
```

The extension panel is injected above the ChatGPT composer and uses a shadow root. The gateway connects over authenticated local IPC to an already running Hermes process started explicitly with `hermes --ipc`. Hermes keeps its normal interactive session, model/provider, tools, and native approval flow. The extension does not scrape ChatGPT responses or send Hermes results back into ChatGPT.

Gateway task submission and cancellation remain fail-closed until a live native-approval acceptance test passes. IPC request records are in memory and are lost when Hermes exits. The gateway does not launch Hermes. See `IPC_PROTOCOL.md` for transport and lifecycle details.
