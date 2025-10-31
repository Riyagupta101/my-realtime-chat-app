// Chat Management

class ChatManager {
    constructor() {
        this.messages = [];
        this.currentContact = null;
        this.contacts = [];
        this.allUsers = [];
        this.searchResults = [];
        this.isTyping = false;
        this.messageIdCounter = 1;
        this.currentUser = null;
        this.showingSearchResults = false;
    }
    
    init(currentUser) {
        this.currentUser = currentUser;
        
        const currentUserAvatar = document.getElementById('current-user-avatar');
        const currentUserName = document.getElementById('current-user-name');
        
        if (currentUserAvatar) currentUserAvatar.textContent = currentUser.avatar || currentUser.name.charAt(0);
        if (currentUserName) currentUserName.textContent = currentUser.name;
        
        this.setupContactHandlers();
        this.setupSearchHandlers();
        this.setupMessageHandlers();
    }
    
    setupContactHandlers() {
        const contactsContainer = document.getElementById('contacts-container');
        if (contactsContainer) {
            contactsContainer.addEventListener('click', (e) => {
                const contactElement = e.target.closest('.contact');
                if (contactElement) {
                    const contactId = contactElement.getAttribute('data-contact-id');
                    let contact;
                    
                    if (this.showingSearchResults) {
                        contact = this.searchResults.find(c => c.id === contactId);
                        if (contact) {
                            // Start new conversation with searched user
                            this.startNewConversation(contact);
                        }
                    } else {
                        contact = this.contacts.find(c => c.id === contactId);
                        if (contact) {
                            this.switchContact(contact);
                        }
                    }
                }
            });
        }
    }
    
    setupSearchHandlers() {
        if (window.chatApp && window.chatApp.socket) {
            window.chatApp.socket.on('search_users_results', (results) => {
                this.showSearchResults(results);
            });
        }
    }

    setupMessageHandlers() {
        if (window.chatApp && window.chatApp.socket) {
            // Handle file message errors
            window.chatApp.socket.on('file_message_error', (data) => {
                console.error('❌ File message error:', data.error);
                notificationManager.showInAppNotification("File Error", "Failed to send file message");
            });
        }
    }
    
