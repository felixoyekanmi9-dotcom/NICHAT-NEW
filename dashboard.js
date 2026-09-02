import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


/* =========================================================
   NICHAT DASHBOARD
   Modern UI + existing Firebase chat functionality
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const userSearch = document.getElementById("userSearch");
const usersList = document.getElementById("usersList");

const chatUserName = document.getElementById("chatUserName");
const chatStatus = document.getElementById("chatStatus");
const chatAvatar = document.getElementById("chatAvatar");

const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const myAvatar = document.getElementById("myAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const backToChatsBtn = document.getElementById("backToChatsBtn");


/* =========================================================
   APP STATE
========================================================= */

let currentUser = null;
let selectedUser = null;

let allUsers = [];
let chatData = {};

let unsubscribeMessages = null;
let unsubscribeChats = null;

let isSending = false;


/* =========================================================
   MOBILE VIEW HANDLERS
========================================================= */

function openChatView() {
  if (window.innerWidth <= 768) {
    document.body.classList.add("chat-active");
  }
}

function closeChatView() {
  document.body.classList.remove("chat-active");
}


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  currentUser = user;

  updateMyProfile(user);

  console.log("NICHAT logged in:", user.email);

  await loadUsers();
  loadChatsRealtime();

});


/* =========================================================
   PROFILE
========================================================= */

function updateMyProfile(user) {

  if (!myAvatar) return;

  const photoURL = user.photoURL;

  if (photoURL) {
    myAvatar.innerHTML = `
      <img
        src="${escapeAttribute(photoURL)}"
        alt="My profile"
      >
      <span class="online-dot"></span>
    `;
  } else {
    myAvatar.innerHTML = `
      <i class="fa-solid fa-user"></i>
      <span class="online-dot"></span>
    `;
  }

}


/* =========================================================
   CHAT ID
========================================================= */

