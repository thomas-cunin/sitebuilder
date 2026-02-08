"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Log {
  id: string;
  level: string;
  message: string;
  createdAt: string | Date;
}

interface LogViewerProps {
  siteId: string;
  initialLogs?: Log[];
  autoRefresh?: boolean;
}

export function LogViewer({ siteId, initialLogs = [], autoRefresh = true }: LogViewerProps) {
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [isConnected, setIsConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoRefresh) return;

    const eventSource = new EventSource(`/api/sites/${siteId}/logs?stream=true`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const newLogs = JSON.parse(event.data);
        setLogs(newLogs);
      } catch (e) {
        console.error("Failed to parse logs:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [siteId, autoRefresh]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const refreshLogs = async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/logs`);
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Failed to refresh logs:", e);
    }
  };

  const downloadLogs = () => {
    const content = logs
      .map((log) => `[${log.createdAt}] [${log.level}] ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${siteId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "text-red-500";
      case "WARN":
        return "text-yellow-500";
      case "INFO":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          Logs
          {autoRefresh && (
            <span
              className={cn(
                "ml-2 inline-block w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refreshLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={downloadLogs}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="bg-gray-900 text-gray-100 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm"
        >
          {logs.length === 0 ? (
            <p className="text-gray-500">Aucun log disponible</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-0.5">
                <span className="text-gray-500 text-xs">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>{" "}
                <span className={cn("font-bold", getLevelColor(log.level))}>
                  [{log.level}]
                </span>{" "}
                <span className="whitespace-pre-wrap">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
