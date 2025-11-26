/**
 * Advanced logging library for Node.js with hierarchical levels,
 * structured logging, and multiple output destinations.
 * 
 * ESM version based on the design principles from the Go implementation.
 */

import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import os from 'os';

/**
 * @typedef {Object} LogEntry
 * @property {Date} timestamp - When the log was created
 * @property {string} level - String representation of the log level
 * @property {number} levelValue - Numeric value of the log level
 * @property {string} message - The log message
 * @property {string} [component] - The component that generated the log
 * @property {string} [file] - Source file that generated the log
 * @property {number} [line] - Line number in source file
 * @property {string} instanceId - Unique identifier for this logger instance
 * @property {number} pid - Process ID
 * @property {string} hostname - Server hostname
 * @property {Object.<string, any>} [fields] - Additional structured data fields
 */

/**
 * Log levels in increasing order of verbosity
 * @enum {number}
 */
export const Level = {
    EMERGENCY: 0, // System is unusable
    ALERT: 1,     // Action must be taken immediately
    CRITICAL: 2,  // Critical conditions
    ERROR: 3,     // Error conditions
    WARNING: 4,   // Warning conditions
    NOTICE: 5,    // Normal but significant condition
    INFO: 6,      // Informational
    DEBUG: 7,     // Debug-level messages
    VERBOSE: 8,   // Verbose debug messages
    TRACE: 9      // Extremely detailed tracing
};

/**
 * Maps level values to their string representations
 * @type {Object.<number, string>}
 */
export const LEVEL_NAMES = {
    [Level.EMERGENCY]: 'EMERG',
    [Level.ALERT]: 'ALERT',
    [Level.CRITICAL]: 'CRIT',
    [Level.ERROR]: 'ERROR',
    [Level.WARNING]: 'WARN',
    [Level.NOTICE]: 'NOTICE',
    [Level.INFO]: 'INFO',
    [Level.DEBUG]: 'DEBUG',
    [Level.VERBOSE]: 'VERB',
    [Level.TRACE]: 'TRACE'
};

/**
 * Output format options
 * @enum {string}
 */
export const Format = {
    TEXT: 'text',
    JSON: 'json'
};

/**
 * ANSI color codes for different log levels
 * @type {Object.<number, string>}
 */
const LEVEL_COLORS = {
    [Level.EMERGENCY]: '\u001b[1;31m', // Bold Red
    [Level.ALERT]: '\u001b[1;31m',     // Bold Red
    [Level.CRITICAL]: '\u001b[1;31m',  // Bold Red
    [Level.ERROR]: '\u001b[31m',       // Red
    [Level.WARNING]: '\u001b[33m',     // Yellow
    [Level.NOTICE]: '\u001b[1;34m',    // Bold Blue
    [Level.INFO]: '\u001b[32m',        // Green
    [Level.DEBUG]: '\u001b[36m',       // Cyan
    [Level.VERBOSE]: '\u001b[35m',     // Magenta
    [Level.TRACE]: '\u001b[35m'        // Magenta
};

// Reset ANSI color
const RESET_COLOR = '\u001b[0m';
const DIM_COLOR = '\u001b[90m';

/**
 * Rate sampler for controlling high-volume logging
 */
class RateSampler {
    constructor() {
        /** @type {Object.<string, number>} */
        this.samplingRates = {};
        /** @type {Object.<string, number>} */
        this.counters = {};
    }

    /**
     * Sets how often a log with a given key should be emitted
     * @param {string} key - Unique identifier for this log type
     * @param {number} rate - Frequency (1 = every log, N = 1 out of every N logs)
     */
    setSamplingRate(key, rate) {
        if (rate < 1) {
            rate = 1;
        }
        this.samplingRates[key] = rate;
        delete this.counters[key]; // Reset counter when rate changes
    }

    /**
     * Determines if a log with the given key should be emitted
     * @param {string} key - Unique identifier for this log type
     * @returns {boolean} - True if the log should be emitted
     */
    shouldLog(key) {
        const rate = this.samplingRates[key];
        if (!rate || rate <= 1) {
            return true; // Log everything if no sampling rate is set
        }

        let counter = this.counters[key] || 0;
        counter = (counter + 1) % rate;
        this.counters[key] = counter;

        return counter === 0; // Only log when counter is 0
    }
}

