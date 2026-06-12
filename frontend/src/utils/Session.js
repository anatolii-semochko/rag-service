// Session class for managing chat session history
export class Session {
    constructor() {
        this.messages = [];
        this.loadFromStorage();
    }

    add(request, summary) {
        this.messages.push({ request, summary });
        this.saveToStorage();
    }

    get() {
        return this.messages;
    }

    clear() {
        this.messages = [];
        this.saveToStorage();
    }

    // Load session from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('chat_session');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.messages = parsed.messages || [];
            }
        } catch (error) {
            console.error('Error loading session from localStorage:', error);
            this.messages = [];
        }
    }

    // Save session to localStorage
    saveToStorage() {
        try {
            localStorage.setItem('chat_session', JSON.stringify({
                messages: this.messages
            }));
        } catch (error) {
            console.error('Error saving session to localStorage:', error);
        }
    }

    // Get session size/length
    size() {
        return this.messages.length;
    }

    // Check if session is empty
    isEmpty() {
        return this.messages.length === 0;
    }
}