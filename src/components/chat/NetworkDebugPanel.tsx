"use client";

import { useState } from "react";
import type { DebugInfo } from "@/lib/types";

interface NetworkDebugPanelProps {
  debug: DebugInfo;
}

export function NetworkDebugPanel({ debug }: NetworkDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const hasLogs = debug.networkLogs.length > 0;
  const hasErrors = debug.networkLogs.some(
    (l) => l.error || (l.status && l.status >= 400)
  );

  return (
    <div className="mt-1.5 max-w-2xl">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${
          hasErrors
            ? "text-red-500 hover:text-red-400"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            hasErrors ? "bg-red-500" : hasLogs ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        />
        {debug.toolUsed || "no tool"} · {debug.networkLogs.length} request
        {debug.networkLogs.length !== 1 ? "s" : ""}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-border/50 bg-muted/30 text-[10px] font-mono overflow-hidden">
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-border/30 text-muted-foreground flex items-center justify-between">
            <span>
              {debug.claudeModel} · {new Date(debug.timestamp).toLocaleTimeString()}
            </span>
            {debug.toolUsed && (
              <span className="text-foreground font-medium">{debug.toolUsed}</span>
            )}
          </div>

          {/* Tool input */}
          {debug.toolInput && (
            <div className="px-2.5 py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">Tool input: </span>
              <span className="text-foreground break-all">
                {JSON.stringify(debug.toolInput)}
              </span>
            </div>
          )}

          {/* Network logs */}
          {debug.networkLogs.map((log, i) => {
            const isError = log.error || (log.status && log.status >= 400);
            const isExpanded = expandedLog === i;
            return (
              <div
                key={i}
                className={`border-b border-border/20 last:border-b-0 ${
                  isError ? "bg-red-500/5" : ""
                }`}
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : i)}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={`font-medium shrink-0 ${
                      log.method === "GET" ? "text-blue-500" : "text-orange-500"
                    }`}
                  >
                    {log.method}
                  </span>
                  <span className="text-foreground truncate flex-1">
                    {log.url}
                  </span>
                  <span
                    className={`shrink-0 ${
                      isError ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {log.status ?? "ERR"}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {log.durationMs}ms
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-2.5 pb-2 space-y-1.5">
                    {log.error && (
                      <div>
                        <span className="text-red-500">Error: </span>
                        <span className="text-red-400 break-all">{log.error}</span>
                      </div>
                    )}
                    {log.requestBody && (
                      <div>
                        <span className="text-muted-foreground">Request: </span>
                        <pre className="text-foreground whitespace-pre-wrap break-all mt-0.5 bg-background/50 rounded p-1.5 max-h-32 overflow-y-auto">
                          {formatJson(log.requestBody)}
                        </pre>
                      </div>
                    )}
                    {log.responseSnippet && (
                      <div>
                        <span className="text-muted-foreground">Response: </span>
                        <pre className="text-foreground whitespace-pre-wrap break-all mt-0.5 bg-background/50 rounded p-1.5 max-h-48 overflow-y-auto">
                          {formatJson(log.responseSnippet)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {debug.networkLogs.length === 0 && (
            <div className="px-2.5 py-2 text-muted-foreground">
              No network requests (text-only response from Claude)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
