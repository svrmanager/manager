import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, where, onSnapshot, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDocs, doc, getDoc, deleteDoc, writeBatch, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIG FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDXWb4X1xGiURwwvpRWcMkeqEM5CZ8LUIw",
  authDomain: "servermanager-bd080.firebaseapp.com",
  projectId: "servermanager-bd080",
  storageBucket: "servermanager-bd080.firebasestorage.app",
  messagingSenderId: "602348901704",
  appId: "1:602348901704:web:8c34e2e15cd1489589cf7d",
  measurementId: "G-6YNX0BVY4M"
};

// --- CONFIG CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "douvpolrv"; 
const CLOUDINARY_PRESET = "svrmanager";   

// --- INIT ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- STATE ---
let currentUser = null;
let currentCustomUserId = "LOADING..."; 
let currentRoomId = null;
let currentRoomData = null;
let unsubscribeMsg = null; 
let unsubscribeRooms = null;
let unsubscribeDevLogs = null;
const notificationUnsubscribers = new Map();
let confirmCallback = null; 
let pendingFiles = []; 
let pendingPreviewUrls = [];
let currentRoomMessages = []; 
let searchQuery = ""; 
let allRoomsData = []; 
let qrScanner = null;
let qrScannerRunning = false;
let nativePushInitialized = false;
let nativePushReady = false;
let pendingJoinCode = null;

try {
    pendingJoinCode = extractRoomCode(new URL(window.location.href).searchParams.get('join') || '');
} catch (_) { /* URL lama tetap dapat dibuka */ }

const isNativeAndroid = () => window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'android';
const notificationAudio = new Audio('assets/sounds/mixkit-bell-notification-933.wav');
notificationAudio.preload = 'auto';

let currentSessionPassword = "(Password terenkripsi, masuk via Auto-Login)";

// --- DOM ELEMENTS (MAIN) ---
const dom = {
    authOverlay: document.getElementById('authOverlay'),
    appContainer: document.getElementById('appContainer'),
    roomListPanel: document.getElementById('roomListPanel'),
    chatPanel: document.getElementById('chatPanel'),
    chatHeader: document.getElementById('chatHeader'),
    chatBox: document.getElementById('chatBox'),
    chatInputArea: document.getElementById('chatInputArea'),
    emptyChatState: document.getElementById('emptyChatState'),
    
    userProfileBtn: document.getElementById('userProfileBtn'),
    userAvatarInput: document.getElementById('userAvatarInput'),
    sidebarUserAvatar: document.getElementById('sidebarUserAvatar'),
    sidebarUserInitial: document.getElementById('sidebarUserInitial'),
    sidebarTitle: document.getElementById('sidebarTitle'),
    sidebarEmail: document.getElementById('sidebarEmail'),

    roomProfileBtn: document.getElementById('roomProfileBtn'),
    roomProfileOverlay: document.getElementById('roomProfileOverlay'),
    roomAvatarInput: document.getElementById('roomAvatarInput'),
    headerRoomAvatar: document.getElementById('headerRoomAvatar'),
    headerRoomInitial: document.getElementById('headerRoomInitial'),

    roomsContainer: document.getElementById('roomsContainer'),
    toggleArchiveBtn: document.getElementById('toggleArchiveBtn'),
    archivedRoomsContainer: document.getElementById('archivedRoomsContainer'),
    archiveIcon: document.getElementById('archiveIcon'),

    msgInput: document.getElementById('msgInput'),
    sendBtn: document.getElementById('sendBtn'),
    
    scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
    unreadBadge: document.getElementById('unreadBadge'),
    
    loginBox: document.getElementById('loginBox'),
    forgotBox: document.getElementById('forgotBox'),
    showForgotBtn: document.getElementById('showForgotBtn'),
    backToLoginBtn: document.getElementById('backToLoginBtn'),
    sendResetBtn: document.getElementById('sendResetBtn'),
    forgotEmailInput: document.getElementById('forgotEmailInput'),

    searchMenuBtn: document.getElementById('searchMenuBtn'),
    searchContainer: document.getElementById('searchContainer'),
    searchInput: document.getElementById('searchInput'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),

    multiAttachBtn: document.getElementById('multiAttachBtn'),
    multiFileInput: document.getElementById('multiFileInput'),
    multiPreviewContainer: document.getElementById('multiPreviewContainer'),
    multiPreviewList: document.getElementById('multiPreviewList'),

    groupMenuBtn: document.getElementById('groupMenuBtn'),
    groupMenuDropdown: document.getElementById('groupMenuDropdown'),
    leaveGroupBtn: document.getElementById('leaveGroupBtn'),
    viewMembersBtn: document.getElementById('viewMembersBtn'),
    renameRoomBtn: document.getElementById('renameRoomBtn'), 
    accessSettingsBtn: document.getElementById('accessSettingsBtn'),
    toggleNotifBtn: document.getElementById('toggleNotifBtn'),
    archiveRoomBtn: document.getElementById('archiveRoomBtn'),

    logoutBtn: document.getElementById('logoutBtn'),
    toastContainer: document.getElementById('toastContainer'),
    confirmModal: document.getElementById('confirmModal'),
    imageViewer: document.getElementById('imageViewer'),
    viewerImage: document.getElementById('viewerImage'),
    viewerVideo: document.getElementById('viewerVideo'),
    viewerMainDownloadBtn: document.getElementById('viewerMainDownloadBtn'),
    downloadOptions: document.getElementById('downloadOptions'),
    dlBtnText: document.getElementById('dlBtnText'),
    btnDlJpg: document.getElementById('btnDlJpg'),
    btnDlPng: document.getElementById('btnDlPng'),

    // Caption Elements
    openCaptionBtn: document.getElementById('openCaptionBtn'),
    captionContainer: document.getElementById('captionContainer'),
    closeCaptionBtn: document.getElementById('closeCaptionBtn'),
    captionInput: document.getElementById('captionInput'),
    saveCaptionBtn: document.getElementById('saveCaptionBtn'),

    // Modals
    logoutModal: document.getElementById('logoutModal'),
    logoutTitle: document.getElementById('logoutTitle'),
    logoutEmailDisplay: document.getElementById('logoutEmailDisplay'),
    logoutPasswordDisplay: document.getElementById('logoutPasswordDisplay'),
    btnTogglePassword: document.getElementById('btnTogglePassword'),
    logoutActionButtons: document.getElementById('logoutActionButtons'),
    btnCancelLogout: document.getElementById('btnCancelLogout'),
    btnConfirmLogout: document.getElementById('btnConfirmLogout'),
    logoutUsernameDisplay: document.getElementById('logoutUsernameDisplay'),
    btnEditUsername: document.getElementById('btnEditUsername'),
    btnSaveUsername: document.getElementById('btnSaveUsername'),
    logoutUserIdDisplay: document.getElementById('logoutUserIdDisplay'),
    btnCopyUserId: document.getElementById('btnCopyUserId'),
    modalAccess: document.getElementById('modalAccess'),
    btnCloseAccess: document.getElementById('btnCloseAccess'),
    accessCodeDisplay: document.getElementById('accessCodeDisplay'),
    btnCopyAccessCode: document.getElementById('btnCopyAccessCode'),
    togglePrivate: document.getElementById('togglePrivate'),
    modalMembers: document.getElementById('modalMembers'),
    btnCloseMembers: document.getElementById('btnCloseMembers'),
    inviteContainer: document.getElementById('inviteContainer'),
    inviteUserIdInput: document.getElementById('inviteUserIdInput'),
    btnInviteUser: document.getElementById('btnInviteUser'),
    pendingContainer: document.getElementById('pendingContainer'),
    togglePendingBtn: document.getElementById('togglePendingBtn'),
    pendingListContainer: document.getElementById('pendingListContainer'),
    pendingCount: document.getElementById('pendingCount'),
    pendingIcon: document.getElementById('pendingIcon'),
    membersListContainer: document.getElementById('membersListContainer'),
    memberCount: document.getElementById('memberCount'),
};

// --- DOM ELEMENTS (DEVELOPER) ---
const devDom = {
    trigger: document.getElementById('devModeTrigger'),
    authModal: document.getElementById('devAuthModal'),
    authInput: document.getElementById('devAuthInput'),
    btnCancel: document.getElementById('btnCancelDev'),
    btnEnter: document.getElementById('btnEnterDev'),
    dashboard: document.getElementById('devDashboard'),
    btnExit: document.getElementById('btnExitDev'),
    clock: document.getElementById('devClock'),
    
    totalUsers: document.getElementById('devTotalUsers'),
    totalGroups: document.getElementById('devTotalGroups'),
    totalMsgs: document.getElementById('devTotalMsgs'),
    totalMedia: document.getElementById('devTotalMedia'),
    
    usersList: document.getElementById('devUsersList'),
    groupsList: document.getElementById('devGroupsList'),
    logsList: document.getElementById('devLogsList'),
    trafficChart: document.getElementById('devTrafficChart'),
    trafficLoading: document.getElementById('devTrafficLoading')
};

// --- NAVIGATION API ---
function showRoomList() {
    dom.roomListPanel.classList.remove('-translate-x-full');
    dom.chatPanel.classList.add('translate-x-full', 'absolute');
    dom.searchContainer.classList.add('hidden');
    dom.searchContainer.classList.remove('flex');
}

function closeImageViewer() {
    dom.imageViewer.classList.add('hidden');
    dom.viewerVideo.pause();
    dom.viewerVideo.src = '';
}

function closeTopOverlay() {
    const scannerModal = document.getElementById('modalQrScanner');
    if (scannerModal && !scannerModal.classList.contains('hidden')) {
        stopQrScanner();
        scannerModal.classList.add('hidden');
        return true;
    }
    if (!dom.imageViewer.classList.contains('hidden')) {
        closeImageViewer();
        return true;
    }

    const overlays = [
        dom.confirmModal, dom.logoutModal, devDom.authModal, devDom.dashboard,
        document.getElementById('modalAccess'), document.getElementById('modalMembers'),
        document.getElementById('modalRename'), document.getElementById('modalSuccess'),
        document.getElementById('modalCreate'), document.getElementById('modalJoin')
    ];
    const openOverlay = overlays.find(item => item && !item.classList.contains('hidden'));
    if (openOverlay) {
        openOverlay.classList.add('hidden');
        if (openOverlay === devDom.dashboard && unsubscribeDevLogs) {
            unsubscribeDevLogs();
            unsubscribeDevLogs = null;
        }
        return true;
    }
    if (!dom.groupMenuDropdown.classList.contains('hidden')) {
        dom.groupMenuDropdown.classList.add('hidden');
        return true;
    }
    if (!dom.searchContainer.classList.contains('hidden')) {
        dom.closeSearchBtn.click();
        return true;
    }
    return false;
}

async function handleBackAction() {
    if (closeTopOverlay()) return;
    if (window.innerWidth < 768 && !dom.chatPanel.classList.contains('translate-x-full')) {
        if (window.location.hash === '#chat') history.back();
        else showRoomList();
        return;
    }
    if (isNativeAndroid()) {
        try { await window.Capacitor.Plugins.App.minimizeApp(); } catch (_) { /* tetap di aplikasi */ }
    } else if (window.history.length > 1) {
        history.back();
    }
}

window.addEventListener('popstate', () => {
    if (window.innerWidth < 768 && !dom.chatPanel.classList.contains('translate-x-full')) showRoomList();
});

