/**
 * File Management Module
 * Version: 1.4.0
 * Last Updated: 2024-01-28
 * 
 * Changes:
 * - 1.4.0: Updated chat file handling with appending and new timestamp format (YY.MM.DD.HH.SS)
 * - 1.3.0: Added server-side image storage with localStorage caching
 * - 1.2.0: Added MIME type handling for file selection
 * - 1.1.0: Added chat history management
 * - 1.0.0: Initial implementation with basic file operations
 */
import { errorHandler } from './errorHandling.js';
import { validateCSV, validateFile } from './validation.js';

/**
 * Create a file input element with specific MIME type filtering
 * @param {string[]} acceptedTypes - Array of accepted MIME types
 * @returns {Promise<File>} Selected file
 */
export function selectFile(acceptedTypes = ['application/json', 'text/csv']) {
    return new Promise((resolve, reject) => {
        try {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            
            // Set accepted file types
            const extensions = {
                'application/json': '.json',
                'text/csv': '.csv',
                'image/jpeg': '.jpg,.jpeg',
                'image/png': '.png',
                'image/gif': '.gif'
            };
            
            const acceptedExtensions = acceptedTypes
                .map(type => extensions[type] || type)
                .join(',');
            
            fileInput.accept = acceptedExtensions;

            fileInput.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                // Validate file type
                const fileErrors = validateFile(file, acceptedTypes);
                if (fileErrors.length > 0) {
                    reject(new Error(fileErrors.join(', ')));
                    return;
                }

                resolve(file);
            };

            fileInput.click();
        } catch (error) {
            errorHandler.logError('selectFile', error);
            reject(error);
        }
    });
}

/**
 * Convert CSV content to JSON format
 * @param {string} csvText - CSV content to convert
 * @returns {Array} Array of objects representing the CSV data
 */
function csvToJSON(csvText) {
    try {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const obj = {};
            const currentline = lines[i].split(',').map(value => {
                // Remove quotes and unescape double quotes
                value = value.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1).replace(/""/g, '"');
                }
                return value;
            });

            headers.forEach((header, j) => {
                obj[header] = currentline[j];
            });
            result.push(obj);
        }

        return result;
    } catch (error) {
        errorHandler.logError('csvToJSON', error);
        throw error;
    }
}

/**
 * Save data to JSON file with machine-made format
 * @param {Array} items - Array of items to save
 * @param {string} roomName - Name of the room
 * @param {string} type - Type of data (items, chat, etc)
 * @returns {Promise<boolean>} Success status
 */
