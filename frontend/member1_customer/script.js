
"use strict";

/*
 EventHub - Member 1 Customer Portal
 Shared JWT Authentication + RBAC Navigation
*/

const API_BASE = "../../backend/api";
const $ = id => document.getElementById(id);

const SHARED_TOKEN = "eventhub_session_token";
const SHARED_USER = "eventhub_session_user";

let token = "";
let currentUser = null;
let events = [];
let schedules = [];
let selectedEvent = null;

// ------------------------------------
// HELPER FUNCTIONS
// ------------------------------------

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

function money(value) {
    return "RM " + Number(value).toFixed(2);
}

function formatDate(value) {
    const date = new Date(
        String(value).replace(" ", "T")
    );

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.remove("hidden");
}

$("toast").addEventListener("click", () => {
    $("toast").classList.add("hidden");
});

function openModal(id) {
    $(id).classList.remove("hidden");
}

function closeModal(id) {
    $(id).classList.add("hidden");
}

// ------------------------------------
// SHARED SESSION
// ------------------------------------

function saveSession(jwt, user) {
    token = jwt;
    currentUser = user;

    sessionStorage.setItem(SHARED_TOKEN, jwt);
    sessionStorage.setItem(
        SHARED_USER,
        JSON.stringify(user)
    );

    window.EventHubAuth?.setSession(jwt, user);
    updateLoginUI();
}

function clearSession() {
    token = "";
    currentUser = null;

    sessionStorage.removeItem(SHARED_TOKEN);
    sessionStorage.removeItem(SHARED_USER);

    // Remove previous demonstration session keys.
    sessionStorage.removeItem("eventhub_token");
    sessionStorage.removeItem("eventhub_user");
    sessionStorage.removeItem("ticketnest_token");
    sessionStorage.removeItem("eventhub_management_token");
    sessionStorage.removeItem("venue_admin_token");

    window.EventHubAuth?.clearSession();
    updateLoginUI();
}

function updateLoginUI() {
    const loggedIn = Boolean(token && currentUser);

    $("loginNavBtn").classList.toggle(
        "hidden", loggedIn
    );

    $("logoutBtn").classList.toggle(
        "hidden", !loggedIn
    );

    $("welcomeText").textContent = loggedIn
        ? "Hi, " +
          String(currentUser.full_name || "Customer")
              .trim().split(/\s+/)[0]
        : "";
}

function logout(message = "Logged out successfully.") {
    clearSession();

    closeModal("bookingModal");
    closeModal("confirmationModal");

    showToast(message);
}

// ------------------------------------
// PHP REST API
// ------------------------------------

async function apiRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        ...(token
            ? { Authorization: "Bearer " + token }
            : {}),
        ...(options.headers || {})
    };

    let response;

    try {
        response = await fetch(
            API_BASE + "/" + endpoint,
            {
                ...options,
                headers
            }
        );
    } catch {
        throw new Error(
            "Cannot connect to the server. Check XAMPP."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            "Server returned an invalid JSON response."
        );
    }

    if (!response.ok || result.success === false) {
        if (response.status === 401 && token &&
            endpoint !== "login.php") {
            logout(
                "Your session has expired. Please log in again."
            );
        }

        throw new Error(
            result.message ||
            "Request failed (HTTP " + response.status + ")"
        );
    }

    return result;
}

// ------------------------------------
// CUSTOMER LOGIN
// ------------------------------------

async function login(email, password) {
    // Do not send an old token with a new login request.
    const response = await fetch(
        API_BASE + "/login.php",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ email, password })
        }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || "Login failed."
        );
    }

    if (result.user?.role !== "customer") {
        throw new Error(
            "This portal accepts customer accounts only. " +
            "Use the management login for organisers or admins."
        );
    }

    if (!result.token) {
        throw new Error("Login did not return a JWT.");
    }

    saveSession(result.token, result.user);

    closeModal("loginModal");
    $("loginForm").reset();
    $("loginError").textContent = "";

    showToast(
        "Welcome back, " + currentUser.full_name + "!"
    );
}

$("loginForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button =
            event.currentTarget.querySelector(
                'button[type="submit"]'
            );

        $("loginError").textContent = "";
        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            await login(
                $("email").value.trim(),
                $("password").value
            );
        } catch (error) {
            $("loginError").textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = "Login to EventHub";
        }
    }
);

$("loginNavBtn").addEventListener(
    "click",
    () => openModal("loginModal")
);

$("logoutBtn").addEventListener(
    "click",
    () => logout()
);

$("closeLogin").addEventListener(
    "click",
    () => closeModal("loginModal")
);

// ------------------------------------
// EVENT DISPLAY
// ------------------------------------

