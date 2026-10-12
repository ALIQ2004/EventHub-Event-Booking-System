
/*
 Venue Management Portal - Member 3
 Shared PHP REST API + JWT Authentication
*/

const API_BASE = "../../backend/api";

let venues = [];
let authToken = sessionStorage.getItem("venue_admin_token") || "";

const $ = (id) => document.getElementById(id);

const tableBody = $("venueTableBody");
const formSection = $("venueFormSection");
const venueForm = $("venueForm");
const formTitle = $("formTitle");

// ------------------------------------
// AUTHENTICATION INTERFACE
// ------------------------------------

// Add a login panel without changing the original HTML.
const authPanel = document.createElement("section");
authPanel.style.cssText = `
    max-width: 1010px;
    margin: 25px auto;
    padding: 20px;
    border: 1px solid #5147a3;
    border-radius: 12px;
    background: #202744;
    color: white;
`;

authPanel.innerHTML = `
    <div id="authLoggedOut">
        <h3>Administrator Login</h3>
        <p>Sign in to manage venues through the shared API.</p>
        <form id="adminLoginForm">
            <input id="adminEmail" type="email"
                placeholder="Admin email" required
                style="padding:10px;margin:5px;color:#111">

            <input id="adminPassword" type="password"
                placeholder="Password" required
                style="padding:10px;margin:5px;color:#111">

            <button type="submit"
                style="padding:11px 20px;cursor:pointer">
                Login
            </button>
        </form>
    </div>

    <div id="authLoggedIn" hidden>
        <strong>Administrator authenticated</strong>
        <button id="adminLogoutBtn" type="button"
            style="padding:10px;margin-left:15px;cursor:pointer">
            Logout
        </button>
    </div>
`;

// Insert the login panel at the beginning of the page.
document.body.insertBefore(authPanel, document.body.firstChild);

function updateAuthUI() {
    $("authLoggedOut").hidden = Boolean(authToken);
    $("authLoggedIn").hidden = !authToken;
    $("addVenueBtn").disabled = !authToken;
}

function logoutAdmin() {
    authToken = "";
    sessionStorage.removeItem("venue_admin_token");
    updateAuthUI();
    closeForm();
}

$("adminLogoutBtn").addEventListener("click", logoutAdmin);

$("adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    try {
        const response = await fetch(API_BASE + "/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Login failed");
        }

        if (result.user.role !== "admin") {
            throw new Error(
                "An administrator account is required."
            );
        }

        authToken = result.token;

        sessionStorage.setItem(
            "venue_admin_token",
            authToken
        );

        $("adminLoginForm").reset();

        updateAuthUI();
        await loadVenues();

        alert("Administrator login successful!");

    } catch (error) {
        alert(error.message);
    }
});

// ------------------------------------
// API REQUEST HELPER
// ------------------------------------

async function apiRequest(endpoint, method = "GET", data = null) {
    const headers = {
        "Accept": "application/json"
    };

    if (authToken) {
        headers["Authorization"] = "Bearer " + authToken;
    }

    if (data !== null) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(API_BASE + "/" + endpoint, {
            method,
            headers,
            ...(data !== null
                ? { body: JSON.stringify(data) }
                : {})
        });
    } catch {
        throw new Error(
            "Cannot connect to the PHP backend. Check XAMPP."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("Invalid response from PHP server.");
    }

    if (!response.ok) {
        if (response.status === 401 && authToken) {
            logoutAdmin();
        }

        throw new Error(
            result.message || "API request failed"
        );
    }

    return result;
}

// ------------------------------------
// GET - LOAD VENUES FROM MYSQL
// ------------------------------------

async function loadVenues() {
    tableBody.innerHTML = "";

    try {
        const result = await apiRequest("venues.php");

        venues = Array.isArray(result.data)
            ? result.data
            : [];

        renderVenues();

    } catch (error) {
        alert("Unable to load venues: " + error.message);
    }
}

// ------------------------------------
// DISPLAY VENUES IN EXISTING TABLE
// ------------------------------------