async function setupNativeBackButton() {
    const appPlugin = window.Capacitor?.Plugins?.App;
    if (!isNativeAndroid() || !appPlugin) return;
    try {
        await appPlugin.addListener('backButton', handleBackAction);
        await appPlugin.addListener('appUrlOpen', event => {
            const code = extractRoomCode(event?.url || '');
            if (!code) return;
            if (currentUser) {
                document.getElementById('joinRoomCode').value = code;
                toggleModal('modalJoin', true);
            } else {
                pendingJoinCode = code;
            }
        });
    } catch (error) { console.warn('Native navigation:', error); }
}

void setupNativeBackButton();

// --- HELPER FUNCTIONS ---
window.showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-gray-800';
    const icon = type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-check-circle"></i>';
    toast.className = `${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold pointer-events-auto toast-enter`;
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-enter-active'); }, 10);
    setTimeout(() => { toast.classList.remove('toast-enter-active'); toast.classList.add('toast-exit-active'); setTimeout(() => toast.remove(), 300); }, 3000);
};

window.showCustomConfirm = (title, msg, callback) => {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = msg;
    dom.confirmModal.classList.remove('hidden');
    confirmCallback = callback;
};

document.getElementById('btnCancelConfirm').onclick = () => dom.confirmModal.classList.add('hidden');
document.getElementById('btnOkConfirm').onclick = () => { if(confirmCallback) confirmCallback(); dom.confirmModal.classList.add('hidden'); };

function checkIsAdmin() {
    if(!currentRoomData || !currentUser) return false;
    return currentRoomData.admins ? currentRoomData.admins.includes(currentUser.uid) : (currentRoomData.createdBy === currentUser.email);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearNotificationListeners() {
    notificationUnsubscribers.forEach(unsubscribe => unsubscribe());
    notificationUnsubscribers.clear();
}

function syncNotificationListeners() {
    const webNotificationsAllowed = ("Notification" in window) && Notification.permission === "granted";
    if (!currentUser || (!isNativeAndroid() && !webNotificationsAllowed)) {
        clearNotificationListeners();
        return;
    }

    const enabledRoomIds = new Set(JSON.parse(localStorage.getItem(`notif_${currentUser.uid}`) || '[]'));

    notificationUnsubscribers.forEach((unsubscribe, roomId) => {
        if (!enabledRoomIds.has(roomId)) {
            unsubscribe();
            notificationUnsubscribers.delete(roomId);
        }
    });

    enabledRoomIds.forEach(roomId => {
        if (notificationUnsubscribers.has(roomId)) return;

        let isInitialSnapshot = true;
        const messageQuery = query(collection(db, "messages"), where("roomId", "==", roomId));
        const unsubscribe = onSnapshot(messageQuery, snapshot => {
            if (!isInitialSnapshot) {
                snapshot.docChanges().forEach(change => {
                    if (change.type !== "added") return;
                    const message = change.doc.data();
                    if (message.uid !== currentUser?.uid) void checkAndShowNotification(roomId, message);
                });
            }
            isInitialSnapshot = false;
        }, error => console.error("Notification listener error:", error));

        notificationUnsubscribers.set(roomId, unsubscribe);
    });
}

function playNotificationSound() {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(() => { /* Browser dapat menahan audio sebelum interaksi pertama */ });
}

async function setupNativePushNotifications() {
    if (!isNativeAndroid() || !currentUser) return false;
    if (nativePushInitialized) return nativePushReady;
    const push = window.Capacitor?.Plugins?.PushNotifications;
    const nativeNotification = window.Capacitor?.Plugins?.NativeNotification;
    if (!push || !nativeNotification) return false;

    try {
        const status = await nativeNotification.isPushConfigured();
        if (!status?.configured) return false;
    } catch (error) {
        console.warn('Pemeriksaan konfigurasi push gagal:', error);
        return false;
    }
    nativePushInitialized = true;

    try {
        await push.createChannel({
            id: 'chat_messages_v2',
            name: 'Pesan chat',
            description: 'Notifikasi pesan masuk Server Manager',
            importance: 5,
            visibility: 1,
            vibration: true,
            sound: 'mixkit_bell_notification_933.wav'
        });
        await push.addListener('registration', async token => {
            if (!currentUser || !token?.value) return;
            await setDoc(doc(db, 'users', currentUser.uid), {
                pushTokens: arrayUnion(token.value),
                pushPlatform: 'android',
                pushUpdatedAt: serverTimestamp()
            }, { merge: true });
        });
        await push.addListener('registrationError', error => console.warn('Registrasi push belum aktif:', error));
        await push.addListener('pushNotificationActionPerformed', event => {
            const roomId = event?.notification?.data?.roomId;
            const room = allRoomsData.find(item => item.id === roomId);
            if (room) openChatRoom(room.id, room);
        });

        let permission = await push.checkPermissions();
        if (permission.receive === 'prompt') permission = await push.requestPermissions();
        if (permission.receive !== 'granted') return false;
        await push.register();
        nativePushReady = true;
        return true;
    } catch (error) {
        nativePushReady = false;
        console.warn('Push Android belum dapat didaftarkan:', error);
        return false;
    }
}

async function deleteRoomAndMessages(roomId) {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, { isDeleting: true });

    try {
        while (true) {
            const messageQuery = query(collection(db, "messages"), where("roomId", "==", roomId));
            const messageSnapshot = await getDocs(messageQuery);
            if (messageSnapshot.empty) break;

            const messageDocs = messageSnapshot.docs;
            for (let index = 0; index < messageDocs.length; index += 450) {
                const batch = writeBatch(db);
                messageDocs.slice(index, index + 450).forEach(messageDoc => batch.delete(messageDoc.ref));
                await batch.commit();
            }
        }

        await deleteDoc(roomRef);
    } catch (error) {
        try { await updateDoc(roomRef, { isDeleting: false }); } catch (_) { /* best effort */ }
        throw error;
    }
}

// --- ACTIVITY LOGGING (NEW) ---
async function logActivity(type, detail) {
    if(!currentUser) return;
    try {
        await addDoc(collection(db, "activity_logs"), {
            type: type, // 'upload', 'download', 'message'
            userEmail: currentUser.email,
            userName: currentUser.displayName || "User",
            detail: detail,
            timestamp: serverTimestamp()
        });
    } catch(e) { console.error("Failed to log activity:", e); }
}

// Update Last Active status
async function updateUserActivity() {
    if(currentUser) {
        try {
            await updateDoc(doc(db, "users", currentUser.uid), { lastActive: serverTimestamp() });
        } catch(e) { /* silent fail */ }
    }
}
setInterval(updateUserActivity, 5 * 60 * 1000); // Update every 5 mins

// --- UPLOAD HELPER ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    let resourceType = 'raw';
    if (file.type.startsWith('image/')) resourceType = 'image';
    else if (file.type.startsWith('video/')) resourceType = 'video';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if(data.error) throw new Error(data.error.message);
    return { url: data.secure_url, type: resourceType };
}

// --- LOGOUT / ACCOUNT INFO ---
dom.logoutBtn.onclick = () => {
    dom.logoutModal.classList.remove('hidden');
    dom.logoutTitle.innerText = "Informasi Akun";
    
    const dName = currentUser.displayName || currentUser.email.split('@')[0];
    dom.logoutUsernameDisplay.value = dName;
    dom.logoutUsernameDisplay.setAttribute("readonly", true);
    dom.logoutUsernameDisplay.classList.add("border-transparent");
    dom.logoutUsernameDisplay.classList.remove("border-gray-400", "border-dashed");
    
    dom.logoutUserIdDisplay.value = currentCustomUserId;

    dom.btnEditUsername.classList.remove("hidden");
    dom.btnSaveUsername.classList.add("hidden");

    dom.logoutEmailDisplay.innerText = currentUser.email;
    dom.logoutPasswordDisplay.innerText = "********";
    dom.logoutPasswordDisplay.classList.add("tracking-widest");
    
    dom.btnTogglePassword.innerText = "Lihat Password";
    dom.btnTogglePassword.classList.remove('hidden');
    dom.logoutActionButtons.classList.add('hidden');
    dom.logoutActionButtons.classList.remove('flex');
};

dom.btnCopyUserId.onclick = () => {
    navigator.clipboard.writeText(currentCustomUserId);
    showToast("User ID disalin ke clipboard", "success");
};

dom.btnEditUsername.onclick = () => {
    dom.logoutUsernameDisplay.removeAttribute("readonly");
    dom.logoutUsernameDisplay.classList.remove("border-transparent");
    dom.logoutUsernameDisplay.classList.add("border-gray-400", "border-dashed");
    dom.logoutUsernameDisplay.focus();
    
    dom.btnEditUsername.classList.add("hidden");
    dom.btnSaveUsername.classList.remove("hidden");
};

dom.btnSaveUsername.onclick = async () => {
    const newName = dom.logoutUsernameDisplay.value.trim();
    if(!newName) return showToast("Username tidak boleh kosong", "error");
    
    try {
        await updateProfile(currentUser, { displayName: newName });
        await updateDoc(doc(db, "users", currentUser.uid), { displayName: newName });

        const roomsQuery = query(collection(db, "rooms"), where("memberIds", "array-contains", currentUser.uid));
        const roomsSnapshot = await getDocs(roomsQuery);
        await Promise.all(roomsSnapshot.docs.map(roomDocument => {
            const roomData = roomDocument.data();
            const updatedMembers = (roomData.members || []).map(member => {
                if (typeof member !== 'object' || member.uid !== currentUser.uid) return member;
                return { ...member, username: newName };
            });
            return updateDoc(roomDocument.ref, { members: updatedMembers });
        }));
        
        updateSidebarProfile();
        showToast("Username berhasil diperbarui!", "success");
        
        dom.logoutUsernameDisplay.setAttribute("readonly", true);
        dom.logoutUsernameDisplay.classList.add("border-transparent");
        dom.logoutUsernameDisplay.classList.remove("border-gray-400", "border-dashed");
        dom.btnEditUsername.classList.remove("hidden");
        dom.btnSaveUsername.classList.add("hidden");
    } catch (e) {
        showToast("Gagal update username: " + e.message, "error");
    }
};

dom.btnTogglePassword.onclick = () => {
    dom.logoutTitle.innerText = "Keluar Sekarang, Pastikan ingat password Anda:";
    dom.logoutPasswordDisplay.innerText = currentSessionPassword;
    dom.logoutPasswordDisplay.classList.remove("tracking-widest");
    
    dom.btnTogglePassword.classList.add('hidden');
    dom.logoutActionButtons.classList.remove('hidden');
    dom.logoutActionButtons.classList.add('flex');
};

dom.btnCancelLogout.onclick = () => dom.logoutModal.classList.add('hidden');
dom.btnConfirmLogout.onclick = () => {
    dom.logoutModal.classList.add('hidden');
    currentSessionPassword = "(Password terenkripsi, masuk via Auto-Login)"; 
    signOut(auth);
};

function updateSidebarProfile() {
    const dName = currentUser.displayName || currentUser.email.split('@')[0];
    dom.sidebarTitle.innerText = dName; 
    dom.sidebarEmail.innerText = currentUser.email; 
    
    if (currentUser.photoURL) {
        dom.sidebarUserAvatar.src = currentUser.photoURL;
        dom.sidebarUserAvatar.classList.remove('hidden');
        dom.sidebarUserInitial.classList.add('hidden');
    } else {
        dom.sidebarUserInitial.innerText = dName[0].toUpperCase();
        dom.sidebarUserInitial.classList.remove('hidden');
        dom.sidebarUserAvatar.classList.add('hidden');
    }
}

