// Input validation and sanitization functionality

/**
 * Room-specific item types
 */
const ROOM_ITEM_TYPES = {
    'kitchen': ['countertop', 'dishwasher', 'sink', 'faucet', 'oven', 'range', 'refrigerator', 'microwave'],
    'living-room': ['painting', 'lighting', 'ceiling-fan', 'window-treatments', 'flooring', 'furniture'],
    'master-bathroom': ['lighting', 'vanity', 'storage'],
    'guest-bathroom': ['lighting', 'vanity', 'storage'],
    'bedroom': ['painting', 'lighting', 'curtains']
};

/**
 * Multiple entry item types (kitchen only)
 */
const MULTIPLE_ENTRY_TYPES = new Set([
    'countertop',
    'dishwasher',
    'sink',
    'faucet',
    'oven',
    'range',
    'refrigerator',
    'microwave'
]);

/**
 * Validate an item's data
 * @param {Object} item - The item to validate
 * @param {string} roomName - Name of the room
 * @returns {Array} Array of validation error messages
 */
export function validateItem(item, roomName = '') {
    try {
        const errors = [];
        
        // Required fields
        if (!item.type) errors.push('Item type is required');
        if (!item.name) errors.push('Item name is required');
        
        // Room-specific type validation
        if (roomName && item.type) {
            const allowedTypes = ROOM_ITEM_TYPES[roomName] || [];
            if (!allowedTypes.includes(item.type)) {
                errors.push(`Invalid item type for ${roomName}. Allowed types: ${allowedTypes.join(', ')}`);
            }
        }
        
        // Cost validation
        if (typeof item.cost !== 'number' || isNaN(item.cost)) {
            errors.push('Cost must be a valid number');
        } else if (item.cost < 0) {
            errors.push('Cost cannot be negative');
        }

        // URL validation
        if (item.url && !isValidUrl(item.url)) {
            errors.push('Invalid URL format');
        }

        // Image path validation
        if (item.image_path && typeof item.image_path !== 'string') {
            errors.push('Image path must be a string');
        }

        // Description length
        if (item.description && item.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        // Note length
        if (item.note && item.note.length > 1000) {
            errors.push('Note cannot exceed 1000 characters');
        }

        return errors;
    } catch (error) {
        console.error('Error in validateItem:', error);
        return ['Validation system error occurred'];
    }
}

/**
 * Validate a URL string
 * @param {string} string - The URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Sanitize input to prevent XSS
 * @param {any} input - The input to sanitize
 * @returns {any} Sanitized input
 */
export function sanitizeInput(input) {
    try {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/&/g, '&amp;') // Encode special characters
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    } catch (error) {
        console.error('Error in sanitizeInput:', error);
        return '';
    }
}

/**
 * Validate general costs input
 * @param {Object} costs - The costs object to validate
 * @returns {Array} Array of validation error messages
 */
export function validateGeneralCosts(costs) {
    try {
        const errors = [];
        const costTypes = ['designer', 'demolition', 'materials', 'labor'];

        costTypes.forEach(type => {
            const cost = costs[type];
            if (cost === undefined || cost === null) {
                errors.push(`${type} cost is required`);
            } else if (typeof cost !== 'number' || isNaN(cost)) {
                errors.push(`${type} cost must be a valid number`);
            } else if (cost < 0) {
                errors.push(`${type} cost cannot be negative`);
            }
        });

        return errors;
    } catch (error) {
        console.error('Error in validateGeneralCosts:', error);
        return ['Cost validation system error occurred'];
    }
}

/**
 * Validate file type and size
 * @param {File} file - The file to validate
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Array} Array of validation error messages
 */
