import { useState, useEffect, useCallback } from 'react';
import {
  initializeParser,
  logger,
  analyzeProject,
  FileContent,
  LogHandler,
} from 'repograph-browser';
import { generateScn } from 'scn-ts-browser';
import { defaultFilesJSON } from './default-files';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Textarea } from './components/ui/textarea';
import LogViewer, { LogEntry } from './components/LogViewer';
import { Play, Loader } from 'lucide-react';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filesInput, setFilesInput] = useState(defaultFilesJSON);
  const [scnOutput, setScnOutput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeParser({ wasmBaseUrl: '/wasm/' });
        setIsInitialized(true);
        setLogs(prev => [...prev, { level: 'info', message: 'Parser initialized.', timestamp: Date.now() }]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLogs(prev => [...prev, { level: 'error', message: `Failed to initialize parser: ${message}`, timestamp: Date.now() }]);
      }
    };
    init();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!isInitialized) {
      setLogs(prev => [...prev, { level: 'warn', message: 'Parser not ready.', timestamp: Date.now() }]);
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setScnOutput('');

    const logHandler: LogHandler = (level, ...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      setLogs(prev => [...prev, { level, message, timestamp: Date.now() }]);
    };
    logger.setLogHandler(logHandler);
    logger.setLevel('debug');

    try {
      let files: FileContent[] = [];
      try {
        files = JSON.parse(filesInput);
        if (!Array.isArray(files)) throw new Error("Input is not an array.");
      } catch (error) {
        throw new Error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
      }

      const rankedGraph = await analyzeProject({ files });
      const scn = generateScn(rankedGraph, files);
      setScnOutput(scn);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Analysis failed:', message);
    } finally {
      setIsLoading(false);
      logger.setLogHandler(null);
    }
  }, [filesInput, isInitialized]);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      <header className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold">SCN-TS Web Demo</h1>
        <Button onClick={handleAnalyze} disabled={isLoading || !isInitialized}>
          {isLoading ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Analyze
        </Button>
      </header>
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-150px)]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Input Files (JSON)</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <Textarea
              value={filesInput}
              onChange={(e) => setFilesInput(e.target.value)}
              className="h-full w-full font-mono text-xs"
              placeholder="Paste an array of FileContent objects here..."
            />
          </CardContent>
        </Card>
        
        <Card className="flex flex-col overflow-hidden">
           <CardHeader>
            <CardTitle>Output (SCN)</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto p-0">
            <pre className="text-xs whitespace-pre font-mono p-4 h-full w-full">
              <code>
                {scnOutput || (isLoading ? "Generating..." : "Output will appear here.")}
              </code>
            </pre>
          </CardContent>
        </Card>
      </main>

      <footer className="flex-shrink-0 h-[150px]">
        <LogViewer logs={logs} />
      </footer>
    </div>
  );
}

export default App;