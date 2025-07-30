import React from 'react';
import { LogLevel } from 'repograph-browser';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

export interface LogEntry {
  level: Exclude<LogLevel, 'silent'>;
  message: string;
  timestamp: number;
}

const levelColorMap: Record<Exclude<LogLevel, 'silent'>, string> = {
  error: 'text-red-500',
  warn: 'text-yellow-500',
  info: 'text-blue-400',
  debug: 'text-gray-500',
};

const LogViewer: React.FC<{ logs: readonly LogEntry[] }> = ({ logs }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Logs</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto p-0">
        <div className="p-4 font-mono text-xs">
          {logs.length === 0 && <p className="text-gray-500">No logs yet. Click "Analyze" to start.</p>}
          {logs.map((log, index) => (
            <div key={index} className="flex items-start">
              <span className={cn("font-bold w-12 flex-shrink-0", levelColorMap[log.level])}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogViewer;