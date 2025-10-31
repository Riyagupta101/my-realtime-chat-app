class ChatApp {
    constructor() {
        this.darkMode = false;
        this.emojiPickerVisible = false;
        this.socket = null;
        this.currentUser = null;
        this.eventListenersAttached = false;
        this.messageInputHandler = null;
        this.sendButtonHandler = null;
        this.callTimer = null;
        this.init();
    }
    
    init() {
        this.setupSocketConnection();
        this.setupEventListeners();
        this.checkAuthentication();
    }
    
    setupSocketConnection() {
        // Connect to the server
        this.socket = io();
        
        console.log('🔌 Setting up socket connection...');
        
        // Handle connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to server with ID:', this.socket.id);
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.showNotification('Connection Error', 'Cannot connect to server', 'error');
        });
        
        // Handle authentication events
        this.socket.on('auth_success', (user) => {
            console.log('✅ Authentication successful:', user.email);
            this.handleAuthSuccess(user);
        });
        
        this.socket.on('auth_failed', (message) => {
            console.error('❌ Authentication failed:', message);
            this.handleAuthFailed(message);
        });
        
        // Handle chat events
        this.socket.on('new_message', (message) => {
            console.log('💬 New message received');
            chatManager.receiveMessage(message);
        });
        
        this.socket.on('user_online', (userId) => {
            console.log('🟢 User online:', userId);
            chatManager.updateUserStatus(userId, true);
        });
        
        this.socket.on('user_offline', (userId) => {
            console.log('🔴 User offline:', userId);
            chatManager.updateUserStatus(userId, false);
        });
        
        this.socket.on('contacts_list', (contacts) => {
            console.log('📱 Contacts list received:', contacts.length, 'contacts');
            chatManager.contacts = contacts;
            chatManager.renderContacts();
        });
        
        this.socket.on('all_users_list', (users) => {
            console.log('👥 All users list received:', users.length, 'users');
            chatManager.allUsers = users;
            // You can use this to show all registered users
        });
        
        this.socket.on('conversation_history', (data) => {
            console.log('💭 Conversation history received:', data.messages.length, 'messages');
            chatManager.messages = data.messages;
            chatManager.renderMessages();
        });
        
        // Handle message deletion
        this.socket.on('message_deleted', (data) => {
            console.log('🗑️ Message deleted:', data.messageId);
            chatManager.handleMessageDeleted(data.messageId);
        });
        
        // Handle new user registration (for existing users)
        this.socket.on('new_user_added', (newUser) => {
            console.log('🆕 New user registered:', newUser.name);
            
            // Check if we already have this user in our contacts
            const existingUser = chatManager.contacts.find(contact => contact.id === newUser.id);
            if (!existingUser) {
                // Add the new user to contacts
                chatManager.contacts.push(newUser);
                chatManager.renderContacts();
                
                // Show notification
                this.showNotification('New User', `${newUser.name} joined the chat!`, 'info');
            }
        });

        // Handle search results
        this.socket.on('search_users_results', (results) => {
            console.log('🔍 Search results received:', results.length, 'users');
            chatManager.showSearchResults(results);
        });

        // Handle file message notifications
        this.socket.on('file_message_notification', (data) => {
            console.log('📎 File message notification:', data);
            this.showNotification('File Received', `${data.fileName} received`, 'info');
        });

        // Setup call event listeners
        this.setupCallEventListeners();
    }
    
    // Call functionality
    setupCallEventListeners() {
        if (!this.socket) return;

        // Incoming call
        this.socket.on('incoming_call', (data) => {
            console.log('📞 Incoming call from:', data.callerId);
            this.handleIncomingCall(data);
        });

        // Call initiated
        this.socket.on('call_initiated', (data) => {
            console.log('📞 Call initiated to:', data.receiverId);
            this.showCallModal('outgoing', data);
        });

        // Call answered
        this.socket.on('call_answered', (data) => {
            console.log('📞 Call answered by:', data.receiverId);
            this.handleCallAnswered(data);
        });

        // Call rejected
        this.socket.on('call_rejected', (data) => {
            console.log('📞 Call rejected by:', data.receiverId);
            this.handleCallRejected(data);
        });

        // Call ended
        this.socket.on('call_ended', (data) => {
            console.log('📞 Call ended by:', data.endedBy);
            this.handleCallEnded(data);
        });

        // Call failed
        this.socket.on('call_failed', (data) => {
            console.log('📞 Call failed:', data.reason);
            this.handleCallFailed(data);
        });

        // WebRTC signaling
        this.socket.on('webrtc_offer', this.handleWebRTCOffer.bind(this));
        this.socket.on('webrtc_answer', this.handleWebRTCAnswer.bind(this));
        this.socket.on('webrtc_ice_candidate', this.handleWebRTCIceCandidate.bind(this));
    }

    // Initialize call
    initiateCall(callType) {
        if (!chatManager.currentContact) {
            this.showNotification('Error', 'Please select a contact first', 'error');
            return;
        }

        if (!this.socket) {
            this.showNotification('Error', 'Not connected to server', 'error');
            return;
        }

        console.log(`📞 Initiating ${callType} call to:`, chatManager.currentContact.id);
        
        this.socket.emit('initiate_call', {
            receiverId: chatManager.currentContact.id,
            callType: callType
        });
    }

    // Handle incoming call
    handleIncomingCall(data) {
        const caller = chatManager.contacts.find(c => c.id === data.callerId) || 
                      chatManager.searchResults.find(c => c.id === data.callerId);
        
        if (!caller) {
            console.log('❌ Caller not found in contacts');
            return;
        }

        this.showIncomingCallModal(caller, data.callType);
    }

    // Show incoming call modal
    showIncomingCallModal(caller, callType) {
        const modal = document.createElement('div');
        modal.className = 'incoming-call-notification';
        modal.innerHTML = `
            <div class="call-type-indicator">
                <i class="fas fa-${callType === 'video' ? 'video' : 'phone'}"></i>
                Incoming ${callType} call
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div class="call-user-avatar" style="width: 50px; height: 50px; margin-right: 15px;">${caller.avatar}</div>
                <div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${caller.name}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">is calling you...</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="call-btn accept" onclick="chatApp.answerCall('${caller.id}')">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="call-btn reject" onclick="chatApp.rejectCall('${caller.id}')">
                    <i class="fas fa-phone-slash"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto remove after 30 seconds if not answered
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
    }

    // Answer call
    answerCall(callerId) {
        if (this.socket) {
            this.socket.emit('answer_call', { callerId });
            this.removeIncomingCallNotifications();
            this.showCallModal('active', { callType: 'video' });
        }
    }

    // Reject call
    rejectCall(callerId) {
        if (this.socket) {
            this.socket.emit('reject_call', { callerId });
            this.removeIncomingCallNotifications();
        }
    }

    // Remove incoming call notifications
    removeIncomingCallNotifications() {
        const notifications = document.querySelectorAll('.incoming-call-notification');
        notifications.forEach(notification => notification.remove());
    }

    // Show call modal
    showCallModal(type, data) {
        const modal = document.createElement('div');
        modal.className = 'call-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="call-container">
                <div class="call-user-avatar">${chatManager.currentContact?.avatar || 'U'}</div>
                <div class="call-user-name">${chatManager.currentContact?.name || 'User'}</div>
                <div class="call-status">
                    ${type === 'outgoing' ? 'Calling...' : 
                      type === 'active' ? 'Call in progress' : 'Call ended'}
                </div>
                ${type === 'active' ? '<div class="call-timer">00:00</div>' : ''}
                <div class="call-actions">
                    <button class="call-btn end" onclick="chatApp.endCall('${chatManager.currentContact?.id}')">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Start timer for active calls
        if (type === 'active') {
            this.startCallTimer(modal);
        }
    }

    // Start call timer
    startCallTimer(modal) {
        let seconds = 0;
        const timerElement = modal.querySelector('.call-timer');
        
        this.callTimer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            if (timerElement) {
                timerElement.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    // Handle call answered
    handleCallAnswered(data) {
        this.showCallModal('active', data);
    }

    // Handle call rejected
    handleCallRejected(data) {
        this.closeCallModal();
        this.showNotification('Call Rejected', `${chatManager.currentContact?.name || 'User'} rejected the call`, 'error');
    }

    // Handle call ended
    handleCallEnded(data) {
        this.closeCallModal();
        
        if (data.endedBy !== this.currentUser?.id) {
            this.showNotification('Call Ended', `${chatManager.currentContact?.name || 'User'} ended the call`, 'info');
        }
    }

    // Handle call failed
    handleCallFailed(data) {
        this.closeCallModal();
        this.showNotification('Call Failed', data.reason, 'error');
    }

    // End call
    endCall(otherUserId) {
        if (this.socket) {
            const duration = this.callTimer ? Math.floor(this.callTimer._idleTimeout / 1000) : 0;
            this.socket.emit('end_call', { 
                otherUserId: otherUserId,
                duration: duration
            });
        }
        this.closeCallModal();
    }

    // Close call modal
    closeCallModal() {
        const modals = document.querySelectorAll('.call-modal');
        modals.forEach(modal => modal.remove());
        
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        
        this.removeIncomingCallNotifications();
    }

    // WebRTC handlers (simplified for demo)
    handleWebRTCOffer(data) {
        console.log('WebRTC offer received:', data);
        // In real app, this would handle the WebRTC offer
    }

    handleWebRTCAnswer(data) {
        console.log('WebRTC answer received:', data);
        // In real app, this would handle the WebRTC answer
    }

    handleWebRTCIceCandidate(data) {
        console.log('WebRTC ICE candidate received:', data);
        // In real app, this would handle the ICE candidate
    }
    
    checkAuthentication() {
        const token = localStorage.getItem('chat_token');
        const userData = localStorage.getItem('chat_user');
        
        console.log('🔍 Checking authentication...');
        
        if (token && userData) {
            // Try to authenticate with the stored token
            console.log('🔄 Authenticating with stored token...');
            this.socket.emit('authenticate', { token });
            this.showLoading(true);
        } else {
            console.log('👤 No stored authentication found');
            this.showLoginPage();
        }
    }
    
    handleAuthSuccess(user) {
        console.log('🎉 Handling auth success for user:', user.name);
        this.currentUser = user;
        localStorage.setItem('chat_token', user.token);
        localStorage.setItem('chat_user', JSON.stringify(user));
        
        // Initialize chat components
        chatManager.init(user);
        this.renderMediaItems();
        this.renderEmojis();
        
        this.showChatApp();
        this.showLoading(false);
        
        // Load contacts from server
        console.log('📞 Requesting contacts list...');
        this.socket.emit('get_contacts');
        
        // Also load all users
        this.socket.emit('get_all_users');
        
        this.showNotification('Welcome', `Hello, ${user.name}!`, 'success');
    }
    
    handleAuthFailed(message) {
        console.error('🚫 Auth failed, clearing storage...');
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        this.showLoginPage();
        this.showNotification('Authentication Failed', message, 'error');
        this.showLoading(false);
    }
    
    showLoginPage() {
        console.log('🔓 Showing login page');
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('chat-app').style.display = 'none';
        this.showLoading(false);
    }
    
    showChatApp() {
        console.log('💬 Showing chat app');
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
    }
    
    showLoading(show) {
        const loadingElement = document.getElementById('auth-loading');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        console.log('⏳ Loading state:', show);
        
        if (loadingElement) {
            loadingElement.classList.toggle('active', show);
        }
        
        // Disable forms while loading
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = show);
        }
        
        if (registerForm) {
            const inputs = registerForm.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = show);
        }
    }
    
    showNotification(title, message, type = 'info') {
        console.log('📢 Notification:', title, '-', message);
        notificationManager.showInAppNotification(title, message);
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
        
        // Save dark mode preference
        localStorage.setItem('darkMode', this.darkMode);
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
        if (this.eventListenersAttached) {
            console.log('⚠️ Event listeners already attached, skipping...');
            return;
        }
        
        // Authentication event listeners
        this.setupAuthEventListeners();
        
        // Chat event listeners
        this.setupChatEventListeners();
        
        // Other UI event listeners
        this.setupOtherUIEventListeners();
        
        this.eventListenersAttached = true;
        console.log('✅ Event listeners attached');
    }
    
    setupAuthEventListeners() {
        // Tab switching
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        
        if (loginTab) {
            loginTab.addEventListener('click', () => this.switchAuthTab('login'));
        }
        
        if (registerTab) {
            registerTab.addEventListener('click', () => this.switchAuthTab('register'));
        }
        
        // Form submissions
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }
    
    setupChatEventListeners() {
        // Use event delegation to prevent multiple listeners
        this.setupMessageInputHandlers();
    }
    
    setupMessageInputHandlers() {
        // Remove existing handlers if they exist
        if (this.messageInputHandler) {
            document.removeEventListener('click', this.messageInputHandler);
        }
        if (this.sendButtonHandler) {
            document.removeEventListener('click', this.sendButtonHandler);
        }
        
        // Set up new handlers using event delegation
        document.addEventListener('click', (e) => {
            // Send button click
            if (e.target.closest('#send-btn')) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // Message input enter key
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            // Remove any existing event listeners by cloning the element
            const newMessageInput = messageInput.cloneNode(true);
            messageInput.parentNode.replaceChild(newMessageInput, messageInput);
            
            newMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
            
            // Typing indicators
            let typingTimer;
            newMessageInput.addEventListener('input', () => {
                if (newMessageInput.value.trim() !== '' && chatManager.currentContact) {
                    this.socket.emit('typing_start', {
                        userId: this.currentUser?.id,
                        contactId: chatManager.currentContact.id
                    });
                    
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        this.socket.emit('typing_stop', {
                            userId: this.currentUser?.id,
                            contactId: chatManager.currentContact.id
                        });
                    }, 1000);
                } else if (chatManager.currentContact) {
                    this.socket.emit('typing_stop', {
                        userId: this.currentUser?.id,
                        contactId: chatManager.currentContact.id
                    });
                }
            });
        }
    }
    
    handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        if (messageInput && messageInput.value.trim() && chatManager.currentContact) {
            const messageText = messageInput.value.trim();
            messageInput.value = '';
            chatManager.sendMessage(messageText);
        }
    }
    
    setupOtherUIEventListeners() {
        // Call buttons
        const videoCallBtn = document.getElementById('video-call-btn');
        const audioCallBtn = document.getElementById('audio-call-btn');

        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', () => {
                this.initiateCall('video');
            });
        }

        if (audioCallBtn) {
            audioCallBtn.addEventListener('click', () => {
                this.initiateCall('audio');
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
            // Load dark mode preference
            const savedDarkMode = localStorage.getItem('darkMode') === 'true';
            if (savedDarkMode) {
                this.darkMode = true;
                document.body.classList.add('dark-mode');
                darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
            
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
        
        // ✅ FILE ATTACHMENT WITH GALLERY/SYSTEM ACCESS - CORRECTED
        const attachBtn = document.getElementById('attach-btn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar';
                fileInput.multiple = false;
                
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.handleFileUpload(file);
                    }
                };
                
                fileInput.click();
            });
        }
        
        // ✅ SEARCH CONTACTS WITH TELEGRAM-STYLE BEHAVIOR - CORRECTED
        const searchContactsInput = document.getElementById('search-contacts');
        if (searchContactsInput) {
            const debouncedSearch = debounce((e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                
                if (searchTerm === '') {
                    // Show normal contacts when search is empty
                    chatManager.showingSearchResults = false;
                    chatManager.renderContacts();
                    return;
                }
                
                // Search for users by name
                if (window.chatApp && window.chatApp.socket) {
                    window.chatApp.socket.emit('search_users', { searchTerm });
                }
            }, 500);
            
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
        
        // Refresh contacts button
        const refreshContactsBtn = document.getElementById('refresh-contacts');
        if (refreshContactsBtn) {
            refreshContactsBtn.addEventListener('click', () => {
                this.socket.emit('get_contacts');
                this.showNotification('Contacts', 'Contacts list refreshed', 'info');
            });
        }
        
        // Other action buttons
        const actionButtons = [
            { id: 'search-conversation', message: "Search functionality would open a search dialog in a real application" },
            { id: 'star-messages', message: "Starred messages would be saved to favorites in a real application" },
            { id: 'view-profile', message: `${chatManager.currentContact?.name || 'Contact'}'s profile would open in a real application` },
            { id: 'delete-chat', message: `Chat with ${chatManager.currentContact?.name || 'Contact'} has been deleted`, confirm: true }
        ];
        
        actionButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.addEventListener('click', () => {
                    if (button.confirm) {
                        if (confirm(`Are you sure you want to delete the chat with ${chatManager.currentContact?.name || 'Contact'}?`)) {
                            notificationManager.showInAppNotification("Chat Deleted", button.message);
                        }
                    } else {
                        notificationManager.showInAppNotification("Action", button.message);
                    }
                });
            }
        });
    }

    // ✅ ADD NEW METHOD FOR FILE UPLOAD - CORRECTED
    handleFileUpload(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const fileData = {
                fileUrl: e.target.result,
                fileName: file.name,
                fileSize: this.formatFileSize(file.size),
                messageType: this.getFileType(file.type)
            };
            
            if (chatManager.currentContact) {
                chatManager.sendFileMessage(fileData);
            } else {
                notificationManager.showInAppNotification("Error", "Please select a contact first");
            }
        };
        
        reader.onerror = (error) => {
            console.error('File reading error:', error);
            notificationManager.showInAppNotification("Error", "Failed to read file");
        };
        
        reader.readAsDataURL(file);
    }

    // ✅ HELPER METHOD TO GET FILE TYPE - CORRECTED
    getFileType(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        return 'file';
    }

    // ✅ HELPER METHOD TO FORMAT FILE SIZE - CORRECTED
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    switchAuthTab(tab) {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    }
    
    handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showNotification('Error', 'Please fill in all fields', 'error');
            return;
        }
        
        console.log('🔐 Attempting login for:', email);
        this.showLoading(true);
        
        // Send login request to server
        this.socket.emit('login', { email, password });
    }
    
    handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!name || !email || !password || !confirmPassword) {
            this.showNotification('Error', 'Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showNotification('Registration Failed', 'Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('Registration Failed', 'Password must be at least 6 characters', 'error');
            return;
        }
        
        console.log('📝 Attempting registration for:', email);
        this.showLoading(true);
        
        // Send registration request to server
        this.socket.emit('register', { name, email, password });
    }
    
    handleLogout() {
        console.log('🚪 Logging out...');
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        localStorage.removeItem('darkMode');
        if (this.socket) {
            this.socket.disconnect();
        }
        this.showLoginPage();
        this.showNotification('Logged Out', 'You have been successfully logged out');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Chat App...');
    window.chatApp = new ChatApp();
});