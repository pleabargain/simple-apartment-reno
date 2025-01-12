// UI management functionality
import { errorHandler } from './errorHandling.js';
import { sanitizeInput, ROOM_ITEM_TYPES } from './validation.js';
import { 
    itemManager,
    kitchenManager,
    livingRoomManager,
    masterBathroomManager,
    guestBathroomManager,
    bedroomManager
} from './itemManagement.js';
import {
    ollamaIntegration,
    kitchenOllama,
    livingRoomOllama,
    masterBathroomOllama,
    guestBathroomOllama,
    bedroomOllama
} from './ollamaIntegration.js';
import { saveChatHistory, loadChatHistory } from './fileManagement.js';

class UIManager {
    constructor() {
        this.chatMessages = [];
        this.roomName = window.location.pathname.split('/')[1] || '';
        this.itemManager = this.getRoomManager();
        this.ollamaInstance = this.getRoomOllama();
        this.setupEventListeners();
        this.loadChatHistory();
    }

    /**
     * Get room-specific item manager
     * @returns {ItemManager} Room-specific item manager
     */
    getRoomManager() {
        switch (this.roomName) {
            case 'kitchen': return kitchenManager;
            case 'living-room': return livingRoomManager;
            case 'master-bathroom': return masterBathroomManager;
            case 'guest-bathroom': return guestBathroomManager;
            case 'bedroom': return bedroomManager;
            default: return itemManager;
        }
    }

    /**
     * Get room-specific Ollama instance
     * @returns {OllamaIntegration} Room-specific Ollama instance
     */
    getRoomOllama() {
        switch (this.roomName) {
            case 'kitchen': return kitchenOllama;
            case 'living-room': return livingRoomOllama;
            case 'master-bathroom': return masterBathroomOllama;
            case 'guest-bathroom': return guestBathroomOllama;
            case 'bedroom': return bedroomOllama;
            default: return ollamaIntegration;
        }
    }

    /**
     * Initialize UI elements and event listeners
     */
    setupEventListeners() {
        try {
            // Error console button
            const errorButton = document.getElementById('viewErrors');
            if (errorButton) {
                errorButton.onclick = () => errorHandler.showErrorConsole();
            }

            // Sample data loading
            const loadSampleBtn = document.getElementById('load-sample-btn');
            if (loadSampleBtn) {
                loadSampleBtn.addEventListener('click', () => this.handleSampleDataLoad());
            }

            // Save with date stamp
            const saveWithDateBtn = document.getElementById('save-date-btn');
            if (saveWithDateBtn) {
                saveWithDateBtn.addEventListener('click', () => this.handleDateStampSave());
            }

            // Chat input
            const chatInput = document.getElementById('user-message');
            const sendButton = document.getElementById('send-message-btn');
            if (chatInput && sendButton) {
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleChatMessage();
                });
                sendButton.addEventListener('click', () => this.handleChatMessage());
            }

            // General costs inputs
            const costInputs = ['designer', 'demolition', 'materials', 'labor'].map(type => 
                document.getElementById(`${type}-cost`)
            );
            costInputs.forEach(input => {
                if (input) {
                    input.addEventListener('change', () => this.updateCosts());
                }
            });

            // Add item form
            const addItemBtn = document.getElementById('add-item-btn');
            if (addItemBtn) {
                addItemBtn.addEventListener('click', () => this.handleAddItem());
            }

