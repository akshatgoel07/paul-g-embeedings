export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context?: Record<string, any>;
}
export declare class Logger {
    private minLevel;
    constructor(minLevel?: LogLevel);
    private shouldLog;
    private formatMessage;
    private log;
    debug(message: string, context?: Record<string, any>): void;
    info(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>): void;
    error(message: string, context?: Record<string, any>): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map