function renderVenues() {
    tableBody.innerHTML = "";

    if (venues.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.textContent = "No venues available.";
        return;
    }

    venues.forEach((venue) => {
        const row = tableBody.insertRow();

        const values = [
            venue.venue_id,
            venue.venue_name,
            `${venue.address}, ${venue.city}, ${venue.state}`,
            venue.capacity
        ];

        values.forEach((value) => {
            const cell = row.insertCell();
            cell.textContent = value ?? "";
        });

        const statusCell = row.insertCell();
        const badge = document.createElement("span");

        badge.className =
            venue.status === "available"
                ? "status-available"
                : "status-unavailable";

        badge.textContent = venue.status;
        statusCell.appendChild(badge);

        const actionCell = row.insertCell();

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.disabled = !authToken;

        editButton.addEventListener("click", () => {
            editVenue(venue.venue_id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.disabled = !authToken;

        deleteButton.addEventListener("click", () => {
            deleteVenue(venue.venue_id);
        });

        actionCell.append(editButton, deleteButton);
    });
}

// ------------------------------------
// OPEN ADD VENUE FORM
// ------------------------------------

function openForm() {
    if (!authToken) {
        alert("Please log in as administrator.");
        return;
    }

    venueForm.reset();
    $("venueId").value = "";

    // Backend creates venues as available.
    $("venueStatus").value = "available";
    $("venueStatus").disabled = true;

    setCreateFieldMode();

    formTitle.textContent = "Add New Venue";
    formSection.hidden = false;

    formSection.scrollIntoView({ behavior: "smooth" });
}

// ------------------------------------
// CLOSE FORM
// ------------------------------------

function closeForm() {
    formSection.hidden = true;
    venueForm.reset();
}

// ------------------------------------
// FORM MODE
// ------------------------------------

function setCreateFieldMode() {
    [
        "venueAddress",
        "venueCity",
        "venueState",
        "venueFacilities"
    ].forEach((id) => {
        $(id).readOnly = false;
    });
}

function setEditFieldMode() {
    // The existing PHP PUT API only supports
    // venue_name and capacity.
    [
        "venueAddress",
        "venueCity",
        "venueState",
        "venueFacilities"
    ].forEach((id) => {
        $(id).readOnly = true;
    });

    $("venueStatus").disabled = true;
}

// ------------------------------------
// EDIT VENUE
// ------------------------------------

function editVenue(id) {
    const venue = venues.find(
        (v) => Number(v.venue_id) === Number(id)
    );

    if (!venue) {
        alert("Venue not found.");
        return;
    }

    $("venueId").value = venue.venue_id;
    $("venueName").value = venue.venue_name;
    $("venueAddress").value = venue.address;
    $("venueCity").value = venue.city;
    $("venueState").value = venue.state;
    $("venueCapacity").value = venue.capacity;
    $("venueFacilities").value = venue.facilities || "";
    $("venueStatus").value = venue.status;

    setEditFieldMode();

    formTitle.textContent = "Edit Venue";
    formSection.hidden = false;

    formSection.scrollIntoView({ behavior: "smooth" });
}

// ------------------------------------
// DELETE VENUE THROUGH API
// ------------------------------------

async function deleteVenue(id) {
    if (!authToken) {
        alert("Administrator login required.");
        return;
    }

    const venue = venues.find(
        (v) => Number(v.venue_id) === Number(id)
    );

    if (!venue) return;

    const confirmed = confirm(
        `Delete "${venue.venue_name}" permanently?`
    );

    if (!confirmed) return;

    try {
        const result = await apiRequest(
            "venues.php?id=" + encodeURIComponent(id),
            "DELETE"
        );

        alert(result.message);
        closeForm();
        await loadVenues();

    } catch (error) {
        alert("Delete failed: " + error.message);
    }
}

// ------------------------------------
// CREATE / UPDATE VENUE
// ------------------------------------

venueForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
        alert("Please log in first.");
        return;
    }

    if (!venueForm.reportValidity()) return;

    const id = $("venueId").value;

    const venueData = {
        venue_name: $("venueName").value.trim(),
        address: $("venueAddress").value.trim(),
        city: $("venueCity").value.trim(),
        state: $("venueState").value.trim(),
        capacity: Number($("venueCapacity").value),
        facilities: $("venueFacilities").value.trim()
    };

    if (
        !venueData.venue_name ||
        !Number.isInteger(venueData.capacity) ||
        venueData.capacity <= 0
    ) {
        alert("Enter a valid venue name and capacity.");
        return;
    }

    const saveButton = venueForm.querySelector(
        'button[type="submit"]'
    );

    if (saveButton) saveButton.disabled = true;

    try {
        let result;

        if (id) {
            // PUT currently updates only name and capacity.
            result = await apiRequest(
                "venues.php?id=" + encodeURIComponent(id),
                "PUT",
                {
                    venue_name: venueData.venue_name,
                    capacity: venueData.capacity
                }
            );

        } else {
            if (
                !venueData.address ||
                !venueData.city ||
                !venueData.state
            ) {
                throw new Error(
                    "Address, city and state are required."
                );
            }

            result = await apiRequest(
                "venues.php",
                "POST",
                venueData
            );
        }

        alert(result.message);

        closeForm();
        await loadVenues();

    } catch (error) {
        alert("Save failed: " + error.message);

    } finally {
        if (saveButton) saveButton.disabled = false;
    }
});

// ------------------------------------
// BUTTON EVENTS
// ------------------------------------

$("addVenueBtn").addEventListener("click", openForm);

$("cancelBtn").addEventListener("click", closeForm);

// ------------------------------------
// START
// ------------------------------------

updateAuthUI();
loadVenues();