dom.userProfileBtn.onclick = () => dom.userAvatarInput.click();
dom.userAvatarInput.onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    showToast("Mengunggah foto profil...", "success");
    dom.userProfileBtn.classList.add("animate-pulse");
    try {
        const uploadData = await uploadToCloudinary(file);
        await updateProfile(currentUser, { photoURL: uploadData.url });
        updateSidebarProfile();
        showToast("Foto profil diperbarui!", "success");
    } catch(err) { 
        showToast("Gagal: " + err.message, "error"); 
    } finally {
        dom.userProfileBtn.classList.remove("animate-pulse");
        e.target.value = '';
    }
};

dom.roomProfileBtn.onclick = () => {
    if(!currentRoomData) return;
    if(checkIsAdmin()) {
        dom.roomAvatarInput.click();
    } else {
        showToast("Hanya Admin yang dapat mengubah foto grup.", "error");
    }
};

dom.roomAvatarInput.onchange = async (e) => {
    const file = e.target.files[0];
    if(!file || !currentRoomId) return;
    const targetRoomId = currentRoomId;
    
    showToast("Mengunggah foto grup...", "success");
    dom.roomProfileBtn.classList.add("animate-pulse");
    try {
        const uploadData = await uploadToCloudinary(file);
        await updateDoc(doc(db, "rooms", targetRoomId), { avatarUrl: uploadData.url });
        showToast("Foto grup diperbarui!", "success");
    } catch(err) { 
        showToast("Gagal: " + err.message, "error"); 
    } finally {
        dom.roomProfileBtn.classList.remove("animate-pulse");
        e.target.value = '';
    }
};

// --- SCROLL TO BOTTOM LOGIC ---
let unreadCount = 0;

dom.chatBox.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = dom.chatBox;
    if (scrollHeight - scrollTop - clientHeight > 200) {
        dom.scrollToBottomBtn.classList.remove('hidden', 'translate-y-10', 'opacity-0');
    } else {
        dom.scrollToBottomBtn.classList.add('translate-y-10', 'opacity-0');
        unreadCount = 0;
        dom.unreadBadge.classList.add('hidden');
        setTimeout(() => {
            if(dom.scrollToBottomBtn.classList.contains('opacity-0')) {
                dom.scrollToBottomBtn.classList.add('hidden');
            }
        }, 300);
    }
});

dom.scrollToBottomBtn.onclick = () => {
    dom.chatBox.scrollTo({ top: dom.chatBox.scrollHeight, behavior: 'smooth' });
    unreadCount = 0;
    dom.unreadBadge.classList.add('hidden');
};


// --- VIEWER, PAN & CAPTION LOGIC ---
let zoomLevel = 1;
let isDragging = false;
let startX, startY;
let translateX = 0, translateY = 0;
let initialPinchDistance = 0;
let initialPinchZoom = 1;
let lastTouchX = 0;
let lastTouchY = 0;
let lastTapAt = 0;

function updateImageTransform() {
    dom.viewerImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
    if (zoomLevel > 1) {
        dom.viewerImage.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else {
        dom.viewerImage.style.cursor = 'default';
    }
}

// Fitur Zoom dengan Scroll
dom.viewerImage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if(e.deltaY < 0) {
        zoomLevel = Math.min(zoomLevel + 0.2, 5); // Maksimal Zoom 5x
    } else {
        zoomLevel = Math.max(zoomLevel - 0.2, 1); // Minimal Zoom 1x
        if (zoomLevel === 1) {
            translateX = 0; // Kembalikan ke tengah jika zoom di-reset
            translateY = 0;
        }
    }
    updateImageTransform();
});

// Fitur Geser Gambar (Drag & Pan) HANYA saat diklik dan ditahan
dom.viewerImage.addEventListener('mousedown', (e) => {
    e.preventDefault(); // FIX: Mencegah efek drag bawaan browser
    if (zoomLevel > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        updateImageTransform();
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateImageTransform();
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        updateImageTransform();
    }
});

window.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        updateImageTransform();
    }
});

function touchDistance(touches) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

dom.viewerImage.addEventListener('touchstart', event => {
    event.preventDefault();
    if (event.touches.length === 2) {
        initialPinchDistance = touchDistance(event.touches);
        initialPinchZoom = zoomLevel;
        isDragging = false;
        return;
    }
    if (event.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapAt < 280) {
            zoomLevel = zoomLevel > 1 ? 1 : 2.5;
            if (zoomLevel === 1) translateX = translateY = 0;
            updateImageTransform();
            lastTapAt = 0;
        } else {
            lastTapAt = now;
        }
        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
        isDragging = zoomLevel > 1;
    }
}, { passive: false });

dom.viewerImage.addEventListener('touchmove', event => {
    event.preventDefault();
    if (event.touches.length === 2 && initialPinchDistance > 0) {
        zoomLevel = Math.min(5, Math.max(1, initialPinchZoom * (touchDistance(event.touches) / initialPinchDistance)));
        if (zoomLevel === 1) translateX = translateY = 0;
        updateImageTransform();
        return;
    }
    if (event.touches.length === 1 && zoomLevel > 1) {
        const touch = event.touches[0];
        translateX += touch.clientX - lastTouchX;
        translateY += touch.clientY - lastTouchY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        updateImageTransform();
    }
}, { passive: false });

dom.viewerImage.addEventListener('touchend', event => {
    if (event.touches.length < 2) initialPinchDistance = 0;
    if (event.touches.length === 0) isDragging = false;
    updateImageTransform();
}, { passive: true });

dom.viewerImage.addEventListener('touchcancel', () => {
    initialPinchDistance = 0;
    isDragging = false;
    updateImageTransform();
}, { passive: true });

window.viewImage = (url, type, originalName = 'download', msgId = null, currentCaption = '') => {
    dom.imageViewer.classList.remove('hidden');
    dom.downloadOptions.classList.add('hidden'); 
    
    // Reset Zoom dan Posisi
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();
    
    // Reset Panel Keterangan State
    dom.captionContainer.classList.add('hidden');
    dom.captionInput.value = currentCaption || ''; // Tampilkan keterangan jika sudah ada
    
    let baseName = originalName;
    if(baseName.includes('.')) baseName = baseName.substring(0, baseName.lastIndexOf('.'));

    if (type === 'video') {
        dom.viewerImage.classList.add('hidden');
        dom.openCaptionBtn.classList.add('hidden'); // Matikan Keterangan untuk Video
        dom.viewerVideo.classList.remove('hidden');
        dom.viewerVideo.src = url;
        dom.dlBtnText.innerText = "Download Video";
        dom.viewerMainDownloadBtn.onclick = () => {
            const dlUrl = url.replace('/upload/', '/upload/fl_attachment/');
            window.downloadFile(dlUrl, originalName);
        };
    } else {
        dom.viewerVideo.classList.add('hidden');
        dom.viewerImage.classList.remove('hidden');
        dom.openCaptionBtn.classList.remove('hidden'); // Aktifkan Keterangan untuk Gambar
        dom.viewerImage.src = url;
        dom.dlBtnText.innerText = "Download Options";
        
        // Simpan URL gambar dan ID Pesan untuk Keterangan
        dom.openCaptionBtn.dataset.imageUrl = url;
        dom.openCaptionBtn.dataset.msgId = msgId;

        dom.viewerMainDownloadBtn.onclick = (e) => {
            e.stopPropagation();
            dom.downloadOptions.classList.toggle('hidden');
        };

        dom.btnDlJpg.onclick = () => {
            const dlUrl = url.replace('/upload/', '/upload/f_jpg,fl_attachment/');
            window.downloadFile(dlUrl, `${baseName}.jpg`);
            dom.downloadOptions.classList.add('hidden');
        };
        dom.btnDlPng.onclick = () => {
            const dlUrl = url.replace('/upload/', '/upload/f_png,fl_attachment/');
            window.downloadFile(dlUrl, `${baseName}.png`);
            dom.downloadOptions.classList.add('hidden');
        };
    }
};

document.addEventListener('click', (e) => {
    if (!dom.downloadOptions.contains(e.target) && !dom.viewerMainDownloadBtn.contains(e.target)) {
        dom.downloadOptions.classList.add('hidden');
    }
});

document.getElementById('closeImageViewer').onclick = closeImageViewer;

// Event Listeners UI Keterangan (Caption)
dom.openCaptionBtn.onclick = () => dom.captionContainer.classList.remove('hidden');
dom.closeCaptionBtn.onclick = () => dom.captionContainer.classList.add('hidden');

// Modifikasi Logika Simpan agar muncul konfirmasi terlebih dahulu
dom.saveCaptionBtn.onclick = () => {
    const newCaption = dom.captionInput.value.trim();
    
    showCustomConfirm("Simpan Keterangan", "Apakah Anda yakin ingin menyimpan keterangan ini untuk gambar?", async () => {
        const msgId = dom.openCaptionBtn.dataset.msgId;
        const imageUrl = dom.openCaptionBtn.dataset.imageUrl;

        if (!msgId) return showToast("Tidak dapat menemukan ID pesan", "error");

        dom.saveCaptionBtn.disabled = true;
        dom.saveCaptionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        try {
            const msgRef = doc(db, "messages", msgId);
            const msgSnap = await getDoc(msgRef);
            
            if (msgSnap.exists()) {
                const data = msgSnap.data();
                let updatedAttachments = data.attachments || [];
                let updated = false;

                // Update array attachment yang sesuai dengan URL gambarnya
                updatedAttachments = updatedAttachments.map(att => {
                    if (att.fileUrl === imageUrl) {
                        att.caption = newCaption;
                        updated = true;
                    }
                    return att;
                });

                // Fallback untuk sistem lama dimana URL file hanya di root object
                if (!updated && data.fileUrl === imageUrl) {
                    updatedAttachments.push({
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        type: data.type,
                        caption: newCaption
                    });
                }

                // Simpan perubahan ke Firestore
                await updateDoc(msgRef, { attachments: updatedAttachments });
                showToast("Keterangan berhasil disimpan!", "success");
                dom.captionContainer.classList.add('hidden');
            }
        } catch (error) {
            showToast("Gagal menyimpan: " + error.message, "error");
        } finally {
            dom.saveCaptionBtn.disabled = false;
            dom.saveCaptionBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Keterangan';
        }
    });
};


window.downloadFile = async (url, filename) => {
    const safeFilename = String(filename || 'unduhan')
        .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
        .replace(/^\.+/, '')
        .trim() || 'unduhan';
    showToast(`Mengunduh ${safeFilename}...`, "success");
    logActivity("download", safeFilename); // DEV LOGGING

    try {
        const capacitor = window.Capacitor;
        const isNativeAndroid = capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === 'android';
        const nativeDownloader = capacitor?.Plugins?.NativeDownload;

        if (isNativeAndroid && nativeDownloader) {
            await nativeDownloader.download({ url, fileName: safeFilename });
            showToast(`Download dimulai. Cek folder Download: ${safeFilename}`, "success");
            return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
        showToast(`File tersimpan: ${safeFilename}`, "success");
    } catch (e) {
        const capacitor = window.Capacitor;
        if (capacitor?.isNativePlatform?.()) {
            showToast(e?.message || "Download gagal. Periksa koneksi dan izin aplikasi.", "error");
            return;
        }

        showToast("Unduhan dibuka langsung karena file tidak dapat diproses browser.", "error");
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = safeFilename;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

// --- ATTACHMENT ---
dom.multiAttachBtn.onclick = () => dom.multiFileInput.click();

function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
        if (file.size > 10 * 1024 * 1024) { 
            showToast(`File ${file.name} terlalu besar (Max 10MB)`, "error");
            return false;
        }
        return true;
    });

    if(validFiles.length > 0) {
        pendingFiles = pendingFiles.concat(validFiles);
        renderPendingFiles();
    }
    e.target.value = ''; 
}
dom.multiFileInput.onchange = handleFileSelection;

