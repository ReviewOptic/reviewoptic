(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var accountId = script.getAttribute("data-account-id");
  var theme = script.getAttribute("data-theme") || "light";
  if (!accountId) return;

  var apiBase = script.src.replace(/\/widget\.js.*$/, "");

  fetch(apiBase + "/api/public/widget-stats/" + accountId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.totalRatings) return;

      var avg = data.averageRating.toFixed(1);
      var count = data.totalRatings;
      var filled = Math.round(data.averageRating);

      var stars = "";
      for (var i = 1; i <= 5; i++) {
        stars += "<span style=\"color:" + (i <= filled ? "#f59e0b" : "#d1d5db") + ";font-size:20px;\">&#9733;</span>";
      }

      var bg = theme === "dark" ? "#1e293b" : "#ffffff";
      var textColor = theme === "dark" ? "#f8fafc" : "#0f172a";
      var subColor = theme === "dark" ? "#94a3b8" : "#64748b";
      var borderColor = theme === "dark" ? "#334155" : "#e2e8f0";

      var html = "<div style=\"display:inline-block;font-family:system-ui,sans-serif;background:" + bg + ";border:1px solid " + borderColor + ";border-radius:12px;padding:14px 20px;text-align:center;\">" +
        "<div>" + stars + "</div>" +
        "<div style=\"font-size:22px;font-weight:700;color:" + textColor + ";margin-top:4px;\">" + avg + " <span style=\"font-size:14px;font-weight:400;color:" + subColor + "\">out of 5</span></div>" +
        "<div style=\"font-size:12px;color:" + subColor + ";margin-top:2px;\">Based on " + count + " rating" + (count !== 1 ? "s" : "") + "</div>" +
        "<div style=\"font-size:10px;color:" + subColor + ";margin-top:8px;opacity:0.7;\">Powered by ReviewOptic</div>" +
        "</div>";

      var container = document.createElement("div");
      container.innerHTML = html;
      script.parentNode.insertBefore(container, script);
    })
    .catch(function () {});
})();
