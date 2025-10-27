async function checkAuth() {
  try {
    const response = await fetch("/api/admin/check-session", {
      credentials: "include",
    });
    
    if (!response.ok) {
      console.error('Session check failed with status:', response.status);
      window.location.href = "/admin-login.html";
      return false;
    }
    
    const responseData = await response.json();
    const data = responseData.data || {};

    if (!data.authenticated) {
      window.location.href = "/admin-login.html";
      return false;
    }

    const firstName = (data.user?.firstName || "").toString().trim();
    const lastName = (data.user?.lastName || "").toString().trim();
    const email = (data.user?.email || "").toString().trim();

    const fullName = `${firstName} ${lastName}`.trim() || "User";
    const initials =
      `${firstName.length > 0 ? firstName.charAt(0) : ""}${lastName.length > 0 ? lastName.charAt(0) : ""}`.trim() ||
      "U";

    document.getElementById("userName").textContent = fullName;
    document.getElementById("profileIcon").textContent = initials;
    document.getElementById("dropdownUserName").textContent = fullName;
    document.getElementById("dropdownUserEmail").textContent =
      email || "No email";

    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/admin-login.html";
    return false;
  }
}

function initDropdown() {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  const trigger = document.getElementById("profileTrigger");
  const menu = document.getElementById("dropdownMenu");
  
  if (!trigger || !menu) {
    return;
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = trigger.classList.contains("active");
    trigger.setAttribute("aria-expanded", !isOpen);
    menu.setAttribute("aria-hidden", isOpen);
    trigger.classList.toggle("active");
    menu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    trigger.classList.remove("active");
    menu.classList.remove("show");
    trigger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

async function loadStats() {
  try {
    const [loaResponse, qsResponse] = await Promise.all([
      fetch("/api/admin/letter-of-appointment/stats", {
        credentials: "include",
      }),
      fetch("/api/admin/quote-slip/stats", { credentials: "include" }),
    ]);

   if (!loaResponse.ok || !qsResponse.ok) {
     console.error('Stats API failed:', loaResponse.status, qsResponse.status);
     throw new Error("Stats API failed");
   }
    const loaResponseData = await loaResponse.json().catch(() => ({}));
    const qsResponseData = await qsResponse.json().catch(() => ({}));
    
    const loaStats = loaResponseData.data || loaResponseData;
    const qsStats = qsResponseData.data || qsResponseData;

    document.getElementById("loaTotal").textContent = loaStats.total || 0;
    document.getElementById("loaToday").textContent = loaStats.today || 0;
    document.getElementById("loaWeek").textContent =
      loaStats.thisWeek || 0;

    document.getElementById("qsTotal").textContent = qsStats.total || 0;
    document.getElementById("qsToday").textContent = qsStats.today || 0;
    document.getElementById("qsWeek").textContent = qsStats.thisWeek || 0;

    const total = (loaStats.total || 0) + (qsStats.total || 0);
    const today = (loaStats.today || 0) + (qsStats.today || 0);
    const week = (loaStats.thisWeek || 0) + (qsStats.thisWeek || 0);
    const month = (loaStats.thisMonth || 0) + (qsStats.thisMonth || 0);

    document.getElementById("totalSubmissions").textContent = total;
    document.getElementById("todaySubmissions").textContent = today;
    document.getElementById("weekSubmissions").textContent = week;
    document.getElementById("monthSubmissions").textContent = month;
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', { credentials: 'include' });
    const data = await response.json();
    return data.data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

async function logout() {
  try {
    const csrfToken = await getCsrfToken();
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: {
        'x-csrf-token': csrfToken
      },
      credentials: "include",
    });
    window.location.href = "/admin-login.html";
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/admin-login.html";
  }
}

async function init() {
  const authenticated = await checkAuth();
  if (authenticated) {
    initDropdown();
    await loadStats();
    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
  }
}

init();
