// Ollama API integration functionality
import { errorHandler } from './errorHandling.js';
import { saveChatHistory, loadChatHistory } from './fileManagement.js';

class OllamaIntegration {
    constructor(roomName = '') {
        this.API_URL = 'http://localhost:11434/api/generate';
        this.MODEL = 'llama3.2';
        this.messages = [];
        this.roomName = roomName;
    }

    /**
     * Load room data for context
     * @returns {Promise<Object>} Room data
     */
    async loadRoomData() {
        try {
            // Find most recent items file
            const prefix = `${this.roomName}/MACHINE_MADE_${this.roomName}_items_`;
            const files = Object.keys(localStorage).filter(key => key.startsWith(prefix));
            if (files.length === 0) return {};

            // Sort by date and get most recent
            const mostRecent = files.sort().pop();
            const data = localStorage.getItem(mostRecent);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            errorHandler.logError('loadRoomData', error, { roomName: this.roomName });
            return {};
        }
    }

    /**
     * Send message to Ollama API
     * @param {string} message - User message
     * @param {Object} additionalContext - Additional context beyond room data
     * @returns {Promise<Object>} API response
     */
    async sendMessage(message, additionalContext = {}) {
        try {
            // Validate inputs
            if (!message?.trim()) {
                throw new Error('Message is required');
            }

            // Load room data and combine with additional context
            const roomData = await this.loadRoomData();
            const context = {
                roomName: this.roomName,
                roomData,
                ...additionalContext
            };
            
            // Format context for prompt
            const contextStr = JSON.stringify(context, null, 2);
            
            // Construct prompt with context
            const prompt = `You are a renovation expert assistant specializing in ${this.roomName} renovations. Here is the current renovation data:

${contextStr}

User question: ${message}

Provide a helpful response about the ${this.roomName} renovation based on this data. Consider:
- Current items and their costs
- General costs (designer, demolition, materials, labor)
- Specific recommendations for ${this.roomName} improvements
- Cost analysis and budget considerations for ${this.roomName} renovation`;

            // Make API request
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.MODEL,
                    prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Store and save message history
            const newMessages = [
                {
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                },
                {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString()
                }
            ];
            
            this.messages.push(...newMessages);
            await this.saveChatHistory();

            return {
                success: true,
                response: data.response
            };

        } catch (error) {
            errorHandler.logError('sendMessage', error, { 
                message, 
                roomName: this.roomName,
                additionalContext 
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save chat history to file
     * @returns {Promise<void>}
     */
    async saveChatHistory() {
        if (this.roomName) {
            await saveChatHistory(this.messages, this.roomName);
        }
    }

    /**
     * Load chat history from file
     * @returns {Promise<void>}
     */
    async loadChatHistory() {
        if (this.roomName) {
            this.messages = await loadChatHistory(this.roomName);
        }
    }

    /**
     * Get chat message history
     * @returns {Array} Array of message objects
     */
    getMessageHistory() {
        return [...this.messages];
    }

    /**
     * Clear chat message history
     * @returns {Promise<void>}
     */
    async clearMessageHistory() {
        this.messages = [];
        if (this.roomName) {
            await this.saveChatHistory();
        }
    }

    /**
     * Check if Ollama server is available
     * @returns {Promise<boolean>} Server availability status
     */
    async checkServerAvailability() {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.MODEL,
                    prompt: 'test',
                    stream: false
                })
            });

            return response.ok;
        } catch (error) {
            errorHandler.logError('checkServerAvailability', error);
            return false;
        }
    }

    /**
     * Get cost analysis from Ollama
     * @param {Object} context - Current renovation context
     * @returns {Promise<Object>} Analysis results
     */
    async getCostAnalysis(context) {
        try {
            const prompt = `As a renovation expert, analyze the following renovation costs and provide insights:

${JSON.stringify(context, null, 2)}

Please provide:
1. Total cost breakdown
2. Cost-saving opportunities
3. Budget recommendations
4. Areas that might be over or under budgeted
5. Industry standard comparisons where possible`;

            const response = await this.sendMessage(prompt, context);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            return {
                success: true,
                analysis: response.response
            };

        } catch (error) {
            errorHandler.logError('getCostAnalysis', error, { context });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get recommendations for specific room type
     * @param {string} roomType - Type of room
     * @param {Object} context - Current renovation context
     * @returns {Promise<Object>} Recommendations
     */
    async getRoomRecommendations(roomType, context) {
        try {
            const prompt = `As a renovation expert, provide specific recommendations for ${roomType} renovation based on:

${JSON.stringify(context, null, 2)}

Please include:
1. Suggested improvements
2. Potential cost optimizations
3. Design considerations
4. Common pitfalls to avoid
5. Material recommendations`;

            const response = await this.sendMessage(prompt, context);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            return {
                success: true,
                recommendations: response.response
            };

        } catch (error) {
            errorHandler.logError('getRoomRecommendations', error, { roomType, context });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get material recommendations
     * @param {string} itemType - Type of item
     * @param {Object} context - Current renovation context
     * @returns {Promise<Object>} Material recommendations
     */
    async getMaterialRecommendations(itemType, context) {
        try {
            const prompt = `As a renovation expert, recommend materials for ${itemType} based on:

${JSON.stringify(context, null, 2)}

Please provide:
1. Recommended materials
2. Pros and cons of each option
3. Cost considerations
4. Durability factors
5. Maintenance requirements`;

            const response = await this.sendMessage(prompt, context);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            return {
                success: true,
                recommendations: response.response
            };

        } catch (error) {
            errorHandler.logError('getMaterialRecommendations', error, { itemType, context });
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create and export instances for each room
const ollamaIntegration = new OllamaIntegration(); // Global instance
const kitchenOllama = new OllamaIntegration('kitchen');
const livingRoomOllama = new OllamaIntegration('living-room');
const masterBathroomOllama = new OllamaIntegration('master-bathroom');
const guestBathroomOllama = new OllamaIntegration('guest-bathroom');
const bedroomOllama = new OllamaIntegration('bedroom');

export { 
    ollamaIntegration,
    kitchenOllama,
    livingRoomOllama,
    masterBathroomOllama,
    guestBathroomOllama,
    bedroomOllama
};