/**
 * Base class for all log outputs
 */
export class Output {
    /**
     * Creates a new output
     * @param {string} format - The output format (text or json)
     */
    constructor(format) {
        this.format = format;
    }

    /**
     * Writes a log entry to the output
     * @param {LogEntry} entry - The log entry to write
     */
    write(entry) {
        throw new Error('Method not implemented');
    }

    /**
     * Formats a log entry according to the output format
     * @param {LogEntry} entry - The log entry to format
     * @returns {string} - The formatted log entry
     */
    formatEntry(entry) {
        if (this.format === Format.JSON) {
            return JSON.stringify(entry) + '\n';
        }

        // Text format
        const timeStr = entry.timestamp.toISOString().replace('T', ' ').replace('Z', '');
        const levelColor = LEVEL_COLORS[entry.levelValue] || '';

        let location = '';
        if (entry.file) {
            location = ` ${DIM_COLOR}[${entry.file}:${entry.line}]${RESET_COLOR}`;
        }

        let component = '';
        if (entry.component) {
            component = ` (${entry.component})`;
        }

        let line = `${timeStr} [${levelColor}${entry.level}${RESET_COLOR}]${component}${location} ${entry.message}`;

        // Add fields if present
        if (entry.fields && Object.keys(entry.fields).length > 0) {
            line += ` ${DIM_COLOR}${JSON.stringify(entry.fields)}${RESET_COLOR}`;
        }

        return line + '\n';
    }

    /**
     * Closes the output
     */
    close() {
        // Default implementation does nothing
    }
}

/**
 * Output that writes to the console
 */
export class ConsoleOutput extends Output {
    /**
     * Creates a new console output
     * @param {Writable} [stream=process.stdout] - The stream to write to
     * @param {string} [format=Format.TEXT] - The output format
     */
    constructor(stream = process.stdout, format = Format.TEXT) {
        super(format);
        this.stream = stream;
    }

    /**
     * Writes a log entry to the console
     * @param {LogEntry} entry - The log entry to write
     */
    write(entry) {
        if (this.stream) {
            this.stream.write(this.formatEntry(entry));
        }
    }
}

/**
 * Output that writes to a file
 */
export class FileOutput extends Output {
    /**
     * Creates a new file output
     * @param {string} filePath - Path to the log file
     * @param {string} [format=Format.JSON] - The output format
     * @param {Object} [options] - Additional options
     * @param {number} [options.maxSizeMB=100] - Maximum file size in MB before rotation
     * @param {boolean} [options.compress=false] - Whether to compress rotated logs
     */
    constructor(filePath, format = Format.JSON, options = {}) {
        super(format);
        this.filePath = filePath;
        this.maxSize = (options.maxSizeMB || 100) * 1024 * 1024;
        this.compress = options.compress || false;
        this.currentSize = 0;
        this.rotateCallback = null;

        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Open file stream
        this.stream = fs.createWriteStream(filePath, { flags: 'a' });

        // Get initial file size
        try {
            const stats = fs.statSync(filePath);
            this.currentSize = stats.size;
        } catch (err) {
            // File probably doesn't exist yet, start at 0
            this.currentSize = 0;
        }
    }

    /**
     * Sets a callback to be called after log rotation
     * @param {Function} callback - Function to call with the rotated file path
     */
    setRotateCallback(callback) {
        this.rotateCallback = callback;
    }

    /**
     * Writes a log entry to the file
     * @param {LogEntry} entry - The log entry to write
     */
    write(entry) {
        const data = this.formatEntry(entry);

        // Check if we need to rotate
        if (this.maxSize > 0 && this.currentSize + Buffer.byteLength(data) > this.maxSize) {
            this.rotate();
        }

        if (this.stream) {
            this.stream.write(data);
            this.currentSize += Buffer.byteLength(data);
        }
    }

    /**
     * Rotates the log file
     */
    rotate() {
        // Close current stream
        if (this.stream) {
            this.stream.end();
        }

        // Generate timestamp for rotated file name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.filePath}.${timestamp}`;

        // Rename current file to rotated path
        try {
            fs.renameSync(this.filePath, rotatedPath);
        } catch (err) {
            console.error(`Failed to rotate log file: ${err.message}`);
        }

        // Open new file stream
        this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
        this.currentSize = 0;

        // Call rotation callback if set
        if (this.rotateCallback) {
            setImmediate(() => this.rotateCallback(rotatedPath));
        }

        // Compress rotated file if enabled
        if (this.compress) {
            this.compressRotatedFile(rotatedPath);
        }
    }