window.removePendingFile = (index) => {
    pendingFiles.splice(index, 1);
    renderPendingFiles();
};

function renderPendingFiles() {
    pendingPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    pendingPreviewUrls = [];

    if(pendingFiles.length === 0) {
        dom.multiPreviewContainer.classList.add('hidden');
        return;
    }
    
    dom.multiPreviewContainer.classList.remove('hidden');
    dom.multiPreviewList.innerHTML = '';
    
    pendingFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = "relative flex items-center gap-2 p-2 bg-gray-50 border rounded-lg max-w-[200px] w-full group";
        
        let iconHtml = '<i class="fas fa-file-alt text-2xl text-indigo-400"></i>';
        if (file.type.startsWith('image/')) {
            const tempUrl = URL.createObjectURL(file);
            pendingPreviewUrls.push(tempUrl);
            iconHtml = `<img src="${tempUrl}" class="w-8 h-8 object-cover rounded shadow-sm">`;
        } else if (file.type.startsWith('video/')) {
            iconHtml = '<i class="fas fa-video text-2xl text-purple-400"></i>';
        }

        div.innerHTML = `
            <div class="flex-shrink-0">${iconHtml}</div>
            <div class="overflow-hidden w-full">
                <p class="text-xs font-bold text-gray-700 truncate" title="${file.name}">${file.name}</p>
                <p class="text-[10px] text-gray-400">${(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onclick="removePendingFile(${index})" class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow transition scale-0 group-hover:scale-100">
                <i class="fas fa-times text-[10px]"></i>
            </button>
        `;
        dom.multiPreviewList.appendChild(div);
    });
}

// --- SEARCH SYSTEM ---
dom.searchMenuBtn.onclick = () => {
    dom.searchContainer.classList.remove('hidden');
    dom.searchContainer.classList.add('flex');
    dom.searchInput.focus();
};

dom.closeSearchBtn.onclick = () => {
    dom.searchContainer.classList.add('hidden');
    dom.searchContainer.classList.remove('flex');
    dom.searchInput.value = '';
    searchQuery = '';
    renderAllMessages(); 
};

dom.searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderAllMessages(); 
};

// --- AUTH SYSTEM ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        dom.authOverlay.classList.add('hidden');
        dom.appContainer.classList.remove('hidden');
        
        updateSidebarProfile();
        loadRooms(); 
        updateUserActivity(); // Set online

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            const dName = user.displayName || user.email.split('@')[0];

            if (userSnap.exists()) {
                if (userSnap.data().disabled) {
                    showToast("Akses akun ini telah dinonaktifkan oleh pengelola.", "error");
                    await signOut(auth);
                    return;
                }
                currentCustomUserId = userSnap.data().userId;
                await updateDoc(userRef, { email: user.email, displayName: dName, lastActive: serverTimestamp() });
            } else {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
                let newId = ''; 
                for(let i=0; i<12; i++) newId += chars.charAt(Math.floor(Math.random() * chars.length));
                currentCustomUserId = newId;
                await setDoc(userRef, { userId: currentCustomUserId, email: user.email, displayName: dName, lastActive: serverTimestamp() });
            }
            const savedNotificationRooms = JSON.parse(localStorage.getItem(`notif_${user.uid}`) || '[]');
            if (savedNotificationRooms.length) {
                await setDoc(userRef, { notificationRooms: arrayUnion(...savedNotificationRooms) }, { merge: true });
            }
            syncNotificationListeners();
            void setupNativePushNotifications();
            if (pendingJoinCode) {
                document.getElementById('joinRoomCode').value = pendingJoinCode;
                toggleModal('modalJoin', true);
                pendingJoinCode = null;
            }
        } catch (e) { console.error("Error setting user ID:", e); }

    } else {
        if (unsubscribeRooms) { unsubscribeRooms(); unsubscribeRooms = null; }
        if (unsubscribeMsg) { unsubscribeMsg(); unsubscribeMsg = null; }
        if (unsubscribeDevLogs) { unsubscribeDevLogs(); unsubscribeDevLogs = null; }
        clearNotificationListeners();
        if (isNativeAndroid() && nativePushInitialized) {
            try { await window.Capacitor?.Plugins?.PushNotifications?.removeAllListeners(); } catch (_) { /* logout tetap lanjut */ }
        }
        nativePushInitialized = false;
        nativePushReady = false;
        
        currentUser = null;
        currentCustomUserId = "LOADING...";
        currentRoomId = null;
        currentRoomData = null;
        currentRoomMessages = [];
        allRoomsData = [];
        searchQuery = "";
        pendingFiles = [];

        dom.roomsContainer.innerHTML = '';
        dom.archivedRoomsContainer.innerHTML = '';
        dom.chatBox.innerHTML = '';
        
        dom.emptyChatState.classList.remove('hidden');
        dom.chatHeader.classList.add('hidden');
        dom.chatBox.classList.add('hidden');
        dom.chatInputArea.classList.add('hidden');
        dom.groupMenuDropdown.classList.add('hidden');
        
        dom.authOverlay.classList.remove('hidden');
        dom.appContainer.classList.add('hidden');
        dom.forgotBox.classList.add('hidden');
        dom.loginBox.classList.remove('hidden');
    }
});

dom.showForgotBtn.onclick = () => {
    dom.loginBox.classList.add('hidden');
    dom.forgotBox.classList.remove('hidden');
    dom.forgotEmailInput.value = document.getElementById('emailInput').value;
};

dom.backToLoginBtn.onclick = () => {
    dom.forgotBox.classList.add('hidden');
    dom.loginBox.classList.remove('hidden');
};

dom.sendResetBtn.onclick = async () => {
    const email = dom.forgotEmailInput.value.trim();
    if (!email) return showToast("Masukkan alamat email Anda terlebih dahulu!", "error");
    dom.sendResetBtn.disabled = true;
    dom.sendResetBtn.innerText = "Mengirim...";
    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Tautan reset terkirim! Silakan cek email Anda.", "success");
        dom.forgotEmailInput.value = '';
        dom.backToLoginBtn.click(); 
    } catch (e) { showToast("Gagal: " + e.message, "error"); } 
    finally { dom.sendResetBtn.disabled = false; dom.sendResetBtn.innerText = "Kirim Link Reset"; }
};

document.getElementById('toggleAuthBtn').onclick = function() {
    const isLogin = document.getElementById('authBtn').innerText.includes("Masuk");
    if (isLogin) {
        this.innerHTML = `Sudah punya akun? <span class="font-bold">Login Disini</span>`;
        document.getElementById('authBtn').innerText = "Daftar Akun Baru";
        document.getElementById('authTitle').innerText = "Buat Akun Baru";
        document.getElementById('usernameField').classList.remove('hidden');
        dom.showForgotBtn.classList.add('hidden'); 
    } else {
        this.innerHTML = `Belum punya akun? <span class="font-bold">Daftar Sekarang</span>`;
        document.getElementById('authBtn').innerText = "Masuk";
        document.getElementById('authTitle').innerText = "Login untuk Masuk";
        document.getElementById('usernameField').classList.add('hidden');
        dom.showForgotBtn.classList.remove('hidden'); 
    }
};

document.getElementById('authBtn').onclick = async () => {
    const authButton = document.getElementById('authBtn');
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passInput').value;
    const username = document.getElementById('usernameInput').value.trim();
    const isRegister = authButton.innerText.includes("Daftar");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return showToast("Masukkan alamat email yang valid.", "error");
    if (!pass) return showToast("Password wajib diisi.", "error");
    if (isRegister && !username) return showToast("Username wajib diisi!", "error");

    const originalLabel = authButton.innerText;
    authButton.disabled = true;
    authButton.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Memproses...';
    try {
        if (isRegister) {
            const userCred = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCred.user, { displayName: username });
            currentUser = userCred.user;
            currentSessionPassword = pass; 
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
            currentSessionPassword = pass; 
        }
    } catch (e) {
        const friendlyErrors = {
            'auth/email-already-in-use': 'Email ini sudah terdaftar.',
            'auth/invalid-credential': 'Email atau password salah.',
            'auth/weak-password': 'Password terlalu lemah. Gunakan minimal 6 karakter.',
            'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu sebentar.'
        };
        showToast(friendlyErrors[e.code] || e.message, 'error');
    } finally {
        authButton.disabled = false;
        authButton.innerText = originalLabel;
    }
};

// --- MODALS ---
const toggleModal = (id, show) => document.getElementById(id).classList.toggle('hidden', !show);
document.getElementById('btnOpenCreate').onclick = () => toggleModal('modalCreate', true);
document.getElementById('btnOpenJoin').onclick = () => toggleModal('modalJoin', true);
document.getElementById('btnCloseCreate').onclick = () => toggleModal('modalCreate', false);
document.getElementById('btnCloseJoin').onclick = () => toggleModal('modalJoin', false);
document.getElementById('btnCloseSuccess').onclick = () => toggleModal('modalSuccess', false);
document.getElementById('btnCloseRename').onclick = () => toggleModal('modalRename', false);
dom.btnCloseAccess.onclick = () => toggleModal('modalAccess', false);
dom.btnCloseMembers.onclick = () => toggleModal('modalMembers', false);

function extractRoomCode(value) {
    if (!value) return null;
    const raw = String(value).trim();
    try {
        const parsed = new URL(raw);
        const fromUrl = parsed.searchParams.get('join');
        if (fromUrl && /^[A-Z0-9]{7}$/i.test(fromUrl)) return fromUrl.toUpperCase();
    } catch (_) { /* QR dapat berisi kode langsung */ }
    const normalized = raw.replace(/^SVRMANAGER\s*:\s*/i, '').trim().toUpperCase();
    return /^[A-Z0-9]{7}$/.test(normalized) ? normalized : null;
}

function renderRoomQr(container, code) {
    if (!container || !code || typeof window.qrcode !== 'function') return;
    const qr = window.qrcode(0, 'M');
    qr.addData(`https://svrmanager.my.id/?join=${encodeURIComponent(code)}`);
    qr.make();
    container.innerHTML = qr.createImgTag(6, 8, `QR grup ${code}`);
}

function applyScannedRoomCode(value) {
    const code = extractRoomCode(value);
    const status = document.getElementById('qrScanStatus');
    if (!code) {
        if (status) status.textContent = 'QR ini bukan QR grup Server Manager yang valid.';
        return false;
    }
    document.getElementById('joinRoomCode').value = code;
    void stopQrScanner();
    toggleModal('modalQrScanner', false);
    toggleModal('modalJoin', true);
    showToast(`Kode grup ${code} berhasil dipindai.`, 'success');
    return true;
}

async function stopQrScanner() {
    if (!qrScanner) return;
    try {
        if (qrScannerRunning) await qrScanner.stop();
    } catch (_) { /* scanner mungkin sudah berhenti */ }
    try { await qrScanner.clear(); } catch (_) { /* elemen akan dipakai ulang */ }
    qrScannerRunning = false;
    qrScanner = null;
}

