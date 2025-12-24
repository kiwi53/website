// Chat Application State
const state = {
    userName: '',
    roomCode: '',
    roomName: '',
    roomOwner: '',
    messages: [],
    currentMediaFile: null,
    isHost: false,
    broadcastChannel: null,
    currentRoomPassword: '',
    hideFromPublic: false
};

// DOM Elements
const screens = {
    name: document.getElementById('nameScreen'),
    rooms: document.getElementById('roomsScreen'),
    createRoom: document.getElementById('createRoomScreen'),
    join: document.getElementById('joinScreen'),
    roomCreated: document.getElementById('roomCreatedScreen'),
    chat: document.getElementById('chatScreen')
};

const elements = {
    userName: document.getElementById('userName'),
    continueBtn: document.getElementById('continueBtn'),
    
    roomsTableBody: document.getElementById('roomsTableBody'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    joinWithCodeBtn: document.getElementById('joinWithCodeBtn'),
    refreshRoomsBtn: document.getElementById('refreshRoomsBtn'),
    
    roomName: document.getElementById('roomName'),
    hideFromPublicCheck: document.getElementById('hideFromPublicCheck'),
    passwordProtectCheck: document.getElementById('passwordProtectCheck'),
    roomPassword: document.getElementById('roomPassword'),
    passwordSection: document.querySelector('#createRoomScreen .password-section'),
    createRoomSubmitBtn: document.getElementById('createRoomSubmitBtn'),
    backFromCreateBtn: document.getElementById('backFromCreateBtn'),
    
    roomCodeInput: document.getElementById('roomCodeInput'),
    joinPassword: document.getElementById('joinPassword'),
    joinPasswordSection: document.getElementById('joinPasswordSection'),
    joinSubmitBtn: document.getElementById('joinSubmitBtn'),
    backFromJoinBtn: document.getElementById('backFromJoinBtn'),
    
    displayRoomCode: document.getElementById('displayRoomCode'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    enterRoomBtn: document.getElementById('enterRoomBtn'),
    
    currentRoomCode: document.getElementById('currentRoomCode'),
    onlineCount: document.getElementById('onlineCount'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    
    attachBtn: document.getElementById('attachBtn'),
    fileInput: document.getElementById('fileInput'),
    mediaPreview: document.getElementById('mediaPreview'),
    previewImage: document.getElementById('previewImage'),
    previewVideo: document.getElementById('previewVideo'),
    cancelPreviewBtn: document.getElementById('cancelPreviewBtn')
};

// Utility Functions
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function saveToLocalStorage() {
    const roomData = {
        code: state.roomCode,
        name: state.roomName || 'Unnamed Room',
        owner: state.roomOwner || state.userName,
        messages: state.messages,
        users: [state.userName],
        password: state.currentRoomPassword,
        hasPassword: !!state.currentRoomPassword,
        hideFromPublic: state.hideFromPublic || false,
        lastActivity: Date.now()
    };
    localStorage.setItem(`chatroom_${state.roomCode}`, JSON.stringify(roomData));
    
    // Update rooms list
    updateRoomsList();
}

function loadFromLocalStorage(roomCode) {
    const data = localStorage.getItem(`chatroom_${roomCode}`);
    if (data) {
        const roomData = JSON.parse(data);
        state.messages = roomData.messages || [];
        state.roomName = roomData.name || 'Unnamed Room';
        state.roomOwner = roomData.owner || '';
        state.currentRoomPassword = roomData.password || '';
        state.hideFromPublic = roomData.hideFromPublic || false;
        renderAllMessages();
        return roomData;
    }
    return null;
}

function cleanupInactiveRooms() {
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    const now = Date.now();
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chatroom_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.lastActivity && (now - data.lastActivity) > fifteenMinutes) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Skip invalid entries
            }
        }
    }
}

function getAllRooms() {
    // Clean up inactive rooms first
    cleanupInactiveRooms();
    
    const rooms = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('chatroom_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                // Only show rooms that are not hidden from public
                if (!data.hideFromPublic) {
                    rooms.push({
                        code: data.code,
                        name: data.name || 'Unnamed Room',
                        owner: data.owner || 'Unknown',
                        users: data.users?.length || 1,
                        hasPassword: data.hasPassword || false
                    });
                }
            } catch (e) {
                // Skip invalid entries
            }
        }
    }
    return rooms;
}

