// Chat Management

class ChatManager {
    constructor() {
        this.messages = [];
        this.currentContact = null;
        this.contacts = [];
        this.isTyping = false;
        this.messageIdCounter = 1;
        
        // Sample data
        this.contacts = [
            { id: 1, name: "Aisha Sharma", avatar: "AS", online: true, lastMessage: "Sure! I'll send you the documents shortly.", lastTime: "9:46 AM", muted: false },
            { id: 2, name: "Rohan Mehta", avatar: "RM", online: true, lastMessage: "The meeting is scheduled for tomorrow.", lastTime: "Yesterday", muted: false },
            { id: 3, name: "Priya Patel", avatar: "PP", online: false, lastMessage: "Thanks for your help with the project!", lastTime: "Monday", muted: false },
            { id: 4, name: "David Kim", avatar: "DK", online: true, lastMessage: "Let's catch up next week.", lastTime: "Sunday", muted: true },
            { id: 5, name: "Emily Chen", avatar: "EC", online: false, lastMessage: "The files have been uploaded.", lastTime: "Last week", muted: false }
        ];
        
        this.initialMessages = [
            { id: 1, sender: "Aisha Sharma", text: "Hi! Are we still on for the meeting today?", time: "9:45 AM", type: "received" },
            { id: 2, sender: "You", text: "Yes, the meeting is at 10 AM.", time: "9:46 AM", type: "sent" },
            { id: 3, sender: "Aisha Sharma", text: "Sure! I'll send you the documents shortly.", time: "9:46 AM", type: "received" }
        ];
        
        this.messages = [...this.initialMessages];
        this.messageIdCounter = this.messages.length + 1;
        this.currentContact = this.contacts[0];
    }
    
    // Render contacts list
    renderContacts() {
        const contactsContainer = document.getElementById('contacts-container');
        if (!contactsContainer) return;
        
        contactsContainer.innerHTML = '';
        
        this.contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = `contact ${contact.id === this.currentContact.id ? 'active' : ''}`;
            contactElement.innerHTML = `
                <div class="contact-avatar ${contact.online ? 'online' : ''}">${contact.avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name} ${contact.muted ? '<i class="fas fa-bell-slash" style="color: #6c757d; margin-left: 5px;"></i>' : ''}</div>
                    <div class="contact-preview">${contact.lastMessage}</div>
                </div>
                <div class="contact-time">${contact.lastTime}</div>
            `;
            
            contactElement.addEventListener('click', () => this.switchContact(contact));
            contactsContainer.appendChild(contactElement);
        });
    }
    
    // Render messages
    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.type}`;
            messageElement.innerHTML = `
                <div class="message-text">${message.text}</div>
                <div class="message-time">${message.time}</div>
            `;
            messagesContainer.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Switch to a different contact
    switchContact(contact) {
        this.currentContact = contact;
        this.renderContacts();
        
        // Update chat header
        const activeContactName = document.getElementById('active-contact-name');
        const activeContactStatus = document.getElementById('active-contact-status');
        
        if (activeContactName) activeContactName.textContent = contact.name;
        if (activeContactStatus) {
            activeContactStatus.innerHTML = `
                <span class="status-indicator"></span> ${contact.online ? 'Online' : 'Offline'} • Last seen just now
            `;
        }
        
        // Update right panel
        const panelContactName = document.getElementById('panel-contact-name');
        const panelContactStatus = document.getElementById('panel-contact-status');
        const panelContactAvatar = document.getElementById('panel-contact-avatar');
        
        if (panelContactName) panelContactName.textContent = contact.name;
        if (panelContactStatus) {
            panelContactStatus.innerHTML = `
                <span class="status-indicator"></span> ${contact.online ? 'Online' : 'Offline'}
            `;
        }
        if (panelContactAvatar) panelContactAvatar.textContent = contact.avatar;
        
        // Update mute notifications button
        const muteNotificationsBtn = document.getElementById('mute-notifications');
        if (muteNotificationsBtn) {
            muteNotificationsBtn.innerHTML = `
                <i class="fas fa-bell${contact.muted ? '' : '-slash'}"></i> 
                ${contact.muted ? 'Unmute' : 'Mute'} notifications
            `;
        }
        
        // In a real app, we would load the conversation history for this contact
        this.messages = this.initialMessages.filter(msg => 
            msg.sender === contact.name || msg.sender === 'You' || 
            (msg.type === 'received' && msg.sender === contact.name)
        );
        this.renderMessages();
    }
    
    // Send a message
    sendMessage(text) {
        if (!text.trim()) return;
        
        const newMessage = {
            id: this.messageIdCounter++,
            sender: 'You',
            text: text.trim(),
            time: getCurrentTime(),
            type: 'sent'
        };
        
        this.messages.push(newMessage);
        this.renderMessages();
        
        // Update contact's last message
        this.currentContact.lastMessage = text;
        this.currentContact.lastTime = 'Just now';
        this.renderContacts();
        
        // Simulate typing indicator and response after a delay
        this.showTypingIndicator();
        setTimeout(() => {
            this.hideTypingIndicator();
            this.receiveMessage(getRandomResponse());
        }, 2000);
    }
    
    // Receive a message
    receiveMessage(text) {
        const newMessage = {
            id: this.messageIdCounter++,
            sender: this.currentContact.name,
            text: text,
            time: getCurrentTime(),
            type: 'received'
        };
        
        this.messages.push(newMessage);
        this.renderMessages();
        
        // Update contact's last message
        this.currentContact.lastMessage = text;
        this.currentContact.lastTime = 'Just now';
        this.renderContacts();
        
        // Show push notification if the window is not focused and notifications are enabled
        if ((document.hidden || !isElementInViewport(document.getElementById('messages-container'))) && 
            notificationManager.notificationsEnabled && !this.currentContact.muted) {
            notificationManager.showPushNotification(this.currentContact.name, text);
        }
    }
    
    // Show typing indicator
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        typingElement.id = 'typing-indicator';
        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Hide typing indicator
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Toggle mute for current contact
    toggleMuteContact() {
        this.currentContact.muted = !this.currentContact.muted;
        
        // Update UI
        const muteNotificationsBtn = document.getElementById('mute-notifications');
        if (muteNotificationsBtn) {
            muteNotificationsBtn.innerHTML = `
                <i class="fas fa-bell${this.currentContact.muted ? '' : '-slash'}"></i> 
                ${this.currentContact.muted ? 'Unmute' : 'Mute'} notifications
            `;
        }
        
        this.renderContacts();
        
        notificationManager.showInAppNotification(
            "Notifications", 
            `Notifications ${this.currentContact.muted ? 'muted' : 'unmuted'} for ${this.currentContact.name}`
        );
    }
}

// Create global chat manager instance
const chatManager = new ChatManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}