function getChatIdForUsers(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


function getChatId() {

  if (!currentUser || !selectedUser) {
    return null;
  }

  return getChatIdForUsers(
    currentUser.uid,
    selectedUser.uid
  );

}


/* =========================================================
   LOAD USERS
========================================================= */

async function loadUsers() {

  try {

    usersList.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>Loading conversations...</span>
      </div>
    `;

    const snapshot = await getDocs(
      collection(db, "users")
    );

    allUsers = [];

    snapshot.forEach((documentSnapshot) => {

      const user = documentSnapshot.data();

      if (
        user.uid &&
        user.uid !== currentUser.uid
      ) {
        allUsers.push(user);
      }

    });

    applySearch();

  } catch (error) {

    console.error("Error loading users:", error);

    usersList.innerHTML = `
      <div class="loading error-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Could not load users. Check permissions.</span>
      </div>
    `;

  }

}


/* =========================================================
   REAL-TIME CHAT SIDEBAR
========================================================= */

function loadChatsRealtime() {

  if (unsubscribeChats) {
    unsubscribeChats();
  }

  const chatsQuery = query(
    collection(db, "chats"),
    where(
      "participants",
      "array-contains",
      currentUser.uid
    )
  );

  unsubscribeChats = onSnapshot(

    chatsQuery,

    (snapshot) => {

      chatData = {};

      snapshot.forEach((chatDocument) => {

        chatData[chatDocument.id] =
          chatDocument.data();

      });

      applySearch();

    },

    (error) => {

      console.error(
        "Chat sidebar error:",
        error
      );

    }

  );

}


/* =========================================================
   UNREAD COUNT
========================================================= */

function getUnreadCount(chat) {

  if (!chat || !chat.unreadCounts) {
    return 0;
  }

  return chat.unreadCounts[currentUser.uid] || 0;

}


/* =========================================================
   DISPLAY USERS
========================================================= */

function displayUsers(users) {

  if (!usersList || !currentUser) {
    return;
  }

  usersList.innerHTML = "";

  const sortedUsers = [...users].sort(
    (userA, userB) => {

      const chatIdA = getChatIdForUsers(
        currentUser.uid,
        userA.uid
      );

      const chatIdB = getChatIdForUsers(
        currentUser.uid,
        userB.uid
      );

      const timeA =
        chatData[chatIdA]
          ?.lastMessageAt
          ?.seconds || 0;

      const timeB =
        chatData[chatIdB]
          ?.lastMessageAt
          ?.seconds || 0;

      return timeB - timeA;

    }
  );

  if (sortedUsers.length === 0) {

    usersList.innerHTML = `
      <div class="empty-users">
        <div class="empty-users-icon">
          <i class="fa-solid fa-user-group"></i>
        </div>

        <strong>No users found</strong>

        <span>
          Try another name or email.
        </span>
      </div>
    `;

    return;
  }


  sortedUsers.forEach((user) => {

    const chatId =
      getChatIdForUsers(
        currentUser.uid,
        user.uid
      );

    const chat = chatData[chatId];

    const unreadCount =
      getUnreadCount(chat);

    const displayName =
      user.name ||
      user.username ||
      user.email ||
      "NICHAT User";

    const initials =
      getInitials(displayName);

    const lastMessage =
      chat?.lastMessage ||
      "Start a conversation";

    const lastTime =
      formatChatTime(
        chat?.lastMessageAt
      );

    const isOnline =
      user.online === true;


    const userItem =
      document.createElement("div");

    userItem.className = "user-item";

    if (
      selectedUser &&
      selectedUser.uid === user.uid
    ) {
      userItem.classList.add("active");
    }


    userItem.innerHTML = `

      <div class="user-avatar-wrap">

        <div class="user-avatar">

          ${
            user.photoURL
              ? `
                <img
                  src="${escapeAttribute(user.photoURL)}"
                  alt="${escapeAttribute(displayName)}"
                >
              `
              : `<span>${escapeHTML(initials)}</span>`
          }

        </div>

        ${
          isOnline
            ? `<span class="user-online-dot"></span>`
            : ""
        }

      </div>


      <div class="user-info">

        <div class="user-top-row">

          <h4>
            ${escapeHTML(displayName)}
          </h4>

          <div class="chat-meta">

            ${
              lastTime
                ? `<span class="chat-time">${escapeHTML(lastTime)}</span>`
                : ""
            }

            ${
              unreadCount > 0
                ? `<span class="unread-count">${unreadCount}</span>`
                : ""
            }

          </div>

        </div>


        <div class="user-bottom-row">

          <p class="last-message">
            ${escapeHTML(lastMessage)}
          </p>

          ${
            chat?.lastSenderId === currentUser.uid &&
            chat?.lastMessage
              ? `
                <span class="message-status">
                  <i class="fa-solid fa-check-double"></i>
                </span>
              `
              : ""
          }

        </div>

      </div>

    `;


    userItem.addEventListener(
      "click",
      () => openChat(user)
    );


    usersList.appendChild(userItem);

  });

}


/* =========================================================
   OPEN CHAT
========================================================= */

async function openChat(user) {

  openChatView();

  selectedUser = user;

  const displayName =
    user.name ||
    user.username ||
    user.email ||
    "NICHAT User";


  /* Update header */

  chatUserName.textContent =
    displayName;


  updateChatAvatar(user);


  chatStatus.innerHTML =
    user.online === true
      ? `<span class="status-indicator online"></span> Online`
      : `<span class="status-indicator"></span> Offline`;


  /* Enable composer */

  messageInput.disabled = false;
  sendBtn.disabled = false;

  messageInput.placeholder =
    `Message ${displayName}`;


  /* Clear welcome screen */

  messages.classList.remove("empty-chat");


  const chatId = getChatId();


  /* Mark unread messages as read */

  if (chatId) {

    try {

      await setDoc(

        doc(
          db,
          "chats",
          chatId
        ),

        {
          unreadCounts: {
            [currentUser.uid]: 0
          }
        },

        {
          merge: true
        }

      );

    } catch (error) {

      console.error(
        "Could not mark chat as read:",
        error
      );

    }

  }


  displayUsers(
    getFilteredUsers()
  );


  messages.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>Opening conversation...</span>
    </div>
  `;


  loadMessages();

  setTimeout(() => {
    messageInput.focus();
  }, 100);

}


/* =========================================================
   CHAT AVATAR
========================================================= */

function updateChatAvatar(user) {

  if (!chatAvatar) return;

  const displayName =
    user.name ||
    user.username ||
    user.email ||
    "NICHAT User";

  const initials =
    getInitials(displayName);

  chatAvatar.innerHTML = `
    ${
      user.photoURL
        ? `
          <img
            src="${escapeAttribute(user.photoURL)}"
            alt="${escapeAttribute(displayName)}"
          >
        `
        : `
          <span class="avatar-initials">
            ${escapeHTML(initials)}
          </span>
        `
    }

    ${
      user.online === true
        ? `<span class="chat-online-dot"></span>`
        : ""
    }
  `;

}


/* =========================================================
   LOAD MESSAGES
========================================================= */

function loadMessages() {

  if (!selectedUser) {
    return;
  }

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const chatId = getChatId();

  if (!chatId) {
    return;
  }

  const messagesRef = collection(
    db,
    "chats",
    chatId,
    "messages"
  );

  const messagesQuery = query(
    messagesRef,
    orderBy(
      "createdAt",
      "asc"
    )
  );

  unsubscribeMessages = onSnapshot(

    messagesQuery,

    (snapshot) => {

      messages.innerHTML = "";

      if (snapshot.empty) {

        renderEmptyConversation();

        return;
      }


      let previousDateKey = null;

      snapshot.forEach(
        (documentSnapshot) => {

          const message =
            documentSnapshot.data();

          const messageDate =
            getMessageDate(message.createdAt);

          const dateKey =
            messageDate
              ? getDateKey(messageDate)
              : null;


          if (
            dateKey &&
            dateKey !== previousDateKey
          ) {

            renderDateDivider(
              messageDate
            );

            previousDateKey = dateKey;

          }


          displayMessage(message);

        }
      );


      scrollMessagesToBottom();

    },

    (error) => {

      console.error(
        "Message loading error:",
        error
      );

      messages.innerHTML = `
        <div class="loading error-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Could not load messages.</span>
        </div>
      `;

    }

  );

}


/* =========================================================
   EMPTY CONVERSATION
========================================================= */

function renderEmptyConversation() {

  const displayName =
    selectedUser?.name ||
    selectedUser?.username ||
    selectedUser?.email ||
    "this person";

  messages.innerHTML = `

    <div class="empty-conversation">

      <div class="empty-conversation-avatar">

        ${
          selectedUser?.photoURL
            ? `
              <img
                src="${escapeAttribute(selectedUser.photoURL)}"
                alt=""
              >
            `
            : `
              <span>
                ${escapeHTML(getInitials(displayName))}
              </span>
            `
        }

      </div>

      <span class="private-badge">
        <i class="fa-solid fa-lock"></i>
        Private conversation
      </span>

      <h2>
        Start chatting with ${escapeHTML(displayName)}
      </h2>

      <p>
        Send a message to begin your conversation.
      </p>

    </div>

  `;

}


/* =========================================================
   DATE DIVIDER
========================================================= */

function renderDateDivider(date) {

  const divider =
    document.createElement("div");

  divider.className =
    "date-divider";

  divider.innerHTML = `
    <span>
      ${escapeHTML(formatMessageDate(date))}
    </span>
  `;

  messages.appendChild(divider);

}


/* =========================================================
   DISPLAY MESSAGE
========================================================= */

function displayMessage(message) {

  const messageElement =
    document.createElement("div");

  const isMine =
    message.senderId === currentUser.uid;

  messageElement.className =
    isMine
      ? "message sent"
      : "message received";


  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";


  const textElement =
    document.createElement("div");

  textElement.className =
    "message-text";

  textElement.textContent =
    message.text || "";


  const footer =
    document.createElement("div");

  footer.className =
    "message-footer";


  const timeElement =
    document.createElement("span");

  timeElement.className =
    "message-time";


  if (
    message.createdAt &&
    message.createdAt.toDate
  ) {

    const date =
      message.createdAt.toDate();

    timeElement.textContent =
      date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  } else {

    timeElement.textContent =
      "Sending...";

  }


  footer.appendChild(timeElement);


  if (isMine) {

    const status =
      document.createElement("span");

    status.className =
      "message-check";

    status.innerHTML =
      '<i class="fa-solid fa-check-double"></i>';

    footer.appendChild(status);

  }


  bubble.appendChild(textElement);
  bubble.appendChild(footer);

  messageElement.appendChild(bubble);

  messages.appendChild(messageElement);

}


/* =========================================================
   SEND MESSAGE
========================================================= */

if (messageForm) {

  messageForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (
        !currentUser ||
        !selectedUser ||
        isSending
      ) {
        return;
      }


      const text =
        messageInput.value.trim();


      if (!text) {
        return;
      }


      try {

        isSending = true;

        sendBtn.disabled = true;

        const chatId =
          getChatId();


        if (!chatId) {
          return;
        }


        /* CREATE / UPDATE CHAT */

        await setDoc(

          doc(
            db,
            "chats",
            chatId
          ),

          {

            participants: [
              currentUser.uid,
              selectedUser.uid
            ],

            lastMessage: text,

            lastMessageAt:
              serverTimestamp(),

            lastSenderId:
              currentUser.uid,

            unreadCounts: {

              [currentUser.uid]: 0,

              [selectedUser.uid]:
                (
                  chatData[chatId]
                    ?.unreadCounts
                    ?.[selectedUser.uid] ||
                  0
                ) + 1

            }

          },

          {
            merge: true
          }

        );


        /* SAVE MESSAGE */

        await addDoc(

          collection(
            db,
            "chats",
            chatId,
            "messages"
          ),

          {

            text,

            senderId:
              currentUser.uid,

            receiverId:
              selectedUser.uid,

            createdAt:
              serverTimestamp()

          }

        );


        messageInput.value = "";

        messageInput.focus();


      } catch (error) {

        console.error(
          "Send message error:",
          error
        );

        alert(
          "Could not send message. Please try again."
        );

      } finally {

        isSending = false;

        if (selectedUser) {
          sendBtn.disabled = false;
        }

      }

    }
  );

}


