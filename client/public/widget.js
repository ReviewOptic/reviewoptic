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

      function el(tag, styles, attrs) {
        var e = document.createElement(tag);
        if (styles) e.setAttribute("style", styles);
        if (attrs) Object.keys(attrs).forEach(function(k) { e.setAttribute(k, attrs[k]); });
        return e;
      }

      function renderStars(rating) {
        var wrap = el("span");
        for (var i = 1; i <= 5; i++) {
          var s = el("span", "color:" + (i <= rating ? "#f59e0b" : (isDark ? "#334155" : "#e2e8f0")) + ";font-size:16px;");
          s.textContent = "★";
          wrap.appendChild(s);
        }
        return wrap;
      }

      function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      }

      function renderCard(review) {
        var card = el("div", "background:" + cardBg + ";border:1px solid " + borderColor + ";border-radius:10px;padding:16px 18px;");
        var starsWrap = el("div", "margin-bottom:6px;");
        starsWrap.appendChild(renderStars(review.rating));
        card.appendChild(starsWrap);
        var nameDiv = el("div", "font-size:14px;font-weight:600;color:" + textColor + ";margin-bottom:2px;");
        nameDiv.textContent = review.displayName || "";
        card.appendChild(nameDiv);
        var dateDiv = el("div", "font-size:12px;color:" + subColor + ";");
        dateDiv.textContent = formatDate(review.createdAt);
        card.appendChild(dateDiv);
        return card;
      }

      function poweredBy() {
        var p = el("div", "text-align:center;margin-top:10px;font-size:10px;color:" + subColor + ";opacity:0.6;");
        p.textContent = "Powered by ReviewOptic";
        return p;
      }

      var container = el("div", "font-family:system-ui,sans-serif;");

      if (data.layout === "carousel") {
        var cards = data.reviews;
        var current = 0;

        var outer = el("div", "position:relative;background:" + bg + ";border:1px solid " + borderColor + ";border-radius:12px;padding:20px;");
        var cardEl = el("div", "min-height:90px;");
        cardEl.setAttribute("id", "rw-card");
        cardEl.appendChild(renderCard(cards[0]));
        outer.appendChild(cardEl);

        var nav = el("div", "display:flex;align-items:center;justify-content:space-between;margin-top:14px;");
        var prevBtn = el("button", "background:none;border:1px solid " + borderColor + ";border-radius:6px;padding:4px 10px;cursor:pointer;color:" + subColor + ";font-size:16px;");
        prevBtn.textContent = "←";
        var dotsEl = el("span", "font-size:12px;color:" + subColor + ";");
        dotsEl.textContent = "1 / " + cards.length;
        var nextBtn = el("button", "background:none;border:1px solid " + borderColor + ";border-radius:6px;padding:4px 10px;cursor:pointer;color:" + subColor + ";font-size:16px;");
        nextBtn.textContent = "→";
        nav.appendChild(prevBtn);
        nav.appendChild(dotsEl);
        nav.appendChild(nextBtn);
        outer.appendChild(nav);
        outer.appendChild(poweredBy());
        container.appendChild(outer);
        script.parentNode.insertBefore(container, script);

        prevBtn.addEventListener("click", function () {
          current = (current - 1 + cards.length) % cards.length;
          while (cardEl.firstChild) cardEl.removeChild(cardEl.firstChild);
          cardEl.appendChild(renderCard(cards[current]));
          dotsEl.textContent = (current + 1) + " / " + cards.length;
        });
        nextBtn.addEventListener("click", function () {
          current = (current + 1) % cards.length;
          while (cardEl.firstChild) cardEl.removeChild(cardEl.firstChild);
          cardEl.appendChild(renderCard(cards[current]));
          dotsEl.textContent = (current + 1) + " / " + cards.length;
        });

      } else {
        var grid = el("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;");
        data.reviews.forEach(function(review) { grid.appendChild(renderCard(review)); });
        container.appendChild(grid);
        container.appendChild(poweredBy());
        script.parentNode.insertBefore(container, script);
      }
    })
    .catch(function () {});
})();