const categoryIcons = {
    Technology: "💻",
    Music: "🎵",
    Education: "🎓",
    Festival: "🎪",
    Business: "💼"
};

async function loadEvents() {
    try {
        const result = await apiRequest("events.php");
        const now = new Date();

        events = (result.data || []).filter(event =>
            event.status === "upcoming" &&
            new Date(
                String(event.start_date).replace(" ", "T")
            ) > now
        );

        populateCategories();
        renderEvents();
    } catch (error) {
        $("eventGrid").textContent =
            "Unable to load events: " + error.message;
    }
}

function populateCategories() {
    const categories = [
        ...new Set(events.map(e => e.category))
    ];

    $("categoryFilter").replaceChildren();

    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All Categories";
    $("categoryFilter").appendChild(all);

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        $("categoryFilter").appendChild(option);
    });
}

function renderEvents() {
    const search = $("searchInput").value
        .toLowerCase().trim();

    const category = $("categoryFilter").value;

    const filtered = events.filter(event => {
        const matchesSearch =
            String(event.event_name)
                .toLowerCase().includes(search) ||
            String(event.category)
                .toLowerCase().includes(search) ||
            String(event.description || "")
                .toLowerCase().includes(search);

        return matchesSearch &&
            (category === "all" ||
             event.category === category);
    });

    if (!filtered.length) {
        $("eventGrid").innerHTML =
            "<p>No matching upcoming events found.</p>";
        return;
    }

    $("eventGrid").innerHTML = filtered.map(event => {
        const icon =
            categoryIcons[event.category] || "🎟️";

        return `
            <article class="event-card">
                <div class="event-banner">
                    <span class="category-badge">
                        ${escapeHtml(event.category)}
                    </span>
                    <span class="banner-icon">${icon}</span>
                </div>

                <div class="event-content">
                    <span class="event-date">
                        ${escapeHtml(formatDate(event.start_date))}
                    </span>

                    <h3>${escapeHtml(event.event_name)}</h3>

                    <p class="event-description">
                        ${escapeHtml(event.description || "")}
                    </p>

                    <p class="event-location">
                        📍 Event Venue #${Number(event.venue_id)}
                    </p>

                    <div class="event-bottom">
                        <div class="event-price">
                            ${money(event.ticket_price)}
                            <small>per ticket</small>
                        </div>

                        <button
                            class="btn btn-primary book-btn"
                            data-event-id="${Number(event.event_id)}">
                            Book Now
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    document.querySelectorAll(".book-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                startBooking(
                    Number(button.dataset.eventId)
                );
            });
        });
}

$("searchInput").addEventListener(
    "input", renderEvents
);

$("categoryFilter").addEventListener(
    "change", renderEvents
);

// ------------------------------------
// CUSTOMER BOOKING
// ------------------------------------

async function startBooking(eventId) {
    if (!token || !currentUser) {
        openModal("loginModal");
        showToast("Please log in to book tickets.");
        return;
    }

    if (currentUser.role !== "customer") {
        showToast(
            "Only customer accounts can book tickets."
        );
        return;
    }

    selectedEvent = events.find(
        event => Number(event.event_id) === eventId
    );

    if (!selectedEvent) return;

    $("bookingError").textContent = "";
    $("bookingEventName").textContent =
        selectedEvent.event_name;

    $("bookingDescription").textContent =
        selectedEvent.description || "";

    $("ticketQuantity").value = 1;
    $("scheduleSelect").replaceChildren();

    $("confirmBookingBtn").disabled = true;
    openModal("bookingModal");

    try {
        const result = await apiRequest(
            "schedules.php?event_id=" +
            encodeURIComponent(eventId)
        );

        schedules = Array.isArray(result.data)
            ? result.data
            : [];

        if (!schedules.length) {
            $("bookingError").textContent =
                "No schedules are currently available.";
            updateTotal();
            return;
        }

        schedules.forEach(schedule => {
            const option = document.createElement("option");

            option.value = schedule.schedule_id;
            option.textContent =
                formatDate(schedule.schedule_date) +
                " · " +
                String(schedule.start_time).slice(0, 5) +
                " - " +
                String(schedule.end_time).slice(0, 5);

            $("scheduleSelect").appendChild(option);
        });

        updateTotal();
    } catch (error) {
        $("bookingError").textContent = error.message;
    }
}

function updateTotal() {
    const schedule = schedules.find(
        item =>
            String(item.schedule_id) ===
            $("scheduleSelect").value
    );

    if (!schedule) {
        $("totalPrice").textContent = money(0);
        $("confirmBookingBtn").disabled = true;
        return;
    }

    const available =
        Number(schedule.available_tickets);

    const quantity =
        Number($("ticketQuantity").value);

    const valid =
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= 10 &&
        quantity <= available;

    $("availabilityText").textContent =
        available + " tickets available" +
        (available === 0 ? " — Sold out" : "");

    $("totalPrice").textContent = money(
        Math.max(0, quantity) *
        Number(schedule.ticket_price)
    );

    $("confirmBookingBtn").disabled = !valid;
}

$("scheduleSelect").addEventListener(
    "change", updateTotal
);

$("ticketQuantity").addEventListener(
    "input", updateTotal
);

$("bookingForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const scheduleId =
            Number($("scheduleSelect").value);

        const quantity =
            Number($("ticketQuantity").value);

        if (
            !scheduleId ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 10
        ) {
            $("bookingError").textContent =
                "Please choose between 1 and 10 tickets.";
            return;
        }

        const button = $("confirmBookingBtn");
        button.disabled = true;
        button.textContent = "Processing booking...";
        $("bookingError").textContent = "";

        try {
            const result = await apiRequest(
                "bookings.php",
                {
                    method: "POST",
                    body: JSON.stringify({
                        schedule_id: scheduleId,
                        quantity
                    })
                }
            );

            $("confirmationReference").textContent =
                result.booking_reference;

            $("confirmationEvent").textContent =
                selectedEvent.event_name;

            $("confirmationTotal").textContent =
                money(result.total_amount);

            closeModal("bookingModal");
            openModal("confirmationModal");

        } catch (error) {
            $("bookingError").textContent =
                error.message;

            try {
                const refreshed = await apiRequest(
                    "schedules.php?event_id=" +
                    selectedEvent.event_id
                );

                schedules = refreshed.data || [];
                updateTotal();
            } catch {
                // Preserve the booking error.
            }

        } finally {
            button.textContent = "Confirm Booking";
            updateTotal();
        }
    }
);

$("closeBooking").addEventListener(
    "click",
    () => closeModal("bookingModal")
);

$("closeConfirmation").addEventListener(
    "click",
    () => closeModal("confirmationModal")
);

$("confirmationDone").addEventListener(
    "click",
    () => closeModal("confirmationModal")
);

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.add("hidden");
        }
    });
});

// ------------------------------------
// RESTORE AND VALIDATE SESSION
// ------------------------------------

async function restoreSession() {
    const savedToken =
        sessionStorage.getItem(SHARED_TOKEN);

    if (!savedToken) {
        clearSession();
        return;
    }

    try {
        const response = await fetch(
            API_BASE + "/me.php",
            {
                headers: {
                    Accept: "application/json",
                    Authorization:
                        "Bearer " + savedToken
                }
            }
        );

        if (!response.ok) {
            throw new Error("Session expired");
        }

        const result = await response.json();

        if (!result.user) {
            throw new Error("Invalid session");
        }

        if (result.user.role !== "customer") {
            // The customer portal should not
            // reuse an organiser/admin session.
            window.location.replace(
                "../member2_organiser/index.html"
            );
            return;
        }

        saveSession(savedToken, result.user);

    } catch {
        clearSession();
    }
}

// ------------------------------------
// START
// ------------------------------------

async function initialise() {
    // Hide the navbar's default auth controls when
    // Member 1's existing controls are in use.
    const nav =
        document.getElementById("eventhub-global-nav");

    if (nav &&
        document.getElementById("customerAuthControls")
            ?.parentElement === nav) {
        nav.querySelector(".eh-auth")?.remove();
    }

    await restoreSession();
    updateLoginUI();
    await loadEvents();

    // Guest login link from the shared homepage.
    const params = new URLSearchParams(
        window.location.search
    );

    if (params.get("login") === "1" && !token) {
        openModal("loginModal");
    }
}

initialise();

/* ==========================================
   EVENTHUB - SINGLE NAVBAR AUTH CONTROLS
   ========================================== */

function fixCustomerNavbar() {
    const nav = document.getElementById(
        "eventhub-global-nav"
    );

    const customerAuth = document.getElementById(
        "customerAuthControls"
    );

    if (!nav || !customerAuth) return;

    // Remove the extra Login button created by
    // the shared navigation.
    nav.querySelector(".eh-auth")?.remove();

    // Remove the unused role badge.
    nav.querySelector(".eh-role")?.remove();

    // Move existing customer Login/Logout controls
    // into the top-right of the shared navbar.
    if (customerAuth.parentElement !== nav) {
        nav.appendChild(customerAuth);
    }

    customerAuth.style.cssText = `
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

    // Keep the existing customer login state.
    updateLoginUI();
}

document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(fixCustomerNavbar);
});