function updateRoomsList() {
    const rooms = getAllRooms();
    const tbody = elements.roomsTableBody;
    
    if (rooms.length === 0) {
        tbody.innerHTML = '<tr class="no-rooms"><td colspan="4">No rooms available. Create one!</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    rooms.forEach(room => {
        const row = document.createElement('tr');
        const isOwner = room.owner === state.userName;
        const ownerSymbol = isOwner ? ' <span class="owner-badge">👑</span>' : '';
        const deleteBtn = isOwner ? `<button class="delete-room-btn" data-code="${room.code}">🗑️</button>` : '';
        
        row.innerHTML = `
            <td><strong>${room.name}</strong>${ownerSymbol}</td>
            <td>${room.users}</td>
            <td>${room.hasPassword ? '<span class="room-protected">🔒</span>' : '—'}</td>
            <td>
                <button class="join-room-btn" data-code="${room.code}" data-protected="${room.hasPassword}">Join</button>
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add click handlers to delete buttons
    tbody.querySelectorAll('.delete-room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const roomCode = btn.dataset.code;
            if (confirm('Are you sure you want to delete this room?')) {
                localStorage.removeItem(`chatroom_${roomCode}`);
                updateRoomsList();
            }
        });
    });
    
    // Add click handlers to join buttons
    tbody.querySelectorAll('.join-room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const roomCode = btn.dataset.code;
            const hasPassword = btn.dataset.protected === 'true';
            
            if (hasPassword) {
                // Show join screen for password entry
                elements.roomCodeInput.value = roomCode;
                elements.joinPasswordSection.classList.remove('hidden');
                showScreen('join');
            } else {
                // Join directly without password
                state.roomCode = roomCode;
                state.isHost = false;
                
                const roomData = loadFromLocalStorage(roomCode);
                if (!roomData) {
                    alert('Room not found!');
                    return;
                }
                
                state.currentRoomPassword = '';
                enterChatRoom();
            }
        });
    });
}

function broadcastMessage(message) {
    // Use BroadcastChannel for cross-tab communication
    const channel = new BroadcastChannel(`chatroom_${state.roomCode}`);
    channel.postMessage(message);
}

// Event Handlers
elements.continueBtn.addEventListener('click', () => {
    const name = elements.userName.value.trim();
    if (!name) {
        alert('Please enter your name!');
        return;
    }
    
    state.userName = name;
    updateRoomsList();
    showScreen('rooms');
});

elements.createRoomBtn.addEventListener('click', () => {
    showScreen('createRoom');
});

elements.joinWithCodeBtn.addEventListener('click', () => {
    elements.roomCodeInput.value = '';
    elements.joinPassword.value = '';
    elements.joinPasswordSection.classList.add('hidden');
    showScreen('join');
});

elements.refreshRoomsBtn.addEventListener('click', () => {
    updateRoomsList();
});

elements.passwordProtectCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
        elements.passwordSection.classList.remove('hidden');
    } else {
        elements.passwordSection.classList.add('hidden');
        elements.roomPassword.value = '';
    }
});

elements.createRoomSubmitBtn.addEventListener('click', () => {
    const roomName = elements.roomName.value.trim();
    if (!roomName) {
        alert('Please enter a room name!');
        return;
    }
    
    state.roomCode = generateRoomCode();
    state.roomName = roomName;
    state.roomOwner = state.userName;
    state.hideFromPublic = elements.hideFromPublicCheck.checked;
    state.isHost = true;
    
    if (elements.passwordProtectCheck.checked) {
        const password = elements.roomPassword.value.trim();
        if (!password) {
            alert('Please enter a password or uncheck password protection!');
            return;
        }
        state.currentRoomPassword = password;
    } else {
        state.currentRoomPassword = '';
    }
    
    // Reset create room form
    elements.roomName.value = '';
    elements.hideFromPublicCheck.checked = false;
    elements.passwordProtectCheck.checked = false;
    elements.passwordSection.classList.add('hidden');
    elements.roomPassword.value = '';
    
    // Save to localStorage and enter room directly
    saveToLocalStorage();
    enterChatRoom();
});

elements.backFromCreateBtn.addEventListener('click', () => {
    showScreen('rooms');
});

elements.backFromJoinBtn.addEventListener('click', () => {
    elements.joinPassword.value = '';
    showScreen('rooms');
});

elements.joinSubmitBtn.addEventListener('click', () => {
    const code = elements.roomCodeInput.value.trim().toUpperCase();
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-character room code!');
        return;
    }
    
    state.roomCode = code;
    state.isHost = false;
    
    // Try to load existing room data
    const roomData = loadFromLocalStorage(code);
    
    if (!roomData) {
        alert('Room not found! Make sure the code is correct.');
        return;
    }
    
    // Check password if protected
    if (roomData.hasPassword) {
        const enteredPassword = elements.joinPassword.value.trim();
        if (enteredPassword !== roomData.password) {
            alert('Incorrect password!');
            return;
        }
    }
    
    state.currentRoomPassword = roomData.password || '';
    elements.joinPassword.value = '';
    enterChatRoom();
});

elements.copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(state.roomCode).then(() => {
        elements.copyCodeBtn.textContent = '✓';
        setTimeout(() => {
            elements.copyCodeBtn.textContent = '📋';
        }, 2000);
    });
});

elements.enterRoomBtn.addEventListener('click', () => {
    enterChatRoom();
});

elements.leaveRoomBtn.addEventListener('click', () => {
    addSystemMessage(`${state.userName} left the room`);
    saveToLocalStorage();
    
    // Reset state
    state.messages = [];
    state.roomCode = '';
    state.currentMediaFile = null;
    state.currentRoomPassword = '';
    
    // Clear inputs
    elements.roomCodeInput.value = '';
    elements.messageInput.value = '';
    elements.joinPassword.value = '';
    
    updateRoomsList();
    showScreen('rooms');
});

// Message Functions
function enterChatRoom() {
    elements.currentRoomCode.textContent = state.roomCode;
    showScreen('chat');
    
    // Add join message
    addSystemMessage(`${state.userName} joined the room`);
    
    // Setup broadcast channel listener
    state.broadcastChannel = new BroadcastChannel(`chatroom_${state.roomCode}`);
    state.broadcastChannel.onmessage = (event) => {
        const message = event.data;
        if (message.type === 'message') {
            // Don't add duplicates - check if message already exists
            const isDuplicate = state.messages.some(m => 
                m.sender === message.sender && 
                m.text === message.text && 
                m.time === message.time
            );
            
            if (!isDuplicate) {
                state.messages.push(message);
                renderMessage(message);
                scrollToBottom();
                saveToLocalStorage();
            }
        } else if (message.type === 'system') {
            addSystemMessage(message.text, false);
        }
    };
}

function addSystemMessage(text, broadcast = true) {
    const messageEl = document.createElement('div');
    messageEl.className = 'system-message';
    messageEl.textContent = text;
    elements.messagesContainer.appendChild(messageEl);
    scrollToBottom();
    
    if (broadcast) {
        broadcastMessage({ type: 'system', text });
    }
}

function sendMessage() {
    const text = elements.messageInput.value.trim();
    
    if (!text && !state.currentMediaFile) {
        return;
    }
    
    const message = {
        type: 'message',
        sender: state.userName,
        text: text,
        time: getCurrentTime(),
        media: null,
        isOwn: true
    };
    
    // Handle media
    if (state.currentMediaFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            message.media = {
                type: state.currentMediaFile.type.startsWith('image/') ? 'image' : 'video',
                data: e.target.result
            };
            
            // Add to messages, render, and broadcast
            state.messages.push(message);
            renderMessage(message);
            scrollToBottom();
            saveToLocalStorage();
            broadcastMessage(message);
            
            // Clear input after sending
            elements.messageInput.value = '';
            clearMediaPreview();
        };
        reader.readAsDataURL(state.currentMediaFile);
    } else {
        // Add to messages, render, and broadcast
        state.messages.push(message);
        renderMessage(message);
        scrollToBottom();
        saveToLocalStorage();
        broadcastMessage(message);
        
        // Clear input after sending
        elements.messageInput.value = '';
        clearMediaPreview();
    }
}

function renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message' + (message.isOwn ? ' own' : '');
    
    const headerEl = document.createElement('div');
    headerEl.className = 'message-header';
    
    const senderEl = document.createElement('span');
    senderEl.className = 'message-sender';
    senderEl.textContent = message.sender;
    
    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = message.time;
    
    headerEl.appendChild(senderEl);
    headerEl.appendChild(timeEl);
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    if (message.text) {
        const textEl = document.createElement('div');
        textEl.textContent = message.text;
        contentEl.appendChild(textEl);
    }
    
    if (message.media) {
        const mediaEl = document.createElement('div');
        mediaEl.className = 'message-media';
        
        if (message.media.type === 'image') {
            const img = document.createElement('img');
            img.src = message.media.data;
            mediaEl.appendChild(img);
        } else if (message.media.type === 'video') {
            const video = document.createElement('video');
            video.src = message.media.data;
            video.controls = true;
            mediaEl.appendChild(video);
        }
        
        contentEl.appendChild(mediaEl);
    }
    
    messageEl.appendChild(headerEl);
    messageEl.appendChild(contentEl);
    elements.messagesContainer.appendChild(messageEl);
}

function renderAllMessages() {
    // Clear existing messages except system message
    elements.messagesContainer.innerHTML = '<div class="system-message">Welcome to the chat room!</div>';
    
    state.messages.forEach(message => {
        renderMessage(message);
    });
    
    scrollToBottom();
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Media Handling
elements.attachBtn.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File is too large! Maximum size is 10MB.');
        return;
    }
    
    state.currentMediaFile = file;
    showMediaPreview(file);
});

function showMediaPreview(file) {
    elements.mediaPreview.classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
            elements.previewImage.src = e.target.result;
            elements.previewImage.classList.remove('hidden');
            elements.previewVideo.classList.add('hidden');
        } else if (file.type.startsWith('video/')) {
            elements.previewVideo.src = e.target.result;
            elements.previewVideo.classList.remove('hidden');
            elements.previewImage.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
}

function clearMediaPreview() {
    elements.mediaPreview.classList.add('hidden');
    elements.previewImage.classList.add('hidden');
    elements.previewVideo.classList.add('hidden');
    elements.previewImage.src = '';
    elements.previewVideo.src = '';
    elements.fileInput.value = '';
    state.currentMediaFile = null;
}

elements.cancelPreviewBtn.addEventListener('click', clearMediaPreview);

// Send Message Event Listeners
elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initial setup
showScreen('name');