async function startQrScanner() {
    const status = document.getElementById('qrScanStatus');
    if (typeof window.Html5Qrcode !== 'function') {
        status.textContent = 'Pemindai QR gagal dimuat. Gunakan gambar QR atau masukkan kode.';
        return;
    }
    await stopQrScanner();
    qrScanner = new window.Html5Qrcode('qrReader');
    status.textContent = 'Meminta izin kamera…';
    try {
        await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: (width, height) => {
                const size = Math.floor(Math.min(width, height) * 0.72);
                return { width: size, height: size };
            } },
            decodedText => {
                qrScannerRunning = true;
                applyScannedRoomCode(decodedText);
            },
            () => {}
        );
        qrScannerRunning = true;
        status.textContent = 'Arahkan kamera ke QR grup.';
    } catch (error) {
        status.textContent = 'Kamera tidak tersedia. Pilih gambar QR atau masukkan kode secara manual.';
        console.warn('QR camera:', error);
    }
}

document.getElementById('btnScanQr').onclick = () => {
    toggleModal('modalJoin', false);
    toggleModal('modalQrScanner', true);
    void startQrScanner();
};

document.getElementById('btnCloseQrScanner').onclick = () => {
    void stopQrScanner();
    toggleModal('modalQrScanner', false);
    toggleModal('modalJoin', true);
};

document.getElementById('qrImageInput').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file || typeof window.Html5Qrcode !== 'function') return;
    const status = document.getElementById('qrScanStatus');
    await stopQrScanner();
    qrScanner = new window.Html5Qrcode('qrReader');
    try {
        status.textContent = 'Membaca gambar QR…';
        const decodedText = await qrScanner.scanFile(file, true);
        applyScannedRoomCode(decodedText);
    } catch (error) {
        status.textContent = 'QR tidak terbaca. Coba gambar yang lebih jelas.';
    } finally {
        event.target.value = '';
    }
};

// --- GROUP LOGIC ---
document.getElementById('confirmCreateRoom').onclick = async () => {
    const name = document.getElementById('newRoomName').value.trim();
    if(!name) return;
    const code = Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
        const myProfile = { uid: currentUser.uid, email: currentUser.email, username: currentUser.displayName || currentUser.email };
        await addDoc(collection(db, "rooms"), {
            name: name, code: code, members: [myProfile], memberIds: [currentUser.uid], 
            createdBy: currentUser.email, 
            admins: [currentUser.uid], 
            avatarUrl: null, 
            isPrivate: false, 
            pendingMembers: [],
            createdAt: serverTimestamp()
        });
        toggleModal('modalCreate', false); toggleModal('modalSuccess', true);
        document.getElementById('generatedCodeDisplay').innerText = code;
        renderRoomQr(document.getElementById('generatedQrCode'), code);
        document.getElementById('newRoomName').value = '';
    } catch (e) { showToast(e.message, 'error'); }
};

document.getElementById('confirmJoinRoom').onclick = async () => {
    const joinButton = document.getElementById('confirmJoinRoom');
    const code = document.getElementById('joinRoomCode').value.trim().toUpperCase();
    if(!code) return;

    joinButton.disabled = true;
    const originalLabel = joinButton.innerHTML;
    joinButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    try {
        const q = query(collection(db, "rooms"), where("code", "==", code));
        const snap = await getDocs(q);
        if(snap.empty) return showToast("Kode salah atau tidak ditemukan!", 'error');

        const roomDoc = snap.docs[0];
        const roomData = roomDoc.data();

        if(roomData.isDeleting) return showToast("Grup ini sedang dihapus.", 'error');
        if(roomData.memberIds && roomData.memberIds.includes(currentUser.uid)) return showToast("Anda sudah berada di grup ini.", 'error');
        if(roomData.pendingMembers && roomData.pendingMembers.some(m => m.uid === currentUser.uid)) return showToast("Menunggu persetujuan admin grup.", 'error');

        const myProfile = { uid: currentUser.uid, email: currentUser.email, username: currentUser.displayName || currentUser.email.split('@')[0] };
        
        if (roomData.isPrivate) {
            await updateDoc(roomDoc.ref, { pendingMembers: arrayUnion(myProfile) });
            showToast("Permintaan bergabung dikirim ke Admin.", 'success');
        } else {
            await updateDoc(roomDoc.ref, { members: arrayUnion(myProfile), memberIds: arrayUnion(currentUser.uid) });
            showToast("Berhasil bergabung ke grup!", 'success');
        }
        toggleModal('modalJoin', false); 
        document.getElementById('joinRoomCode').value = '';
    } catch (e) {
        showToast("Gagal bergabung: " + e.message, 'error');
    } finally {
        joinButton.disabled = false;
        joinButton.innerHTML = originalLabel;
    }
};

// --- ARSIP & LOAD ROOMS ---
dom.toggleArchiveBtn.onclick = () => {
    dom.archivedRoomsContainer.classList.toggle('hidden');
    dom.archiveIcon.classList.toggle('rotate-180');
};

function renderRoomsList() {
    dom.roomsContainer.innerHTML = '';
    dom.archivedRoomsContainer.innerHTML = '';
    let archivedList = JSON.parse(localStorage.getItem(`archive_${currentUser.uid}`) || '[]');
    
    allRoomsData.forEach(data => {
        const el = document.createElement('div');
        el.className = "p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition flex items-center gap-3";
        
        let avatarHtml = '';
        if(data.avatarUrl) {
            avatarHtml = `<img src="${data.avatarUrl}" class="w-10 h-10 rounded-full object-cover shadow-sm">`;
        } else {
            avatarHtml = `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">${data.name[0].toUpperCase()}</div>`;
        }
        
        const privateIcon = data.isPrivate ? '<i class="fas fa-lock text-[8px] text-gray-400 ml-1" title="Grup Privat"></i>' : '';

        el.innerHTML = `
            <div class="flex-shrink-0">${avatarHtml}</div>
            <div class="overflow-hidden w-full">
                <h4 class="font-bold text-gray-800 text-sm truncate w-full flex items-center">${data.name} ${privateIcon}</h4>
                <p class="text-[10px] text-gray-400">${data.members ? data.members.length : 0} Anggota</p>
            </div>
        `;
        el.onclick = () => openChatRoom(data.id, data);
        
        if (archivedList.includes(data.id)) {
            dom.archivedRoomsContainer.appendChild(el);
        } else {
            dom.roomsContainer.appendChild(el);
        }
    });
}

function loadRooms() {
    if (unsubscribeRooms) unsubscribeRooms(); 
    
    const q = query(collection(db, "rooms"), where("memberIds", "array-contains", currentUser.uid));
    unsubscribeRooms = onSnapshot(q, (snap) => {
        allRoomsData = [];
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allRoomsData.push(data);
            
            if(data.id === currentRoomId) {
                currentRoomData = data;
                document.getElementById('activeRoomName').innerText = data.name;
                updateHeaderRoomProfile();
                
                if (!dom.modalMembers.classList.contains('hidden')) {
                    renderMembersModal();
                }
            }
        });
        renderRoomsList();
    }, (error) => {
        console.error("Error load rooms:", error);
        showToast("Error memuat grup: " + error.message, "error");
    });
}

function updateHeaderRoomProfile() {
    if(!currentRoomData) return;
    
    if (currentRoomData.avatarUrl) {
        dom.headerRoomAvatar.src = currentRoomData.avatarUrl;
        dom.headerRoomAvatar.classList.remove('hidden');
        dom.headerRoomInitial.classList.add('hidden');
    } else {
        dom.headerRoomInitial.innerText = currentRoomData.name[0].toUpperCase();
        dom.headerRoomInitial.classList.remove('hidden');
        dom.headerRoomAvatar.classList.add('hidden');
    }

    if (checkIsAdmin()) {
        dom.roomProfileOverlay.classList.remove('hidden');
        dom.renameRoomBtn.classList.remove('hidden');
        dom.accessSettingsBtn.classList.remove('hidden');
    } else {
        dom.roomProfileOverlay.classList.add('hidden');
        dom.renameRoomBtn.classList.add('hidden');
        dom.accessSettingsBtn.classList.add('hidden');
    }
}

function openChatRoom(roomId, roomData) {
    currentRoomId = roomId;
    currentRoomData = roomData;
    unreadCount = 0;
    dom.unreadBadge.classList.add('hidden');
    pendingFiles = [];
    renderPendingFiles();
    
    document.getElementById('activeRoomName').innerText = roomData.name;
    updateHeaderRoomProfile();

    dom.chatBox.innerHTML = '<div class="absolute inset-0 flex flex-col justify-center items-center bg-white z-10"><i class="fas fa-circle-notch fa-spin text-4xl text-indigo-500 mb-3"></i><span class="text-sm font-bold text-gray-400 animate-pulse">Mengambil data obrolan...</span></div>';
    currentRoomMessages = []; 

    dom.searchContainer.classList.add('hidden');
    dom.searchContainer.classList.remove('flex');
    dom.searchInput.value = '';
    searchQuery = '';
    updateDropdownMenuText(); 

    if (window.innerWidth < 768) {
        if (dom.chatPanel.classList.contains('translate-x-full')) {
            history.pushState({ page: 'chat' }, '', '#chat');
        }
        dom.roomListPanel.classList.add('-translate-x-full');
        dom.chatPanel.classList.remove('translate-x-full');
        dom.chatPanel.classList.remove('absolute');
    }
    dom.emptyChatState.classList.add('hidden'); 
    dom.chatHeader.classList.remove('hidden');
    dom.chatBox.classList.remove('hidden');
    dom.chatInputArea.classList.remove('hidden');
    dom.groupMenuDropdown.classList.add('hidden'); 
    loadMessages(roomId);
}

document.getElementById('backToDashboard').onclick = handleBackAction;

// --- MENU TITIK 3 ---
function updateDropdownMenuText() {
    let archivedList = JSON.parse(localStorage.getItem(`archive_${currentUser.uid}`) || '[]');
    let notifList = JSON.parse(localStorage.getItem(`notif_${currentUser.uid}`) || '[]');
    
    dom.archiveRoomBtn.innerHTML = archivedList.includes(currentRoomId) 
        ? '<i class="fas fa-box-open mr-2 text-gray-500"></i> Keluarkan dari Arsip'
        : '<i class="fas fa-archive mr-2 text-gray-500"></i> Arsipkan Chat';
        
    dom.toggleNotifBtn.innerHTML = notifList.includes(currentRoomId)
        ? '<i class="fas fa-bell-slash mr-2 text-yellow-500"></i> Matikan Notifikasi'
        : '<i class="fas fa-bell mr-2 text-yellow-500"></i> Aktifkan Notifikasi';
}

dom.groupMenuBtn.onclick = () => {
    updateDropdownMenuText();
    dom.groupMenuDropdown.classList.toggle('hidden');
};

dom.renameRoomBtn.onclick = () => {
    dom.groupMenuDropdown.classList.add('hidden');
    document.getElementById('editRoomNameInput').value = currentRoomData.name;
    toggleModal('modalRename', true);
};

document.getElementById('confirmRenameRoom').onclick = async () => {
    const newName = document.getElementById('editRoomNameInput').value.trim();
    if(!newName) return;
    try {
        await updateDoc(doc(db, "rooms", currentRoomId), { name: newName });
        toggleModal('modalRename', false);
        showToast("Nama grup berhasil diubah", "success");
    } catch (e) { showToast(e.message, 'error'); }
};

dom.accessSettingsBtn.onclick = () => {
    dom.groupMenuDropdown.classList.add('hidden');
    dom.accessCodeDisplay.value = currentRoomData.code;
    dom.togglePrivate.checked = currentRoomData.isPrivate || false;
    renderRoomQr(document.getElementById('accessQrCode'), currentRoomData.code);
    toggleModal('modalAccess', true);
};

