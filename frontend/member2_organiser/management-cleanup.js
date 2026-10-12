
/*
 EventHub Management Sidebar Cleanup
 Removes duplicate branding and profile.
*/

(function () {
    "use strict";

    function cleanSidebar() {
        const sidebar = document.querySelector(".sidebar");

        if (!sidebar) return;

        const brand = sidebar.querySelector(".brand");
        const profile = sidebar.querySelector(".sidebar-bottom");

        if (brand) {
            brand.remove();
        }

        if (profile) {
            profile.remove();
        }

        sidebar.style.paddingTop = "28px";
        sidebar.style.justifyContent = "flex-start";
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            cleanSidebar
        );
    } else {
        cleanSidebar();
    }
})();
