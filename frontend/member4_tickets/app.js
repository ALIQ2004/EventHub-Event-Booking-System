
"use strict";

/*
 EventHub — Member 4
 My Tickets, Booking History and QR Tickets

 Unified session shared with Member 1.
*/

const API_BASE =
    "/Hehe/event_booking_system/backend/api";

const $ = id => document.getElementById(id);

const TOKEN_KEY = "eventhub_session_token";
const USER_KEY = "eventhub_session_user";

let jwt = sessionStorage.getItem(TOKEN_KEY) || "";
let currentUser = null;
let bookings = [];
let messageTimeout;

// Prevent older async responses from restoring
// a session after the user has logged out.
let sessionVersion = 0;

// ------------------------------------
// NOTIFICATIONS
// ------------------------------------

function notify(text, type = "ok") {
    const box = $("message");

    box.textContent = text;
    box.className = "message " + type;
    box.hidden = false;

    clearTimeout(messageTimeout);

    messageTimeout = setTimeout(() => {
        box.hidden = true;
    }, 5000);
}

// ------------------------------------
// API REQUESTS
// ------------------------------------

async function apiRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        ...(options.headers || {})
    };

    if (jwt) {
        headers.Authorization = "Bearer " + jwt;
    }

    let response;

    try {
        response = await fetch(
            `${API_BASE}/${endpoint}`,
            {
                ...options,
                headers
            }
        );
    } catch {
        throw new Error(
            "Cannot reach backend. Check Apache and PHP."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            `Server returned invalid JSON (HTTP ${response.status}).`
        );
    }

    if (!response.ok || result.success === false) {
        const error = new Error(
            result.message ||
            `Request failed (HTTP ${response.status})`
        );

        error.status = response.status;
        throw error;
    }

    return result;
}

// ------------------------------------
// SHARED AUTHENTICATION
// ------------------------------------

function saveSession(token, user) {
    if (!token || user?.role !== "customer") {
        throw new Error(
            "Only customer accounts can use My Tickets."
        );
    }

    jwt = token;
    currentUser = user;
    sessionVersion++;

    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
    );

    // Remove obsolete Member 4 token.
    sessionStorage.removeItem("ticketnest_token");

    window.EventHubAuth?.setSession(token, user);

    updateNavbarAuth();
}

function clearSession() {
    sessionVersion++;

    jwt = "";
    currentUser = null;
    bookings = [];

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem("ticketnest_token");
    sessionStorage.removeItem("eventhub_token");
    sessionStorage.removeItem("eventhub_user");

    window.EventHubAuth?.clearSession();
}

// ------------------------------------
// LOGIN POPUP
// ------------------------------------

function openLogin() {
    $("loginError").textContent = "";
    $("loginSection").hidden = false;
    $("email").focus();
}

function closeLogin() {
    $("loginSection").hidden = true;
    $("loginError").textContent = "";
    $("password").value = "";
}

// ------------------------------------
// SINGLE TOP NAVBAR
// ------------------------------------