            // Item type selector
            const itemTypeSelect = document.getElementById('item-type');
            if (itemTypeSelect && this.roomName) {
                // Clear existing options
                itemTypeSelect.innerHTML = '';
                // Add room-specific options
                const types = ROOM_ITEM_TYPES[this.roomName] || [];
                types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                    itemTypeSelect.appendChild(option);
                });
            }
        } catch (error) {
            errorHandler.logError('setupEventListeners', error);
        }
    }

    /**
     * Load chat history
     */
    async loadChatHistory() {
        try {
            if (this.roomName) {
                this.chatMessages = await loadChatHistory(this.roomName);
                this.displayChatHistory();
            }
        } catch (error) {
            errorHandler.logError('loadChatHistory', error);
        }
    }

    /**
     * Display chat history
     */
    displayChatHistory() {
        try {
            const chatMessages = document.getElementById('chat-messages');
            if (!chatMessages) return;

            chatMessages.innerHTML = '';
            this.chatMessages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message';
                messageDiv.innerHTML = `
                    <p><strong>${sanitizeInput(msg.sender)}:</strong> ${sanitizeInput(msg.content)}</p>
                `;
                chatMessages.appendChild(messageDiv);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (error) {
            errorHandler.logError('displayChatHistory', error);
        }
    }

    /**
     * Handle chat message submission
     */
    async handleChatMessage() {
        try {
            const input = document.getElementById('user-message');
            const message = input.value.trim();
            
            if (!message) return;

            // Add user message to chat
            this.addChatMessage('You', message);
            input.value = '';

            // Get current context
            const currentContext = {
                items: this.itemManager.getAllItems(),
                generalCosts: this.itemManager.generalCosts,
                totals: this.itemManager.calculateTotals(),
                roomName: this.roomName,
                timestamp: new Date().toISOString()
            };

            // Send to Ollama
            const response = await this.ollamaInstance.sendMessage(message, currentContext);
            
            if (response.success) {
                this.addChatMessage('Assistant', response.response);
            } else {
                this.addChatMessage('System', 'Error processing your request. Please try again.');
            }

            // Save chat history
            if (this.roomName) {
                await saveChatHistory(this.chatMessages, this.roomName);
            }

        } catch (error) {
            errorHandler.logError('handleChatMessage', error, { message });
            this.addChatMessage('System', 'An error occurred while processing your message.');
        }
    }

    /**
     * Add message to chat display
     * @param {string} sender - Message sender
     * @param {string} content - Message content
     */
    addChatMessage(sender, content) {
        try {
            const chatMessages = document.getElementById('chat-messages');
            if (!chatMessages) return;

            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message';
            messageDiv.innerHTML = `
                <p><strong>${sanitizeInput(sender)}:</strong> ${sanitizeInput(content)}</p>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Store in history
            this.chatMessages.push({
                sender,
                content,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            errorHandler.logError('addChatMessage', error, { sender, content });
        }
    }

    /**
     * Handle adding new item
     */
    async handleAddItem() {
        try {
            const formData = {
                type: document.getElementById('item-type').value,
                name: document.getElementById('item-name').value,
                description: document.getElementById('item-description').value,
                cost: parseFloat(document.getElementById('item-cost').value),
                url: document.getElementById('item-url').value,
                note: document.getElementById('item-note').value,
                imageFile: document.getElementById('item-image').files[0]
            };

            const result = await this.itemManager.addItem(formData);
            
            if (result.success) {
                this.displayItems();
                this.updateGallery();
                this.clearAddItemForm();
                this.updateCosts();
            } else {
                alert(`Failed to add item: ${result.errors.join(', ')}`);
            }
        } catch (error) {
            errorHandler.logError('handleAddItem', error);
            alert('Error adding item. Check console for details.');
        }
    }

    /**
     * Display items in UI
     */
    displayItems() {
        try {
            const container = document.getElementById('items-list');
            if (!container) return;

            container.innerHTML = '';

            // Group items by type
            const groupedItems = {};
            this.itemManager.getAllItems().forEach(item => {
                if (!groupedItems[item.type]) {
                    groupedItems[item.type] = [];
                }
                groupedItems[item.type].push(item);
            });

            // Display grouped items
            for (const [type, items] of Object.entries(groupedItems)) {
                const typeSection = document.createElement('div');
                typeSection.className = 'item-type-section';
                typeSection.innerHTML = `<h3>${type.charAt(0).toUpperCase() + type.slice(1)}s</h3>`;
                
                items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'item-card';
                    itemDiv.innerHTML = `
                        <p>Name: ${sanitizeInput(item.name)}</p>
                        <p>Description: ${sanitizeInput(item.description)}</p>
                        <p>Cost: ${item.cost.toFixed(2)} AED</p>
                        <p>Note: ${sanitizeInput(item.note || '')}</p>
                        ${item.url ? `<p>URL: <a href="${sanitizeInput(item.url)}" target="_blank">${sanitizeInput(item.url)}</a></p>` : ''}
                        ${item.image_path ? `<img src="${sanitizeInput(item.image_path)}" alt="${sanitizeInput(item.name)}" style="max-width: 200px;">` : ''}
                        <div class="item-actions">
                            <button onclick="editItem(${item.id})">Edit</button>
                            <button onclick="deleteItem(${item.id})">Delete</button>
                        </div>
                        <hr>
                    `;
                    typeSection.appendChild(itemDiv);
                });
                
                container.appendChild(typeSection);
            }
        } catch (error) {
            errorHandler.logError('displayItems', error);
        }
    }

    /**
     * Update gallery display
     */
    updateGallery() {
        try {
            const container = document.getElementById('gallery-container');
            if (!container) return;

            container.innerHTML = '';

            this.itemManager.getAllItems()
                .filter(item => item.image_path)
                .forEach(item => {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'gallery-image';
                    imageDiv.innerHTML = `
                        <img src="${sanitizeInput(item.image_path)}" alt="${sanitizeInput(item.name)}" style="max-width: 200px;">
                        <p>${sanitizeInput(item.name)}</p>
                        <input type="text" value="${sanitizeInput(item.note || '')}" 
                               onchange="updateImageCaption(${item.id}, this.value)">
                        <button onclick="deleteImage(${item.id})">Delete Image</button>
                    `;
                    container.appendChild(imageDiv);
                });
        } catch (error) {
            errorHandler.logError('updateGallery', error);
        }
    }

    /**
     * Update cost displays
     */
    updateCosts() {
        try {
            const costs = {
                designer: parseFloat(document.getElementById('designer-cost')?.value || 0),
                demolition: parseFloat(document.getElementById('demolition-cost')?.value || 0),
                materials: parseFloat(document.getElementById('materials-cost')?.value || 0),
                labor: parseFloat(document.getElementById('labor-cost')?.value || 0)
            };

            this.itemManager.updateGeneralCosts(costs);
            const totals = this.itemManager.calculateTotals();

            // Update display
            document.getElementById('items-total').textContent = totals.itemsTotal.toFixed(2);
            document.getElementById('general-total').textContent = totals.generalTotal.toFixed(2);
            document.getElementById('grand-total').textContent = totals.grandTotal.toFixed(2);
        } catch (error) {
            errorHandler.logError('updateCosts', error);
        }
    }

    /**
     * Clear add item form
     */
    clearAddItemForm() {
        try {
            document.getElementById('item-name').value = '';
            document.getElementById('item-description').value = '';
            document.getElementById('item-cost').value = '';
            document.getElementById('item-url').value = '';
            document.getElementById('item-note').value = '';
            document.getElementById('item-image').value = '';
        } catch (error) {
            errorHandler.logError('clearAddItemForm', error);
        }
    }

    /**
     * Handle loading sample data
     */
    async handleSampleDataLoad() {
        try {
            const items = await this.itemManager.loadSampleData(this.roomName);
            this.displayItems();
            this.updateGallery();
            this.updateCosts();
            this.addChatMessage('System', `Successfully loaded ${items.length} sample items`);
        } catch (error) {
            errorHandler.logError('handleSampleDataLoad', error);
            this.addChatMessage('System', 'Error loading sample data. Check console for details.');
        }
    }

    /**
     * Handle saving with date stamp
     */
    async handleDateStampSave() {
        try {
            const success = await this.itemManager.saveItems();
            if (success) {
                this.addChatMessage('System', 'Successfully saved data with date stamp');
            } else {
                this.addChatMessage('System', 'Error saving data. Check console for details.');
            }
        } catch (error) {
            errorHandler.logError('handleDateStampSave', error);
            this.addChatMessage('System', 'Error saving data. Check console for details.');
        }
    }
}

// Create and export singleton instance
const uiManager = new UIManager();
export { uiManager };
