// Main Application

class ChatApp {
    constructor() {
        this.darkMode = false;
        this.emojiPickerVisible = false;
        this.init();
    }
    
    init() {
        // Initialize managers
        chatManager.renderContacts();
        chatManager.renderMessages();
        this.renderMediaItems();
        this.renderEmojis();
        this.setupEventListeners();
        
        // Simulate receiving a message after a delay
        setTimeout(() => {
            chatManager.receiveMessage("By the way, don't forget to bring the quarterly reports.");
        }, 3000);
    }
    
    // Render media items
    renderMediaItems() {
        const mediaItems = [
            { type: "image", icon: "fas fa-image", url: "https://picsum.photos/200/300" },
            { type: "file", icon: "fas fa-file", url: "#" },
            { type: "video", icon: "fas fa-video", url: "#" },
            { type: "audio", icon: "fas fa-music", url: "#" },
            { type: "link", icon: "fas fa-link", url: "#" },
            { type: "pdf", icon: "fas fa-file-pdf", url: "#" }
        ];
        
        const mediaGrid = document.getElementById('media-grid');
        if (!mediaGrid) return;
        
        mediaGrid.innerHTML = '';
        
        mediaItems.forEach(item => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            mediaItem.innerHTML = `<i class="${item.icon}"></i>`;
            
            if (item.type === 'image') {
                mediaItem.addEventListener('click', () => this.openImageModal(item.url));
            }
            
            mediaGrid.appendChild(mediaItem);
        });
    }
    
    // Render emojis in the picker
    renderEmojis() {
        const emojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];
        
        const emojiPicker = document.getElementById('emoji-picker');
        if (!emojiPicker) return;
        
        emojiPicker.innerHTML = '';
        
        emojis.forEach(emoji => {
            const emojiElement = document.createElement('span');
            emojiElement.className = 'emoji';
            emojiElement.textContent = emoji;
            emojiElement.addEventListener('click', () => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.value += emoji;
                    messageInput.focus();
                }
            });
            emojiPicker.appendChild(emojiElement);
        });
    }
    
    // Open image modal
    openImageModal(imageUrl) {
        const imageModal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        
        if (modalImage) modalImage.src = imageUrl;
        if (imageModal) imageModal.style.display = 'flex';
    }
    
    // Close image modal
    closeImageModal() {
        const imageModal = document.getElementById('image-modal');
        if (imageModal) imageModal.style.display = 'none';
    }
    
    // Toggle dark mode
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        document.body.classList.toggle('dark-mode', this.darkMode);
        
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = this.darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    }
    
    // Toggle emoji picker
    toggleEmojiPicker(e) {
        if (e) e.stopPropagation();
        
        this.emojiPickerVisible = !this.emojiPickerVisible;
        const emojiPicker = document.getElementById('emoji-picker');
        if (emojiPicker) {
            emojiPicker.classList.toggle('active', this.emojiPickerVisible);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Send message
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (messageInput) {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        
        // Toggle right panel on mobile
        const toggleRightPanelBtn = document.getElementById('toggle-right-panel');
        const rightPanel = document.getElementById('right-panel');
        const overlay = document.getElementById('overlay');
        
        if (toggleRightPanelBtn && rightPanel && overlay) {
            toggleRightPanelBtn.addEventListener('click', () => {
                rightPanel.classList.toggle('active');
                overlay.classList.toggle('active');
            });
            
            overlay.addEventListener('click', () => {
                rightPanel.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
        
        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        }
        
        // Emoji picker toggle
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', (e) => this.toggleEmojiPicker(e));
        }
        
        // Close emoji picker when clicking outside
        document.addEventListener('click', () => {
            this.emojiPickerVisible = false;
            const emojiPicker = document.getElementById('emoji-picker');
            if (emojiPicker) {
                emojiPicker.classList.remove('active');
            }
        });
        
        // Prevent emoji picker from closing when clicking inside
        const emojiPicker = document.getElementById('emoji-picker');
        if (emojiPicker) {
            emojiPicker.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Attach button (simulate file attachment)
        const attachBtn = document.getElementById('attach-btn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                notificationManager.showInAppNotification("Attachment", "File attachment feature would open a file dialog in a real application");
            });
        }
        
        // Search contacts
        const searchContactsInput = document.getElementById('search-contacts');
        if (searchContactsInput) {
            const debouncedSearch = debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const contactElements = document.querySelectorAll('.contact');
                
                contactElements.forEach(contact => {
                    const name = contact.querySelector('.contact-name').textContent.toLowerCase();
                    if (name.includes(searchTerm)) {
                        contact.style.display = 'flex';
                    } else {
                        contact.style.display = 'none';
                    }
                });
            }, 300);
            
            searchContactsInput.addEventListener('input', debouncedSearch);
        }
        
        // Modal close
        const modalClose = document.getElementById('modal-close');
        const imageModal = document.getElementById('image-modal');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeImageModal());
        }
        
        if (imageModal) {
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) {
                    this.closeImageModal();
                }
            });
        }
        
        // Notification toggle
        const notificationToggle = document.getElementById('notification-toggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('click', () => {
                notificationManager.toggleNotifications();
            });
        }
        
        // Mute notifications for current contact
        const muteNotificationsBtn = document.getElementById('mute-notifications');
        if (muteNotificationsBtn) {
            muteNotificationsBtn.addEventListener('click', () => {
                chatManager.toggleMuteContact();
            });
        }
        
        // Other action buttons
        const actionButtons = [
            { id: 'search-conversation', message: "Search functionality would open a search dialog in a real application" },
            { id: 'star-messages', message: "Starred messages would be saved to favorites in a real application" },
            { id: 'view-profile', message: `${chatManager.currentContact.name}'s profile would open in a real application` },
            { id: 'delete-chat', message: `Chat with ${chatManager.currentContact.name} has been deleted`, confirm: true }
        ];
        
        actionButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.addEventListener('click', () => {
                    if (button.confirm) {
                        if (confirm(`Are you sure you want to delete the chat with ${chatManager.currentContact.name}?`)) {
                            notificationManager.showInAppNotification("Chat Deleted", button.message);
                        }
                    } else {
                        notificationManager.showInAppNotification("Action", button.message);
                    }
                });
            }
        });
        
        // Show notification when page visibility changes (tab becomes inactive)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // In a real app, we would set up a listener for new messages
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});