function attachNavbarAuth() {
    const nav = $("eventhub-global-nav");
    const auth = $("ticketNavAuth");

    if (!nav || !auth) {
        console.warn(
            "EventHub navigation is not available."
        );
        return;
    }

    // Remove shared default authentication
    // so only Member 4's existing buttons remain.
    nav.querySelector(".eh-auth")?.remove();
    nav.querySelector(".eh-role")?.remove();

    // Move the actual existing controls.
    if (auth.parentElement !== nav) {
        nav.appendChild(auth);
    }

    auth.hidden = false;

    auth.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        grid-column: 3;
        justify-self: end;
        margin: 0;
        padding: 0;
        width: auto;
        white-space: nowrap;
    `;

    updateNavbarAuth();
}

function updateNavbarAuth() {
    const loggedIn = Boolean(
        jwt &&
        currentUser &&
        currentUser.role === "customer"
    );

    $("navLoginBtn").hidden = loggedIn;
    $("logoutBtn").hidden = !loggedIn;

    $("currentUser").textContent = loggedIn
        ? "Hi, " +
          String(currentUser.full_name || "Customer")
              .trim()
              .split(/\s+/)[0]
        : "";
}

// ------------------------------------
// LOGGED-OUT STATE
// ------------------------------------

function showLoggedOut() {
    $("dashboardSection").hidden = true;
    $("loggedOutSection").hidden = false;

    $("totalCount").textContent = "0";
    $("confirmedCount").textContent = "0";
    $("cancelledCount").textContent = "0";

    $("bookingList").replaceChildren();
    $("statusFilter").value = "all";

    if ($("qrDialog").open) {
        $("qrDialog").close();
    }

    updateNavbarAuth();
}

function setLoggedOut(showNotice = false) {
    clearSession();
    showLoggedOut();
    closeLogin();

    if (showNotice) {
        notify("You have logged out.");
    }
}

// ------------------------------------
// LOGGED-IN STATE
// ------------------------------------

function setLoggedIn() {
    $("loggedOutSection").hidden = true;
    $("dashboardSection").hidden = false;

    closeLogin();
    updateNavbarAuth();
}

// ------------------------------------
// CUSTOMER LOGIN
// ------------------------------------

async function login(event) {
    event.preventDefault();

    const button = $("loginBtn");
    button.disabled = true;

    $("loginError").textContent = "";

    try {
        // Login must not send an old JWT.
        const response = await fetch(
            `${API_BASE}/login.php`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: $("email").value.trim(),
                    password: $("password").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Login failed."
            );
        }

        if (data.user?.role !== "customer") {
            throw new Error(
                "Only customer accounts can access My Tickets."
            );
        }

        if (!data.token) {
            throw new Error(
                "Login did not return a token."
            );
        }

        saveSession(data.token, data.user);
        setLoggedIn();

        await loadBookings();

        if (currentUser) {
            notify("Signed in successfully!");
        }

    } catch (error) {
        $("loginError").textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

// ------------------------------------
// RESTORE SHARED CUSTOMER SESSION
// ------------------------------------

async function restoreSession() {
    const savedToken =
        sessionStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
        jwt = "";
        currentUser = null;
        showLoggedOut();
        return;
    }

    const versionAtStart = sessionVersion;

    // This portal uses the exact same token as Member 1.
    jwt = savedToken;

    try {
        const result = await apiRequest("me.php");

        // Ignore an outdated request.
        if (sessionVersion !== versionAtStart) {
            return;
        }

        if (!result.user) {
            throw new Error(
                "The server did not return a user profile."
            );
        }

        if (result.user.role !== "customer") {
            // Do not destroy a valid organiser/admin
            // session just because it opened My Tickets.
            window.location.replace(
                "../member2_organiser/index.html"
            );
            return;
        }

        saveSession(savedToken, result.user);
        setLoggedIn();

        await loadBookings();

    } catch (error) {
        if (sessionVersion !== versionAtStart) {
            return;
        }

        if (error.status === 401) {
            // Only clear the session when the backend
            // explicitly rejects authentication.
            setLoggedOut();

            notify(
                "Your session has expired. Please log in again.",
                "error"
            );
        } else if (error.status === 403) {
            // A role permission error is not necessarily
            // an expired or invalid JWT.
            currentUser = null;
            showLoggedOut();

            notify(
                "Access denied. Check your account permissions.",
                "error"
            );
        } else {
            // Network/temporary server issues must not
            // delete the customer's saved login.
            currentUser = null;
            showLoggedOut();

            notify(
                "Unable to verify your login: " +
                error.message,
                "error"
            );
        }
    }
}

// ------------------------------------
// LOAD BOOKINGS
// ------------------------------------

async function loadBookings() {
    if (!jwt || !currentUser) {
        return;
    }

    const versionAtStart = sessionVersion;

    $("bookingList").textContent =
        "Loading your bookings…";

    try {
        const response = await apiRequest(
            "bookings.php"
        );

        if (sessionVersion !== versionAtStart) {
            return;
        }

        bookings = Array.isArray(response.data)
            ? response.data
            : [];

        $("totalCount").textContent =
            bookings.length;

        $("confirmedCount").textContent =
            bookings.filter(
                booking =>
                    booking.booking_status === "confirmed"
            ).length;

        $("cancelledCount").textContent =
            bookings.filter(
                booking =>
                    booking.booking_status === "cancelled"
            ).length;

        renderBookings();

    } catch (error) {
        if (sessionVersion !== versionAtStart) {
            return;
        }

        $("bookingList").textContent =
            "Unable to load bookings.";

        if (error.status === 401) {
            setLoggedOut();

            notify(
                "Your login has expired. Please sign in again.",
                "error"
            );
        } else {
            notify(
                "Unable to load bookings: " +
                error.message,
                "error"
            );
        }
    }
}

// ------------------------------------
// BOOKING INFORMATION
// ------------------------------------

function bookingInfoLine(label, value) {
    const span = document.createElement("span");
    const strong = document.createElement("strong");

    strong.textContent = `${label}: `;

    span.append(
        strong,
        document.createTextNode(
            String(value ?? "—")
        )
    );

    return span;
}

// ------------------------------------
// DISPLAY BOOKINGS
// ------------------------------------

function renderBookings() {
    const list = $("bookingList");
    list.replaceChildren();

    const selectedStatus =
        $("statusFilter").value;

    const visible = bookings.filter(
        booking =>
            selectedStatus === "all" ||
            booking.booking_status === selectedStatus
    );

    if (!visible.length) {
        const empty =
            document.createElement("div");

        empty.className = "empty";
        empty.textContent =
            "No bookings found for this filter.";

        list.append(empty);
        return;
    }

    visible.forEach(booking => {
        const card =
            document.createElement("article");

        card.className = "booking-card";

        const top =
            document.createElement("div");

        top.className = "booking-top";

        const heading =
            document.createElement("div");

        const title =
            document.createElement("h3");

        title.textContent =
            booking.event_name || "Event";

        const reference =
            document.createElement("div");

        reference.className = "ref";

        reference.textContent =
            booking.booking_reference || "";

        heading.append(title, reference);

        const status =
            document.createElement("span");

        status.className =
            `status status-${booking.booking_status}`;

        status.textContent =
            booking.booking_status || "unknown";

        top.append(heading, status);

        const meta =
            document.createElement("div");

        meta.className = "booking-meta";

        meta.append(
            bookingInfoLine(
                "Date",
                booking.schedule_date
            ),
            bookingInfoLine(
                "Tickets",
                booking.quantity
            ),
            bookingInfoLine(
                "Total",
                `RM ${Number(
                    booking.total_amount
                ).toFixed(2)}`
            )
        );

        const actions =
            document.createElement("div");

        actions.className = "card-actions";

        if (booking.booking_status === "confirmed") {
            const qrButton =
                document.createElement("button");

            qrButton.type = "button";
            qrButton.className = "secondary-btn";
            qrButton.textContent = "View QR ticket";

            qrButton.addEventListener(
                "click",
                () => showQr(
                    booking.booking_id,
                    qrButton
                )
            );

            const cancelButton =
                document.createElement("button");

            cancelButton.type = "button";
            cancelButton.className = "danger-btn";
            cancelButton.textContent = "Cancel booking";

            cancelButton.addEventListener(
                "click",
                () => cancelBooking(
                    booking.booking_id,
                    cancelButton
                )
            );

            actions.append(
                qrButton,
                cancelButton
            );
        }

        card.append(
            top,
            meta,
            actions
        );

        list.append(card);
    });
}

// ------------------------------------
// DIGITAL QR TICKET
// ------------------------------------

async function showQr(id, button) {
    button.disabled = true;

    try {
        const response = await apiRequest(
            `ticket_qr.php?booking_id=${encodeURIComponent(id)}`
        );

        if (
            typeof response.qr_image !== "string" ||
            !response.qr_image.startsWith(
                "data:image/png;base64,"
            )
        ) {
            throw new Error(
                "QR image format is invalid."
            );
        }

        $("qrImage").src =
            response.qr_image;

        $("qrEventName").textContent =
            response.event_name || "Event ticket";

        $("qrReference").textContent =
            response.booking_reference || "";

        $("qrDialog").showModal();

    } catch (error) {
        notify(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

// ------------------------------------
// CANCEL BOOKING
// ------------------------------------

async function cancelBooking(id, button) {
    if (!confirm(
        `Cancel booking #${id}? ` +
        "This action will restore the reserved tickets."
    )) {
        return;
    }

    button.disabled = true;

    try {
        await apiRequest(
            `bookings.php?id=${encodeURIComponent(id)}`,
            {
                method: "PATCH"
            }
        );

        notify(
            `Booking #${id} cancelled successfully.`
        );

        await loadBookings();

    } catch (error) {
        notify(error.message, "error");
        button.disabled = false;
    }
}

