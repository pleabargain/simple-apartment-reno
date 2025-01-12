// Main application entry point
import { errorHandler } from './errorHandling.js';
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
import { uiManager } from './uiManager.js';
import { loadChatHistory } from './fileManagement.js';

class RenovationApp {
    constructor() {
        this.initialized = false;
        this.roomName = window.location.pathname.split('/')[1] || '';
        this.itemManager = this.getRoomManager();
        this.ollamaInstance = this.getRoomOllama();
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
     * Initialize the application
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            if (this.initialized) return;

            // Check Ollama server availability
            const ollamaAvailable = await this.ollamaInstance.checkServerAvailability();
            if (!ollamaAvailable) {
                console.warn('Ollama server not available. Chat features will be disabled.');
                this.disableChatFeatures();
            } else {
                // Load chat history if Ollama is available
                await this.loadChatHistory();
            }

            // Load any existing data
            await this.loadExistingData();

            // Initialize UI
            this.initializeUI();

            this.initialized = true;
            console.log(`Renovation app initialized successfully for ${this.roomName || 'home'} page`);

        } catch (error) {
            errorHandler.logError('initialization', error);
            console.error('Failed to initialize renovation app:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Load existing data from JSON if available
     * @returns {Promise<void>}
     */
    async loadExistingData() {
        try {
            if (!this.roomName) return;

            // Try to load most recent machine-made JSON
            const prefix = `${this.roomName}/MACHINE_MADE_${this.roomName}_items_`;
            const files = Object.keys(localStorage).filter(key => key.startsWith(prefix));
            
            if (files.length > 0) {
                // Sort by date and get most recent
                const mostRecent = files.sort().pop();
                const data = localStorage.getItem(mostRecent);
                if (data) {
                    const items = JSON.parse(data);
                    this.itemManager.setItems(items);
                    console.log(`Loaded ${items.length} items from ${mostRecent}`);
                    return;
                }
            }

            // Fall back to sample data if no machine-made data exists
            const response = await fetch(`${this.roomName}/sample_${this.roomName}.json`);
            if (response.ok) {
                const jsonData = await response.json();
                const items = jsonData.map(item => ({
                    ...item,
                    cost: parseFloat(item.cost) || 0,
                    id: Date.now() + Math.random()
                }));
                this.itemManager.setItems(items);
                console.log(`Loaded ${items.length} items from sample data`);
            }
        } catch (error) {
            console.warn('No existing data found, starting fresh');
        }
    }

    /**
     * Load chat history
     * @returns {Promise<void>}
     */
    async loadChatHistory() {
        try {
            if (!this.roomName) return;

            const messages = await loadChatHistory(this.roomName);
            if (messages.length > 0) {
                console.log(`Loaded ${messages.length} chat messages`);
            }
        } catch (error) {
            console.warn('No chat history found');
        }
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        try {
            // Display any existing items
            uiManager.displayItems();
            
            // Update gallery if there are images
            uiManager.updateGallery();
            
            // Initialize costs display
            uiManager.updateCosts();

            // Add welcome message to chat
            if (this.roomName) {
                uiManager.addChatMessage('System', 
                    `Welcome to the ${this.roomName.replace('-', ' ')} renovation assistant! ` +
                    'Ask me anything about your renovation project.'
                );
            }

        } catch (error) {
            errorHandler.logError('UI initialization', error);
            console.error('Failed to initialize UI:', error);
        }
    }

    /**
     * Disable chat features if Ollama is not available
     */
    disableChatFeatures() {
        try {
            const chatInterface = document.getElementById('chat-interface');
            if (chatInterface) {
                chatInterface.innerHTML = `
                    <div class="error-message" style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 4px;">
                        <p><strong>Chat features are currently unavailable</strong></p>
                        <p>Please ensure the Ollama server is running locally on port 11434.</p>
                    </div>
                `;
            }
        } catch (error) {
            errorHandler.logError('disableChatFeatures', error);
        }
    }

    /**
     * Handle initialization errors
     * @param {Error} error - The error that occurred
     */
    handleInitializationError(error) {
        try {
            // Display error message to user
            const mainContent = document.querySelector('main') || document.body;
            const errorDiv = document.createElement('div');
            errorDiv.className = 'initialization-error';
            errorDiv.innerHTML = `
                <div style="color: #dc3545; padding: 20px; background: #f8d7da; border-radius: 4px; margin: 20px;">
                    <h2>Initialization Error</h2>
                    <p>There was a problem initializing the application. Please try:</p>
                    <ul>
                        <li>Refreshing the page</li>
                        <li>Checking your internet connection</li>
                        <li>Ensuring all required files are present</li>
                        <li>Checking if the Ollama server is running</li>
                    </ul>
                    <p>If the problem persists, check the browser console for more details.</p>
                </div>
            `;
            mainContent.insertBefore(errorDiv, mainContent.firstChild);
        } catch (e) {
            console.error('Failed to display initialization error:', e);
        }
    }
}

// Create and initialize app
const app = new RenovationApp();
app.initialize().catch(console.error);

// Export for potential external use
export { app as renovationApp };