/* =========================================================
   ENTER TO SEND
========================================================= */

if (messageInput) {

  messageInput.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        if (
          !messageInput.disabled &&
          messageInput.value.trim()
        ) {
          messageForm.requestSubmit();
        }

      }

    }
  );

}


/* =========================================================
   SEARCH USERS
========================================================= */

function getFilteredUsers() {

  if (!userSearch) {
    return allUsers;
  }

  const searchText =
    userSearch.value
      .trim()
      .toLowerCase();

  return allUsers.filter((user) => {

    const name =
      (user.name || "")
        .toLowerCase();

    const username =
      (user.username || "")
        .toLowerCase();

    const email =
      (user.email || "")
        .toLowerCase();

    return (
      name.includes(searchText) ||
      username.includes(searchText) ||
      email.includes(searchText)
    );

  });

}


function applySearch() {

  displayUsers(
    getFilteredUsers()
  );

}


if (userSearch) {

  userSearch.addEventListener(
    "input",
    applySearch
  );

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getInitials(name) {

  const words =
    String(name || "NICHAT User")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();

}


function formatChatTime(timestamp) {

  if (
    !timestamp ||
    !timestamp.toDate
  ) {
    return "";
  }

  const date =
    timestamp.toDate();

  const now =
    new Date();

  const sameDay =
    date.toDateString() ===
    now.toDateString();

  if (sameDay) {

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }

  const yesterday =
    new Date(now);

  yesterday.setDate(
    now.getDate() - 1
  );

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short"
    }
  );

}