    /**
     * Compresses a rotated log file
     * @param {string} filePath - Path to the rotated log file
     */
    async compressRotatedFile(filePath) {
        try {
            const { createGzip } = await import('zlib');
            const gzip = createGzip();
            const source = fs.createReadStream(filePath);
            const destination = fs.createWriteStream(`${filePath}.gz`);

            source.pipe(gzip).pipe(destination);

            destination.on('finish', () => {
                fs.unlinkSync(filePath); // Remove original file
            });
        } catch (err) {
            console.error(`Failed to compress rotated log file: ${err.message}`);
        }
    }

    /**
     * Closes the file output
     */
    close() {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }
}

/**
 * Logger class that handles all logging operations
 */
export class Logger {
    /**
     * Creates a new logger
     * @param {Object} [options] - Logger options
     * @param {number} [options.level=Level.INFO] - Default log level
     * @param {string} [options.component] - Component name
     * @param {Object.<string, any>} [options.defaultFields] - Default fields to include in all logs
     */
    constructor(options = {}) {
        this.level = options.level !== undefined ? options.level : Level.INFO;
        this.component = options.component || '';
        this.defaultFields = options.defaultFields || {};
        this.outputs = [];
        this.componentLevels = {};
        this.instanceId = `${process.pid}-${Date.now()}`;
        this.sampler = new RateSampler();

        // Async queue setup
        this.queue = [];
        this.queueSize = 1000;
        this.queueProcessing = false;
        this.closed = false;
    }

    /**
     * Adds an output destination
     * @param {Output} output - The output to add
     * @returns {Logger} - This logger instance for chaining
     */
    addOutput(output) {
        this.outputs.push(output);
        return this;
    }

    /**
     * Sets the global log level
     * @param {number} level - The new log level
     * @returns {Logger} - This logger instance for chaining
     */
    setLevel(level) {
        this.level = level;
        return this;
    }

    /**
     * Gets the current global log level
     * @returns {number} - The current log level
     */
    getLevel() {
        return this.level;
    }

    /**
     * Sets the log level for a specific component
     * @param {string} component - Component name
     * @param {number} level - The new log level for this component
     * @returns {Logger} - This logger instance for chaining
     */
    setComponentLevel(component, level) {
        this.componentLevels[component] = level;
        return this;
    }

    /**
     * Checks if a message at the given level should be logged
     * @param {number} level - The log level to check
     * @param {string} component - The component name
     * @returns {boolean} - True if the message should be logged
     * @private
     */
    isLoggable(level, component) {
        // Check component-specific level first
        if (component && this.componentLevels[component] !== undefined) {
            return level <= this.componentLevels[component];
        }

        // Fall back to global level
        return level <= this.level;
    }

    /**
     * Creates a new logger with the given component
     * @param {string} component - The component name
     * @returns {Logger} - A new logger instance
     */
    with(component) {
        const newLogger = new Logger({
            level: this.level,
            component,
            defaultFields: { ...this.defaultFields }
        });

        // Share settings with new logger
        newLogger.outputs = this.outputs;
        newLogger.componentLevels = this.componentLevels;
        newLogger.instanceId = this.instanceId;
        newLogger.sampler = this.sampler;
        newLogger.queue = this.queue;

        return newLogger;
    }

    /**
     * Creates a new logger with additional default fields
     * @param {Object} fields - Fields to add to the default fields
     * @returns {Logger} - A new logger instance
     */
    withFields(fields) {
        const newLogger = new Logger({
            level: this.level,
            component: this.component,
            defaultFields: { ...this.defaultFields, ...fields }
        });

        // Share settings with new logger
        newLogger.outputs = this.outputs;
        newLogger.componentLevels = this.componentLevels;
        newLogger.instanceId = this.instanceId;
        newLogger.sampler = this.sampler;
        newLogger.queue = this.queue;

        return newLogger;
    }

    /**
     * Creates a new logger with an additional default field
     * @param {string} key - Field key
     * @param {any} value - Field value
     * @returns {Logger} - A new logger instance
     */
    withField(key, value) {
        const fields = {};
        fields[key] = value;
        return this.withFields(fields);
    }