dom.btnCopyAccessCode.onclick = () => {
    navigator.clipboard.writeText(currentRoomData.code);
    showToast("Kode grup disalin!", "success");
};

dom.togglePrivate.onchange = async (e) => {
    const isPrivat = e.target.checked;
    try {
        await updateDoc(doc(db, "rooms", currentRoomId), { isPrivate: isPrivat });
        showToast(`Grup diubah menjadi ${isPrivat ? 'Privat' : 'Publik'}`, "success");
    } catch (err) {
        showToast(err.message, "error");
        e.target.checked = !isPrivat; 
    }
};

dom.archiveRoomBtn.onclick = () => {
    dom.groupMenuDropdown.classList.add('hidden');
    let archivedList = JSON.parse(localStorage.getItem(`archive_${currentUser.uid}`) || '[]');
    if (archivedList.includes(currentRoomId)) {
        archivedList = archivedList.filter(id => id !== currentRoomId);
        showToast("Chat dikembalikan ke utama", "success");
    } else {
        archivedList.push(currentRoomId);
        showToast("Chat diarsipkan", "success");
        if (window.innerWidth < 768) history.back(); 
    }
    localStorage.setItem(`archive_${currentUser.uid}`, JSON.stringify(archivedList));
    renderRoomsList();
    updateDropdownMenuText();
};

dom.toggleNotifBtn.onclick = async () => {
    dom.groupMenuDropdown.classList.add('hidden');
    if (isNativeAndroid()) {
        const enabled = await setupNativePushNotifications();
        if (!enabled) showToast('Izin diberikan, tetapi push latar belakang belum terhubung ke Firebase Android.', 'error');
    } else if (!("Notification" in window)) {
        return showToast("Perangkat ini belum mendukung notifikasi web.", "error");
    } else if (Notification.permission !== "granted") {
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") return showToast("Izin notifikasi ditolak browser.", "error");
        } catch (e) { return showToast("Browser tidak mendukung notifikasi", "error"); }
    }
    
    let notifList = JSON.parse(localStorage.getItem(`notif_${currentUser.uid}`) || '[]');
    if (notifList.includes(currentRoomId)) {
        notifList = notifList.filter(id => id !== currentRoomId);
        await setDoc(doc(db, 'users', currentUser.uid), { notificationRooms: arrayRemove(currentRoomId) }, { merge: true });
        showToast("Notifikasi dimatikan untuk grup ini", "success");
    } else {
        notifList.push(currentRoomId);
        await setDoc(doc(db, 'users', currentUser.uid), { notificationRooms: arrayUnion(currentRoomId) }, { merge: true });
        showToast("Notifikasi diaktifkan untuk grup ini", "success");
    }
    localStorage.setItem(`notif_${currentUser.uid}`, JSON.stringify(notifList));
    syncNotificationListeners();
    updateDropdownMenuText();
};

async function checkAndShowNotification(roomId, msgData) {
    let notifList = JSON.parse(localStorage.getItem(`notif_${currentUser.uid}`) || '[]');
    if (notifList.includes(roomId)) {
        let notifBody = msgData.text || "Mengirim lampiran";
        if (msgData.attachments && msgData.attachments.length > 0) {
             notifBody = "Mengirim " + msgData.attachments.length + " file/gambar";
        }
        const title = msgData.username || "Pesan Baru";
        if (isNativeAndroid() && document.visibilityState === 'visible' && window.Capacitor?.Plugins?.NativeNotification) {
            try {
                await window.Capacitor.Plugins.NativeNotification.show({ title, body: notifBody, roomId });
                return;
            } catch (error) { console.warn('Notifikasi native:', error); }
        }
        if (isNativeAndroid()) return; // Saat di latar belakang, FCM menampilkan satu notifikasi sistem.
        if (("Notification" in window) && Notification.permission === "granted") {
            new Notification(title, { body: notifBody, icon: "icons/icon-192.webp" });
            playNotificationSound();
        }
    }
}

// --- MESSAGES LOGIC ---
function loadMessages(roomId) {
    if (unsubscribeMsg) unsubscribeMsg();
    
    const q = query(collection(db, "messages"), where("roomId", "==", roomId));
    let isFirstLoad = true; 
    
    unsubscribeMsg = onSnapshot(q, (snap) => {
        const newIncomingCount = isFirstLoad ? 0 : snap.docChanges().filter(change => {
            return change.type === "added" && change.doc.data().uid !== currentUser.uid;
        }).length;
        currentRoomMessages = []; 
        snap.forEach(doc => {
            const msgData = doc.data();
            msgData.id = doc.id;
            currentRoomMessages.push(msgData);
        });

        currentRoomMessages.sort((a, b) => {
            const timeA = (a.timestamp && typeof a.timestamp.toMillis === 'function') ? a.timestamp.toMillis() : Date.now();
            const timeB = (b.timestamp && typeof b.timestamp.toMillis === 'function') ? b.timestamp.toMillis() : Date.now();
            return timeA - timeB;
        });

        const wasFirstLoad = isFirstLoad;
        isFirstLoad = false;
        renderAllMessages(wasFirstLoad, newIncomingCount); 
    }, (error) => {
        console.error("Error load messages:", error);
        dom.chatBox.innerHTML = `<div class="p-6 text-center text-red-500 font-bold mt-10 bg-red-50 rounded-2xl mx-4 shadow-sm border border-red-100">Gagal Mengambil Obrolan: <br><span class="text-xs font-normal text-red-400 mt-2 block">${error.message}</span></div>`;
    });
}

function renderAllMessages(forceScrollToBottom = false, newIncomingCount = 0) {
    const previousScrollTop = dom.chatBox.scrollTop;
    const previousScrollHeight = dom.chatBox.scrollHeight;
    const wasNearBottom = previousScrollHeight - previousScrollTop - dom.chatBox.clientHeight <= 200;
    dom.chatBox.innerHTML = '';
    let lastDateString = null; 

    const isSearchingImage = searchQuery === 'gambar' || searchQuery === 'foto';
    const isSearchingVideo = searchQuery === 'video';
    const isSearchingFile = searchQuery === 'file' || searchQuery === 'dokumen' || searchQuery === 'pdf';

    const filteredMessages = currentRoomMessages.filter(msg => {
        if (!searchQuery) return true; 
        if (isSearchingImage && (msg.type === 'image' || (msg.attachments && msg.attachments.some(a => a.type === 'image')))) return true;
        if (isSearchingVideo && (msg.type === 'video' || (msg.attachments && msg.attachments.some(a => a.type === 'video')))) return true;
        if (isSearchingFile && (msg.type === 'raw' || (msg.attachments && msg.attachments.some(a => a.type === 'raw')))) return true;
        if (msg.text && msg.text.toLowerCase().includes(searchQuery)) return true;
        if (msg.fileName && msg.fileName.toLowerCase().includes(searchQuery)) return true;
        
        // Logika agar mencari ke dalam Keterangan Tersembunyi (Caption)
        if (msg.attachments && msg.attachments.length > 0) {
            return msg.attachments.some(att => 
                (att.fileName && att.fileName.toLowerCase().includes(searchQuery)) || 
                (att.caption && att.caption.toLowerCase().includes(searchQuery))
            );
        }
        return false; 
    });

    if (filteredMessages.length === 0 && searchQuery) {
        dom.chatBox.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm">Tidak ada hasil ditemukan untuk "<b>${searchQuery}</b>"</div>`;
        return;
    }

    filteredMessages.forEach(msgData => {
        const msgDate = msgData.timestamp ? msgData.timestamp.toDate() : new Date();
        const currentDateString = msgDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (currentDateString !== lastDateString) {
            const divider = document.createElement('div');
            divider.className = "chat-stream-item flex justify-center items-center my-6 select-none relative z-0";
            divider.innerHTML = `
                <div class="h-px bg-gray-200 flex-1"></div>
                <span class="px-4 py-1 rounded-full bg-gray-50 border text-[10px] font-bold text-gray-500 uppercase tracking-widest">${currentDateString}</span>
                <div class="h-px bg-gray-200 flex-1"></div>
            `;
            dom.chatBox.appendChild(divider);
            lastDateString = currentDateString;
        }
        renderMessage(msgData);
    });
    
    // Logika Auto-scroll yang disesuaikan
    if (!searchQuery) {
        if (forceScrollToBottom || wasNearBottom) {
            setTimeout(() => {
                dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
            }, 100); 
        } else {
            dom.chatBox.scrollTop = previousScrollTop;
            if (newIncomingCount > 0) {
                unreadCount += newIncomingCount;
                dom.unreadBadge.innerText = unreadCount;
                dom.unreadBadge.classList.remove('hidden');
            }
        }
    }
}

