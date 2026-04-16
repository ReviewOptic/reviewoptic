(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var accountId = script.getAttribute("data-account-id");
  var theme = script.getAttribute("data-theme") || "light";
  if (!accountId) return;

  var apiBase = script.src.replace(/\/widget\.js.*$/, "");

  fetch(apiBase + "/api/widget/" + accountId + "/reviews")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.reviews || !data.reviews.length) return;

      var isDark = theme === "dark";
      var bg = isDark ? "#1e293b" : "#ffffff";
      var cardBg = isDark ? "#0f172a" : "#f8fafc";
      var textColor = isDark ? "#f8fafc" : "#0f172a";
      var subColor = isDark ? "#94a3b8" : "#64748b";
      var borderColor = isDark ? "#334155" : "#e2e8f0";

      function escHtml(str) {
        return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      }

      function renderStars(rating) {
        var s = "";
        for (var i = 1; i <= 5; i++) {
          s += "<span style=\"color:" + (i <= rating ? "#f59e0b" : (isDark ? "#334155" : "#e2e8f0")) + ";font-size:16px;\">&#9733;</span>";
        }
        return s;
      }

      function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      }

      function renderCard(review) {
        return "<div style=\"background:" + cardBg + ";border:1px solid " + borderColor + ";border-radius:10px;padding:16px 18px;\">" +
          "<div style=\"margin-bottom:6px;\">" + renderStars(review.rating) + "</div>" +
          "<div style=\"font-size:14px;font-weight:600;color:" + textColor + ";margin-bottom:2px;\">" + escHtml(review.displayName) + "</div>" +
          "<div style=\"font-size:12px;color:" + subColor + ";\">" + formatDate(review.createdAt) + "</div>" +
          "</div>";
      }

      var container = document.createElement("div");
      container.setAttribute("style", "font-family:system-ui,sans-serif;");

      if (data.layout === "carousel") {
        var cards = data.reviews;
        var current = 0;

        var inner = "<div style=\"position:relative;background:" + bg + ";border:1px solid " + borderColor + ";border-radius:12px;padding:20px;\">" +
          "<div id=\"rw-card\" style=\"min-height:90px;\">" + renderCard(cards[0]) + "</div>" +
          "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-top:14px;\">" +
            "<button id=\"rw-prev\" style=\"background:none;border:1px solid " + borderColor + ";border-radius:6px;padding:4px 10px;cursor:pointer;color:" + subColor + ";font-size:16px;\">&#8592;</button>" +
            "<span id=\"rw-dots\" style=\"font-size:12px;color:" + subColor + ";\">1 / " + cards.length + "</span>" +
            "<button id=\"rw-next\" style=\"background:none;border:1px solid " + borderColor + ";border-radius:6px;padding:4px 10px;cursor:pointer;color:" + subColor + ";font-size:16px;\">&#8594;</button>" +
          "</div>" +
          "<div style=\"text-align:center;margin-top:10px;font-size:10px;color:" + subColor + ";opacity:0.6;\">Powered by ReviewOptic</div>" +
          "</div>";

        container.innerHTML = inner;
        document.currentScript ? script.parentNode.insertBefore(container, script) : document.body.appendChild(container);

        var cardEl = container.querySelector("#rw-card");
        var dotsEl = container.querySelector("#rw-dots");

        container.querySelector("#rw-prev").addEventListener("click", function () {
          current = (current - 1 + cards.length) % cards.length;
          cardEl.innerHTML = renderCard(cards[current]);
          dotsEl.textContent = (current + 1) + " / " + cards.length;
        });
        container.querySelector("#rw-next").addEventListener("click", function () {
          current = (current + 1) % cards.length;
          cardEl.innerHTML = renderCard(cards[current]);
          dotsEl.textContent = (current + 1) + " / " + cards.length;
        });

      } else {
        // Grid layout
        var gridStyle = "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;";
        var cardsHtml = data.reviews.map(renderCard).join("");
        container.innerHTML =
          "<div style=\"" + gridStyle + "\">" + cardsHtml + "</div>" +
          "<div style=\"text-align:center;margin-top:10px;font-size:10px;color:" + subColor + ";opacity:0.6;\">Powered by ReviewOptic</div>";
        script.parentNode.insertBefore(container, script);
      }
    })
    .catch(function () {});
})();