export function validateFile(file, allowedTypes, maxSize) {
    try {
        const errors = [];
        
        if (!file) {
            errors.push('No file provided');
            return errors;
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check file size
        if (file.size > maxSize) {
            errors.push(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
        }

        return errors;
    } catch (error) {
        console.error('Error in validateFile:', error);
        return ['File validation system error occurred'];
    }
}

/**
 * Validate machine-made JSON filename format
 * @param {string} filename - The filename to validate
 * @returns {boolean} Whether the filename is valid
 */
export function validateMachineJsonFilename(filename) {
    const pattern = /^MACHINE_MADE_([a-z-]+)_(items|chat|sample)_\d{4}-\d{2}-\d{2}\.json$/;
    return pattern.test(filename);
}

/**
 * Validate JSON data structure
 * @param {string} jsonText - The JSON content to validate
 * @param {Array} requiredFields - Array of required fields
 * @param {string} roomName - Name of the room for type validation
 * @returns {Object} Validation result with errors and parsed data if valid
 */
export function validateJSON(jsonText, requiredFields, roomName = '') {
    try {
        const result = {
            isValid: false,
            errors: [],
            data: null
        };

        if (!jsonText.trim()) {
            result.errors.push('JSON file is empty');
            return result;
        }

        let jsonData;
        try {
            jsonData = JSON.parse(jsonText);
        } catch (error) {
            result.errors.push('Invalid JSON format');
            return result;
        }

        if (!Array.isArray(jsonData)) {
            result.errors.push('JSON must contain an array of items');
            return result;
        }

        if (jsonData.length === 0) {
            result.errors.push('JSON file must contain at least one item');
            return result;
        }

        // Validate each item in the array
        const data = [];
        const itemCounts = new Map();
        
        jsonData.forEach((item, index) => {
            // Check required fields
            const missingFields = requiredFields.filter(field => !(field in item));
            if (missingFields.length > 0) {
                result.errors.push(`Item ${index + 1} is missing required fields: ${missingFields.join(', ')}`);
                return;
            }

            // Validate room-specific item types
            if (roomName && ROOM_ITEM_TYPES[roomName]) {
                if (!ROOM_ITEM_TYPES[roomName].includes(item.type)) {
                    result.errors.push(`Item ${index + 1} has invalid type for ${roomName}`);
                    return;
                }
            }

            // Track item counts for non-multiple entry types
            if (!MULTIPLE_ENTRY_TYPES.has(item.type)) {
                const count = itemCounts.get(item.type) || 0;
                if (count > 0) {
                    result.errors.push(`Multiple entries for ${item.type} are not allowed`);
                    return;
                }
                itemCounts.set(item.type, count + 1);
            }

            data.push(item);
        });

        if (result.errors.length === 0) {
            result.isValid = true;
            result.data = data;
        }

        return result;
    } catch (error) {
        console.error('Error in validateJSON:', error);
        return {
            isValid: false,
            errors: ['JSON validation system error occurred'],
            data: null
        };
    }
}

/**
 * Validate CSV data structure (kept for backward compatibility)
 * @deprecated Use validateJSON instead
 * @param {string} csvText - The CSV content to validate
 * @param {Array} requiredHeaders - Array of required column headers
 * @param {string} roomName - Name of the room for type validation
 * @returns {Object} Validation result with errors and parsed data if valid
 */
export function validateCSV(csvText, requiredHeaders, roomName = '') {
    try {
        const result = {
            isValid: false,
            errors: [],
            data: null
        };

        if (!csvText.trim()) {
            result.errors.push('CSV file is empty');
            return result;
        }

        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            result.errors.push('CSV file must contain headers and at least one data row');
            return result;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate required headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
            return result;
        }

        // Validate data rows
        const data = [];
        const itemCounts = new Map();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            
            if (values.length !== headers.length) {
                result.errors.push(`Line ${i + 1} has ${values.length} values, expected ${headers.length}`);
                continue;
            }

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            // Validate room-specific item types
            if (roomName && ROOM_ITEM_TYPES[roomName]) {
                if (!ROOM_ITEM_TYPES[roomName].includes(row.type)) {
                    result.errors.push(`Line ${i + 1} has invalid type for ${roomName}`);
                    continue;
                }
            }

            // Track item counts for non-multiple entry types
            if (!MULTIPLE_ENTRY_TYPES.has(row.type)) {
                const count = itemCounts.get(row.type) || 0;
                if (count > 0) {
                    result.errors.push(`Multiple entries for ${row.type} are not allowed`);
                    continue;
                }
                itemCounts.set(row.type, count + 1);
            }

            data.push(row);
        }

        if (result.errors.length === 0) {
            result.isValid = true;
            result.data = data;
        }

        return result;
    } catch (error) {
        console.error('Error in validateCSV:', error);
        return {
            isValid: false,
            errors: ['CSV validation system error occurred'],
            data: null
        };
    }
}

export { ROOM_ITEM_TYPES, MULTIPLE_ENTRY_TYPES };