window.deleteMessage = (msgId) => {
    showCustomConfirm("Hapus Pesan", "Pesan akan dihapus untuk semua orang. Lanjutkan?", async () => {
        try {
            const msgRef = doc(db, "messages", msgId);
            await updateDoc(msgRef, { isDeleted: true, text: "", fileUrl: null, attachments: null });
            showToast("Pesan dihapus", 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });
};

function renderMessage(msg) {
    const isMe = msg.uid === currentUser.uid;
    const senderName = msg.username || msg.email.split('@')[0];
    const div = document.createElement('div');
    div.className = `chat-stream-item flex w-full min-w-0 mb-4 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in group relative z-0`;

    const deleteBtn = (isMe && !msg.isDeleted) ? 
        `<button onclick="deleteMessage('${msg.id}')" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition ml-2" title="Hapus"><i class="fas fa-trash-alt"></i></button>` : '';

    const bubbleHeader = `
        <div class="flex justify-between items-start mb-1 gap-4 border-b border-black/5 pb-1">
            <span class="text-[10px] font-bold ${isMe ? 'text-indigo-800' : 'text-orange-600'}">${senderName}</span>
            ${deleteBtn}
        </div>
    `;
    
    let contentHtml = '';
    if (msg.isDeleted) {
        contentHtml = `<div class="flex items-center gap-2 text-gray-400 italic text-sm py-1"><i class="fas fa-ban text-xs"></i> <span>Pesan dihapus</span></div>`;
    } else {
        let mediaContent = '';
        let attachmentsToRender = msg.attachments || [];
        if (msg.fileUrl && attachmentsToRender.length === 0) {
            attachmentsToRender.push({ fileUrl: msg.fileUrl, fileName: msg.fileName, type: msg.type });
        }

        if (attachmentsToRender.length > 0) {
            mediaContent += `<div class="flex flex-wrap gap-2 mt-2 mb-2">`;
            attachmentsToRender.forEach(att => {
                const safeName = (att.fileName || 'file_terlampir').replace(/'/g, "\\'");
                
                // Menyiapkan teks keterangan agar aman dimasukkan ke fungsi onclick html
                let safeCaption = "";
                if (att.caption) {
                    safeCaption = att.caption.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
                }

                if(att.type === 'image') {
                    // HANYA GAMBAR, KETERANGAN DIHILANGKAN DARI TAMPILAN CHAT
                    mediaContent += `
                        <div class="relative flex flex-col items-start z-10 w-full max-w-[250px] mb-1 group">
                            <img src="${att.fileUrl}" class="rounded-lg max-h-40 w-auto object-cover border bg-black/10 cursor-pointer hover:opacity-90 transition" 
                            onclick="viewImage('${att.fileUrl}', 'image', '${safeName}', '${msg.id}', '${safeCaption}')">
                        </div>`;
                } else if (att.type === 'video') {
                    mediaContent += `
                        <div class="relative inline-block h-28 w-auto z-10 mb-1">
                            <video src="${att.fileUrl}" class="rounded-lg h-full object-cover border bg-black/10 cursor-pointer" onclick="viewImage('${att.fileUrl}', 'video', '${safeName}', '${msg.id}')"></video>
                            <button onclick="viewImage('${att.fileUrl}', 'video', '${safeName}', '${msg.id}')" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-indigo-600 transition text-white w-10 h-10 rounded-full flex items-center justify-center pointer-events-none"><i class="fas fa-play"></i></button>
                        </div>`;
                } else {
                    const dName = att.fileName || 'File Terlampir';
                    mediaContent += `
                        <div class="relative inline-block mb-1 w-full max-w-[250px] z-10">
                            <div class="flex items-center gap-3 p-2 bg-black/5 hover:bg-black/10 transition border rounded-lg">
                                <div class="bg-white border text-indigo-600 w-10 h-10 rounded flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <i class="fas fa-file-alt text-xl"></i>
                                </div>
                                <div class="overflow-hidden w-full flex flex-col justify-center">
                                    <p class="text-xs font-bold text-gray-700 truncate" title="${dName}">${dName}</p>
                                    <button type="button" onclick="downloadFile('${att.fileUrl}', '${safeName}')" class="text-[10px] text-indigo-600 font-bold hover:underline mt-1 inline-block text-left cursor-pointer border-none bg-transparent p-0 w-fit">
                                        <i class="fas fa-download mr-1"></i> Unduh
                                    </button>
                                </div>
                            </div>
                        </div>`;
                }
            });
            mediaContent += `</div>`;
        }

        let displayMsgText = msg.text || '';
        if (searchQuery && displayMsgText.toLowerCase().includes(searchQuery)) {
            const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, "gi");
            displayMsgText = displayMsgText.replace(regex, "<span class='bg-yellow-200 text-black px-1 rounded'>$1</span>");
        }

        const textContent = displayMsgText ? `<p class="chat-message-text text-sm leading-relaxed whitespace-pre-wrap">${displayMsgText}</p>` : '';
        contentHtml = mediaContent + textContent;
    }

    const bubbleClass = isMe ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border';
    const msgDate = msg.timestamp ? msg.timestamp.toDate() : new Date();
    const timeString = msgDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

    div.innerHTML = `
        <div class="chat-bubble min-w-0 px-3 py-2 rounded-xl shadow-sm ${bubbleClass} relative">
            ${bubbleHeader} 
            ${contentHtml}
            <div class="flex justify-end items-center gap-1 mt-1">
                <span class="text-[9px] text-gray-400 select-none">${timeString}</span>
                ${isMe && !msg.isDeleted ? '<i class="fas fa-check text-[9px] text-blue-500" title="Terkirim"></i>' : ''}
            </div>
        </div>
    `;
    dom.chatBox.appendChild(div);
}

dom.msgInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px'; 
    if (this.value === '') { this.style.height = 'auto'; }
});
dom.msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        dom.sendBtn.click(); 
    }
});

dom.sendBtn.onclick = async () => {
    if (!currentRoomId) return;
    if (currentRoomData?.isDeleting) return showToast("Grup ini sedang dihapus.", "error");
    const targetRoomId = currentRoomId;
    const text = dom.msgInput.value.trim();
    const filesToSend = [...pendingFiles];
    if (!text && filesToSend.length === 0) return;

    dom.sendBtn.disabled = true;
    dom.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
    let finalAttachments = [];

    try {
        updateUserActivity(); 
        if (filesToSend.length > 0) {
            const uploadPromises = filesToSend.map(file => uploadToCloudinary(file).then(data => ({ fileUrl: data.url, fileName: file.name, type: data.type })));
            finalAttachments = await Promise.all(uploadPromises);
            logActivity("upload", `${finalAttachments.length} file terlampir`); // DEV LOG
        } else {
            logActivity("message", "Mengirim pesan teks"); // DEV LOG
        }

        await addDoc(collection(db, "messages"), {
            roomId: targetRoomId,
            text: text,
            uid: currentUser.uid,
            email: currentUser.email,
            username: currentUser.displayName || currentUser.email.split('@')[0], 
            attachments: finalAttachments.length > 0 ? finalAttachments : null,
            isDeleted: false,
            timestamp: serverTimestamp()
        });

        if (currentRoomId === targetRoomId) {
            dom.msgInput.value = '';
            dom.msgInput.style.height = 'auto';
            pendingFiles = [];
            renderPendingFiles();
        }

    } catch (e) { 
        showToast("Gagal mengirim: " + e.message, 'error'); 
    } finally { 
        dom.sendBtn.disabled = false; 
        dom.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; 
    }
};

// --- ANGGOTA & PERSETUJUAN LOGIC ---
dom.viewMembersBtn.onclick = () => {
    dom.groupMenuDropdown.classList.add('hidden');
    renderMembersModal();
    toggleModal('modalMembers', true);
};

function renderMembersModal() {
    if(!currentRoomData) return;
    
    dom.membersListContainer.innerHTML = '';
    dom.pendingListContainer.innerHTML = '';
    
    const members = currentRoomData.members || []; 
    const pendingMembers = currentRoomData.pendingMembers || [];
    
    dom.memberCount.innerText = members.length;
    dom.pendingCount.innerText = pendingMembers.length;
    
    const iAmAdmin = checkIsAdmin();

    if (iAmAdmin) {
        dom.inviteContainer.classList.remove('hidden');
        dom.inviteContainer.classList.add('flex');
        
        if(pendingMembers.length > 0) {
            dom.pendingContainer.classList.remove('hidden');
            dom.pendingContainer.classList.add('flex');
        } else {
            dom.pendingContainer.classList.add('hidden');
            dom.pendingContainer.classList.remove('flex');
        }
    } else {
        dom.inviteContainer.classList.add('hidden');
        dom.inviteContainer.classList.remove('flex');
        dom.pendingContainer.classList.add('hidden');
        dom.pendingContainer.classList.remove('flex');
    }

    pendingMembers.forEach(m => {
        const name = m.username || m.email.split('@')[0];
        const uid = m.uid;
        const item = document.createElement('div');
        item.className = "flex justify-between items-center p-3 border-b border-gray-100 bg-white hover:bg-gray-50";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">${name[0].toUpperCase()}</div>
                <div>
                    <p class="text-sm font-bold text-gray-800">${name}</p>
                    <p class="text-[9px] text-gray-500">Minta masuk grup</p>
                </div>
            </div>
            <div class="flex gap-1">
                <button onclick="rejectMember('${uid}')" class="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200 transition"><i class="fas fa-times"></i></button>
                <button onclick="acceptMember('${uid}')" class="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600 shadow transition"><i class="fas fa-check"></i></button>
            </div>
        `;
        dom.pendingListContainer.appendChild(item);
    });

    members.forEach(m => {
        const name = (typeof m === 'object') ? (m.username || m.email.split('@')[0]) : "User Lama";
        const email = (typeof m === 'object') ? m.email : "Hidden";
        const uid = (typeof m === 'object') ? m.uid : m;
        const isMe = (uid === currentUser.uid);
        
        const isTargetAdmin = currentRoomData.admins ? currentRoomData.admins.includes(uid) : (currentRoomData.createdBy === email);

        let actionBtn = '';
        if (iAmAdmin && !isTargetAdmin) {
            actionBtn = `<button onclick="makeAdmin('${uid}')" class="text-[10px] border border-indigo-200 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-50 ml-2 transition">Jadikan Admin</button>`;
        }

        const item = document.createElement('div');
        item.className = "flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">${name[0].toUpperCase()}</div>
                <div class="flex flex-col">
                    <p class="text-sm font-bold text-gray-800 leading-tight">${name} ${isMe ? '<span class="text-[10px] font-normal text-gray-400">(Anda)</span>' : ''}</p>
                    ${isTargetAdmin ? '<span class="text-[9px] text-indigo-600 font-bold mt-0.5">ADMIN</span>' : ''}
                </div>
            </div>
            <div>${actionBtn}</div>
        `;
        dom.membersListContainer.appendChild(item);
    });
}

dom.togglePendingBtn.onclick = () => {
    dom.pendingListContainer.classList.toggle('hidden');
    dom.pendingIcon.classList.toggle('rotate-180');
};

dom.btnInviteUser.onclick = async () => {
    const targetId = dom.inviteUserIdInput.value.trim().toUpperCase();
    if(targetId.length !== 12) return showToast("User ID harus tepat 12 karakter!", "error");
    if(targetId === currentCustomUserId) return showToast("Anda tidak bisa mengundang diri sendiri.", "error");

    dom.btnInviteUser.disabled = true;
    dom.btnInviteUser.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const q = query(collection(db, "users"), where("userId", "==", targetId));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            showToast("Pengguna dengan ID tersebut tidak ditemukan.", "error");
            return;
        }

        const targetUserDoc = snap.docs[0];
        const targetUid = targetUserDoc.id; 
        const targetData = targetUserDoc.data();

        if(currentRoomData.memberIds.includes(targetUid)) {
            showToast("Pengguna ini sudah ada di dalam grup.", "error");
            return;
        }

        const targetProfile = { uid: targetUid, email: targetData.email, username: targetData.displayName || "User" };
        
        await updateDoc(doc(db, "rooms", currentRoomId), {
            members: arrayUnion(targetProfile),
            memberIds: arrayUnion(targetUid)
        });

        showToast(`Berhasil mengundang ${targetProfile.username}!`, "success");
        dom.inviteUserIdInput.value = '';

    } catch(e) {
        showToast("Terjadi kesalahan: " + e.message, "error");
    } finally {
        dom.btnInviteUser.disabled = false;
        dom.btnInviteUser.innerHTML = 'Undang';
    }
};

window.makeAdmin = async (targetUid) => {
    try {
        await updateDoc(doc(db, "rooms", currentRoomId), { admins: arrayUnion(targetUid) });
        showToast("Anggota berhasil dijadikan Admin", "success");
    } catch (e) { showToast(e.message, 'error'); }
};

window.acceptMember = async (targetUid) => {
    const pendingArr = currentRoomData.pendingMembers || [];
    const targetProfile = pendingArr.find(m => m.uid === targetUid);
    if(!targetProfile) return;
    
    try {
        await updateDoc(doc(db, "rooms", currentRoomId), {
            pendingMembers: arrayRemove(targetProfile),
            members: arrayUnion(targetProfile),
            memberIds: arrayUnion(targetUid)
        });
        showToast("Persetujuan diterima.", "success");
    } catch(e) { showToast(e.message, "error"); }
};

window.rejectMember = async (targetUid) => {
    const pendingArr = currentRoomData.pendingMembers || [];
    const targetProfile = pendingArr.find(m => m.uid === targetUid);
    if (!targetProfile) return;
    try {
        await updateDoc(doc(db, "rooms", currentRoomId), { pendingMembers: arrayRemove(targetProfile) });
        showToast("Persetujuan ditolak.", "success");
    } catch(e) { showToast(e.message, "error"); }
};