function getMessageDate(timestamp) {

  if (
    !timestamp ||
    !timestamp.toDate
  ) {
    return null;
  }

  return timestamp.toDate();

}


function getDateKey(date) {

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ].join("-");

}


function formatMessageDate(date) {

  const now =
    new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return "Today";
  }

  const yesterday =
    new Date(now);

  yesterday.setDate(
    now.getDate() - 1
  );

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  );

}


function scrollMessagesToBottom() {

  requestAnimationFrame(() => {

    messages.scrollTop =
      messages.scrollHeight;

  });

}


function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value || "";

  return div.innerHTML;

}


function escapeAttribute(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


/* =========================================================
   LOGOUT & ACTIONS
========================================================= */

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const confirmLogout = confirm("Do you want to logout?");

    if (!confirmLogout) {
      return;
    }

    try {
      await signOut(auth);
      window.location.href = "./login.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Could not logout.");
    }
  });
}

if (myAvatar) {
  myAvatar.addEventListener("click", () => {
    console.log("Profile avatar clicked");
  });
}


/* =========================================================
   MOBILE BACK BUTTON
========================================================= */

if (backToChatsBtn) {
  backToChatsBtn.addEventListener("click", () => {
    closeChatView();
  });
}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener("beforeunload", () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  if (unsubscribeChats) {
    unsubscribeChats();
  }
})