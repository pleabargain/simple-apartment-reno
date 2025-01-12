// Item management functionality
import { errorHandler } from './errorHandling.js';
import { validateItem, sanitizeInput } from './validation.js';
import { handleImageUpload, saveToJSON } from './fileManagement.js';

class ItemManager {
    constructor(roomName = '') {
        this.roomName = roomName;
        this.items = [];
        this.generalCosts = {
            designer: 0,
            demolition: 0,
            materials: 0,
            labor: 0
        };
        
        // Define which items can have multiple entries
        this.multipleEntryTypes = new Set([
            'countertop',
            'dishwasher',
            'sink',
            'faucet',
            'oven',
            'range',
            'refrigerator',
            'microwave'
        ]);
    }

    /**
     * Check if item type allows multiple entries
     * @param {string} type - Item type to check
     * @returns {boolean} Whether multiple entries are allowed
     */
    allowsMultipleEntries(type) {
        return this.multipleEntryTypes.has(type);
    }

    /**
     * Get count of items by type
     * @param {string} type - Item type to count
     * @returns {number} Number of items of that type
     */
    getItemCountByType(type) {
        return this.items.filter(item => item.type === type).length;
    }

    /**
     * Validate item count
     * @param {string} type - Item type to validate
     * @returns {boolean} Whether another item of this type can be added
     */
    canAddItemType(type) {
        return this.allowsMultipleEntries(type) || this.getItemCountByType(type) === 0;
    }

    /**
     * Add a new item
     * @param {Object} itemData - Raw item data
     * @returns {Promise<Object>} Result object with success status and any errors
     */
    async addItem(itemData) {
        try {
            // Check if we can add this type of item
            if (!this.canAddItemType(itemData.type)) {
                return {
                    success: false,
                    errors: [`Only one ${itemData.type} is allowed in this room`]
                };
            }

            // Sanitize inputs
            const sanitizedItem = {
                id: Date.now(),
                type: sanitizeInput(itemData.type),
                name: sanitizeInput(itemData.name),
                description: sanitizeInput(itemData.description),
                cost: parseFloat(itemData.cost) || 0,
                url: sanitizeInput(itemData.url),
                note: sanitizeInput(itemData.note),
                image_path: ''
            };

            // Validate item
            const validationErrors = validateItem(sanitizedItem);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    errors: validationErrors
                };
            }

            // Handle image if provided
            if (itemData.imageFile) {
                try {
                    sanitizedItem.image_path = await handleImageUpload(
                        itemData.imageFile,
                        this.roomName,
                        sanitizedItem.type
                    );
                } catch (error) {
                    errorHandler.logError('Image upload', error, { item: sanitizedItem });
                    return {
                        success: false,
                        errors: [`Image upload failed: ${error.message}`]
                    };
                }
            }

            // Add item to collection
            this.items.push(sanitizedItem);

            // Save to JSON
            await this.saveItems();