export async function saveToJSON(items, roomName, type = 'items') {
    try {
        const now = new Date();
        const date = `${now.getFullYear().toString().slice(-2)}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;
        const finalFilename = `${roomName}/MACHINE_MADE_${roomName}_${type}_${date}.json`;

        // Create blob and trigger download
        const jsonContent = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Also store in localStorage for persistence
        localStorage.setItem(finalFilename, jsonContent);

        return true;
    } catch (error) {
        errorHandler.logError('saveToJSON', error, { 
            items, 
            roomName, 
            type,
            finalFilename 
        });
        return false;
    }
}

/**
 * Load and parse JSON file
 * @returns {Promise<Object>} Parsed JSON data and any errors
 */
export async function loadJSON() {
    try {
        const file = await selectFile(['application/json']);
        
        // Validate file size
        const fileErrors = validateFile(file, ['application/json'], 5 * 1024 * 1024); // 5MB max
        if (fileErrors.length > 0) {
            throw new Error(fileErrors.join(', '));
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    const requiredFields = ['type', 'name', 'description', 'cost', 'url', 'note', 'image_path'];
                    
                    // Validate JSON structure
                    const validationErrors = [];
                    for (const item of jsonData) {
                        for (const field of requiredFields) {
                            if (!(field in item)) {
                                validationErrors.push(`Missing required field: ${field}`);
                            }
                        }
                    }

                    if (validationErrors.length > 0) {
                        reject(new Error(validationErrors.join(', ')));
                        return;
                    }

                    // Parse and convert data types
                    const parsedData = jsonData.map(row => ({
                        ...row,
                        cost: parseFloat(row.cost) || 0,
                        id: Date.now() + Math.random() // Add unique ID
                    }));

                    resolve({
                        success: true,
                        data: parsedData,
                        errors: []
                    });
                } catch (error) {
                    errorHandler.logError('JSON parsing', error, { file: file.name });
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                errorHandler.logError('JSON reading', error, { file: file.name });
                reject(new Error('Error reading file'));
            };

            reader.readAsText(file);
        });
    } catch (error) {
        errorHandler.logError('loadJSON', error, { file: error.name });
        throw error;
    }
}

/**
 * Handle image file upload with server storage and local caching
 * @param {string} roomName - Name of the room
 * @param {string} type - Type of item (for filename)
 * @returns {Promise<string>} Path to saved image
 */
export async function handleImageUpload(roomName, type) {
    try {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const file = await selectFile(allowedTypes);
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        const fileErrors = validateFile(file, allowedTypes, maxSize);
        if (fileErrors.length > 0) {
            throw new Error(fileErrors.join(', '));
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${type}_${timestamp}_${file.name}`;
        const path = `${roomName}/images/${filename}`;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Store in localStorage as cache
                    localStorage.setItem(path, e.target.result);
                    
                    // Upload to server
                    const formData = new FormData();
                    formData.append('image', e.target.result);
                    formData.append('path', path);
                    
                    const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Server error: ${response.statusText}`);
                    }

                    resolve(path);
                } catch (error) {
                    errorHandler.logError('handleImageUpload', error, { path });
                    // Still resolve with path since we have localStorage backup
                    resolve(path);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    } catch (error) {
        errorHandler.logError('handleImageUpload', error, { type });
        throw error;
    }
}

/**
 * Load sample data file
 * @param {string} roomName - Name of the room
 * @returns {Promise<Array>} Array of sample items
 */
export async function loadSampleData(roomName) {
    try {
        // Try loading JSON first, fall back to CSV if JSON doesn't exist
        try {
            const response = await fetch(`${roomName}/sample_${roomName}.json`);
            if (response.ok) {
                const jsonData = await response.json();
                return jsonData.map(row => ({
                    ...row,
                    cost: parseFloat(row.cost) || 0,
                    id: Date.now() + Math.random()
                }));
            }
        } catch (error) {
            console.log('JSON sample not found, trying CSV...');
        }

        // Fall back to CSV
        const response = await fetch(`${roomName}/sample_${roomName}.csv`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        const jsonData = csvToJSON(csvText);

        // Save loaded sample as machine-made JSON
        await saveToJSON(jsonData, roomName, 'sample');

        return jsonData.map(row => ({
            ...row,
            cost: parseFloat(row.cost) || 0,
            id: Date.now() + Math.random()
        }));
    } catch (error) {
        errorHandler.logError('loadSampleData', error, { roomName });
        throw error;
    }
}

/**
 * Delete image file
 * @param {string} imagePath - Path to image file
 * @returns {Promise<boolean>} Success status
 */
export async function deleteImage(imagePath) {
    try {
        // Remove from localStorage
        localStorage.removeItem(imagePath);
        return true;
    } catch (error) {
        errorHandler.logError('deleteImage', error, { imagePath });
        return false;
    }
}

/**
 * Save chat history
 * @param {Array} messages - Array of chat messages
 * @param {string} roomName - Name of the room
 * @returns {Promise<boolean>} Success status
 */
export async function saveChatHistory(messages, roomName) {
    try {
        // Find existing chat files
        const prefix = `${roomName}/MACHINE_MADE_${roomName}_chat_`;
        const files = Object.keys(localStorage).filter(key => key.startsWith(prefix));
        
        // Load existing messages
        let existingMessages = [];
        if (files.length > 0) {
            const mostRecent = files.sort().pop();
            const data = localStorage.getItem(mostRecent);
            if (data) {
                existingMessages = JSON.parse(data);
            }
        }

        // Append new messages
        const allMessages = [...existingMessages, ...messages];
        
        // Save combined messages
        return saveToJSON(allMessages, roomName, 'chat');
    } catch (error) {
        errorHandler.logError('saveChatHistory', error, { roomName });
        return false;
    }
}

/**
 * Load chat history
 * @param {string} roomName - Name of the room
 * @returns {Promise<Array>} Array of chat messages
 */
export async function loadChatHistory(roomName) {
    try {
        // Find most recent chat history file
        const prefix = `${roomName}/MACHINE_MADE_${roomName}_chat_`;
        const files = Object.keys(localStorage).filter(key => key.startsWith(prefix));
        if (files.length === 0) return [];

        // Sort by date and get most recent
        const mostRecent = files.sort().pop();
        const data = localStorage.getItem(mostRecent);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        errorHandler.logError('loadChatHistory', error, { roomName });
        return [];
    }
}
