import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { useExecSession } from '../../hooks/useExecSession';

interface ExecTerminalProps {
  allocId: string;
  task: string;
  command?: string[];
  onExit?: (exitCode: number) => void;
}

export function ExecTerminal({
  allocId,
  task,
  command = ['/bin/sh'],
  onExit,
}: ExecTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleData = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const handleExit = useCallback((exitCode: number) => {
    xtermRef.current?.write(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
    onExit?.(exitCode);
  }, [onExit]);

  const handleError = useCallback((error: string) => {
    xtermRef.current?.write(`\r\n\x1b[31m[Error: ${error}]\x1b[0m\r\n`);
  }, []);

  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendInput,
    sendResize,
  } = useExecSession({
    allocId,
    task,
    command,
    tty: true,
    onData: handleData,
    onExit: handleExit,
    onError: handleError,
  });

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle input
    terminal.onData((data) => {
      sendInput(data);
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      sendResize(terminal.cols, terminal.rows);
    };

    window.addEventListener('resize', handleResize);

    // Write initial message
    terminal.write('\x1b[36mConnecting to container...\x1b[0m\r\n');

    // Auto-connect
    connect();

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      disconnect();
    };
  }, [allocId, task]); // Re-initialize when allocation or task changes

  // Send resize when connected
  useEffect(() => {
    if (isConnected && xtermRef.current && fitAddonRef.current) {
      fitAddonRef.current.fit();
      sendResize(xtermRef.current.cols, xtermRef.current.rows);
      xtermRef.current.write('\x1b[32mConnected!\x1b[0m\r\n\r\n');
      xtermRef.current.focus();
    }
  }, [isConnected, sendResize]);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' :
            isConnecting ? 'bg-yellow-500 animate-pulse' :
            error ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-sm text-gray-300">
            {isConnected ? 'Connected' :
             isConnecting ? 'Connecting...' :
             error ? 'Disconnected' :
             'Ready'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && !isConnecting && (
            <button
              onClick={connect}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Reconnect
            </button>
          )}
          {isConnected && (
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 bg-[#1a1b26]"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

export default ExecTerminal;