    // Show search results
    showSearchResults(results) {
        this.searchResults = results;
        this.showingSearchResults = true;
        
        const contactsContainer = document.getElementById('contacts-container');
        if (!contactsContainer) return;
        
        contactsContainer.innerHTML = '';
        
        if (results.length === 0) {
            contactsContainer.innerHTML = `
                <div class="no-contacts" style="text-align: center; padding: 20px; color: #64748b;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        results.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = `contact search-result`;
            contactElement.setAttribute('data-contact-id', contact.id);
            contactElement.innerHTML = `
                <div class="contact-avatar ${contact.online ? 'online' : ''}">${contact.avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name} <span style="color: #4361ee; font-size: 0.8em;">(Click to start chat)</span></div>
                    <div class="contact-preview">${contact.online ? 'Online' : 'Offline'}</div>
                </div>
                <div class="contact-time"></div>
            `;
            
            contactsContainer.appendChild(contactElement);
        });
    }
    
    // Start new conversation with searched user
    startNewConversation(contact) {
        // Check if contact already exists in contacts
        let existingContact = this.contacts.find(c => c.id === contact.id);
        
        if (!existingContact) {
            // Add to contacts
            existingContact = {
                ...contact,
                lastMessage: 'Start chatting...',
                lastTime: 'Now',
                muted: false
            };
            this.contacts.push(existingContact);
        }
        
        this.switchContact(existingContact);
        this.showingSearchResults = false;
        
        // Clear search input
        const searchInput = document.getElementById('search-contacts');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Show normal contacts
        this.renderContacts();
    }
    
    // Render contacts list (only users with conversations)
    renderContacts() {
        this.showingSearchResults = false;
        const contactsContainer = document.getElementById('contacts-container');
        if (!contactsContainer) return;
        
        contactsContainer.innerHTML = '';
        
        if (this.contacts.length === 0) {
            contactsContainer.innerHTML = `
                <div class="no-contacts" style="text-align: center; padding: 20px; color: #64748b;">
                    <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No conversations yet</p>
                    <p style="font-size: 0.9em;">Search for users to start chatting</p>
                </div>
            `;
            return;
        }
        
        this.contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = `contact ${contact.id === this.currentContact?.id ? 'active' : ''}`;
            contactElement.setAttribute('data-contact-id', contact.id);
            contactElement.innerHTML = `
                <div class="contact-avatar ${contact.online ? 'online' : ''}">${contact.avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name} ${contact.muted ? '<i class="fas fa-bell-slash" style="color: #6c757d; margin-left: 5px;"></i>' : ''}</div>
                    <div class="contact-preview">${contact.lastMessage || 'No messages yet'}</div>
                </div>
                <div class="contact-time">${contact.lastTime || ''}</div>
            `;
            
            contactsContainer.appendChild(contactElement);
        });
    }
    
    // Render messages with media support
    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        this.messages.forEach(message => {
            const isSent = message.senderId === this.currentUser.id;
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            messageElement.setAttribute('data-message-id', message.id);
            
            let messageContent = '';
            
            if (message.messageType === 'image') {
                messageContent = `
                    <div class="message-media">
                        <img src="${message.fileUrl}" alt="Shared image" class="media-image" onclick="chatManager.openMedia('${message.fileUrl}', 'image')">
                        <div class="media-caption">${message.text}</div>
                    </div>
                `;
            } else if (message.messageType === 'video') {
                messageContent = `
                    <div class="message-media">
                        <video controls class="media-video">
                            <source src="${message.fileUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div class="media-caption">${message.text}</div>
                    </div>
                `;
            } else if (message.messageType === 'file') {
                messageContent = `
                    <div class="message-file" onclick="chatManager.downloadFile('${message.fileUrl}', '${message.fileName}')">
                        <div class="file-icon">
                            <i class="fas fa-file-download"></i>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${message.fileName}</div>
                            <div class="file-size">${message.fileSize}</div>
                        </div>
                    </div>
                `;
            } else {
                messageContent = `<div class="message-text">${message.text}</div>`;
            }
            
            messageElement.innerHTML = `
                ${messageContent}
                <div class="message-actions">
                    <button class="delete-message-btn" title="Delete message">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="message-time">${formatTime(new Date(message.timestamp))}</div>
            `;
            
            if (isSent) {
                const deleteBtn = messageElement.querySelector('.delete-message-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteMessage(message.id);
                });
            } else {
                const deleteBtn = messageElement.querySelector('.delete-message-btn');
                deleteBtn.style.display = 'none';
            }
            
            messagesContainer.appendChild(messageElement);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Switch to a different contact
    switchContact(contact) {
        this.currentContact = contact;
        this.renderContacts();
        
        const activeContactName = document.getElementById('active-contact-name');
        const activeContactStatus = document.getElementById('active-contact-status');
        const activeContactAvatar = document.getElementById('active-contact-avatar');
        
        if (activeContactName) activeContactName.textContent = contact.name;
        if (activeContactAvatar) activeContactAvatar.textContent = contact.avatar;
        if (activeContactStatus) {
            activeContactStatus.innerHTML = `
                <span class="status-indicator"></span> ${contact.online ? 'Online • Last seen just now' : 'Offline • Last seen recently'}
            `;
        }
        
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
        
        const muteNotificationsBtn = document.getElementById('mute-notifications');
        if (muteNotificationsBtn) {
            muteNotificationsBtn.innerHTML = `
                <i class="fas fa-bell${contact.muted ? '' : '-slash'}"></i> 
                ${contact.muted ? 'Unmute' : 'Mute'} notifications
            `;
        }
        
        if (window.chatApp && window.chatApp.socket) {
            window.chatApp.socket.emit('get_conversation', { contactId: contact.id });
        }
    }
    
    // Send a message
    sendMessage(text) {
        if (!text.trim() || !this.currentContact) return;
        
        const message = {
            text: text.trim(),
            senderId: this.currentUser.id,
            receiverId: this.currentContact.id,
            timestamp: new Date().toISOString(),
            messageType: 'text'
        };
        
        if (window.chatApp && window.chatApp.socket) {
            window.chatApp.socket.emit('send_message', message);
        }
        
        const tempMessage = {
            ...message,
            id: `temp-${Date.now()}`,
            type: 'sent'
        };
        
        this.messages.push(tempMessage);
        this.renderMessages();
        
        this.currentContact.lastMessage = text;
        this.currentContact.lastTime = 'Just now';
        this.renderContacts();
        
        console.log('💬 Message sent locally:', text);
    }
    
    // Send file message
    sendFileMessage(fileData) {
        if (!this.currentContact) {
            notificationManager.showInAppNotification("Error", "Please select a contact first");
            return;
        }

        console.log('📤 Sending file message:', fileData);
        
        if (window.chatApp && window.chatApp.socket) {
            window.chatApp.socket.emit('send_file_message', {
                receiverId: this.currentContact.id,
                fileUrl: fileData.fileUrl,
                fileName: fileData.fileName,
                fileSize: fileData.fileSize,
                messageType: fileData.messageType
            });
        }
        
        const tempMessage = {
            id: `temp-${Date.now()}`,
            text: fileData.messageType === 'image' ? '📷 Photo' : 
                  fileData.messageType === 'video' ? '🎥 Video' : 
                  `📄 ${fileData.fileName}`,
            senderId: this.currentUser.id,
            receiverId: this.currentContact.id,
            timestamp: new Date().toISOString(),
            messageType: fileData.messageType,
            fileUrl: fileData.fileUrl,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            type: 'sent'
        };
        
        this.messages.push(tempMessage);
        this.renderMessages();
        
        this.currentContact.lastMessage = fileData.messageType === 'image' ? '📷 Photo' : 
                                        fileData.messageType === 'video' ? '🎥 Video' : 
                                        `📄 ${fileData.fileName}`;
        this.currentContact.lastTime = 'Just now';
        this.renderContacts();

        console.log('✅ File message sent locally');
    }
    
    // Receive a message - FIXED VERSION
    receiveMessage(message) {
        console.log('💬 Receiving message:', message);
        
        // Remove any temporary message with the same content
        this.messages = this.messages.filter(msg => 
            !msg.id.startsWith('temp-') || 
            msg.text !== message.text || 
            msg.messageType !== message.messageType ||
            msg.fileName !== message.fileName
        );
        
        // Add message to current conversation if it's from the current contact
        // OR if we're viewing the conversation with the sender
        if (this.currentContact && 
            (message.senderId === this.currentContact.id || message.receiverId === this.currentContact.id)) {
            this.messages.push({
                ...message,
                type: message.senderId === this.currentUser.id ? 'sent' : 'received'
            });
            this.renderMessages();
            console.log('✅ Message added to current conversation');
        }
        
        // Update contact's last message in contacts list
        const contactId = message.senderId === this.currentUser.id ? message.receiverId : message.senderId;
        const contact = this.contacts.find(c => c.id === contactId);
        
        if (contact) {
            contact.lastMessage = message.messageType === 'image' ? '📷 Photo' : 
                                 message.messageType === 'video' ? '🎥 Video' : 
                                 message.messageType === 'file' ? `📄 ${message.fileName}` : 
                                 message.text;
            contact.lastTime = 'Just now';
            this.renderContacts();
            console.log('✅ Contact last message updated');
        } else if (message.senderId !== this.currentUser.id) {
            // If this is a new contact, add them to contacts
            this.addNewContact(message.senderId);
        }
        
        // Show push notification
        if ((document.hidden || !isElementInViewport(document.getElementById('messages-container'))) && 
            notificationManager.notificationsEnabled && 
            message.senderId !== this.currentUser.id) {
            const senderName = this.contacts.find(c => c.id === message.senderId)?.name || 'Unknown';
            const messageText = message.messageType === 'image' ? 'sent a photo' : 
                               message.messageType === 'video' ? 'sent a video' : 
                               message.messageType === 'file' ? `sent a file: ${message.fileName}` : 
                               message.text;
            notificationManager.showPushNotification(senderName, messageText);
            console.log('✅ Notification shown');
        }
        
        console.log('💬 Message received and processed successfully');
    }
    
    // Add new contact when receiving message from unknown user
    async addNewContact(userId) {
        try {
            // In real app, you would fetch user details from server
            const newContact = {
                id: userId,
                name: 'Unknown User', // This would be fetched from server
                avatar: 'U',
                online: true,
                lastSeen: new Date(),
                lastMessage: 'New message',
                lastTime: 'Just now',
                muted: false
            };
            
            this.contacts.push(newContact);
            this.renderContacts();
            console.log('✅ New contact added:', userId);
        } catch (error) {
            console.error('❌ Error adding new contact:', error);
        }
    }
    
    // Delete message
    deleteMessage(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            this.messages = this.messages.filter(msg => msg.id !== messageId);
            this.renderMessages();
            
            if (window.chatApp && window.chatApp.socket && this.currentContact) {
                window.chatApp.socket.emit('delete_message', { 
                    messageId: messageId,
                    contactId: this.currentContact.id 
                });
            }
            
            notificationManager.showInAppNotification("Message Deleted", "Message has been deleted");
        }
    }
    
    // Handle message deletion from server
    handleMessageDeleted(messageId) {
        this.messages = this.messages.filter(msg => msg.id !== messageId);
        this.renderMessages();
    }
    
    // Open media in modal
    openMedia(url, type) {
        if (type === 'image') {
            const imageModal = document.getElementById('image-modal');
            const modalImage = document.getElementById('modal-image');
            
            if (modalImage) modalImage.src = url;
            if (imageModal) imageModal.style.display = 'flex';
        }
    }
    
    // Download file
    downloadFile(url, fileName) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Show typing indicator
    showTypingIndicator(userId) {
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
    
    // Update user status
    updateUserStatus(userId, online) {
        const contact = this.contacts.find(c => c.id === userId);
        if (contact) {
            contact.online = online;
            this.renderContacts();
            
            if (this.currentContact?.id === userId) {
                const activeContactStatus = document.getElementById('active-contact-status');
                if (activeContactStatus) {
                    activeContactStatus.innerHTML = `
                        <span class="status-indicator"></span> ${online ? 'Online • Last seen just now' : 'Offline • Last seen recently'}
                    `;
                }
                
                const panelContactStatus = document.getElementById('panel-contact-status');
                if (panelContactStatus) {
                    panelContactStatus.innerHTML = `
                        <span class="status-indicator"></span> ${online ? 'Online' : 'Offline'}
                    `;
                }
            }
        }
    }
    
    // Toggle mute for current contact
    toggleMuteContact() {
        if (!this.currentContact) return;
        
        this.currentContact.muted = !this.currentContact.muted;
        
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
    
    // Refresh contacts from server
    refreshContacts() {
        if (window.chatApp && window.chatApp.socket) {
            window.chatApp.socket.emit('get_contacts');
        }
    }
}

// Create global chat manager instance
const chatManager = new ChatManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}