// ------------------------------------
// BUTTON EVENTS
// ------------------------------------

$("loginForm").addEventListener(
    "submit",
    login
);

$("navLoginBtn").addEventListener(
    "click",
    openLogin
);

$("pageLoginBtn").addEventListener(
    "click",
    openLogin
);

$("logoutBtn").addEventListener(
    "click",
    () => setLoggedOut(true)
);

$("closeLoginBtn").addEventListener(
    "click",
    closeLogin
);

$("loginSection").addEventListener(
    "click",
    event => {
        if (event.target === $("loginSection")) {
            closeLogin();
        }
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape" &&
            !$("loginSection").hidden
        ) {
            closeLogin();
        }
    }
);

$("refreshBtn").addEventListener(
    "click",
    loadBookings
);

$("statusFilter").addEventListener(
    "change",
    renderBookings
);

$("closeQrBtn").addEventListener(
    "click",
    () => $("qrDialog").close()
);

$("closeQrBottom").addEventListener(
    "click",
    () => $("qrDialog").close()
);

$("qrDialog").addEventListener(
    "close",
    () => {
        $("qrImage").removeAttribute("src");
    }
);

// ------------------------------------
// START
// ------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {
        // Shared navbar creates its elements on
        // DOMContentLoaded; attach on the next frame.
        requestAnimationFrame(attachNavbarAuth);

        restoreSession();
    }
);
