/**
 * Error Handling Module
 * Version: 1.6.0
 * Last Updated: 2025-01-12
 * 
 * Changes:
 * - 1.6.0: Separated user interaction logs from error logs, improved log formatting
 * - 1.5.0: Added verbose logging, user interaction tracking, and enhanced error capture
 * - 1.4.0: Fixed error log file persistence, improved error logging reliability
 * - 1.3.0: Centralized error logging to root errors.log file, removed room-specific handlers
 * - 1.2.0: Added room-specific error handlers and logging
 * - 1.1.0: Added error console display and UI integration
 * - 1.0.0: Initial implementation with basic error logging
 */
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.interactionLog = [];
        this.errorCount = 0;
        this.debugMode = true; // Enable verbose logging
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for user interactions
     * @returns {void}
     */
    setupEventListeners() {
        try {
            // Track all button clicks
            document.addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON' || 
                    event.target.type === 'button' ||
                    event.target.type === 'submit') {
                    this.logUserInteraction('button_click', {
                        buttonText: event.target.textContent,
                        buttonId: event.target.id,
                        buttonType: event.target.type,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Track file input changes
            document.addEventListener('change', (event) => {
                if (event.target.type === 'file') {
                    this.logUserInteraction('file_input', {
                        inputId: event.target.id,
                        fileName: event.target.files?.[0]?.name || 'No file selected',
                        fileType: event.target.files?.[0]?.type || 'unknown',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Track form submissions
            document.addEventListener('submit', (event) => {
                this.logUserInteraction('form_submit', {
                    formId: event.target.id,
                    formAction: event.target.action,
                    timestamp: new Date().toISOString()
                });
            });

        } catch (e) {
            console.error('Error setting up event listeners:', e);
            this.logError('setup_event_listeners', e);
        }
    }

    /**
     * Log user interactions for debugging
     * @param {string} action - The user action being performed
     * @param {Object} details - Additional details about the action
     * @returns {void}
     */
    logUserInteraction(action, details = {}) {
        if (!this.debugMode) return;

        const interactionLog = {
            type: 'user_interaction',
            action,
            details,
            timestamp: new Date().toISOString()
        };

        // Store interaction in memory
        this.interactionLog.push(interactionLog);

        // Log interaction to file
        this.saveToFile('interaction', {
            timestamp: interactionLog.timestamp,
            type: 'USER_ACTION',
            action: action,
            details: JSON.stringify(details, null, 2)
        });

        if (this.debugMode) {
            console.log('User Interaction:', interactionLog);
        }
    }

    /**
     * Log an error with detailed information
     * @param {string} operation - The operation being performed when error occurred
     * @param {Error} error - The error object
     * @param {Object} context - Additional context about the error
     * @returns {void}
     */
    logError(operation, error, context = {}, level = 'error') {
        try {
            // Ensure error is an Error object
            const errorObj = error instanceof Error ? error : new Error(error?.message || error?.toString() || 'Unknown error');
            
            const errorEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                operation,
                error: {
                    message: errorObj.message,
                    stack: errorObj.stack || new Error().stack,
                    name: errorObj.name
                },
                context: JSON.stringify(context)
            };

            // Add debug information if available
            if (this.debugMode) {
                context = {
                    ...context,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    debugMode: true
                };
            }

            this.errorLog.push(errorEntry);
            this.errorCount++;
            this.updateErrorCount();
            
            // Save error to file
            this.saveToFile('error', errorEntry);
            
            // Use appropriate console method based on level
            const consoleMethod = level === 'warn' ? console.warn : console.error;
            consoleMethod('Error logged:', errorEntry);

            // Log to console in debug mode
            if (this.debugMode) {
                console.group('Detailed Error Information');
                console.log('Operation:', operation);
                console.log('Error:', errorObj);
                console.log('Context:', context);
                console.log('Stack:', errorObj.stack);
                console.groupEnd();
            }
        } catch (e) {
            console.error('Error in logError:', e);
        }
    }

    /**
     * Update the error count display in the UI
     * @returns {void}
     */
    updateErrorCount() {
        try {
            const errorCountElement = document.getElementById('error-count');
            if (errorCountElement) {
                errorCountElement.textContent = this.errorCount === 0 ? 
                    'No errors' : 
                    `${this.errorCount} error${this.errorCount === 1 ? '' : 's'}`;
                errorCountElement.style.color = this.errorCount === 0 ? 'green' : '#dc3545';
            }
        } catch (e) {
            console.error('Error updating error count:', e);
            this.logError('update_error_count', e);
        }
    }

    /**
     * Save log entry to file
     * @param {string} type - Type of log entry ('error' or 'interaction')
     * @param {Object} data - The data to log
     * @returns {void}
     */
    async saveToFile(type, data) {
        try {
            let logText;
            
            if (type === 'error') {
                logText = `${data.timestamp} [ERROR:${data.operation}] ${data.error.message}\n` +
                         `Stack Trace:\n${data.error.stack || 'No stack trace available'}\n` +
                         `Context: ${data.context}\n` +
                         `----------------------------------------\n\n`;
            } else if (type === 'interaction') {
                logText = `${data.timestamp} [${data.type}:${data.action}]\n` +
                         `Details:\n${data.details}\n` +
                         `----------------------------------------\n\n`;
            }

            // Create a FormData object to send the log
            const formData = new FormData();
            formData.append('errorLog', logText);

            // Send log to server endpoint
            const response = await fetch('/api/log-error', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to save log: ${response.statusText}`);
            }

            // Keep a copy in memory
            const storageKey = type === 'error' ? 'tempErrorLog' : 'tempInteractionLog';
            const existingLog = sessionStorage.getItem(storageKey) || '';
            sessionStorage.setItem(storageKey, existingLog + logText);
        } catch (e) {
            console.error(`Error saving ${type} to file:`, e);
            if (type !== 'error') { // Prevent infinite loop if error logging fails
                this.logError('save_to_file', e, { type, data });
            }
        }
    }

    /**
     * Display error console with all logged errors
     * @returns {void}
     */
    showErrorConsole() {
        try {
            console.clear();
            console.log('=== Error Log ===');
            this.errorLog.forEach((entry, index) => {
                console.group(`Error ${index + 1}: ${entry.operation}`);
                console.log('Timestamp:', entry.timestamp);
                console.log('Operation:', entry.operation);
                console.log('Error:', entry.error);
                console.log('Context:', entry.context);
                console.groupEnd();
            });
        } catch (e) {
            console.error('Error showing error console:', e);
            this.logError('show_error_console', e);
        }
    }

    /**
     * Clear all logged errors
     * @returns {void}
     */
    clearErrors() {
        try {
            this.errorLog = [];
            this.errorCount = 0;
            this.updateErrorCount();
            sessionStorage.removeItem('tempErrorLog');
            sessionStorage.removeItem('tempInteractionLog');
        } catch (e) {
            console.error('Error clearing errors:', e);
            this.logError('clear_errors', e);
        }
    }

    /**
     * Get all logged errors
     * @returns {Array} Array of error entries
     */
    getErrors() {
        return [...this.errorLog];
    }

    /**
     * Get all logged interactions
     * @returns {Array} Array of interaction entries
     */
    getInteractions() {
        return [...this.interactionLog];
    }
}

// Create single error handler instance
const errorHandler = new ErrorHandler();

// Export for module usage
export { errorHandler, ErrorHandler };