    /**
     * Core logging function
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     * @private
     */
    log(level, message, fields) {
        if (!this.isLoggable(level, this.component)) {
            return;
        }

        // Get caller information
        const stack = new Error().stack;
        let fileLine = { file: '', line: 0 };

        if (stack) {
            // Parse the stack trace to get file and line
            // Skip the first two lines (Error and this method)
            // console.log('stack', stack)
            const lines = stack.split('\n').slice(4);
            for (const line of lines) {
                // ESM format stack trace is slightly different from CommonJS
                const match = line.match(/at (?:(.+) \()?(?:file:\/\/)?(.+):(\d+):(\d+)/);
                if (match) {
                    const [, , filePath, lineNum] = match;
                    // TODO: add some parent folders as well
                    fileLine = {
                        file: path.basename(filePath),
                        line: parseInt(lineNum, 10)
                    };
                    break;
                }
            }
        }

        // Create log entry
        const entry = {
            timestamp: new Date(),
            level: LEVEL_NAMES[level],
            levelValue: level,
            message,
            component: this.component,
            instanceId: this.instanceId,
            file: fileLine.file,
            line: fileLine.line,
            pid: process.pid,
            hostname: os.hostname(),
            fields: {}
        };

        // Add default fields
        if (Object.keys(this.defaultFields).length > 0) {
            Object.assign(entry.fields, this.defaultFields);
        }

        // Add per-message fields if provided
        if (fields && Object.keys(fields).length > 0) {
            Object.assign(entry.fields, fields);
        }

        // Add function name for trace-level logs
        if (level === Level.TRACE && stack) {
            const funcMatch = stack.split('\n')[3]?.match(/at ([^(]+)/);
            if (funcMatch && funcMatch[1]) {
                entry.fields.func = funcMatch[1].trim();
            }
        }

        // Queue the entry
        this.queueEntry(entry);
    }

    /**
     * Queues a log entry for processing
     * @param {LogEntry} entry - The log entry to queue
     * @private
     */
    queueEntry(entry) {
        // Add to queue
        if (this.queue.length < this.queueSize) {
            this.queue.push(entry);
        } else {
            // Queue full, log to console as fallback
            console.error(`WARNING: Log queue full, dropping log: ${entry.message}`);
            return;
        }

        // Start processing if not already running
        if (!this.queueProcessing && !this.closed) {
            this.processQueue();
        }
    }

    /**
     * Processes the queue of log entries
     * @private
     */
    processQueue() {
        this.queueProcessing = true;

        setImmediate(() => {
            while (this.queue.length > 0 && !this.closed) {
                const entry = this.queue.shift();
                this.writeLogEntry(entry);
            }

            this.queueProcessing = false;

            // If new entries were added during processing, restart
            if (this.queue.length > 0 && !this.closed) {
                this.processQueue();
            }
        });
    }

    /**
     * Writes a log entry to all outputs
     * @param {LogEntry} entry - The log entry to write
     * @private
     */
    writeLogEntry(entry) {
        for (const output of this.outputs) {
            try {
                if (output) {
                    output.write(entry);
                }
            } catch (err) {
                console.error(`ERROR: Failed to write log: ${err.message}`);
            }
        }
    }

    /**
     * Logs a message with rate limiting
     * @param {number} level - Log level
     * @param {string} samplingKey - Key for sampling rate
     * @param {number} rate - Sampling rate (1 = every log, N = 1 out of N logs)
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     * @private
     */
    logWithSampling(level, samplingKey, rate, message, fields) {
        if (!this.isLoggable(level, this.component)) {
            return;
        }

        this.sampler.setSamplingRate(samplingKey, rate);

        if (this.sampler.shouldLog(samplingKey)) {
            this.log(level, message, fields);
        }
    }

    /**
     * Flushes all pending log entries
     * @returns {Promise<void>} - Promise that resolves when all logs are flushed
     */
    async flush() {
        // If no queue processing is happening, start it
        if (!this.queueProcessing && this.queue.length > 0) {
            this.processQueue();
        }

        // Wait for queue to empty
        while (this.queue.length > 0 || this.queueProcessing) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Closes the logger and all outputs
     */
    close() {
        this.closed = true;

        // Wait for queue to be processed
        setImmediate(() => {
            // Close all outputs
            for (const output of this.outputs) {
                try {
                    if (output) {
                        output.close();
                    }
                } catch (err) {
                    console.error(`ERROR: Failed to close output: ${err.message}`);
                }
            }
        });
    }

    // Standard logging methods

    /**
     * Logs at emergency level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    emergency(message, fields) {
        this.log(Level.EMERGENCY, message, fields);
    }

    /**
     * Logs at alert level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    alert(message, fields) {
        this.log(Level.ALERT, message, fields);
    }

    /**
     * Logs at critical level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    critical(message, fields) {
        this.log(Level.CRITICAL, message, fields);
    }

    /**
     * Logs at error level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    error(message, fields) {
        this.log(Level.ERROR, message, fields);
    }

    /**
     * Logs at warning level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    warning(message, fields) {
        this.log(Level.WARNING, message, fields);
    }

    /**
     * Logs at notice level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    notice(message, fields) {
        this.log(Level.NOTICE, message, fields);
    }

    /**
     * Logs at info level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    info(message, fields) {
        this.log(Level.INFO, message, fields);
    }

    /**
     * Logs at debug level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    debug(message, fields) {
        this.log(Level.DEBUG, message, fields);
    }

    /**
     * Logs at verbose level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    verbose(message, fields) {
        this.log(Level.VERBOSE, message, fields);
    }

    /**
     * Logs at trace level
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    trace(message, fields) {
        this.log(Level.TRACE, message, fields);
    }

    // Sampled logging methods

    /**
     * Logs at info level with rate limiting
     * @param {string} key - Sampling key
     * @param {number} rate - Sampling rate (1 = every log, N = 1 out of N logs)
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    sampledInfo(key, rate, message, fields) {
        this.logWithSampling(Level.INFO, key, rate, message, fields);
    }

    /**
     * Logs at error level with rate limiting
     * @param {string} key - Sampling key
     * @param {number} rate - Sampling rate (1 = every log, N = 1 out of N logs)
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    sampledError(key, rate, message, fields) {
        this.logWithSampling(Level.ERROR, key, rate, message, fields);
    }

    /**
     * Logs at warning level with rate limiting
     * @param {string} key - Sampling key
     * @param {number} rate - Sampling rate (1 = every log, N = 1 out of N logs)
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    sampledWarning(key, rate, message, fields) {
        this.logWithSampling(Level.WARNING, key, rate, message, fields);
    }

    /**
     * Logs at debug level with rate limiting
     * @param {string} key - Sampling key
     * @param {number} rate - Sampling rate (1 = every log, N = 1 out of N logs)
     * @param {string} message - Log message
     * @param {Object} [fields] - Additional fields
     */
    sampledDebug(key, rate, message, fields) {
        this.logWithSampling(Level.DEBUG, key, rate, message, fields);
    }
}

// Create default logger
const defaultLogger = new Logger();
defaultLogger.addOutput(new ConsoleOutput());

/**
 * Returns the default logger
 * @returns {Logger} - The default logger
 */
export function getLogger() {
    return defaultLogger;
}

/**
 * Creates a new logger with the given options
 * @param {Object} options - Logger options
 * @returns {Logger} - A new logger instance
 */
export function createLogger(options) {
    return new Logger(options);
}

// Export default logger methods
export const emergency = (message, fields) => defaultLogger.emergency(message, fields);
export const alert = (message, fields) => defaultLogger.alert(message, fields);
export const critical = (message, fields) => defaultLogger.critical(message, fields);
export const error = (message, fields) => defaultLogger.error(message, fields);
export const warning = (message, fields) => defaultLogger.warning(message, fields);
export const notice = (message, fields) => defaultLogger.notice(message, fields);
export const info = (message, fields) => defaultLogger.info(message, fields);
export const debug = (message, fields) => defaultLogger.debug(message, fields);
export const verbose = (message, fields) => defaultLogger.verbose(message, fields);
export const trace = (message, fields) => defaultLogger.trace(message, fields);

// Default export for convenience
export default {
    Level,
    Format,
    Logger,
    Output,
    ConsoleOutput,
    FileOutput,
    getLogger,
    createLogger,
    emergency,
    alert,
    critical,
    error,
    warning,
    notice,
    info,
    debug,
    verbose,
    trace
};