            return {
                success: true,
                item: sanitizedItem
            };
        } catch (error) {
            errorHandler.logError('addItem', error, { itemData });
            return {
                success: false,
                errors: ['Failed to add item']
            };
        }
    }

    /**
     * Update an existing item
     * @param {number} id - Item ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Result object with success status and any errors
     */
    async updateItem(id, updates) {
        try {
            const itemIndex = this.items.findIndex(item => item.id === id);
            if (itemIndex === -1) {
                return {
                    success: false,
                    errors: ['Item not found']
                };
            }

            // Create updated item
            const updatedItem = {
                ...this.items[itemIndex],
                ...Object.keys(updates).reduce((acc, key) => ({
                    ...acc,
                    [key]: sanitizeInput(updates[key])
                }), {}),
                cost: parseFloat(updates.cost) || this.items[itemIndex].cost
            };

            // Validate updated item
            const validationErrors = validateItem(updatedItem);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    errors: validationErrors
                };
            }

            // Handle new image if provided
            if (updates.imageFile) {
                try {
                    updatedItem.image_path = await handleImageUpload(
                        updates.imageFile,
                        this.roomName,
                        updatedItem.type
                    );
                } catch (error) {
                    errorHandler.logError('Image upload during update', error, { item: updatedItem });
                    return {
                        success: false,
                        errors: [`Image upload failed: ${error.message}`]
                    };
                }
            }

            // Update item
            this.items[itemIndex] = updatedItem;

            // Save changes
            await this.saveItems();

            return {
                success: true,
                item: updatedItem
            };
        } catch (error) {
            errorHandler.logError('updateItem', error, { id, updates });
            return {
                success: false,
                errors: ['Failed to update item']
            };
        }
    }

    /**
     * Delete an item
     * @param {number} id - Item ID
     * @returns {Promise<Object>} Result object with success status
     */
    async deleteItem(id) {
        try {
            const itemIndex = this.items.findIndex(item => item.id === id);
            if (itemIndex === -1) {
                return {
                    success: false,
                    errors: ['Item not found']
                };
            }

            // Remove item
            this.items.splice(itemIndex, 1);

            // Save changes
            await this.saveItems();

            return {
                success: true
            };
        } catch (error) {
            errorHandler.logError('deleteItem', error, { id });
            return {
                success: false,
                errors: ['Failed to delete item']
            };
        }
    }

    /**
     * Get items by type
     * @param {string} type - Item type to filter by
     * @returns {Array} Filtered items
     */
    getItemsByType(type) {
        try {
            return this.items.filter(item => item.type === type);
        } catch (error) {
            errorHandler.logError('getItemsByType', error, { type });
            return [];
        }
    }

    /**
     * Calculate total costs
     * @returns {Object} Breakdown of costs
     */
    calculateTotals() {
        try {
            const itemsTotal = this.items.reduce((sum, item) => sum + item.cost, 0);
            const generalTotal = Object.values(this.generalCosts).reduce((sum, cost) => sum + cost, 0);
            
            return {
                itemsTotal,
                generalTotal,
                grandTotal: itemsTotal + generalTotal
            };
        } catch (error) {
            errorHandler.logError('calculateTotals', error);
            return {
                itemsTotal: 0,
                generalTotal: 0,
                grandTotal: 0
            };
        }
    }

    /**
     * Update general costs
     * @param {Object} costs - Updated general costs
     * @returns {Object} Result object with success status
     */
    updateGeneralCosts(costs) {
        try {
            Object.keys(costs).forEach(key => {
                if (key in this.generalCosts) {
                    this.generalCosts[key] = parseFloat(costs[key]) || 0;
                }
            });

            return {
                success: true,
                costs: { ...this.generalCosts }
            };
        } catch (error) {
            errorHandler.logError('updateGeneralCosts', error, { costs });
            return {
                success: false,
                errors: ['Failed to update general costs']
            };
        }
    }

    /**
     * Save items to JSON
     * @returns {Promise<boolean>} Success status
     */
    async saveItems() {
        try {
            return await saveToJSON(this.items, this.roomName, 'items');
        } catch (error) {
            errorHandler.logError('saveItems', error);
            return false;
        }
    }

    /**
     * Set items data (used when loading from file)
     * @param {Array} items - Array of items to set
     */
    setItems(items) {
        this.items = items;
    }

    /**
     * Get all items
     * @returns {Array} All items
     */
    getAllItems() {
        return [...this.items];
    }
}

// Create and export instances for each room
const itemManager = new ItemManager(); // Global instance
const kitchenManager = new ItemManager('kitchen');
const livingRoomManager = new ItemManager('living-room');
const masterBathroomManager = new ItemManager('master-bathroom');
const guestBathroomManager = new ItemManager('guest-bathroom');
const bedroomManager = new ItemManager('bedroom');

export { 
    itemManager,
    kitchenManager,
    livingRoomManager,
    masterBathroomManager,
    guestBathroomManager,
    bedroomManager
};
