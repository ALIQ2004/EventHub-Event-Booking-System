
"use strict";

/*
 EventHub Shared Navigation
 Unified Login + RBAC

 Guest:
   Home, Explore Events

 Customer:
   Home, Explore Events, My Tickets

 Admin:
   Home, Organiser

 Session validated through PHP me.php.
*/

(function () {
    const ROOT =
        "/Hehe/event_booking_system/frontend/";

    const API =
        "/Hehe/event_booking_system/backend/api/";

    const TOKEN_KEY = "eventhub_session_token";
    const USER_KEY = "eventhub_session_user";

    const path = window.location.pathname;

    const currentPage =
        path.includes("member1_customer")
            ? "explore"
            : path.includes("member2_organiser")
            ? "organiser"
            : path.includes("member4_tickets")
            ? "tickets"
            : "home";

    // Member portals retain their own existing
    // login/logout controls; Home uses shared controls.
    const isHomepage =
        currentPage === "home";

    const items = [
        {
            id: "home",
            text: "Home",
            href: ROOT + "index.html",
            roles: ["guest", "customer", "admin"]
        },
        {
            id: "explore",
            text: "Explore Events",
            href: ROOT + "member1_customer/index.html",
            roles: ["guest", "customer"]
        },
        {
            id: "tickets",
            text: "My Tickets",
            href: ROOT + "member4_tickets/index.html",
            roles: ["customer"]
        },
        {
            id: "organiser",
            text: "Organiser",
            href: ROOT + "member2_organiser/index.html",
            roles: ["admin"]
        }
    ];

    // A validation request started before login
    // must never overwrite a newly saved session.
    let validationVersion = 0;

    function readUser() {
        try {
            return JSON.parse(
                sessionStorage.getItem(USER_KEY) || "null"
            );
        } catch {
            return null;
        }
    }

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || "";
    }

    function getRole(user) {
        const role = user?.role;

        return ["customer", "admin"].includes(role)
            ? role
            : "guest";
    }

    function firstName(user) {
        return String(user?.full_name || "User")
            .trim()
            .split(/\s+/)[0];
    }

    function notifyAuthChange(user) {
        window.dispatchEvent(
            new CustomEvent(
                "eventhub:authchange",
                {
                    detail: { user }
                }
            )
        );
    }

    function addStyles() {
        if (document.getElementById(
            "eh-rbac-style"
        )) {
            return;
        }

        const style = document.createElement("style");

        style.id = "eh-rbac-style";

        style.textContent = `
            #eventhub-global-nav {
                display: grid !important;
                grid-template-columns:
                    minmax(0, 1fr)
                    auto
                    minmax(0, 1fr) !important;
                align-items: center !important;
                gap: 18px;
                min-height: 70px;
                width: 100%;
                padding: 12px 7%;
                box-sizing: border-box;
                background: #0c0c15;
                border-bottom: 1px solid #383745;
                color: #fff;
                font-family:
                    'DM Sans', Arial, sans-serif;
                position: relative;
                z-index: 1000;
            }

            #eventhub-global-nav .eh-logo {
                grid-column: 1;
                justify-self: start;
                color: white;
                text-decoration: none;
                font-family:
                    'Outfit', Arial, sans-serif;
                font-size: 25px;
                font-weight: 900;
                white-space: nowrap;
            }

            #eventhub-global-nav .eh-logo span {
                color: #a88bff;
            }

            #eventhub-global-nav .eh-links {
                grid-column: 2;
                justify-self: center;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: nowrap;
                gap: 5px;
            }

            #eventhub-global-nav .eh-links a {
                padding: 10px 13px;
                border-radius: 9px;
                color: #c4bfd3;
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
            }

            #eventhub-global-nav .eh-links a:hover,
            #eventhub-global-nav
                .eh-links a[aria-current="page"] {
                color: #d4c7ff;
                background: #302445;
            }

            #eventhub-global-nav .eh-auth,
            #eventhub-global-nav .eh-role,
            #eventhub-global-nav #customerAuthControls,
            #eventhub-global-nav #managementAuth,
            #eventhub-global-nav #ticketNavAuth {
                grid-column: 3;
                justify-self: end;
                margin: 0 !important;
            }

            #eventhub-global-nav .eh-auth {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 12px;
                white-space: nowrap;
            }

            #eventhub-global-nav .eh-welcome {
                color: #d4c7ff;
                font-size: 13px;
                font-weight: 600;
            }

            #eventhub-global-nav .eh-auth-btn {
                padding: 9px 16px;
                border: 1px solid #383745;
                border-radius: 9px;
                background: transparent;
                color: white;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }

            #eventhub-global-nav .eh-auth-btn:hover {
                border-color: #a88bff;
                background: #232039;
            }

            @media (max-width: 950px) {
                #eventhub-global-nav {
                    grid-template-columns:
                        minmax(0, 1fr) auto !important;
                    padding: 14px 20px;
                }

                #eventhub-global-nav .eh-logo {
                    grid-column: 1;
                    grid-row: 1;
                }

                #eventhub-global-nav .eh-auth,
                #eventhub-global-nav .eh-role,
                #eventhub-global-nav
                    #customerAuthControls,
                #eventhub-global-nav
                    #managementAuth,
                #eventhub-global-nav
                    #ticketNavAuth {
                    grid-column: 2;
                    grid-row: 1;
                }

                #eventhub-global-nav .eh-links {
                    grid-column: 1 / -1;
                    grid-row: 2;
                    justify-self: center;
                    max-width: 100%;
                    overflow-x: auto;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function renderLinks(role) {
        const container =
            document.querySelector(
                "#eventhub-global-nav .eh-links"
            );

        if (!container) return;

        container.replaceChildren();

        items.filter(item =>
            item.roles.includes(role)
        ).forEach(item => {
            const link = document.createElement("a");

            link.href = item.href;
            link.textContent = item.text;

            if (item.id === currentPage) {
                link.setAttribute(
                    "aria-current",
                    "page"
                );
            }

            container.appendChild(link);
        });
    }

    function openUniversalLogin() {
        if (
            isHomepage &&
            typeof window.EventHubOpenLogin === "function"
        ) {
            window.EventHubOpenLogin();
        } else {
            window.location.assign(
                ROOT + "index.html?login=1"
            );
        }
    }

    function clearStorage() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);

        [
            "eventhub_token",
            "eventhub_user",
            "ticketnest_token",
            "eventhub_management_token",
            "venue_admin_token"
        ].forEach(key =>
            sessionStorage.removeItem(key)
        );
    }

    function renderAuth(user) {
        // Member pages use their existing
        // authentication buttons.
        if (!isHomepage) return;

        const nav = document.getElementById(
            "eventhub-global-nav"
        );

        if (!nav) return;

        let auth = nav.querySelector(".eh-auth");

        if (!auth) {
            auth = document.createElement("div");
            auth.className = "eh-auth";
            nav.appendChild(auth);
        }

        auth.replaceChildren();

        if (user) {
            const welcome =
                document.createElement("span");

            welcome.className = "eh-welcome";
            welcome.textContent =
                "Hi, " + firstName(user);

            const logout =
                document.createElement("button");

            logout.type = "button";
            logout.className = "eh-auth-btn";
            logout.textContent = "Logout";

            logout.addEventListener(
                "click",
                () => {
                    clearSession();

                    window.location.assign(
                        ROOT + "index.html"
                    );
                }
            );

            auth.append(welcome, logout);

        } else {
            const login =
                document.createElement("button");

            login.type = "button";
            login.className = "eh-auth-btn";
            login.textContent = "Login";

            login.addEventListener(
                "click",
                openUniversalLogin
            );

            auth.appendChild(login);
        }
    }

    function displaySession(user) {
        renderLinks(getRole(user));
        renderAuth(user);
        notifyAuthChange(user);
    }

    function setSession(jwt, user) {
        if (
            !jwt ||
            !["customer", "admin"].includes(user?.role)
        ) {
            return;
        }

        validationVersion++;

        sessionStorage.setItem(
            TOKEN_KEY,
            jwt
        );

        sessionStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );

        displaySession(user);
    }

    function clearSession() {
        validationVersion++;
        clearStorage();
        displaySession(null);
    }

    async function validateSession() {
        const savedToken = getToken();

        const thisValidation = ++validationVersion;

        if (!savedToken) {
            displaySession(null);
            return;
        }

        try {
            const response = await fetch(
                API + "me.php",
                {
                    headers: {
                        Accept: "application/json",
                        Authorization:
                            "Bearer " + savedToken
                    }
                }
            );

            const result = await response.json();

            // Ignore a stale request if another
            // login/logout has happened meanwhile.
            if (
                thisValidation !== validationVersion ||
                getToken() !== savedToken
            ) {
                return;
            }

            if (
                response.ok &&
                result.success !== false &&
                ["customer", "admin"]
                    .includes(result.user?.role)
            ) {
                sessionStorage.setItem(
                    USER_KEY,
                    JSON.stringify(result.user)
                );

                displaySession(result.user);

            } else if (
                response.status === 401 ||
                response.status === 403
            ) {
                // A rejected authentication/role
                // cannot be treated as a valid session.
                clearSession();

            } else {
                // Avoid deleting the session during
                // temporary server failures.
                displaySession(null);
            }

        } catch (error) {
            if (
                thisValidation === validationVersion
            ) {
                console.warn(
                    "EventHub session validation unavailable:",
                    error.message
                );

                // Keep the token, but show guest links
                // until the server can validate it.
                displaySession(null);
            }
        }
    }

    function renderNavigation() {
        if (document.getElementById(
            "eventhub-global-nav"
        )) {
            return;
        }

        addStyles();

        const nav = document.createElement("nav");
        nav.id = "eventhub-global-nav";
        nav.className = "eh-nav";
        nav.setAttribute(
            "aria-label",
            "EventHub main navigation"
        );

        const logo = document.createElement("a");
        logo.className = "eh-logo";
        logo.href = ROOT + "index.html";

        logo.appendChild(
            document.createTextNode("Event")
        );

        const highlight =
            document.createElement("span");

        highlight.textContent = "Hub.";
        logo.appendChild(highlight);

        const links = document.createElement("div");
        links.className = "eh-links";

        // Existing Member 1/2/4 scripts
        // can replace this placeholder.
        const placeholder =
            document.createElement("span");

        placeholder.className = "eh-role";
        placeholder.hidden = true;

        nav.append(
            logo,
            links,
            placeholder
        );

        document.body.prepend(nav);

        renderLinks("guest");
        renderAuth(null);

        validateSession();
    }

    window.EventHubAuth = {
        setSession,
        clearSession,
        getUser: readUser,
        getToken,
        refresh: validateSession
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            renderNavigation
        );
    } else {
        renderNavigation();
    }
})();