dom.leaveGroupBtn.onclick = () => {
    showCustomConfirm("Keluar Grup", "Anda akan keluar dari grup ini. Lanjutkan?", async () => {
        dom.groupMenuDropdown.classList.add('hidden');
        try {
            const roomRef = doc(db, "rooms", currentRoomId);
            const roomSnap = await getDoc(roomRef);
            const rData = roomSnap.data();

            const newMembers = rData.members.filter(m => ((typeof m === 'object' ? m.uid : m) !== currentUser.uid));
            const newMemberIds = rData.memberIds.filter(id => id !== currentUser.uid);
            let newAdmins = (rData.admins || [rData.createdBy || ""]).filter(id => id !== currentUser.uid);

            if (newMembers.length === 0) {
                await deleteRoomAndMessages(currentRoomId);
                showToast("Grup dihapus karena kosong.", 'success');
            } else {
                let newLeader = rData.createdBy;
                if (newAdmins.length === 0 && newMembers.length > 0) {
                    const nextUser = newMembers[0];
                    newAdmins.push((typeof nextUser === 'object') ? nextUser.uid : nextUser);
                    newLeader = (typeof nextUser === 'object') ? nextUser.email : "Unknown";
                }
                await updateDoc(roomRef, { members: newMembers, memberIds: newMemberIds, admins: newAdmins, createdBy: newLeader });
                showToast("Anda telah keluar.", 'success');
            }
            dom.emptyChatState.classList.remove('hidden');
            dom.chatHeader.classList.add('hidden');
            dom.chatBox.classList.add('hidden');
            dom.chatInputArea.classList.add('hidden');
            if (unsubscribeMsg) { unsubscribeMsg(); unsubscribeMsg = null; }
            currentRoomId = null;
            currentRoomData = null;
            currentRoomMessages = [];
        } catch (e) { showToast(e.message, 'error'); }
    });
};

// ==========================================
// --- DEVELOPER MODE / ANTI ABUSE SYSTEM ---
// ==========================================

function getDevCurrentPassword() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `ES${d}${m}${y}${hr}${min}`;
}

function getDevFallbackPassword() {
    // 1 Menit Toleransi mundur jika jam barusan berganti
    const now = new Date(Date.now() - 60000); 
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `ES${d}${m}${y}${hr}${min}`;
}

setInterval(() => {
    const now = new Date();
    devDom.clock.innerText = now.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

devDom.trigger.onclick = () => {
    devDom.authModal.classList.remove('hidden');
    devDom.authInput.value = '';
    devDom.authInput.focus();
};

devDom.btnCancel.onclick = () => {
    devDom.authModal.classList.add('hidden');
};

devDom.btnEnter.onclick = () => {
    const pwd = devDom.authInput.value.trim();
    if(pwd === getDevCurrentPassword() || pwd === getDevFallbackPassword()) {
        devDom.authModal.classList.add('hidden');
        devDom.dashboard.classList.remove('hidden');
        loadDevDashboard();
        showToast("DEV SYSTEM GRANTED", "success");
    } else {
        showToast("ACCESS DENIED", "error");
        devDom.authInput.value = '';
    }
};

devDom.btnExit.onclick = () => {
    devDom.dashboard.classList.add('hidden');
    if (unsubscribeDevLogs) { unsubscribeDevLogs(); unsubscribeDevLogs = null; }
    showToast("EXITING DEV SYSTEM", "success");
};

async function loadDevDashboard() {
    devDom.usersList.innerHTML = '<p class="text-xs text-gray-500 text-center mt-4">Memuat data pengguna...</p>';
    devDom.groupsList.innerHTML = '<p class="text-xs text-gray-500 text-center mt-4">Memuat data grup...</p>';
    
    try {
        // 1. Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        let usersHTML = '';
        let onlineCount = 0;
        
        usersSnap.forEach(docSnap => {
            const u = docSnap.data();
            const uId = docSnap.id;
            let isOnline = false;
            let timeStr = "Tidak Pernah";
            
            if(u.lastActive && typeof u.lastActive.toDate === 'function') {
                const last = u.lastActive.toDate();
                const diffMins = (Date.now() - last.getTime()) / 60000;
                if(diffMins <= 5) { isOnline = true; onlineCount++; }
                timeStr = last.toLocaleString('id-ID');
            }

            usersHTML += `
                <div class="p-3 bg-[#1a1a1a] rounded border border-gray-800 flex justify-between items-center hover:border-orange-500/30 transition">
                    <div>
                        <p class="text-sm font-bold text-gray-200">${u.displayName || 'Unknown'} <span class="text-[10px] text-gray-500 ml-1 font-mono">${u.userId}</span></p>
                        <p class="text-[10px] text-gray-400">${u.email}</p>
                        <p class="text-[10px] mt-1 ${isOnline ? 'text-green-400' : 'text-gray-500'} font-bold">
                            <i class="fas fa-circle text-[8px] mr-1"></i> ${isOnline ? 'Aktif Sekarang' : 'Terakhir: ' + timeStr}
                        </p>
                    </div>
                    ${u.disabled
                        ? '<span class="text-[10px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded">NONAKTIF</span>'
                        : `<button onclick="forceDeleteUser('${uId}', '${u.email}')" class="text-red-500 bg-red-500/10 hover:bg-red-500/30 px-3 py-1.5 rounded text-xs font-bold transition">NONAKTIFKAN</button>`}
                </div>
            `;
        });
        devDom.usersList.innerHTML = usersHTML;
        devDom.totalUsers.innerText = usersSnap.size;

        // 2. Fetch Groups
        const groupsSnap = await getDocs(collection(db, "rooms"));
        let groupsHTML = '';
        groupsSnap.forEach(docSnap => {
            const g = docSnap.data();
            const gId = docSnap.id;
            groupsHTML += `
                <div class="p-3 bg-[#1a1a1a] rounded border border-gray-800 flex justify-between items-center hover:border-orange-500/30 transition">
                    <div class="overflow-hidden pr-2">
                        <p class="text-sm font-bold text-gray-200 truncate">${g.name}</p>
                        <p class="text-[10px] text-gray-400">Kode: <span class="font-mono text-orange-400">${g.code}</span> | Anggota: ${g.members ? g.members.length : 0}</p>
                        <p class="text-[10px] text-gray-500 mt-1">Dibuat oleh: ${g.createdBy}</p>
                    </div>
                    <button onclick="forceDeleteGroup('${gId}', '${g.name.replace(/'/g, "\\'")}')" class="flex-shrink-0 text-red-500 bg-red-500/10 hover:bg-red-500/30 px-3 py-1.5 rounded text-xs font-bold transition">Bongkar</button>
                </div>
            `;
        });
        devDom.groupsList.innerHTML = groupsHTML;
        devDom.totalGroups.innerText = groupsSnap.size;

        // 3. Activity Logs (Realtime)
        const logsQ = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
        if (unsubscribeDevLogs) unsubscribeDevLogs();
        unsubscribeDevLogs = onSnapshot(logsQ, (snap) => {
            let logsHTML = '';
            snap.forEach(docSnap => {
                const l = docSnap.data();
                const timeStr = l.timestamp ? l.timestamp.toDate().toLocaleTimeString('id-ID') : '...';
                let color = "text-gray-400";
                let icon = "fa-info-circle";
                
                if(l.type === 'upload') { color = "text-blue-400"; icon = "fa-cloud-upload-alt"; }
                else if(l.type === 'download') { color = "text-green-400"; icon = "fa-cloud-download-alt"; }
                else if(l.type === 'message') { color = "text-gray-300"; icon = "fa-comment"; }
                
                logsHTML += `
                    <div class="p-2 border-b border-gray-800/50 hover:bg-[#1a1a1a] transition">
                        <span class="text-[10px] text-gray-500 w-16 inline-block">[${timeStr}]</span>
                        <span class="${color} font-bold w-16 inline-block"><i class="fas ${icon}"></i> ${l.type.toUpperCase()}</span>
                        <span class="text-orange-400 font-bold mx-2">${l.userName}</span>
                        <span class="text-gray-400 truncate">${l.detail}</span>
                    </div>
                `;
            });
            devDom.logsList.innerHTML = logsHTML || '<p class="text-gray-600 text-center">Belum ada aktivitas.</p>';
        }, error => console.error("Activity log listener error:", error));

        // 4. Traffic & Media Stats (dari Messages)
        const msgsSnap = await getDocs(collection(db, "messages"));
        devDom.totalMsgs.innerText = msgsSnap.size;
        
        let mediaCount = 0;
        let hourlyTraffic = new Array(24).fill(0);
        const todayStr = new Date().toDateString();

        msgsSnap.forEach(docSnap => {
            const m = docSnap.data();
            if(m.attachments && m.attachments.length > 0) mediaCount += m.attachments.length;
            
            if(m.timestamp && typeof m.timestamp.toDate === 'function') {
                const mDate = m.timestamp.toDate();
                if(mDate.toDateString() === todayStr) {
                    hourlyTraffic[mDate.getHours()]++;
                }
            }
        });
        devDom.totalMedia.innerText = mediaCount;

        // Build Traffic Chart
        const maxTraffic = Math.max(...hourlyTraffic, 1);
        let chartHTML = '';
        for(let i=0; i<24; i++) {
            const heightPct = (hourlyTraffic[i] / maxTraffic) * 100;
            const hourLabel = String(i).padStart(2, '0');
            chartHTML += `
                <div class="flex flex-col items-center flex-1 group">
                    <div class="text-[8px] text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition">${hourlyTraffic[i]}</div>
                    <div class="w-full bg-orange-500/20 group-hover:bg-orange-500 rounded-t-sm transition-all" style="height: ${heightPct}%"></div>
                    <div class="text-[8px] text-gray-600 mt-2 font-mono">${hourLabel}</div>
                </div>
            `;
        }
        devDom.trafficLoading.style.display = 'none';
        devDom.trafficChart.innerHTML = chartHTML;

    } catch(e) {
        console.error(e);
        showToast("Dev Dash Error: " + e.message, "error");
    }
}

// Dev Mode Actions
window.forceDeleteUser = async (uid, email) => {
    if(!confirm(`Nonaktifkan akses ${email} dan keluarkan dari semua grup?`)) return;
    try {
        await setDoc(doc(db, "users", uid), {
            disabled: true,
            disabledAt: serverTimestamp()
        }, { merge: true });

        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        for (const roomDocument of roomsSnapshot.docs) {
            const roomData = roomDocument.data();
            if (!(roomData.memberIds || []).includes(uid) && !(roomData.pendingMembers || []).some(member => member.uid === uid)) continue;

            const members = (roomData.members || []).filter(member => (typeof member === 'object' ? member.uid : member) !== uid);
            const memberIds = (roomData.memberIds || []).filter(memberId => memberId !== uid);
            const pendingMembers = (roomData.pendingMembers || []).filter(member => member.uid !== uid);
            let admins = (roomData.admins || []).filter(adminId => adminId !== uid);

            if (members.length === 0) {
                await deleteRoomAndMessages(roomDocument.id);
                continue;
            }

            if (admins.length === 0) {
                const nextMember = members[0];
                admins = [typeof nextMember === 'object' ? nextMember.uid : nextMember];
            }

            const nextCreator = roomData.createdBy === email && typeof members[0] === 'object'
                ? members[0].email
                : roomData.createdBy;

            await updateDoc(roomDocument.ref, { members, memberIds, pendingMembers, admins, createdBy: nextCreator });
        }

        showToast("Akses pengguna dinonaktifkan dan keanggotaannya dibersihkan", "success");
        loadDevDashboard();
    } catch(e) { showToast(e.message, "error"); }
};

window.forceDeleteGroup = async (gid, name) => {
    if(!confirm(`PERINGATAN: Hapus paksa grup "${name}" dan semua isinya?`)) return;
    try {
        await deleteRoomAndMessages(gid);
        showToast("Grup & isi obrolan dibongkar", "success");
        loadDevDashboard();
    } catch(e) { showToast(e.message, "error"); }
};
