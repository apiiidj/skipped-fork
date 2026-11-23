// ==UserScript==
// @name         1
// @namespace    1
// @version      1
// @description  1
// @author       1
// @match        https://*.work.ink/*
// @match        https://work.ink/*
// @match        https://red-square.space/*
// @match        https://kys.linkvertise.lol/*
// @match        https://red-square-fallback.luarmor.lol/*
// @match        https://*.lootdest.org/*
// @match        https://lootdest.org/*
// @match        https://*.loot-link.com/*
// @match        https://loot-link.com/*
// @match        https://*.loot-links.com/*
// @match        https://loot-links.com/*
// @match        https://links.lootlabs.gg/*
// @match        https://nerventualken.com/captcha*
// @match        https://ultra-links.net/*
// @match        https://lootboost.net/*
// @match        https://fast-links.org/*
// @match        https://loot-reward.com/*
// @match        https://linkvertise.com/*
// @match       https://rekonise.com/*
// @match       https://lockr.so/*
// @match       https://lockr.net/*
// @match       https://t.tenlets.com/*
// @match       https://play.ogame.gameforge.com/*
// @match        https://ads.luarmor.net/*
// @match        https://auth.platorelay.com/*
// @match        https://auth.platoboost.com/*
// @match        https://auth.platoboost.net/*
// @match        https://auth.platoboost.app/*

// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard

// @run-at       document-start

// @connect      skipped.lol
// @connect      *
// ==/UserScript==

(() => {
    if (location.hostname !== "ads.luarmor.net" || window.self !== window.top) return;
    const ENABLED = "skipped_luarmor_auto_enabled";
    const LIMIT = 6;
    let enabled = false, started = false, observer = null, ticker = 0, stableKey = "", stableSince = 0;
    let status = null;
    try {
        enabled = GM_getValue(ENABLED, true) !== false;
    } catch (_) {}
    function setMessage(text) {
        if (!status) return;
        const label = enabled ? text + " — Stop" : text + " — Resume";
        if (status.textContent !== label) status.textContent = label;
    }
    function stop() {
        enabled = false;
        try {
            GM_setValue(ENABLED, false);
        } catch (_) {}
        if (observer) observer.disconnect();
        observer = null;
        if (ticker) clearInterval(ticker);
        ticker = 0;
        stableKey = "";
        setMessage("Luarmor auto paused");
    }
    function monitor() {
        if (!started || !enabled || observer) return;
        observer = new MutationObserver(run);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [ "disabled", "aria-disabled", "class", "style", "hidden" ]
        });
        ticker = setInterval(run, 100);
        run();
    }
    function resume() {
        try {
            GM_setValue(ENABLED, true);
        } catch (_) {
            enabled = false;
            setMessage("Unable to resume");
            return;
        }
        enabled = true;
        stableKey = "";
        setMessage("Luarmor auto enabled");
        monitor();
    }
    function progress() {
        const label = document.querySelector("#adprogressp");
        const match = label && (label.textContent || "").match(/\b(\d+)\s*\/\s*(\d+)\b/);
        const hub = (document.querySelector("#hubnamearea")?.textContent || "").trim().toLowerCase();
        if (!match || !hub) return null;
        const done = Number(match[1]), total = Number(match[2]);
        if (!Number.isInteger(done) || !Number.isInteger(total) || total < 1 || total > 50 || done < 0 || done > total) return null;
        return {
            done: done,
            total: total,
            hub: hub
        };
    }
    function prefix(p) {
        return "skipped.luarmor.v1:" + location.pathname + ":" + p.hub + ":" + p.total + ":";
    }
    function buttonKind(btn, p) {
        if (!btn || !p) return null;
        if (btn.id === "nextbtn" && p.done < p.total && /\bopenNextCheckpoint\s*\(/.test(btn.getAttribute("onclick") || "")) return "checkpoint:" + p.done;
        if (btn.id === "newkeybtn" && p.done === p.total && /\bnewKey\s*\(/.test(btn.getAttribute("onclick") || "")) return "newkey";
        return null;
    }
    function visible(el) {
        if (!el || !el.isConnected || el.hidden || el.getClientRects().length === 0) return false;
        for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
            const css = getComputedStyle(node);
            if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) === 0 || node.hidden || node.getAttribute("aria-hidden") === "true") return false;
        }
        return true;
    }
    function usable(btn) {
        if (!visible(btn) || btn.disabled || btn.getAttribute("aria-disabled") === "true" || btn.classList.contains("disabled")) return false;
        return getComputedStyle(btn).pointerEvents !== "none";
    }
    function captchaActive() {
        if (visible(document.querySelector("#captchafield"))) return true;
        return [ ...document.querySelectorAll('iframe[src*="hcaptcha.com"][src*="frame=challenge"]') ].some(visible);
    }
    function remember(p, kind) {
        try {
            sessionStorage.setItem(prefix(p) + kind, "1");
            return true;
        } catch (_) {
            return false;
        }
    }
    function marked(p, kind) {
        try {
            return sessionStorage.getItem(prefix(p) + kind) === "1";
        } catch (_) {
            return true;
        }
    }
    document.addEventListener("click", event => {
        const btn = event.target?.closest?.("#nextbtn, #newkeybtn");
        const p = progress(), kind = buttonKind(btn, p);
        if (kind) remember(p, kind);
    }, true);
    function run() {
        if (!enabled || !started || document.visibilityState !== "visible") return;
        const p = progress();
        if (!p || captchaActive()) {
            stableKey = "";
            return;
        }
        const btn = document.querySelector(p.done < p.total ? "#nextbtn" : "#newkeybtn");
        const kind = buttonKind(btn, p);
        if (!kind || !usable(btn)) {
            stableKey = "";
            return;
        }
        const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        if (typeof page[p.done < p.total ? "openNextCheckpoint" : "newKey"] !== "function") {
            stableKey = "";
            return;
        }
        const key = prefix(p) + kind;
        if (marked(p, kind)) {
            stableKey = "";
            setMessage("Checkpoint already started");
            return;
        }
        if (stableKey !== key) {
            stableKey = key;
            stableSince = Date.now();
            return;
        }
        if (Date.now() - stableSince < 250) return;
        try {
            const countKey = "skipped.luarmor.auto.clicks";
            const count = Number(sessionStorage.getItem(countKey) || "0");
            if (!Number.isSafeInteger(count) || count >= LIMIT) {
                stop();
                setMessage("Safety limit reached");
                return;
            }
            if (!remember(p, kind)) {
                stop();
                setMessage("Storage unavailable");
                return;
            }
            sessionStorage.setItem(countKey, String(count + 1));
        } catch (_) {
            stop();
            return;
        }
        stableKey = "";
        setMessage("Action started once");
        try {
            btn.click();
        } catch (error) {
            console.error("[Luarmor auto] click failed", error);
        }
    }
    try {
        GM_registerMenuCommand("Luarmor: Pause automation", stop);
        GM_registerMenuCommand("Luarmor: Resume automation", resume);
        GM_registerMenuCommand("Luarmor: Rearm current checkpoint", () => {
            const p = progress();
            try {
                if (p) sessionStorage.removeItem(prefix(p) + (p.done < p.total ? "checkpoint:" + p.done : "newkey"));
                sessionStorage.removeItem("skipped.luarmor.auto.clicks");
                resume();
            } catch (_) {
                alert("Cannot rearm: storage unavailable.");
            }
        });
    } catch (_) {}
    function start() {
        if (started) return;
        started = true;
        status = document.createElement("button");
        status.type = "button";
        status.setAttribute("aria-label", "Pause or resume Luarmor automation");
        status.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483646;padding:10px 14px;border:1px solid #d9e0eb;border-radius:8px;background:#182232;color:white;font:14px sans-serif;cursor:pointer";
        status.addEventListener("click", () => enabled ? stop() : resume());
        document.body?.appendChild(status);
        setMessage(enabled ? "Luarmor auto enabled" : "Luarmor auto paused");
        monitor();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {
        once: true
    }); else start();
})();

(() => {
    const host = location.hostname;
    const domains = [ "lootdest.org", "loot-link.com", "loot-links.com", "links.lootlabs.gg", "ultra-links.net", "lootboost.net", "fast-links.org", "loot-reward.com" ];
    const captchaFrame = host === "nerventualken.com" && /^\/captcha(?:\/|$)/.test(location.pathname) && window.self !== window.top;
    if (!captchaFrame && !domains.some(d => host === d || host.endsWith("." + d))) return;
    const clicks = new WeakMap;
    const timer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        const button = document.querySelector("button#go");
        if (!button || !button.isConnected || button.disabled || button.getAttribute("aria-disabled") === "true" || !button.getClientRects().length) return;
        const style = getComputedStyle(button);
        if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return;
        const n = clicks.get(button) || 0;
        if (n >= 2400) return;
        clicks.set(button, n + 1);
        button.click();
    }, 50);
    window.addEventListener("pagehide", () => clearInterval(timer), {
        once: true
    });
})();

if (location.hostname !== "ads.luarmor.net" && location.hostname !== "nerventualken.com") {
    (() => {
        const host = location.hostname;
        const domains = [ "lootdest.org", "loot-link.com", "loot-links.com", "links.lootlabs.gg", "ultra-links.net", "lootboost.net", "fast-links.org", "loot-reward.com" ];
        if (!domains.some(d => host === d || host.endsWith("." + d))) return;
        const clickedTokens = new Set;
        const responseSelector = 'textarea[name="g-recaptcha-response"], textarea[name="h-captcha-response"], input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]';
        const continueLabel = /^(continue|proceed|next|continue to destination)$/i;
        function scan(doc, depth = 0) {
            if (!doc || depth > 3) return;
            for (const field of doc.querySelectorAll(responseSelector)) {
                const token = (field.value || "").trim();
                if (!token || clickedTokens.has(token)) continue;
                const scope = field.closest('form, dialog, [role="dialog"]');
                if (!scope) continue;
                for (const button of scope.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]')) {
                    const label = (button.value || button.textContent || button.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
                    const style = doc.defaultView.getComputedStyle(button);
                    if (!continueLabel.test(label) || button.disabled || button.getAttribute("aria-disabled") === "true" || style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none" || !button.getClientRects().length) continue;
                    clickedTokens.add(token);
                    button.click();
                    break;
                }
            }
            for (const frame of doc.querySelectorAll("iframe")) {
                try {
                    if (frame.contentDocument) scan(frame.contentDocument, depth + 1);
                } catch (_) {}
            }
        }
        const run = () => {
            try {
                scan(document);
            } catch (e) {
                console.debug("[LL auto-continue]", e);
            }
        };
        const timer = setInterval(run, 250);
        document.addEventListener("input", run, true);
        document.addEventListener("change", run, true);
        window.addEventListener("pagehide", () => clearInterval(timer), {
            once: true
        });
        setTimeout(() => clearInterval(timer), 18e4);
        run();
    })();
    (function() {
        const VITRE_CSS = ':root {\n  color-scheme: light dark;\n  --vt-hue: 250;\n\n  --vt-font: ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Segoe UI Variable Text", Roboto, "Helvetica Neue", sans-serif;\n  --vt-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;\n\n  --vt-bg: light-dark(oklch(0.945 0.008 90), oklch(0.16 0.008 260));\n  --vt-ink: light-dark(oklch(0.2 0.012 260), oklch(0.97 0.004 260));\n  --vt-ink-2: light-dark(oklch(0.4 0.012 260), oklch(0.8 0.008 260));\n  --vt-ink-3: light-dark(oklch(0.5 0.012 260), oklch(0.74 0.008 260));\n\n  --vt-accent: light-dark(oklch(0.52 0.15 var(--vt-hue)), oklch(0.72 0.13 var(--vt-hue)));\n  --vt-accent-ink: light-dark(oklch(0.99 0 0), oklch(0.18 0.03 var(--vt-hue)));\n  --vt-ok: light-dark(oklch(0.55 0.13 155), oklch(0.76 0.14 155));\n  --vt-warn: light-dark(oklch(0.62 0.13 70), oklch(0.82 0.13 80));\n  --vt-danger: light-dark(oklch(0.55 0.19 25), oklch(0.72 0.16 25));\n\n  --vt-fill-thin: light-dark(oklch(1 0 0 / 0.24), oklch(0.3 0.01 260 / 0.26));\n  --vt-fill: light-dark(oklch(1 0 0 / 0.4), oklch(0.28 0.01 260 / 0.42));\n  --vt-fill-strong: light-dark(oklch(1 0 0 / 0.6), oklch(0.3 0.01 260 / 0.6));\n  --vt-fill-hover: light-dark(oklch(1 0 0 / 0.74), oklch(0.36 0.012 260 / 0.7));\n  --vt-inset: light-dark(oklch(0.3 0.02 260 / 0.08), oklch(0 0 0 / 0.26));\n  --vt-inset-hover: light-dark(oklch(0.3 0.02 260 / 0.12), oklch(1 0 0 / 0.08));\n  --vt-hair: light-dark(oklch(0.3 0.02 260 / 0.12), oklch(1 0 0 / 0.1));\n  --vt-scrim: light-dark(oklch(0.25 0.02 260 / 0.28), oklch(0 0 0 / 0.5));\n  --vt-knob: light-dark(oklch(1 0 0 / 0.96), oklch(0.96 0.004 260 / 0.94));\n\n  --vt-line: light-dark(oklch(1 0 0 / 0.55), oklch(1 0 0 / 0.1));\n  --vt-rim-hi: light-dark(oklch(1 0 0 / 0.95), oklch(1 0 0 / 0.2));\n  --vt-rim-lo: light-dark(oklch(1 0 0 / 0.4), oklch(1 0 0 / 0.05));\n  --vt-lens: light-dark(oklch(1 0 0 / 0.5), oklch(1 0 0 / 0.08));\n  --vt-spec: light-dark(oklch(1 0 0 / 0.95), oklch(1 0 0 / 0.38));\n  --vt-spec-lo: light-dark(oklch(1 0 0 / 0.5), oklch(1 0 0 / 0.16));\n  --vt-shade-1: light-dark(oklch(0.25 0.03 260 / 0.1), oklch(0 0 0 / 0.3));\n  --vt-shade-2: light-dark(oklch(0.25 0.03 260 / 0.16), oklch(0 0 0 / 0.4));\n  --vt-shade-3: light-dark(oklch(0.25 0.03 260 / 0.24), oklch(0 0 0 / 0.55));\n\n  --vt-s-1: light-dark(oklch(0.7 0.13 48), oklch(0.5 0.1 48));\n  --vt-s-2: light-dark(oklch(0.42 0.08 250), oklch(0.36 0.07 250));\n  --vt-s-3: light-dark(oklch(0.8 0.07 150), oklch(0.46 0.06 150));\n  --vt-s-4: light-dark(oklch(0.9 0.08 92), oklch(0.58 0.08 88));\n  --vt-s-5: light-dark(oklch(0.82 0.07 18), oklch(0.44 0.07 18));\n\n  --vt-blur: 24px;\n  --vt-sat: 1.8;\n\n  --vt-r-xs: 8px;\n  --vt-r-sm: 12px;\n  --vt-r-md: 18px;\n  --vt-r-lg: 26px;\n  --vt-r-xl: 34px;\n  --vt-r-pill: 999px;\n\n  --vt-rim:\n    inset 0 0 0 1px var(--vt-line),\n    inset 0 1px 1px var(--vt-rim-hi),\n    inset 0 -1px 1px var(--vt-rim-lo),\n    inset 0 0 22px -8px var(--vt-lens);\n  --vt-shadow-1: 0 1px 2px var(--vt-shade-1), 0 6px 16px -6px var(--vt-shade-2);\n  --vt-shadow-2: 0 2px 4px var(--vt-shade-1), 0 18px 40px -14px var(--vt-shade-2);\n  --vt-shadow-3: 0 4px 8px var(--vt-shade-1), 0 34px 70px -18px var(--vt-shade-3);\n\n  --vt-spring: linear(0, 0.2 6%, 0.65 14%, 0.97 24%, 1.06 32%, 1.07 38%, 1.03 50%, 1.005 62%, 1);\n  --vt-t-fast: 0.18s;\n  --vt-t-med: 0.45s;\n}\n\n:root[data-theme="light"] { color-scheme: light; }\n:root[data-theme="dark"] { color-scheme: dark; }\n\n:where(html) {\n  background: var(--vt-bg);\n  color: var(--vt-ink);\n  font-family: var(--vt-font);\n  font-size: 16px;\n  line-height: 1.5;\n  -webkit-font-smoothing: antialiased;\n  -webkit-text-size-adjust: 100%;\n  text-size-adjust: 100%;\n  scrollbar-width: thin;\n  scrollbar-color: var(--vt-ink-3) transparent;\n}\n:where(body) { margin: 0; min-height: 100dvh; font-size: 0.9375rem; }\n:where(*, *::before, *::after) { box-sizing: border-box; }\n:where(h1, h2, h3, h4) { margin: 0; font-weight: 650; letter-spacing: -0.022em; line-height: 1.15; text-wrap: balance; }\n:where(h1) { font-size: 2.25rem; }\n:where(h2) { font-size: 1.5rem; }\n:where(h3) { font-size: 1.125rem; letter-spacing: -0.012em; }\n:where(h4) { font-size: 0.9375rem; letter-spacing: 0; }\n:where(p) { margin: 0; text-wrap: pretty; }\n:where(a) { color: var(--vt-accent); text-underline-offset: 0.2em; }\n:where(hr) { border: 0; height: 1px; margin: 0; background: var(--vt-hair); }\n:where(code, kbd, samp) { font-family: var(--vt-font-mono); font-size: 0.875em; }\n:where(:focus-visible) { outline: 2px solid var(--vt-accent); outline-offset: 2px; }\n::selection { background: color-mix(in oklch, var(--vt-accent) 30%, transparent); }\n\nbody[data-vt-scene] { background: transparent; }\n.vt-scene { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }\n.vt-scene i { position: absolute; display: block; }\n.vt-scene i:nth-child(1) { left: -10vmin; bottom: -25vmin; width: 55vmin; height: 100vmin; border-radius: 999px; background: var(--vt-s-2); }\n.vt-scene i:nth-child(2) { right: -15vmin; top: -12vmin; width: 75vmin; height: 75vmin; border-radius: 50%; background: var(--vt-s-1); }\n.vt-scene i:nth-child(3) { left: 40%; bottom: -10vmin; width: 45vmin; height: 45vmin; border-radius: 50%; background: var(--vt-s-3); }\n.vt-scene i:nth-child(4) { left: 8%; top: 27%; width: 70vmin; height: 15vmin; border-radius: 999px; background: var(--vt-s-4); transform: rotate(-14deg); }\n.vt-scene i:nth-child(5) { right: 8%; bottom: 14%; width: 25vmin; height: 25vmin; border-radius: 50%; background: var(--vt-s-5); }\n.vt-scene i:nth-child(6) { right: 22%; bottom: 8%; width: 30vmin; height: 30vmin; border-radius: 6vmin; background: var(--vt-s-2); }\n\n.vt-muted { color: var(--vt-ink-2); }\n.vt-faint { color: var(--vt-ink-3); }\n.vt-caption { font-size: 0.8125rem; color: var(--vt-ink-3); }\n.vt-num { font-variant-numeric: tabular-nums; }\n\n.vt-icon {\n  width: 1.25rem;\n  height: 1.25rem;\n  flex: none;\n  fill: none;\n  stroke: currentColor;\n  stroke-width: 1.75;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n}\n\n.vt-glass {\n  position: relative;\n  isolation: isolate;\n  background: var(--vt-fill);\n  -webkit-backdrop-filter: blur(var(--vt-blur)) saturate(var(--vt-sat));\n  backdrop-filter: blur(var(--vt-blur)) saturate(var(--vt-sat));\n  border-radius: var(--vt-r-lg);\n  box-shadow: var(--vt-rim), var(--vt-shadow-2);\n}\n.vt-glass--thin { --vt-fill: var(--vt-fill-thin); --vt-blur: 12px; }\n.vt-glass--thick { --vt-fill: var(--vt-fill-strong); --vt-blur: 40px; }\n\n.vt-glass::before,\n.vt-btn::before {\n  content: "";\n  position: absolute;\n  inset: 0;\n  padding: 1px;\n  border-radius: inherit;\n  background: linear-gradient(140deg, var(--vt-spec) 0%, transparent 34%, transparent 66%, var(--vt-spec-lo) 100%);\n  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);\n  -webkit-mask-composite: xor;\n  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);\n  pointer-events: none;\n}\n\nhtml[data-vt-lens] .vt-lens {\n  --vt-blur: 5px;\n  --vt-sat: 1.6;\n  --vt-lens-bezel: 26px;\n  --vt-lens-scale: 64;\n  -webkit-backdrop-filter: var(--vt-lens-url, blur(0px)) blur(var(--vt-blur)) saturate(var(--vt-sat));\n  backdrop-filter: var(--vt-lens-url, blur(0px)) blur(var(--vt-blur)) saturate(var(--vt-sat));\n}\n\n.vt-card { padding: 1.25rem; }\n.vt-card > :where(h2, h3, h4) + * { margin-top: 0.5rem; }\n\n.vt-btn {\n  position: relative;\n  isolation: isolate;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  min-height: 2.5rem;\n  padding: 0 1.15rem;\n  border: 0;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-fill-strong);\n  -webkit-backdrop-filter: blur(16px) saturate(var(--vt-sat));\n  backdrop-filter: blur(16px) saturate(var(--vt-sat));\n  box-shadow: var(--vt-rim), var(--vt-shadow-1);\n  color: var(--vt-ink);\n  font: inherit;\n  font-weight: 560;\n  line-height: 1;\n  text-decoration: none;\n  white-space: nowrap;\n  cursor: pointer;\n  user-select: none;\n  -webkit-tap-highlight-color: transparent;\n  transition:\n    transform var(--vt-t-med) var(--vt-spring),\n    background-color var(--vt-t-fast),\n    box-shadow var(--vt-t-fast);\n}\n.vt-btn:hover { background: var(--vt-fill-hover); }\n.vt-btn:active { transform: scale(0.95); }\n.vt-btn:disabled,\n.vt-btn[aria-disabled="true"] { opacity: 0.45; pointer-events: none; }\n.vt-btn--primary {\n  background: color-mix(in oklch, var(--vt-accent) 92%, transparent);\n  color: var(--vt-accent-ink);\n}\n.vt-btn--primary:hover { background: var(--vt-accent); }\n.vt-btn--danger { color: var(--vt-danger); }\n.vt-btn--ghost {\n  background: transparent;\n  box-shadow: none;\n  -webkit-backdrop-filter: none;\n  backdrop-filter: none;\n}\n.vt-btn--ghost::before { display: none; }\n.vt-btn--ghost:hover { background: var(--vt-inset-hover); }\n.vt-btn--sm { min-height: 2rem; padding: 0 0.85rem; font-size: 0.8125rem; }\n.vt-btn--lg { min-height: 3rem; padding: 0 1.5rem; font-size: 1rem; }\n.vt-btn--icon { width: 2.5rem; padding: 0; }\n.vt-btn--icon.vt-btn--sm { width: 2rem; }\n\n.vt-btn-group { display: inline-flex; gap: 0.5rem; flex-wrap: wrap; }\n\n.vt-glass :is(.vt-btn, .vt-input, .vt-select, .vt-textarea, .vt-segmented) {\n  -webkit-backdrop-filter: none;\n  backdrop-filter: none;\n}\n\n.vt-input,\n.vt-select,\n.vt-textarea {\n  width: 100%;\n  min-height: 2.75rem;\n  padding: 0 1rem;\n  border: 0;\n  border-radius: var(--vt-r-md);\n  background: var(--vt-inset);\n  box-shadow: inset 0 1px 2px var(--vt-shade-1), inset 0 0 0 1px var(--vt-hair);\n  color: var(--vt-ink);\n  font: inherit;\n  transition: background-color var(--vt-t-fast), box-shadow var(--vt-t-fast);\n}\n.vt-textarea { min-height: 6rem; padding: 0.75rem 1rem; resize: vertical; }\n.vt-select {\n  appearance: none;\n  padding-right: 2.5rem;\n  background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 16 16\' fill=\'none\' stroke=\'%23888\' stroke-width=\'1.75\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m4 6 4 4 4-4\'/%3E%3C/svg%3E");\n  background-repeat: no-repeat;\n  background-position: right 0.9rem center;\n}\n.vt-input::placeholder,\n.vt-textarea::placeholder { color: var(--vt-ink-3); }\n.vt-input:hover,\n.vt-select:hover,\n.vt-textarea:hover { background-color: var(--vt-inset-hover); }\n.vt-input:focus-visible,\n.vt-select:focus-visible,\n.vt-textarea:focus-visible {\n  outline: 2px solid var(--vt-accent);\n  outline-offset: 1px;\n}\n\n.vt-field { display: grid; gap: 0.375rem; }\n.vt-label { font-size: 0.8125rem; font-weight: 560; color: var(--vt-ink-2); }\n\n.vt-switch {\n  appearance: none;\n  position: relative;\n  flex: none;\n  width: 3.25rem;\n  height: 2rem;\n  margin: 0;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-inset);\n  box-shadow: inset 0 1px 3px var(--vt-shade-2), inset 0 0 0 1px var(--vt-hair);\n  cursor: pointer;\n  transition: background-color 0.3s;\n  -webkit-tap-highlight-color: transparent;\n}\n.vt-switch::after {\n  content: "";\n  position: absolute;\n  top: 0.2rem;\n  left: 0.2rem;\n  width: 1.6rem;\n  height: 1.6rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-knob);\n  box-shadow: 0 1px 1px var(--vt-shade-1), 0 3px 8px var(--vt-shade-2), inset 0 1px 0 oklch(1 0 0 / 0.8);\n  transition: transform var(--vt-t-med) var(--vt-spring), width 0.25s var(--vt-spring);\n}\n.vt-switch:checked { background: var(--vt-accent); }\n.vt-switch:checked::after { transform: translateX(1.25rem); }\n.vt-switch:active::after { width: 2.1rem; }\n.vt-switch:checked:active::after { transform: translateX(0.75rem); }\n.vt-switch:disabled { opacity: 0.45; pointer-events: none; }\n\n.vt-check,\n.vt-radio {\n  appearance: none;\n  position: relative;\n  flex: none;\n  width: 1.375rem;\n  height: 1.375rem;\n  margin: 0;\n  background: var(--vt-inset);\n  box-shadow: inset 0 1px 2px var(--vt-shade-1), inset 0 0 0 1px var(--vt-hair);\n  cursor: pointer;\n  transition: background-color var(--vt-t-fast), transform var(--vt-t-med) var(--vt-spring);\n}\n.vt-check { border-radius: 7px; }\n.vt-radio { border-radius: var(--vt-r-pill); }\n.vt-check:checked,\n.vt-radio:checked { background: var(--vt-accent); }\n.vt-check:active,\n.vt-radio:active { transform: scale(0.88); }\n.vt-check::after {\n  content: "";\n  position: absolute;\n  left: 50%;\n  top: 46%;\n  width: 0.3rem;\n  height: 0.6rem;\n  border: solid var(--vt-accent-ink);\n  border-width: 0 2px 2px 0;\n  transform: translate(-50%, -50%) rotate(45deg) scale(0);\n  transition: transform var(--vt-t-med) var(--vt-spring);\n}\n.vt-check:checked::after { transform: translate(-50%, -50%) rotate(45deg) scale(1); }\n.vt-radio::after {\n  content: "";\n  position: absolute;\n  inset: 0.4rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-accent-ink);\n  transform: scale(0);\n  transition: transform var(--vt-t-med) var(--vt-spring);\n}\n.vt-radio:checked::after { transform: scale(1); }\n\n.vt-choice { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }\n\n.vt-slider {\n  appearance: none;\n  width: 100%;\n  height: 2rem;\n  margin: 0;\n  background: transparent;\n  cursor: pointer;\n  --vt-pct: 50%;\n}\n.vt-slider::-webkit-slider-runnable-track {\n  height: 0.5rem;\n  border-radius: var(--vt-r-pill);\n  background: linear-gradient(to right, var(--vt-accent) var(--vt-pct), var(--vt-inset) var(--vt-pct));\n  box-shadow: inset 0 1px 2px var(--vt-shade-1);\n}\n.vt-slider::-webkit-slider-thumb {\n  appearance: none;\n  width: 1.75rem;\n  height: 1.75rem;\n  margin-top: -0.625rem;\n  border: 0;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-knob);\n  box-shadow: 0 1px 1px var(--vt-shade-1), 0 3px 10px var(--vt-shade-2), inset 0 1px 0 oklch(1 0 0 / 0.8);\n  transition: transform var(--vt-t-med) var(--vt-spring);\n}\n.vt-slider:active::-webkit-slider-thumb { transform: scale(1.12); }\n.vt-slider::-moz-range-track {\n  height: 0.5rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-inset);\n}\n.vt-slider::-moz-range-progress {\n  height: 0.5rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-accent);\n}\n.vt-slider::-moz-range-thumb {\n  width: 1.75rem;\n  height: 1.75rem;\n  border: 0;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-knob);\n  box-shadow: 0 1px 1px var(--vt-shade-1), 0 3px 10px var(--vt-shade-2);\n}\n\n.vt-segmented {\n  --vt-thumb-x: 0px;\n  --vt-thumb-w: 0px;\n  position: relative;\n  display: inline-flex;\n  padding: 0.25rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-inset);\n  box-shadow: inset 0 1px 3px var(--vt-shade-1), inset 0 0 0 1px var(--vt-hair);\n}\n.vt-segmented input {\n  position: absolute;\n  opacity: 0;\n  pointer-events: none;\n}\n.vt-segmented label {\n  position: relative;\n  z-index: 1;\n  padding: 0.45rem 1rem;\n  border-radius: var(--vt-r-pill);\n  color: var(--vt-ink-2);\n  font-weight: 560;\n  cursor: pointer;\n  transition: color var(--vt-t-fast);\n}\n.vt-segmented label:has(input:checked) {\n  color: var(--vt-ink);\n  background: var(--vt-fill-strong);\n  box-shadow: var(--vt-rim), var(--vt-shadow-1);\n}\n.vt-segmented label:has(input:focus-visible) { outline: 2px solid var(--vt-accent); outline-offset: 2px; }\n.vt-segmented.is-ready label:has(input:checked) { background: none; box-shadow: none; }\n.vt-segmented.is-ready::before {\n  content: "";\n  position: absolute;\n  top: 0.25rem;\n  bottom: 0.25rem;\n  left: 0;\n  width: var(--vt-thumb-w);\n  transform: translateX(var(--vt-thumb-x));\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-fill-strong);\n  box-shadow: var(--vt-rim), var(--vt-shadow-1);\n  transition: transform var(--vt-t-med) var(--vt-spring), width var(--vt-t-med) var(--vt-spring);\n}\n\n.vt-badge {\n  --c: var(--vt-ink-2);\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.2rem 0.65rem;\n  border-radius: var(--vt-r-pill);\n  background: color-mix(in oklch, var(--c) 16%, transparent);\n  color: color-mix(in oklch, var(--c) 78%, var(--vt-ink));\n  font-size: 0.75rem;\n  font-weight: 600;\n  line-height: 1.4;\n}\n.vt-badge--accent { --c: var(--vt-accent); }\n.vt-badge--ok { --c: var(--vt-ok); }\n.vt-badge--warn { --c: var(--vt-warn); }\n.vt-badge--danger { --c: var(--vt-danger); }\n\n.vt-progress {\n  appearance: none;\n  display: block;\n  width: 100%;\n  height: 0.5rem;\n  border: 0;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-inset);\n  overflow: hidden;\n}\n.vt-progress::-webkit-progress-bar { background: transparent; }\n.vt-progress::-webkit-progress-value {\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-accent);\n  transition: width var(--vt-t-med) var(--vt-spring);\n}\n.vt-progress::-moz-progress-bar { border-radius: var(--vt-r-pill); background: var(--vt-accent); }\n\n.vt-nav {\n  position: sticky;\n  top: 0.75rem;\n  z-index: 20;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  min-height: 3.5rem;\n  margin: 0.75rem;\n  padding: 0.5rem 0.75rem 0.5rem 1.25rem;\n  border-radius: var(--vt-r-pill);\n}\n.vt-nav-spacer { flex: 1; }\n\n.vt-sidebar {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  padding: 0.75rem;\n  border-radius: var(--vt-r-xl);\n}\n.vt-nav-item {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  min-height: 2.75rem;\n  padding: 0 0.9rem;\n  border: 0;\n  border-radius: var(--vt-r-md);\n  background: transparent;\n  color: var(--vt-ink-2);\n  font: inherit;\n  font-weight: 560;\n  text-align: left;\n  text-decoration: none;\n  cursor: pointer;\n  transition: background-color var(--vt-t-fast), color var(--vt-t-fast), transform var(--vt-t-med) var(--vt-spring);\n}\n.vt-nav-item:hover { background: var(--vt-inset-hover); color: var(--vt-ink); }\n.vt-nav-item:active { transform: scale(0.97); }\n.vt-nav-item[aria-current="page"] {\n  background: var(--vt-fill-strong);\n  box-shadow: var(--vt-rim), var(--vt-shadow-1);\n  color: var(--vt-ink);\n}\n\n.vt-dock {\n  position: fixed;\n  left: 50%;\n  bottom: max(1rem, env(safe-area-inset-bottom));\n  z-index: 30;\n  display: flex;\n  gap: 0.25rem;\n  padding: 0.375rem;\n  border-radius: var(--vt-r-pill);\n  transform: translateX(-50%);\n}\n.vt-dock .vt-nav-item {\n  flex-direction: column;\n  justify-content: center;\n  gap: 0.125rem;\n  min-width: 4.25rem;\n  min-height: 3.25rem;\n  padding: 0 0.75rem;\n  border-radius: var(--vt-r-pill);\n  font-size: 0.6875rem;\n}\n\n.vt-list { margin: 0; padding: 0; list-style: none; }\n.vt-list > li {\n  display: flex;\n  align-items: center;\n  gap: 0.875rem;\n  min-height: 3.5rem;\n  padding: 0.5rem 0;\n}\n.vt-list > li + li { border-top: 1px solid var(--vt-hair); }\n.vt-list-main { flex: 1; min-width: 0; }\n\n.vt-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }\n.vt-table th {\n  padding: 0.5rem 0.75rem;\n  color: var(--vt-ink-3);\n  font-size: 0.8125rem;\n  font-weight: 560;\n  text-align: left;\n}\n.vt-table td { padding: 0.75rem; border-top: 1px solid var(--vt-hair); }\n\n.vt-modal {\n  width: min(30rem, calc(100vw - 2rem));\n  padding: 1.5rem;\n  border: 0;\n  border-radius: var(--vt-r-xl);\n  background: var(--vt-fill-strong);\n  -webkit-backdrop-filter: blur(40px) saturate(var(--vt-sat));\n  backdrop-filter: blur(40px) saturate(var(--vt-sat));\n  box-shadow: var(--vt-rim), var(--vt-shadow-3);\n  color: var(--vt-ink);\n  opacity: 0;\n  transform: translateY(10px) scale(0.97);\n  transition:\n    opacity 0.25s,\n    transform var(--vt-t-med) var(--vt-spring),\n    overlay 0.25s allow-discrete,\n    display 0.25s allow-discrete;\n}\n.vt-modal[open] { opacity: 1; transform: none; }\n.vt-modal::backdrop {\n  background: var(--vt-scrim);\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n  opacity: 0;\n  transition: opacity 0.25s, overlay 0.25s allow-discrete, display 0.25s allow-discrete;\n}\n.vt-modal[open]::backdrop { opacity: 1; }\n@starting-style {\n  .vt-modal[open] { opacity: 0; transform: translateY(10px) scale(0.97); }\n  .vt-modal[open]::backdrop { opacity: 0; }\n}\n.vt-modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }\n\n.vt-toast {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: var(--vt-r-pill);\n}\n\n.vt-menu {\n  display: grid;\n  gap: 0.125rem;\n  min-width: 12rem;\n  padding: 0.375rem;\n  border-radius: var(--vt-r-lg);\n}\n\n.vt-avatar {\n  display: inline-grid;\n  place-items: center;\n  flex: none;\n  width: 2.5rem;\n  height: 2.5rem;\n  border-radius: var(--vt-r-pill);\n  background: var(--vt-inset);\n  box-shadow: inset 0 0 0 1px var(--vt-hair);\n  color: var(--vt-ink-2);\n  font-size: 0.8125rem;\n  font-weight: 650;\n}\n\n@media (pointer: coarse) {\n  .vt-btn { min-height: 2.75rem; }\n  .vt-btn--sm { min-height: 2.25rem; }\n}\n\n@media (prefers-contrast: more) {\n  :root {\n    --vt-line: light-dark(oklch(0.3 0.02 260 / 0.5), oklch(1 0 0 / 0.5));\n    --vt-hair: light-dark(oklch(0.3 0.02 260 / 0.4), oklch(1 0 0 / 0.4));\n    --vt-fill: light-dark(oklch(1 0 0 / 0.8), oklch(0.2 0.01 260 / 0.85));\n    --vt-fill-strong: light-dark(oklch(1 0 0 / 0.9), oklch(0.22 0.01 260 / 0.92));\n    --vt-ink-3: light-dark(oklch(0.38 0.012 260), oklch(0.82 0.008 260));\n  }\n}\n\n@media (prefers-reduced-transparency: reduce) {\n  :root {\n    --vt-blur: 0px;\n    --vt-sat: 1;\n    --vt-fill-thin: light-dark(oklch(0.97 0.004 260), oklch(0.22 0.01 260));\n    --vt-fill: light-dark(oklch(0.98 0.004 260), oklch(0.24 0.01 260));\n    --vt-fill-strong: light-dark(oklch(0.99 0.003 260), oklch(0.28 0.01 260));\n    --vt-fill-hover: light-dark(oklch(1 0 0), oklch(0.32 0.01 260));\n  }\n}\n\n@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {\n  :root {\n    --vt-fill-thin: light-dark(oklch(0.97 0.004 260 / 0.92), oklch(0.22 0.01 260 / 0.92));\n    --vt-fill: light-dark(oklch(0.98 0.004 260 / 0.94), oklch(0.24 0.01 260 / 0.94));\n    --vt-fill-strong: light-dark(oklch(0.99 0.003 260 / 0.96), oklch(0.28 0.01 260 / 0.96));\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root { --vt-t-fast: 0s; --vt-t-med: 0s; }\n  .vt-btn,\n  .vt-nav-item,\n  .vt-switch::after,\n  .vt-modal { transition-duration: 0s; }\n}\n\n:root, :host { --vt-hue: 174; }\n';
        window.__VITRE_CSS__ = VITRE_CSS;
        window.__injectVitreCSS = function(target) {
            const root = target || document.head || document.documentElement;
            if (!root || root.querySelector?.("#vt-theme-style")) return;
            const s = document.createElement("style");
            s.id = "vt-theme-style";
            s.textContent = VITRE_CSS;
            root.appendChild(s);
        };
        if (document.head) window.__injectVitreCSS(document.head); else document.addEventListener("DOMContentLoaded", () => window.__injectVitreCSS(document.head), {
            once: true
        });
    })();
    (() => {
        const root = document.documentElement;
        const KEY = "vt-theme";
        const read = () => {
            try {
                return localStorage.getItem(KEY);
            } catch {
                return null;
            }
        };
        const apply = mode => {
            if (mode === "light" || mode === "dark") root.dataset.theme = mode; else delete root.dataset.theme;
        };
        const effective = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const setTheme = mode => {
            try {
                if (mode === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode);
            } catch {}
            apply(mode);
            document.dispatchEvent(new CustomEvent("vt-themechange", {
                detail: effective()
            }));
        };
        if (read()) apply(read());
        const syncSegmented = el => {
            const checked = el.querySelector("input:checked");
            if (!checked) return;
            const label = checked.closest("label");
            el.style.setProperty("--vt-thumb-x", label.offsetLeft + "px");
            el.style.setProperty("--vt-thumb-w", label.offsetWidth + "px");
            el.classList.add("is-ready");
        };
        const syncSlider = el => {
            const min = Number(el.min || 0);
            const max = Number(el.max || 100);
            const pct = (Number(el.value) - min) / (max - min) * 100;
            el.style.setProperty("--vt-pct", pct + "%");
        };
        const lensOK = !!navigator.userAgentData?.brands?.some(b => b.brand === "Chromium") && !matchMedia("(prefers-reduced-transparency: reduce)").matches;
        let lensId = 0;
        const seen = new WeakSet;
        let defs;
        const lensMap = (w, h, r, bezel) => {
            const k = .5;
            const cw = Math.max(2, Math.round(w * k));
            const ch = Math.max(2, Math.round(h * k));
            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext("2d");
            const img = ctx.createImageData(cw, ch);
            for (let y = 0; y < ch; y++) {
                for (let x = 0; x < cw; x++) {
                    const px = (x + .5) / k;
                    const py = (y + .5) / k;
                    const sx = px < w / 2 ? -1 : 1;
                    const sy = py < h / 2 ? -1 : 1;
                    const qx = Math.abs(px - w / 2) - (w / 2 - r);
                    const qy = Math.abs(py - h / 2) - (h / 2 - r);
                    const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
                    const depth = -dist;
                    let dx = 0;
                    let dy = 0;
                    if (depth < bezel) {
                        let nx;
                        let ny;
                        if (qx > 0 && qy > 0) {
                            const len = Math.hypot(qx, qy) || 1;
                            nx = sx * qx / len;
                            ny = sy * qy / len;
                        } else if (qx > qy) {
                            nx = sx;
                            ny = 0;
                        } else {
                            nx = 0;
                            ny = sy;
                        }
                        const t = Math.max(0, depth) / bezel;
                        const m = (1 - t) * (1 - t);
                        dx = -nx * m;
                        dy = -ny * m;
                    }
                    const i = (y * cw + x) * 4;
                    img.data[i] = 128 + 127 * dx;
                    img.data[i + 1] = 128 + 127 * dy;
                    img.data[i + 2] = 128;
                    img.data[i + 3] = 255;
                }
            }
            ctx.putImageData(img, 0, 0);
            return canvas.toDataURL();
        };
        const lensFit = el => {
            const w = Math.round(el.offsetWidth);
            const h = Math.round(el.offsetHeight);
            if (!w || !h) return;
            const cs = getComputedStyle(el);
            const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2);
            const bezel = Math.min(parseFloat(cs.getPropertyValue("--vt-lens-bezel")) || 16, w / 2, h / 2);
            const scale = parseFloat(cs.getPropertyValue("--vt-lens-scale")) || 32;
            const id = el.dataset.vtLensId || "vt-lens-" + ++lensId;
            el.dataset.vtLensId = id;
            let f = document.getElementById(id);
            if (!f) {
                f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
                f.id = id;
                defs.appendChild(f);
            }
            f.setAttribute("filterUnits", "userSpaceOnUse");
            f.setAttribute("x", 0);
            f.setAttribute("y", 0);
            f.setAttribute("width", w);
            f.setAttribute("height", h);
            f.setAttribute("color-interpolation-filters", "sRGB");
            f.innerHTML = '<feImage href="' + lensMap(w, h, r, bezel) + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="m"/>' + '<feDisplacementMap in="SourceGraphic" in2="m" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G"/>';
            el.style.setProperty("--vt-lens-url", "url(#" + id + ")");
        };
        const initLens = () => {
            if (!lensOK) return;
            if (!defs) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("width", 0);
                svg.setAttribute("height", 0);
                svg.style.position = "absolute";
                svg.setAttribute("aria-hidden", "true");
                defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                svg.appendChild(defs);
                document.body.appendChild(svg);
                root.dataset.vtLens = "";
            }
            document.querySelectorAll(".vt-lens").forEach(el => {
                if (seen.has(el)) return;
                seen.add(el);
                lensFit(el);
                let raf = 0;
                new ResizeObserver(() => {
                    cancelAnimationFrame(raf);
                    raf = requestAnimationFrame(() => lensFit(el));
                }).observe(el);
            });
        };
        const initScene = () => {
            if (!document.body.hasAttribute("data-vt-scene") || document.querySelector(".vt-scene")) return;
            const scene = document.createElement("div");
            scene.className = "vt-scene";
            scene.setAttribute("aria-hidden", "true");
            scene.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
            document.body.prepend(scene);
        };
        const init = () => {
            initScene();
            initLens();
            document.querySelectorAll(".vt-segmented").forEach(el => {
                syncSegmented(el);
                el.addEventListener("change", () => syncSegmented(el));
                new ResizeObserver(() => syncSegmented(el)).observe(el);
            });
            document.querySelectorAll(".vt-slider").forEach(el => {
                syncSlider(el);
                el.addEventListener("input", () => syncSlider(el));
            });
            document.querySelectorAll("[data-vt-theme-toggle]").forEach(el => {
                el.addEventListener("click", () => setTheme(effective() === "dark" ? "light" : "dark"));
            });
            document.querySelectorAll("[data-vt-open]").forEach(el => {
                el.addEventListener("click", () => document.querySelector(el.dataset.vtOpen)?.showModal());
            });
            document.querySelectorAll("[data-vt-close]").forEach(el => {
                el.addEventListener("click", () => el.closest("dialog")?.close());
            });
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
        window.Vitre = {
            setTheme: setTheme,
            theme: effective,
            mode: () => read() || root.dataset.theme || "system",
            refresh: init
        };
    })();
    if ([ "auth.platorelay.com", "auth.platoboost.com", "auth.platoboost.net", "auth.platoboost.app" ].includes(location.hostname)) {
        if (window.self === window.top) {
            (function() {
                "use strict";
                const CONFIG = {
                    skipWait: true,
                    autoCopy: true,
                    patterns: [ /lootlabs/i, /^continue$/i ],
                    copyPattern: /^copy$/i,
                    clickDelay: 0,
                    timeout: 12e4
                };
                const FAST_DELAY = 10;
                const FAST_TICKS = 30;
                function installWaitSkipper() {
                    const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
                    const nativeSetInterval = page.setInterval;
                    const appScriptPrefix = location.origin + "/assets/";
                    function calledByPageApp() {
                        try {
                            return String((new Error).stack || "").includes(appScriptPrefix);
                        } catch (e) {
                            return false;
                        }
                    }
                    function patchedSetInterval(handler, delay, ...args) {
                        if (typeof handler !== "function" || Number(delay) !== 1e3 || !calledByPageApp()) {
                            return nativeSetInterval.call(page, handler, delay, ...args);
                        }
                        const slowEvery = Math.round(1e3 / FAST_DELAY);
                        let ticks = 0;
                        return nativeSetInterval.call(page, function() {
                            ticks++;
                            if (ticks <= FAST_TICKS || (ticks - FAST_TICKS) % slowEvery === 0) {
                                return handler.apply(page, args);
                            }
                        }, FAST_DELAY);
                    }
                    try {
                        Object.defineProperty(patchedSetInterval, "name", {
                            value: "setInterval"
                        });
                        patchedSetInterval.toString = () => "function setInterval() { [native code] }";
                    } catch (e) {}
                    page.setInterval = typeof exportFunction === "function" ? exportFunction(patchedSetInterval, page) : patchedSetInterval;
                }
                if (CONFIG.skipWait) {
                    try {
                        installWaitSkipper();
                    } catch (e) {}
                }
                let clicked = false;
                let pending = false;
                let copied = false;
                let copying = false;
                let observer = null;
                let poll = null;
                function textOf(el) {
                    return (el.textContent || "").replace(/\s+/g, " ").trim();
                }
                function isUsable(el) {
                    if (!el || !el.isConnected) return false;
                    if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;
                    const cs = getComputedStyle(el);
                    return cs.display !== "none" && cs.visibility !== "hidden" && cs.pointerEvents !== "none";
                }
                function getButtons() {
                    return [ ...document.querySelectorAll('button, [role="button"]') ];
                }
                function findButton() {
                    const candidates = getButtons();
                    for (const pattern of CONFIG.patterns) {
                        for (const el of candidates) {
                            if (pattern.test(textOf(el)) && isUsable(el)) return el;
                        }
                    }
                    return null;
                }
                function findKeyField() {
                    if (!getButtons().some(el => CONFIG.copyPattern.test(textOf(el)))) return null;
                    const fields = document.querySelectorAll('textarea, input[type="text"], input:not([type])');
                    for (const el of fields) {
                        if (el.value && el.value.trim()) return el;
                    }
                    return null;
                }
                async function writeClipboard(text, field) {
                    try {
                        if (typeof GM_setClipboard === "function") {
                            GM_setClipboard(text, "text");
                            return true;
                        }
                    } catch (e) {}
                    try {
                        if (typeof GM !== "undefined" && GM && typeof GM.setClipboard === "function") {
                            await GM.setClipboard(text);
                            return true;
                        }
                    } catch (e) {}
                    try {
                        await navigator.clipboard.writeText(text);
                        return true;
                    } catch (e) {}
                    try {
                        field.focus();
                        field.select();
                        const ok = document.execCommand("copy");
                        window.getSelection().removeAllRanges();
                        field.blur();
                        if (ok) return true;
                    } catch (e) {}
                    return false;
                }
                const RETRY_EVENTS = [ "pointerdown", "keydown", "focus" ];
                function retryCopy() {
                    tryCopy();
                }
                function setRetryListeners(enabled) {
                    for (const type of RETRY_EVENTS) {
                        if (enabled) window.addEventListener(type, retryCopy, true); else window.removeEventListener(type, retryCopy, true);
                    }
                }
                async function tryCopy() {
                    if (copied || copying) return copied;
                    const field = findKeyField();
                    if (!field) return false;
                    copying = true;
                    const ok = await writeClipboard(field.value.trim(), field);
                    copying = false;
                    if (ok) {
                        copied = true;
                        setRetryListeners(false);
                    } else {
                        setRetryListeners(true);
                    }
                    return true;
                }
                function stop() {
                    if (observer) {
                        observer.disconnect();
                        observer = null;
                    }
                    if (poll) {
                        clearInterval(poll);
                        poll = null;
                    }
                }
                function doClick() {
                    pending = false;
                    const target = findButton();
                    if (!target || !isUsable(target)) return;
                    clicked = true;
                    target.click();
                }
                function tryClick() {
                    if (clicked || pending) return;
                    const btn = findButton();
                    if (!btn || !isUsable(btn)) return;
                    pending = true;
                    setTimeout(doClick, CONFIG.clickDelay);
                }
                function tick() {
                    if (CONFIG.autoCopy && !copied && findKeyField()) {
                        stop();
                        tryCopy();
                        return;
                    }
                    tryClick();
                }
                function start() {
                    observer = new MutationObserver(tick);
                    observer.observe(document.documentElement, {
                        childList: true,
                        subtree: true,
                        characterData: true,
                        attributes: true,
                        attributeFilter: [ "disabled", "aria-disabled", "style", "class" ]
                    });
                    poll = setInterval(tick, 250);
                    setTimeout(stop, CONFIG.timeout);
                    tick();
                }
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", start, {
                        once: true
                    });
                } else {
                    start();
                }
            })();
        }
    }
    !function() {
        "use strict";
        let __bypassOnce = !1;
        try {
            if (GM_getValue("evBypassDetectionOnce", !1)) {
                __bypassOnce = !0;
                GM_setValue("evBypassDetectionOnce", !1);
            }
        } catch (e) {}
        const __brutal = () => !__bypassOnce;
        const e = "3.9.91", t = Math.random().toString(36).substring(2, 15), n = "https://skipped.lol/", o = n + "api/evade/negotiate", a = n + "api/evade/init", i = n + "api/evade/lv", r = unsafeWindow.WebSocket;
        let s = null;
        const l = Element.prototype.addEventListener, c = location.hostname, d = c.includes("work.ink") ? "workink" : c.includes("lootdest.org") || c.includes("fast-links.org") || c.includes("ultra-links.net") || c.includes("lootboost.net") || c.includes("loot-reward.com") || c.includes("links.lootlabs.gg") || c.includes("loot-links.com") || c.includes("loot-link.com") ? "lootlabs" : c.includes("linkvertise.com") ? "linkvertise" : c.includes("lockr.so") || c.includes("lockr.net") ? "lockr" : c.includes("rekonise.com") ? "rekonise" : "t.tenlets.com" === c ? "tenlets" : "play.ogame.gameforge.com" === c ? "ogame" : c.includes("red-square.space") || c.includes("kys.linkvertise.lol") || c.includes("red-square-fallback.luarmor.lol") ? "snipe" : "unknown";
        function u(e) {
            let t = "";
            for (let n = 0; n < e; n++) t += "0123456789abcdef"[Math.floor(16 * Math.random())];
            return t;
        }
        function p() {
            return u(8) + "-" + u(4) + "-" + u(4) + "-" + u(4) + "-" + u(12);
        }
        function m() {
            return "https://play.ogame.gameforge.com/?kid=" + (String(Math.floor(9e4 * Math.random()) + 1e4), 
            "a-00107-a" + String(Math.floor(9e3 * Math.random()) + 1e3) + "-" + String(Math.floor(9e3 * Math.random()) + 1e3) + "-c" + u(7) + "&gfsid=5082_") + p() + "&clickid=" + u(32);
        }
        if ("tenlets" === d) {
            try {
                window.stop();
            } catch (e) {}
            try {
                location.replace(m());
            } catch (e) {
                try {
                    location.href = m();
                } catch (e) {}
            }
            return;
        }
        if ("ogame" === d) {
            try {
                window.stop();
            } catch (e) {}
            return void setTimeout(() => {
                try {
                    window.close();
                } catch (e) {}
            }, 50);
        }
        let f = null;
        "workink" === d && (unsafeWindow.WebSocket = function(e, t) {
            const n = String(e), o = new URL(n, location.href);
            return "work.ink" === o.hostname || o.hostname.endsWith(".work.ink") ? ("/_api/v2/ws" === o.pathname && (f = n), 
            {
                readyState: 3,
                send: () => {},
                close: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                onopen: null,
                onclose: null,
                onmessage: null,
                onerror: null
            }) : new r(e, t);
        }, unsafeWindow.WebSocket.prototype = r.prototype, unsafeWindow.WebSocket.CONNECTING = 0, 
        unsafeWindow.WebSocket.OPEN = 1, unsafeWindow.WebSocket.CLOSING = 2, unsafeWindow.WebSocket.CLOSED = 3);
        let v = !1, h = !1, g = !1, b = null, y = null, w = null, k = null, x = null, _ = null;
        const S = [];
        let T = null, C = null, E = null, M = null, I = null;
        const P = new Map;
        let L = "none", A = !1, $ = null, N = null, q = null, O = null, z = null, U = null;
        function W() {
            if ("workink" !== d) return null;
            if (U && U.host && U.host.isConnected) return U;
            const e = document.createElement("div");
            return e.id = "z61936395d1", (document.body || document.documentElement).appendChild(e), 
            U = e.attachShadow({
                mode: "closed"
            }), window.__injectVitreCSS?.(U), U;
        }
        function B(e) {
            return (W() || document).getElementById(e);
        }
        function G(e) {
            const t = W();
            t ? t.appendChild(e) : document.body.appendChild(e);
        }
        function V() {
            if (z && z.isConnected) return z;
            let e = B("z2baeff64d4");
            if (!e) {
                e = document.createElement("p"), e.id = "z2baeff64d4", e.textContent = "Time Taken: 0.0s";
                const n = B("z7e72fe9c99");
                if (n) n.appendChild(e); else {
                    const n = (t = "#zf700f17074 .z8fa02b1407", (W() || document).querySelector(t));
                    n ? n.insertBefore(e, n.firstChild) : G(e);
                }
            }
            var t;
            return z = e, e;
        }
        function J(e) {
            return (Math.max(0, 0 | e) / 1e3).toFixed(1) + "s";
        }
        function D() {
            if (q) return;
            O = performance.now();
            V();
            const e = () => {
                (z && z.isConnected ? z : V()).textContent = "Time Taken: " + J(performance.now() - O);
            };
            e(), q = setInterval(e, 33);
        }
        function R() {
            if (q && (clearInterval(q), q = null), null != O) {
                const e = performance.now() - O, t = z && z.isConnected ? z : B("z2baeff64d4");
                return t && (t.textContent = "Time Taken: " + J(e)), j("elapsedMs", Math.round(e)), 
                J(e);
            }
            return null;
        }
        const H = {
            url: location.href,
            hostname: c,
            domain: d,
            sessionId: t,
            scriptVersion: e,
            startedAt: (new Date).toISOString()
        };
        function j(e, t) {
            try {
                H[e] = t;
            } catch (n) {
                H[e] = String(t);
            }
        }
        function F() {
            const e = B("zcf88fe7534");
            e && "1" !== e.dataset.z5b93f69957 && (e.dataset.z5b93f69957 = "1", l.call(e, "click", t => {
                t.stopImmediatePropagation();
                const n = function() {
                    const e = [];
                    for (const t of Object.keys(H)) {
                        let n = H[t];
                        if ("string" == typeof n) e.push(t + ": " + n); else try {
                            e.push(t + ": " + JSON.stringify(n, null, 2));
                        } catch {
                            e.push(t + ": [unserializable]");
                        }
                    }
                    return e.join("\n\n");
                }(), o = () => {
                    const t = e.textContent;
                    e.textContent = "Copied!", setTimeout(() => {
                        e.textContent = t;
                    }, 1500);
                }, a = () => {
                    const t = e.textContent;
                    e.textContent = "Copy failed", setTimeout(() => {
                        e.textContent = t;
                    }, 1500);
                };
                try {
                    navigator.clipboard.writeText(n).then(o).catch(() => {
                        try {
                            const e = document.createElement("textarea");
                            e.value = n, e.style.cssText = "position:fixed;left:-9999px;top:-9999px;", document.body.appendChild(e), 
                            e.select(), document.execCommand("copy"), e.remove(), o();
                        } catch {
                            a();
                        }
                    });
                } catch {
                    a();
                }
            }, !0));
        }
        if (unsafeWindow.z2ab57a496e) return;
        unsafeWindow.z2ab57a496e = !0;
        const K = 20, Y = 30, Q = 10, X = !0, Z = !0, ee = !0, te = !1, ne = 3, oe = 15, ae = "#5ac8b4", ie = 1, re = "high", se = "", le = () => ({
            minimumTimeWorkink: GM_getValue("minimumTimeWorkink", GM_getValue("minimumTime", GM_getValue("safetyDelay", K))),
            minimumTimeLinkvertise: GM_getValue("minimumTimeLinkvertise", Y),
            minimumTimeLootlabs: GM_getValue("minimumTimeLootlabs", Q),
            topoBackground: GM_getValue("topoBackground", X),
            openNewTab: GM_getValue("openNewTab", Z),
            lvSafety: GM_getValue("lvSafety", ee),
            lvHistoryTrick: GM_getValue("lvHistoryTrick", te),
            topoBlur: GM_getValue("topoBlur", ne),
            topoLines: Math.max(4, Math.min(15, GM_getValue("topoLines", oe))),
            accentColor: GM_getValue("accentColor", ae),
            uiScale: [ 1, 1.5, 2 ].includes(Number(GM_getValue("uiScale", ie))) ? Number(GM_getValue("uiScale", ie)) : 1,
            topoQuality: [ "low", "medium", "high" ].includes(GM_getValue("topoQuality", re)) ? GM_getValue("topoQuality", re) : "high",
            premiumKey: GM_getValue("premiumKey", se)
        });
        function ce(e) {
            const t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(e || "").trim());
            return t ? {
                r: parseInt(t[1], 16),
                g: parseInt(t[2], 16),
                b: parseInt(t[3], 16)
            } : {
                r: 90,
                g: 200,
                b: 180
            };
        }
        function de() {
            const e = le();
            if (__brutal() && "workink" !== d) return 0;
            return "linkvertise" === d ? e.minimumTimeLinkvertise : "lootlabs" === d ? e.minimumTimeLootlabs : e.minimumTimeWorkink;
        }
        let ue = null;
        function pe(e, t, n = !0) {
            return new Promise((o, a) => {
                const i = setTimeout(() => {
                    e.fn = null, n ? a() : o(null);
                }, t);
                e.fn = t => {
                    clearTimeout(i), e.fn = null, o(t);
                }, e.reject = t => {
                    clearTimeout(i), e.fn = null, a(t);
                };
            });
        }
        const me = (e = 1e4) => {
            const t = {};
            return k = t, pe(t, e);
        }, fe = [], ve = (e = 14e4, t = null) => new Promise((n, o) => {
            const a = {
                resolved: !1,
                matches: t
            };
            a.timeout = setTimeout(() => {
                if (a.resolved) return;
                a.resolved = !0;
                const e = fe.indexOf(a);
                -1 !== e && fe.splice(e, 1), o(new Error("Timed out waiting for monetization completion"));
            }, e), a.resolve = e => {
                a.resolved || (a.resolved = !0, clearTimeout(a.timeout), n(e));
            }, fe.push(a);
        }), he = (e = 18e4) => {
            const t = {};
            return x = t, pe(t, e, !1);
        }, ge = (e = 18e4) => {
            const t = {};
            return T = t, pe(t, e, !1);
        }, be = e => new Promise(t => setTimeout(t, e));
        function ye(e) {
            M && v || 1 === b?.readyState && b.send(e);
        }
        function we(e, t = 15e3) {
            return new Promise((n, o) => {
                if (!e) return void n();
                const a = new Image, i = setTimeout(() => {
                    a.onload = a.onerror = null, a.remove(), o(new Error("Load timed out"));
                }, t);
                a.style.position = "absolute", a.style.left = "-9999px", a.style.top = "-9999px", 
                a.style.width = "300px", a.style.height = "250px", a.onload = () => {
                    clearTimeout(i), n();
                }, a.onerror = () => {
                    clearTimeout(i), a.remove(), o(new Error("Load failed"));
                }, a.src = e, document.body.appendChild(a);
            });
        }
        async function ke(e, t = 6, n = 2e3) {
            for (let o = 0; o < t; o++) try {
                return await we(e), !0;
            } catch {
                o < t - 1 && await be(n);
            }
            return !1;
        }
        function xe(e) {
            const t = function(e) {
                if (!e.length) return Promise.resolve([]);
                return Promise.all(e.map(e => ke(e)));
            }(e);
            I = I ? Promise.all([ I, t ]) : t;
        }
        function _e(e, t = new Set) {
            const n = [ ...new Set([ ...P ].filter(([e]) => !t.has(e)).map(([, e]) => e)) ];
            n.length && xe(n);
        }
        function Se(e) {
            if ("none" === L) {
                if (!g) return L = "done", void xe(function(e) {
                    const t = new Set, n = e => {
                        "string" == typeof e && /^https?:\/\//.test(e) && t.add(e);
                    };
                    for (const t of e?.mUrl || []) n(t.BannerImageUrl ?? t.bannerImageUrl), n(t.LinkIconUrl ?? t.linkIconUrl), 
                    n(t.AdvertiserIconUrl ?? t.advertiserIconUrl);
                    for (const t of [ e?.mM, e?.coM ]) for (const e of t || []) n(e.bannerImageUrl ?? e.BannerImageUrl), 
                    n(e.linkIconUrl ?? e.LinkIconUrl), n(e.advertiserIconUrl ?? e.AdvertiserIconUrl);
                    return [ ...t ];
                }(e));
                L = "banners", xe(function(e) {
                    const t = new Set;
                    for (const n of [ ...e?.mUrl || [], ...e?.mM || [], ...e?.coM || [] ]) {
                        const e = n.BannerImageUrl ?? n.bannerImageUrl;
                        "string" == typeof e && /^https?:\/\//.test(e) && t.add(e);
                    }
                    return [ ...t ];
                }(e)), A && Te();
            }
        }
        function Te() {
            A = !0, g && "banners" === L && (L = "icons", _e());
        }
        function Ce(e, t) {
            const n = new Set, o = e => {
                "string" == typeof e && /^https?:\/\//.test(e) && n.add(e);
            }, a = e => String(e.ID ?? e.id) === String(t);
            for (const t of [ ...e?.mUrl || [], ...e?.mM || [], ...e?.coM || [] ].filter(a)) o(t.BannerImageUrl ?? t.bannerImageUrl), 
            o(t.LinkIconUrl ?? t.linkIconUrl), o(t.AdvertiserIconUrl ?? t.advertiserIconUrl);
            return [ ...n ];
        }
        async function Ee(e) {
            if (v) return;
            if (g) return;
            let t = S.shift();
            if (t || (await ((e = 15e3) => {
                const t = {};
                return _ = t, pe(t, e, !1);
            })(12e4), t = S.shift()), !t || v) return;
            Ye("Please complete the security check...");
            const n = await et(t);
            if (!v) {
                Ye("Security check passed, continuing...");
                try {
                    const t = await new Promise((t, a) => {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: o,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            data: JSON.stringify({
                                turnstile: n,
                                ...null != e ? {
                                    tsid: e
                                } : {}
                            }),
                            onload: e => {
                                try {
                                    t(JSON.parse(e.responseText));
                                } catch (e) {
                                    a(e);
                                }
                            },
                            onerror: a,
                            timeout: 15e3
                        });
                    });
                    t?.tst && (ye(t.tst), null != e && Ie.add(Number(e)));
                } catch (e) {}
            }
        }
        let Me = [];
        const Ie = new Set, Pe = new Set([ "mntd", "s_mntd", "mnad", "s_mnad" ]);
        function Le(e, t = []) {
            M || (M = {
                remaining: new Set,
                completed: new Set(t.map(Number)),
                current: null
            });
        }
        function Ae(...e) {
            const t = new Set;
            for (const n of e) for (const e of [ ...n?.mM || [], ...n?.coM || [] ]) t.add(Number(e.id));
            return t;
        }
        async function $e(e, t, n = !0) {
            const {fM: o} = e;
            if (t && await t, v) return;
            const a = await async function(e, t = !0) {
                const n = M;
                Ne(e);
                let o = e.mM?.length || e.coM?.length ? e : null, a = t, i = null;
                for (;!v; ) {
                    if (!o) {
                        if (Ye("Waiting for monetization data..."), o = await Ue(), null === o) return !0;
                        if (!1 === o) throw new Error("Timed out waiting for monetization data");
                    }
                    Ne(o);
                    const t = o;
                    if (o = null, !n.remaining.size) continue;
                    const r = Math.min(...n.remaining), s = [ ...t.mM || [], ...t.coM || [] ].find(e => Number(e.id) === r);
                    let l = !1;
                    if (s) {
                        if (i = null, a || Ie.has(r) || await Ee(r), a = !1, v) return !0;
                        if (I && (Ye("Loading offers..."), await Promise.race([ I, be(2e4) ])), v) return !0;
                        try {
                            await Be(e, t, s), l = !0;
                        } catch (e) {
                            if (v) return !0;
                            ze(r, e?.message || "offer failed");
                        }
                        if (v) return !0;
                    } else {
                        if (i !== r) {
                            i = r;
                            try {
                                if (o = await Oe(), null === o) return !0;
                                continue;
                            } catch (e) {}
                        }
                        ze(r, "backend did not return instructions");
                    }
                    if (o = await We(t, r, l), null === o) return !0;
                    if (!1 === o) return !1;
                }
                return !0;
            }(e, n);
            if (v) return;
            if (!a) return void Ye("Bypass timed out. Please refresh.");
            o && ye(o), Ye("Waiting for destination...");
            await he() || Ye("Bypass timed out. Please refresh.");
        }
        function Ne(e) {
            if (!M) return;
            const t = [ ...e.monetIds || [], ...e.monetizations || [], ...(e.mM || []).map(e => e.id), ...(e.coM || []).map(e => e.id) ];
            for (const e of t) {
                const t = Number(e);
                if (!Number.isInteger(t) || t < 0) throw new Error("Invalid monetization ID: " + e);
                M.completed.has(t) || M.remaining.add(t);
            }
        }
        function qe(e, t) {
            if (null != e.offerName) return [ t.name, t.offerName ].some(t => null != t && String(t) === String(e.offerName));
            const n = e.monetizationId ?? e.mId ?? e.id;
            return null == n || Number(n) === Number(t.id);
        }
        async function Oe() {
            const e = M;
            if (null == E) throw new Error("No cached offer-data message for remaining monetizations");
            const t = [ ...e.remaining ].sort((e, t) => e - t);
            C = null;
            const n = ge();
            Je(E, t);
            const o = await n;
            if (v) return null;
            if (!o) throw new Error("Timed out requesting the next monetization");
            return C = null, o;
        }
        function ze(e, t) {
            const n = M;
            Ye(`Skipping monetization ${e}...`), n.completed.add(e), n.remaining.delete(e);
        }
        async function Ue() {
            const e = C || await Promise.race([ ge(), he().then(() => null) ]);
            return v ? null : !!e && (C = null, e);
        }
        async function We(e, t, n) {
            const o = M;
            if (C) {
                const e = C;
                return C = null, e;
            }
            if (o.remaining.size && Ae(e).has(Math.min(...o.remaining))) return e;
            if (25 === t && n) {
                const e = await Ue();
                if (!1 !== e || !o.remaining.size) return e;
            }
            for (;o.remaining.size; ) try {
                return await Oe();
            } catch (e) {
                ze(Math.min(...o.remaining));
            }
            return Ye("Waiting for destination..."), Ue();
        }
        async function Be(e, t, n) {
            const o = M;
            o.current = n;
            const a = ve(3e5, e => qe(e, n)).then(e => ({
                value: e
            }), e => ({
                error: e
            }));
            try {
                await Ve(e, t, !0);
                const n = await a;
                if (v) return;
                if (n.error) throw n.error;
                if (!n.value) throw new Error("Missing monetization completion");
            } finally {
                const e = fe.findIndex(e => e.matches);
                -1 !== e && fe.splice(e, 1)[0].resolve(null), o.current = null;
            }
        }
        function Ge(e, t, n) {
            return new Promise(o => {
                const a = B("z7e72fe9c99");
                if (!a) return void o();
                const i = a.innerHTML;
                a.innerHTML = `\n                <p id="z18b9b2fb3d" style="margin:0 0 12px">Click the button to complete ${e.name || "the offer"}.</p>\n                <button id="zdd68edf5cf" class="zb224a43bf9" type="button">Spoof completion</button>\n            `;
                const r = B("zdd68edf5cf");
                l.call(r, "click", s => {
                    s.stopImmediatePropagation(), ye(e.initEncrypted), r.disabled = !0, r.textContent = "Spoofing...";
                    try {
                        let e;
                        e = g ? window.open(t, "workink_offer", n) : window.open(t, "_blank", n), e && setTimeout(() => {
                            try {
                                e.close();
                            } catch (e) {}
                        }, 4e3);
                    } catch (e) {}
                    a.innerHTML = i, o(), ye(e.startEncrypted);
                }, !0);
            });
        }
        async function Ve(e, t, n = !1) {
            const {fM: o, flM: a} = e, i = t?.mUrl || null, r = [ ...(t?.mM || []).map(e => ({
                ...e,
                source: "monetization"
            })), ...(t?.coM || []).map(e => ({
                ...e,
                source: "customOffer"
            })) ].filter(e => !n || Number(e.id) === Number(M.current.id)).sort((e, t) => e.id - t.id);
            Me = [ ...r ], D();
            for (const e of r) {
                if (v) return;
                if (n && M.completed.has(Number(e.id))) return;
                if (!Me.some(t => t.id === e.id && (!e.offerName || t.offerName === e.offerName))) continue;
                const s = e.encrypted || JSON.stringify(e);
                if ("customOffer" === e.source) {
                    Ye(`Processing ${e.name}...`);
                    const n = i?.find(t => String(t.ID) === String(e.id))?.OfferUrl;
                    if (n) {
                        const o = Math.min(1024, Math.max(900, Math.floor(.7 * window.outerWidth))), a = Math.min(800, Math.max(640, Math.floor(.8 * window.outerHeight))), i = `popup=yes,width=${o},height=${a},left=${window.screenX + Math.max(0, Math.floor((window.outerWidth - o) / 2))},top=${window.screenY + Math.max(0, Math.floor((window.outerHeight - a) / 2))}`;
                        if ("s_mnad" === t?.conditions) {
                            const n = Ce(t, e.id);
                            if (n.length && (Ye(`Loading ${e.name || "offer"} media...`), await Promise.all(n.map(e => ke(e))), 
                            v)) return;
                        }
                        await Ge(e, n, i);
                    }
                    a && ye(a), g && (await be(4e4), e.e && ye(e.e)), await be(1e3 + Math.floor(4001 * Math.random())), 
                    o && ye(o), await be(50);
                } else if (80 === e.id) {
                    if (Ye("Processing Stake offer..."), ye(s), !n) try {
                        await ve(14e4);
                    } catch {}
                } else if (25 === e.id) {
                    if (await be(3e3), "start" !== e.event) continue;
                    ye(s);
                    const t = r.find(t => t.id === e.id && "installClicked" === t.event);
                    t && ye(t.encrypted || JSON.stringify(t));
                    const o = n ? null : ve(3e5);
                    if (25 === e.id && Ye("Please run the Opera Spoofer..."), v) return;
                    if (a && ye(a), o) try {
                        await o;
                    } catch {}
                } else ye(s), await be(50);
            }
            o && !v && ye(o);
        }
        function Je(e, n = null) {
            if (v || h) return;
            const a = le();
            GM_xmlhttpRequest({
                method: "POST",
                url: o,
                headers: {
                    "Content-Type": "application/json",
                    ...a.premiumKey ? {
                        "X-Evade-Premium-Key": a.premiumKey
                    } : {}
                },
                data: JSON.stringify({
                    demands: e,
                    ...n ? {
                        mtList: n
                    } : {},
                    direction: "incoming",
                    session_id: t,
                    client_timestamp: Date.now(),
                    r: g
                }),
                onload: function(t) {
                    if (!v) try {
                        const i = JSON.parse(t.responseText);
                        if (!i) return void Ye("Backend failed to respond, retrying...");
                        if (!0 === i?.r && (g = !0), !1 === i.success && i.error) {
                            Ye(i.error), v = !0, T?.fn && T.fn(null);
                            for (const e of fe.splice(0)) e.resolve(null);
                            return;
                        }
                        if ("destination" === i.conditions && i.destinationURL) {
                            v = !0, j("destinationURL", i.destinationURL), x?.fn && x.fn(i.destinationURL), 
                            T?.fn && T.fn(null);
                            for (const e of fe.splice(0)) e.resolve(null);
                            const e = de(), t = ue ? Math.floor((Date.now() - ue) / 1e3) : 0, n = Math.max(0, e - t);
                            if (n > 0) {
                                let e = n;
                                Ye(`Bypass complete! Waiting ${e}s...`);
                                const t = setInterval(() => {
                                    --e > 0 ? Ye(`Bypass complete! Waiting ${e}s...`) : (clearInterval(t), Qe(i.destinationURL));
                                }, 1e3);
                            } else Qe(i.destinationURL);
                            return;
                        }
                        if ("prxd" === i.conditions) {
                            return (ue ? Date.now() - ue : 0) < 9e3 ? (Ye("work.ink has detected your VPN/Proxy. Please disable and retry to bypass this link. [EV-PRX-001]"), 
                            void (v = !0)) : void 0;
                        }
                        if ("hcap" === i.t && null != i.mId) return void async function(e) {
                            if (v) return;
                            let t;
                            unsafeWindow.zc69a55d19a = !0, unsafeWindow.zcc3602d3ff = "Please complete the hCaptcha challenge...", 
                            Ye(unsafeWindow.zcc3602d3ff);
                            try {
                                t = await Ze();
                            } catch (e) {
                                return void Ye("Failed to load hCaptcha. Please refresh.");
                            } finally {
                                unsafeWindow.zc69a55d19a = !1, unsafeWindow.zcc3602d3ff = null;
                            }
                            if (!v) {
                                Ye("hCaptcha solved, submitting...");
                                try {
                                    const n = await new Promise((n, a) => {
                                        GM_xmlhttpRequest({
                                            method: "POST",
                                            url: o,
                                            headers: {
                                                "Content-Type": "application/json"
                                            },
                                            data: JSON.stringify({
                                                hCapToken: t,
                                                hCapID: e
                                            }),
                                            onload: e => {
                                                try {
                                                    n(JSON.parse(e.responseText));
                                                } catch (e) {
                                                    a(e);
                                                }
                                            },
                                            onerror: a,
                                            timeout: 15e3
                                        });
                                    });
                                    n?.hcresp && (ye(n.hcresp), Te());
                                } catch (e) {}
                            }
                        }(i.mId);
                        if ("social_done" === i.conditions && k?.fn && k.fn(), "monetization_done" === i.conditions) {
                            if (M) {
                                const e = M;
                                if (e.current && qe(i, e.current)) {
                                    const t = Number(e.current.id);
                                    e.completed.add(t), e.remaining.delete(t);
                                }
                            }
                            let e = Number(i.monetizationId ?? i.mId ?? i.id);
                            if (i.offerName) {
                                const t = Me.findIndex(e => String(e.name) === String(i.offerName));
                                -1 !== t && (Number.isInteger(e) || (e = Number(Me[t].id)), Me.splice(t, 1));
                            }
                            const t = fe.findIndex(e => !e.matches || e.matches(i));
                            !function(e) {
                                if ("none" === L || "done" === L) return;
                                if (L = "done", !g) return;
                                const t = new Set(M?.completed || []);
                                Number.isInteger(e) && t.add(e), _e(0, t);
                            }(e), -1 !== t && fe.splice(t, 1)[0].resolve(i);
                        }
                        if ("tsac" === i.conditions && (S.push(i.action), _?.fn && _.fn(i.action)), Pe.has(i.conditions)) return j("mntdData", i), 
                        C = i, null === n && (E = e), Ne(i), function(e) {
                            for (const t of [ ...e?.mUrl || [], ...e?.mM || [], ...e?.coM || [] ]) {
                                const e = t.AdvertiserIconUrl ?? t.advertiserIconUrl, n = Number(t.ID ?? t.id);
                                "string" == typeof e && /^https?:\/\//.test(e) && P.set(Number.isInteger(n) ? n : e, e);
                            }
                        }(i), Se(i), void (T?.fn && T.fn(i));
                        "ping" === i.conditions && i.pingMsg && !y && null === w && (y = setTimeout(() => {
                            ye(i.pingMsg), y = null;
                        }, 2e3));
                        if (i.sM?.length || i.raM?.length || i.osM?.length || i.hasOwnProperty("sM")) {
                            if (null !== n) throw new Error("Expected offer data when requesting remaining monetizations");
                            if (!a.premiumKey) {
                                if (M) return void Ne(i);
                                Le(), Ne(i);
                            }
                            j("s_lkif", i), i.tsI && ye(i.tsI), i.sM && j("socials", i.sM), w && (clearTimeout(w), 
                            w = null), (async () => {
                                const e = await et(i.tat);
                                Ye("Security check passed, forcefully evading...");
                                try {
                                    const t = await new Promise((t, n) => {
                                        GM_xmlhttpRequest({
                                            method: "POST",
                                            url: o,
                                            headers: {
                                                "Content-Type": "application/json"
                                            },
                                            data: JSON.stringify({
                                                turnstile: e
                                            }),
                                            onload: e => {
                                                try {
                                                    t(JSON.parse(e.responseText));
                                                } catch (e) {
                                                    n(e);
                                                }
                                            },
                                            onerror: n,
                                            timeout: 15e3
                                        });
                                    });
                                    t?.tst && ye(t.tst);
                                } catch (e) {
                                    return void Ye("Failed to verify security check. Please refresh.");
                                }
                                const t = {}, n = new Promise(e => {
                                    t.fn = e;
                                }), a = async function(e, t = null) {
                                    const {fM: n, flM: o, sM: a, pinger: i, envC: r} = e;
                                    if (r && ye(r), i && ye(i), a?.length) for (let e = 0; e < a.length; e++) {
                                        Ye(`Completing social ${e + 1}/${a.length}...`), ye(a[e].encrypted || a[e]), o && ye(o);
                                        try {
                                            await me(1e4);
                                        } catch {}
                                        await be(10), n && ye(n);
                                    }
                                    if (v) return;
                                    if (M) return $e(e, t);
                                    const s = e.mM, l = s?.length > 0;
                                    let c = null;
                                    if (e.monetIds?.length > 0 && !v && (c = C, c || (Ye("Waiting for monetization data..."), 
                                    c = await ge(18e4))), c && (C = null), !l && !c && !v) return void Ye("Bypass timed out. Please refresh.");
                                    if (v) return;
                                    const d = Ae(e, c), u = [ ...e.monetIds || [], ...c?.monetizations || [] ].map(Number).filter(e => !d.has(e));
                                    if (u.length) return Le(u.join(", ")), C = c, $e(e, t);
                                    if (t && await t, v) return;
                                    if (I && (Ye("Loading offers..."), await Promise.race([ I, be(2e4) ]), v)) return;
                                    if (await Ve(e, l ? {
                                        ...c,
                                        mM: s
                                    } : c), v) return;
                                    n && ye(n), Ye("Waiting for destination...");
                                    const p = C || await Promise.race([ ge(), he().then(() => null) ]);
                                    if (!v) {
                                        if (p) return Le(0, [ ...d ]), C = p, $e({
                                            ...e,
                                            mM: null,
                                            coM: null,
                                            monetIds: []
                                        }, null, !1);
                                        Ye("Bypass timed out. Please refresh.");
                                    }
                                }(i, n).catch(e => {
                                    v || Ye("Monetization failed: " + (e?.message || "Please refresh."));
                                });
                                if (i.hcr) {
                                    const e = Math.max(1, parseInt(i.hcsn, 10) || 1);
                                    unsafeWindow.zc69a55d19a = !0;
                                    for (let t = 0; t < e; t++) {
                                        let n;
                                        unsafeWindow.zcc3602d3ff = `Please complete the hCaptcha challenge (${t + 1}/${e})...`, 
                                        Ye(unsafeWindow.zcc3602d3ff);
                                        try {
                                            n = await Ze();
                                        } catch (e) {
                                            return void Ye("Failed to load hCaptcha. Please refresh.");
                                        }
                                        Ye(`hCaptcha solved (${t + 1}/${e}), submitting...`), unsafeWindow.zcc3602d3ff = `hCaptcha solved (${t + 1}/${e}), submitting...`;
                                        try {
                                            const e = await new Promise((e, t) => {
                                                GM_xmlhttpRequest({
                                                    method: "POST",
                                                    url: o,
                                                    headers: {
                                                        "Content-Type": "application/json"
                                                    },
                                                    data: JSON.stringify({
                                                        hCapToken: n
                                                    }),
                                                    onload: n => {
                                                        try {
                                                            e(JSON.parse(n.responseText));
                                                        } catch (e) {
                                                            t(e);
                                                        }
                                                    },
                                                    onerror: e => {
                                                        t(e);
                                                    },
                                                    ontimeout: () => {
                                                        t(new Error("timeout"));
                                                    },
                                                    timeout: 15e3
                                                });
                                            }), t = e?.hcresp || e?.tst;
                                            t && ye(t);
                                        } catch (e) {
                                            return void Ye("Failed to verify hCaptcha. Please refresh.");
                                        }
                                    }
                                    unsafeWindow.zc69a55d19a = !1, unsafeWindow.zcc3602d3ff = null, Ye("hCaptcha complete, forcefully evading...");
                                }
                                Te(), i.mdDism && !g && ye(i.mdDism);
                                const r = [ ...(i.mM || []).filter(e => "start" === e.event).map(e => e.id), ...i.monetIds || [], ...i.monetizations || [] ], s = M && r.length ? [ Math.min(...r.map(Number)) ] : r;
                                if (s.length > 0) for (const e of s) {
                                    if (v) break;
                                    await Ee(e);
                                }
                                i.mdDism && !g && ye(i.mdDism), t.fn && t.fn(), await a;
                            })();
                        }
                    } catch (e) {
                        return Ye("Backend parse error. Check console."), void (null !== n && T?.reject && T.reject(e));
                    }
                },
                onerror: function(e) {
                    Ye("Backend request failed. Please refresh."), null !== n && T?.reject && T.reject(new Error("Backend request failed"));
                },
                ontimeout: function() {
                    Ye("Backend request timed out. Please refresh."), null !== n && T?.reject && T.reject(new Error("Backend request timed out"));
                },
                timeout: 3e4
            });
        }
        async function De() {
            return true;
        }
        GM_registerMenuCommand("Evade Settings", function() {
            B("zd31ad116dc")?.remove();
            const e = le(), t = e.accentColor, n = ce(t), o = n.r + "," + n.g + "," + n.b, a = [ {
                id: "security",
                label: "Security"
            }, {
                id: "behaviour",
                label: "Behaviour"
            }, {
                id: "customization",
                label: "Customization"
            }, {
                id: "premium",
                label: "Premium"
            } ], i = (e, t, n, o, a, i) => `\n            <div class="z33e989893d">\n                <div class="z9ef6884887">\n                    <span class="zfe23e15b06">${t}</span>\n                    <span class="zc961beae0b" data-for="${e}">${a}${i}</span>\n                </div>\n                <input type="range" id="${e}" min="${n}" max="${o}" value="${a}" data-suffix="${i}">\n            </div>`, r = (e, t, n, o) => `\n            <div class="z33e989893d">\n                <label class="zcda29830fa">\n                    <span class="zfe23e15b06">${t}</span>\n                    <span class="z59420ac6a4">\n                        <input type="checkbox" id="${e}" ${n ? "checked" : ""}>\n                        <span class="zfd8e82922c"></span>\n                    </span>\n                </label>\n                ${o ? `<p class="ze70018555b">${o}</p>` : ""}\n            </div>`, s = `\n            <div class="zb7dcc615fb">\n                <h3 class="z9248364c11">Security</h3>\n                <p class="z2e4c08284d">Set the minimum time Evade will wait before revealing the destination for each provider.</p>\n            </div>\n            ${i("zbeee80e154", "work.ink minimum time", 0, 90, e.minimumTimeWorkink, "s")}\n            ${i("zdb6962bf70", "Linkvertise minimum time", 0, 90, e.minimumTimeLinkvertise, "s")}\n            ${i("z9c13cec19f", "LootLabs minimum time", 0, 90, e.minimumTimeLootlabs, "s")}\n            ${r("z88a7a9a49f", "Linkvertise Completion Spoof", e.lvHistoryTrick, "This is an ADVANCED and UNIQUE Linkvertise bypass method which is currently not required by ANY key system. Use it if you want...")}\n        `, l = `\n            <div class="zb7dcc615fb">\n                <h3 class="z9248364c11">Premium</h3>\n                <p class="z2e4c08284d">Access exclusive features available to premium users.</p>\n            </div>\n            ${c = "ev-premium-feature", 
            d = "API Key", u = e.premiumKey, p = "Type your API Key you get from our Discord bot.", 
            `\n            <div class="z33e989893d">\n                <label class="ev-input">\n                    <span class="zfe23e15b06">${d}</span>\n                    <span class="ev-input-wrap">\n                        <input type="text" id="${c}" value="${u || ""}">\n                    </span>\n                </label>\n                ${p ? `<p class="ze70018555b">${p}</p>` : ""}\n            </div>`}\n        `;
            var c, d, u, p;
            const m = {
                security: s,
                behaviour: `\n            <div class="zb7dcc615fb">\n                <h3 class="z9248364c11">Behaviour</h3>\n                <p class="z2e4c08284d">Control how Evade interacts with destinations and detection mitigations.</p>\n            </div>\n            ${r("z17fae76e6e", "Open destination in new tab", e.openNewTab, "Recommended. Disable only if a key system fails to load in a new tab.")}\n            ${r("z6b73bec810", "Linkvertise Timer", e.lvSafety, "Only disable when not using a key system. Most key systems detect rapid bypasses.")}\n        `,
                customization: `\n            <div class="zb7dcc615fb">\n                <h3 class="z9248364c11">Customization</h3>\n                <p class="z2e4c08284d">Tune the look of the Evade overlay and topographic background.</p>\n            </div>\n            ${r("z27a7fa2c20", "Topographic background", e.topoBackground, "")}\n            ${i("z87371c1082", "Background blur", 0, 10, e.topoBlur, "px")}\n            ${i("z61d6102734", "Contour line count", 4, 15, e.topoLines, "")}\n            <div class="z33e989893d">\n                <div class="z9ef6884887">\n                    <span class="zfe23e15b06">Render quality</span>\n                    <span class="zc961beae0b" id="zdfb1580a0a">${e.topoQuality.charAt(0).toUpperCase() + e.topoQuality.slice(1)}</span>\n                </div>\n                <div class="z47434046b8" id="zd3254f8241" data-value="${e.topoQuality}">\n                    <button type="button" class="zee83b502bf${"low" === e.topoQuality ? " active" : ""}" data-quality="low">Low</button>\n                    <button type="button" class="zee83b502bf${"medium" === e.topoQuality ? " active" : ""}" data-quality="medium">Medium</button>\n                    <button type="button" class="zee83b502bf${"high" === e.topoQuality ? " active" : ""}" data-quality="high">High</button>\n                </div>\n                <p class="ze70018555b">Background quality. Lower if you have bad FPS. Low (960x540), Medium (1280x720), High (1920x1080).</p>\n            </div>\n            <div class="z33e989893d">\n                <div class="z9ef6884887">\n                    <span class="zfe23e15b06">Interface scale</span>\n                    <span class="zc961beae0b" id="z5192fc8188">${e.uiScale}x</span>\n                </div>\n                <div class="z47434046b8" id="z853f0f69c0" role="tablist" data-value="${e.uiScale}">\n                    <button type="button" class="zee83b502bf${1 === e.uiScale ? " active" : ""}" data-scale="1">1x</button>\n                    <button type="button" class="zee83b502bf${1.5 === e.uiScale ? " active" : ""}" data-scale="1.5">1.5x</button>\n                    <button type="button" class="zee83b502bf${2 === e.uiScale ? " active" : ""}" data-scale="2">2x</button>\n                </div>\n                <p class="ze70018555b">Scales the settings panel only.</p>\n            </div>\n            <div class="z33e989893d">\n                <div class="z9ef6884887">\n                    <span class="zfe23e15b06">Accent color</span>\n                    <span class="zc961beae0b" id="za34d4bf14d">${t.toUpperCase()}</span>\n                </div>\n                <div class="z55e43d481d">\n                    <input type="color" id="z7b20dd837d" value="${t}">\n                    <div class="z6f721f07e6" id="z6f721f07e6"></div>\n                </div>\n                <p class="ze70018555b">Drives the active tab highlight and the topographic line color.</p>\n            </div>\n        `,
                premium: l
            }, f = document.createElement("div");
            if (f.id = "zd31ad116dc", !document.getElementById("za96ee625a1")) {
                const e = document.createElement("link");
                e.id = "za96ee625a1", e.rel = "stylesheet", e.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap", 
                document.head.appendChild(e);
            }
            f.innerHTML = `\n            <style>\n                #zd31ad116dc { font-family: 'Poppins', sans-serif; }\n                #zd31ad116dc *, #zd31ad116dc *::before, #zd31ad116dc *::after { box-sizing: border-box; }\n                #zd31ad116dc .z3665a18d5f {\n                    position: fixed; inset: 0; background: rgba(0,0,0,0.72);\n                    z-index: 2147483600; display: flex; align-items: center; justify-content: center;\n                    backdrop-filter: blur(2px);\n                }\n                #zd31ad116dc .z74b1b5eaf9 {\n                    width: 640px; max-width: calc(100vw - 32px); height: 460px; max-height: calc(100vh - 32px);\n                    background: #15171b; border: 1px solid #2a2d34; border-radius: 10px;\n                    box-shadow: 0 20px 60px rgba(0,0,0,0.55);\n                    display: flex; flex-direction: column; overflow: hidden;\n                    color: #d6d8dd;\n                }\n                #zd31ad116dc .z54ec25e5b4 {\n                    display: flex; align-items: center; justify-content: space-between;\n                    padding: 10px 14px; background: #1b1e24; border-bottom: 1px solid #2a2d34;\n                    user-select: none;\n                }\n                #zd31ad116dc .z7d419b2366 {\n                    font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #c9ccd2;\n                }\n                #zd31ad116dc .z7d419b2366 em { font-style: normal; color: var(--zfac1aa6210); }\n                #zd31ad116dc .z4290a9e246 {\n                    background: transparent; color: #8a8e96; border: none; width: 22px; height: 22px;\n                    border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1;\n                    display: flex; align-items: center; justify-content: center;\n                }\n                #zd31ad116dc .z4290a9e246:hover { background: #2a2d34; color: #fff; }\n                #zd31ad116dc .zf52f557563 { flex: 1; display: flex; min-height: 0; }\n                #zd31ad116dc .za2def86afd {\n                    width: 168px; background: #131519; border-right: 1px solid #2a2d34;\n                    padding: 10px 8px; display: flex; flex-direction: column; gap: 2px;\n                    position: relative;\n                }\n                #zd31ad116dc .zfbba7ce415 {\n                    position: absolute; top: 0; left: 8px; right: 8px; height: 32px;\n                    background: var(--zfac1aa6210); border-radius: 6px;\n                    transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);\n                    pointer-events: none; z-index: 0;\n                    will-change: transform;\n                }\n                #zd31ad116dc #ev-premium-feature {\n                    background: #2a2d34;\n                    padding: 3px;\n                    border-radius: 6px;\n                    border: 1px solid #21242a;\n                    color: #fff;\n                }\n                #zd31ad116dc .za9c69d6feb {\n                    position: relative; z-index: 1;\n                    background: transparent; border: none; color: #b3b6bd;\n                    text-align: left; padding: 0 12px; height: 32px; border-radius: 6px;\n                    font-size: 13px; font-weight: 500; cursor: pointer;\n                    transition: color 200ms ease;\n                    display: flex; align-items: center;\n                }\n                #zd31ad116dc .za9c69d6feb:hover { color: #fff; }\n                #zd31ad116dc .za9c69d6feb.active { color: #0c0e11; font-weight: 600; }\n                #zd31ad116dc .z3db05469f7 {\n                    flex: 1; min-width: 0; position: relative; overflow: hidden;\n                }\n                #zd31ad116dc .z30311f86c9 {\n                    position: absolute; inset: 0; padding: 20px 24px; overflow-y: auto;\n                    opacity: 0; transform: translateY(8px);\n                    transition: opacity 220ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);\n                    pointer-events: none;\n                }\n                #zd31ad116dc .z30311f86c9.active {\n                    opacity: 1; transform: translateY(0); pointer-events: auto;\n                }\n                #zd31ad116dc .z30311f86c9::-webkit-scrollbar { width: 8px; }\n                #zd31ad116dc .z30311f86c9::-webkit-scrollbar-thumb { background: #2a2d34; border-radius: 4px; }\n                #zd31ad116dc .zb7dcc615fb { margin-bottom: 18px; }\n                #zd31ad116dc .z9248364c11 {\n                    font-size: 14px; font-weight: 600; margin: 0 0 4px;\n                    color: #fff; letter-spacing: 0.04em;\n                }\n                #zd31ad116dc .z2e4c08284d {\n                    margin: 0; font-size: 12px; color: #8a8e96; line-height: 1.5;\n                }\n                #zd31ad116dc .z33e989893d {\n                    padding: 12px 0; border-bottom: 1px solid #21242a;\n                }\n                #zd31ad116dc .z33e989893d:last-child { border-bottom: none; }\n                #zd31ad116dc .z9ef6884887 {\n                    display: flex; align-items: center; justify-content: space-between;\n                    margin-bottom: 8px;\n                }\n                #zd31ad116dc .zfe23e15b06 {\n                    font-size: 13px; color: #d6d8dd; font-weight: 500;\n                }\n                #zd31ad116dc .zc961beae0b {\n                    font-size: 12px; color: var(--zfac1aa6210); font-variant-numeric: tabular-nums;\n                    font-weight: 600;\n                }\n                #zd31ad116dc .ze70018555b {\n                    margin: 8px 0 0; font-size: 11px; color: #6f737a; line-height: 1.5;\n                }\n                #zd31ad116dc input[type="range"] {\n                    -webkit-appearance: none; appearance: none;\n                    width: 100%; height: 4px; background: #2a2d34; border-radius: 2px; outline: none;\n                }\n                #zd31ad116dc input[type="range"]::-webkit-slider-thumb {\n                    -webkit-appearance: none; appearance: none;\n                    width: 14px; height: 14px; background: var(--zfac1aa6210);\n                    border-radius: 50%; cursor: pointer;\n                    box-shadow: 0 0 0 3px rgba(var(--zca31986c2e), 0.18);\n                    transition: box-shadow 150ms ease;\n                }\n                #zd31ad116dc input[type="range"]::-webkit-slider-thumb:hover {\n                    box-shadow: 0 0 0 5px rgba(var(--zca31986c2e), 0.22);\n                }\n                #zd31ad116dc input[type="range"]::-moz-range-thumb {\n                    width: 14px; height: 14px; background: var(--zfac1aa6210);\n                    border-radius: 50%; cursor: pointer; border: none;\n                }\n                #zd31ad116dc .zcda29830fa {\n                    display: flex; align-items: center; justify-content: space-between;\n                    cursor: pointer; gap: 16px;\n                }\n                #zd31ad116dc .z59420ac6a4 { position: relative; display: inline-block; width: 34px; height: 18px; flex: none; }\n                #zd31ad116dc .z59420ac6a4 input { opacity: 0; width: 0; height: 0; }\n                #zd31ad116dc .zfd8e82922c {\n                    position: absolute; inset: 0; background: #2a2d34; border-radius: 18px;\n                    transition: background 180ms ease;\n                }\n                #zd31ad116dc .zfd8e82922c::before {\n                    content: ''; position: absolute; left: 2px; top: 2px;\n                    width: 14px; height: 14px; background: #8a8e96; border-radius: 50%;\n                    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms ease;\n                }\n                #zd31ad116dc .z59420ac6a4 input:checked + .zfd8e82922c { background: rgba(var(--zca31986c2e), 0.35); }\n                #zd31ad116dc .z59420ac6a4 input:checked + .zfd8e82922c::before {\n                    transform: translateX(16px); background: var(--zfac1aa6210);\n                }\n                #zd31ad116dc .z55e43d481d { display: flex; align-items: center; gap: 12px; }\n                #zd31ad116dc input[type="color"] {\n                    -webkit-appearance: none; appearance: none;\n                    width: 36px; height: 24px; border: 1px solid #2a2d34; border-radius: 4px;\n                    background: transparent; cursor: pointer; padding: 0;\n                }\n                #zd31ad116dc input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }\n                #zd31ad116dc input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }\n                #zd31ad116dc .z47434046b8 {\n                    display: inline-flex; background: #1b1e24; border: 1px solid #2a2d34; border-radius: 6px;\n                    padding: 2px; gap: 2px;\n                }\n                #zd31ad116dc .zee83b502bf {\n                    background: transparent; border: none; color: #b3b6bd;\n                    font-family: inherit; font-size: 12px; font-weight: 500;\n                    height: 24px; min-width: 44px; padding: 0 12px; border-radius: 4px;\n                    cursor: pointer; transition: background 150ms ease, color 150ms ease;\n                }\n                #zd31ad116dc .zee83b502bf:hover { color: #fff; }\n                #zd31ad116dc .zee83b502bf.active {\n                    background: var(--zfac1aa6210); color: #0c0e11; font-weight: 600;\n                }\n                #zd31ad116dc .z6f721f07e6 {\n                    flex: 1; height: 24px; border-radius: 4px;\n                    background: linear-gradient(90deg, rgba(var(--zca31986c2e), 0.15), var(--zfac1aa6210));\n                    border: 1px solid #2a2d34;\n                }\n                #zd31ad116dc .z4852d41180 {\n                    display: flex; justify-content: flex-end; gap: 8px;\n                    padding: 12px 16px; background: #1b1e24; border-top: 1px solid #2a2d34;\n                }\n                #zd31ad116dc .zbf3be86b2e {\n                    height: 30px; padding: 0 16px; border-radius: 5px; border: 1px solid transparent;\n                    font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;\n                    transition: background 150ms ease, border-color 150ms ease;\n                }\n                #zd31ad116dc .z93b260ddd6 { background: transparent; color: #b3b6bd; border-color: #2a2d34; }\n                #zd31ad116dc .z93b260ddd6:hover { background: #20232a; color: #fff; }\n                #zd31ad116dc .z0402e2485d { background: var(--zfac1aa6210); color: #0c0e11; font-weight: 600; }\n                #zd31ad116dc .z0402e2485d:hover { filter: brightness(1.08); }\n            </style>\n            <div class="z3665a18d5f" style="--zfac1aa6210:${t};--zca31986c2e:${o};">\n                <div class="z74b1b5eaf9 vt-card vt-glass vt-glass--thick">\n                    <div class="z54ec25e5b4">\n                        <div class="z7d419b2366"><em>Evade</em> &nbsp;/&nbsp; Settings</div>\n                        <div style="display:flex;gap:6px;align-items:center;"><button class="vt-btn vt-btn--ghost vt-btn--sm" type="button" data-vt-theme-toggle title="Toggle theme">◐</button><button class="z4290a9e246 vt-btn vt-btn--ghost vt-btn--icon" id="z4290a9e246" type="button">&times;</button></div>\n                    </div>\n                    <div class="zf52f557563">\n                        <nav class="za2def86afd vt-sidebar">\n                            <div class="zfbba7ce415" id="zfbba7ce415"></div>\n                            ${a.map((e, t) => `<button type="button" class="za9c69d6feb vt-nav-item${0 === t ? " active" : ""}" ${0 === t ? 'aria-current="page"' : ""} data-tab="${e.id}">${e.label}</button>`).join("")}\n                        </nav>\n                        <div class="z3db05469f7">\n                            ${a.map((e, t) => `<div class="z30311f86c9${0 === t ? " active" : ""}" data-pane="${e.id}">${m[e.id]}</div>`).join("")}\n                        </div>\n                    </div>\n                    <div class="z4852d41180">\n                        <button class="zbf3be86b2e z93b260ddd6 vt-btn vt-btn--ghost" id="z6b8cb64b76" type="button">Cancel</button>\n                        <button class="zbf3be86b2e z0402e2485d vt-btn vt-btn--primary" id="z9a0bd21e97" type="button">Save changes</button>\n                    </div>\n                </div>\n            </div>`, 
            G(f);
            window.Vitre?.refresh?.(f);
            const v = f.querySelector(".z3665a18d5f"), h = f.querySelectorAll(".za9c69d6feb"), g = f.querySelectorAll(".z30311f86c9"), b = f.querySelector("#zfbba7ce415"), y = e => {
                const t = e.offsetTop;
                b.style.transform = `translateY(${t}px)`;
            };
            y(f.querySelector(".za9c69d6feb.active")), h.forEach(e => {
                e.addEventListener("click", () => {
                    h.forEach(e => e.classList.remove("active")), e.classList.add("active"), y(e);
                    const t = e.dataset.tab;
                    g.forEach(e => e.classList.toggle("active", e.dataset.pane === t));
                });
            }), f.querySelectorAll('input[type="range"]').forEach(e => {
                const t = f.querySelector(`[data-for="${e.id}"]`), n = e.dataset.suffix || "";
                e.addEventListener("input", () => {
                    t && (t.textContent = e.value + n);
                });
            });
            const w = f.querySelector("#z7b20dd837d"), k = f.querySelector("#za34d4bf14d");
            w.addEventListener("input", () => {
                const e = w.value, t = ce(e);
                k.textContent = e.toUpperCase(), v.style.setProperty("--zfac1aa6210", e), v.style.setProperty("--zca31986c2e", `${t.r},${t.g},${t.b}`);
            });
            const x = f.querySelector("#z853f0f69c0"), _ = f.querySelector("#z5192fc8188"), S = f.querySelector(".z74b1b5eaf9"), T = e => {
                S.style.transform = `scale(${e})`, S.style.transformOrigin = "center center";
            };
            T(e.uiScale), x.querySelectorAll(".zee83b502bf").forEach(e => {
                e.addEventListener("click", () => {
                    x.querySelectorAll(".zee83b502bf").forEach(e => e.classList.remove("active")), e.classList.add("active"), 
                    x.dataset.value = e.dataset.scale, _.textContent = e.dataset.scale + "x", T(parseFloat(e.dataset.scale));
                });
            });
            const C = f.querySelector("#zd3254f8241"), E = f.querySelector("#zdfb1580a0a");
            C.querySelectorAll(".zee83b502bf").forEach(e => {
                e.addEventListener("click", () => {
                    C.querySelectorAll(".zee83b502bf").forEach(e => e.classList.remove("active")), e.classList.add("active"), 
                    C.dataset.value = e.dataset.quality, E.textContent = e.dataset.quality.charAt(0).toUpperCase() + e.dataset.quality.slice(1);
                });
            });
            const M = () => f.remove();
            f.querySelector("#z4290a9e246").addEventListener("click", M), f.querySelector("#z6b8cb64b76").addEventListener("click", M), 
            v.addEventListener("click", e => {
                e.target === v && M();
            }), f.querySelector("#z9a0bd21e97").addEventListener("click", () => {
                GM_setValue("minimumTimeWorkink", parseInt(f.querySelector("#zbeee80e154").value, 10)), 
                GM_setValue("minimumTimeLinkvertise", parseInt(f.querySelector("#zdb6962bf70").value, 10)), 
                GM_setValue("minimumTimeLootlabs", parseInt(f.querySelector("#z9c13cec19f").value, 10)), 
                GM_setValue("openNewTab", f.querySelector("#z17fae76e6e").checked), GM_setValue("lvSafety", f.querySelector("#z6b73bec810").checked), 
                GM_setValue("lvHistoryTrick", f.querySelector("#z88a7a9a49f").checked), GM_setValue("topoBackground", f.querySelector("#z27a7fa2c20").checked), 
                GM_setValue("topoBlur", parseInt(f.querySelector("#z87371c1082").value, 10)), GM_setValue("topoLines", parseInt(f.querySelector("#z61d6102734").value, 10)), 
                GM_setValue("accentColor", w.value);
                const e = parseFloat(x.dataset.value);
                GM_setValue("uiScale", [ 1, 1.5, 2 ].includes(e) ? e : 1);
                const t = C.dataset.value;
                GM_setValue("topoQuality", [ "low", "medium", "high" ].includes(t) ? t : "high"), 
                GM_setValue("premiumKey", f.querySelector("#ev-premium-feature").value);
                const n = B("z4602579d17");
                if (n) {
                    je(), n.querySelectorAll("#z88fabb6392, .zedcb11b4ba").forEach(e => e.remove());
                    const e = n.querySelector('div[style*="backdrop-filter"]');
                    e && e.remove();
                    const t = f.querySelector("#z27a7fa2c20").checked;
                    n.classList.toggle("z94da2a94d2", t);
                    const o = n.querySelector(".z8fa02b1407");
                    o && o.classList.toggle("z723eab9149", t), t && Fe(n);
                }
                M();
            });
        });
        let Re = "";
        function He() {
            "snipe" === d && window.top === window.self || (document.title && (Re = document.title), 
            function() {
                if ("workink" === d) {
                    try {
                        unsafeWindow.stop();
                    } catch (e) {}
                    try {
                        for (let e = unsafeWindow.setTimeout(() => {}, 0); e >= 0; e--) {
                            try {
                                unsafeWindow.clearTimeout(e);
                            } catch (e) {}
                            try {
                                unsafeWindow.clearInterval(e);
                            } catch (e) {}
                        }
                    } catch (e) {}
                    try {
                        for (let e = unsafeWindow.requestAnimationFrame(() => {}); e >= 0; e--) try {
                            unsafeWindow.cancelAnimationFrame(e);
                        } catch (e) {}
                    } catch (e) {}
                }
            }(), document.documentElement.innerHTML = "", document.documentElement.appendChild(document.createElement("head")), 
            document.documentElement.appendChild(document.createElement("body")), Re && (document.title = Re));
        }
        function je() {
            $ && (cancelAnimationFrame($), $ = null), "snipe" !== d && N && (window.removeEventListener("resize", N), 
            N = null);
        }
        function Fe(e) {
            const t = le(), n = ce(t.accentColor), o = Math.max(0, Math.min(20, Number(t.topoBlur) || 0)), a = document.createElement("canvas");
            a.id = "z88fabb6392", a.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
            const i = document.createElement("div");
            i.style.cssText = "position:absolute;inset:0;backdrop-filter:blur(" + o + "px);pointer-events:none;", 
            e.appendChild(a), e.appendChild(i);
            const r = a.getContext("2d", {
                alpha: !1,
                willReadFrequently: !1
            });
            if (!r) return;
            const s = .5 * (Math.sqrt(3) - 1), l = (3 - Math.sqrt(3)) / 6, c = [ [ 1, 1 ], [ -1, 1 ], [ 1, -1 ], [ -1, -1 ], [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
            const d = new class {
                constructor(e = Math.random()) {
                    this.p = new Uint8Array(256), this.perm = new Uint8Array(512), this.permMod8 = new Uint8Array(512);
                    const t = this.p;
                    for (let e = 0; e < 256; e++) t[e] = e;
                    let n = 2147483647 * e;
                    const o = () => (n = 16807 * n % 2147483647, (n - 1) / 2147483646);
                    for (let e = 255; e > 0; e--) {
                        const n = Math.floor(o() * (e + 1));
                        [t[e], t[n]] = [ t[n], t[e] ];
                    }
                    for (let e = 0; e < 512; e++) this.perm[e] = t[255 & e], this.permMod8[e] = this.perm[e] % 8;
                }
                noise2D(e, t) {
                    const n = (e + t) * s, o = Math.floor(e + n), a = Math.floor(t + n), i = (o + a) * l, r = e - (o - i), d = t - (a - i), u = r > d ? 1 : 0, p = r > d ? 0 : 1, m = r - u + l, f = d - p + l, v = r - 1 + 2 * l, h = d - 1 + 2 * l, g = 255 & o, b = 255 & a;
                    let y = 0, w = 0, k = 0, x = .5 - r * r - d * d;
                    if (x >= 0) {
                        x *= x;
                        const e = this.permMod8[g + this.perm[b]];
                        y = x * x * (c[e][0] * r + c[e][1] * d);
                    }
                    let _ = .5 - m * m - f * f;
                    if (_ >= 0) {
                        _ *= _;
                        const e = this.permMod8[g + u + this.perm[b + p]];
                        w = _ * _ * (c[e][0] * m + c[e][1] * f);
                    }
                    let S = .5 - v * v - h * h;
                    if (S >= 0) {
                        S *= S;
                        const e = this.permMod8[g + 1 + this.perm[b + 1]];
                        k = S * S * (c[e][0] * v + c[e][1] * h);
                    }
                    return 70 * (y + w + k);
                }
            }(42), u = Math.max(4, Math.min(15, Number(t.topoLines) || 15)), p = 15, m = 4e-4, f = {
                low: [ 960, 540 ],
                medium: [ 1280, 720 ],
                high: [ 1920, 1080 ]
            }, [v, h] = f[t.topoQuality] || f.high;
            a.width = v, a.height = h, a.style.objectFit = "cover";
            const g = Math.ceil(v / p) + 1, b = Math.ceil(h / p) + 1, y = new Float32Array(g * b), w = (e, t) => d.noise2D(e, t), k = (e, t, n) => {
                let o = 0;
                return o += w(e * m + .15 * n, t * m + .1 * n), o += .5 * w(e * m * 2 + -.08 * n, t * m * 2 + .18 * n), 
                o += .25 * w(e * m * 4 + .2 * n, t * m * 4 + -.06 * n), o / 1.75;
            }, x = [ [ -1, -1, -1, -1 ], [ 3, 2, -1, -1 ], [ 2, 1, -1, -1 ], [ 3, 1, -1, -1 ], [ 0, 1, -1, -1 ], [ 0, 1, 3, 2 ], [ 0, 2, -1, -1 ], [ 0, 3, -1, -1 ], [ 0, 3, -1, -1 ], [ 0, 2, -1, -1 ], [ 0, 3, 2, 1 ], [ 0, 1, -1, -1 ], [ 3, 1, -1, -1 ], [ 2, 1, -1, -1 ], [ 3, 2, -1, -1 ] ], _ = e => {
                const t = b - 1, n = g - 1;
                for (let o = 0; o < t; o++) {
                    const t = o * g, a = t + g, i = o * p;
                    for (let o = 0; o < n; o++) {
                        const n = y[t + o], s = y[t + o + 1], l = y[a + o + 1], c = y[a + o];
                        let d = 0;
                        if (n >= e && (d |= 8), s >= e && (d |= 4), l >= e && (d |= 2), c >= e && (d |= 1), 
                        0 === d || 15 === d) continue;
                        const u = o * p;
                        let m = s - n;
                        m < 1e-8 && m > -1e-8 && (m = 0);
                        let f = l - s;
                        f < 1e-8 && f > -1e-8 && (f = 0);
                        let v = l - c;
                        v < 1e-8 && v > -1e-8 && (v = 0);
                        let h = c - n;
                        h < 1e-8 && h > -1e-8 && (h = 0);
                        const g = u + (0 === m ? .5 : (e - n) / m) * p, b = i, w = u + p, k = i + (0 === f ? .5 : (e - s) / f) * p, _ = u + (0 === v ? .5 : (e - c) / v) * p, S = i + p, T = u, C = i + (0 === h ? .5 : (e - n) / h) * p, E = x[d];
                        for (let e = 0; e < 4; e += 2) {
                            const t = E[e];
                            if (t < 0) break;
                            const n = E[e + 1];
                            let o, a, i, s;
                            switch (t) {
                              case 0:
                                o = g, a = b;
                                break;

                              case 1:
                                o = w, a = k;
                                break;

                              case 2:
                                o = _, a = S;
                                break;

                              default:
                                o = T, a = C;
                            }
                            switch (n) {
                              case 0:
                                i = g, s = b;
                                break;

                              case 1:
                                i = w, s = k;
                                break;

                              case 2:
                                i = _, s = S;
                                break;

                              default:
                                i = T, s = C;
                            }
                            r.moveTo(o, a), r.lineTo(i, s);
                        }
                    }
                }
            }, S = performance.now(), T = e => {
                if (!a.isConnected) return void je();
                const t = 6e-5 * (e - S);
                r.fillStyle = "#0a0a12", r.fillRect(0, 0, v, h);
                for (let e = 0; e < b; e++) {
                    const n = e * g, o = e * p;
                    for (let e = 0; e < g; e++) y[n + e] = k(e * p, o, t);
                }
                r.lineCap = "round", r.lineJoin = "round";
                const o = u - 1;
                for (let e = 0; e < u; e++) {
                    const t = e / o * 1.8 - .9, a = e / u;
                    r.strokeStyle = "rgba(" + n.r + ", " + n.g + ", " + n.b + ", " + (.12 + .45 * a).toFixed(2) + ")", 
                    r.lineWidth = 2.5 + 1.8 * a, r.beginPath(), _(t), r.stroke();
                }
                $ = requestAnimationFrame(T);
            };
            $ = requestAnimationFrame(T);
        }
        function Ke() {
            je();
            const e = le(), t = e.topoBackground;
            if (!document.getElementById("za96ee625a1")) {
                const e = document.createElement("link");
                e.id = "za96ee625a1", e.rel = "stylesheet", e.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap", 
                document.head.appendChild(e);
            }
            const n = document.createElement("style");
            n.textContent = '#zf700f17074,#zf700f17074 *{font-family:Poppins,sans-serif!important;-webkit-user-select:auto;user-select:auto}#zf700f17074{pointer-events:auto}#zf700f17074 button,#zf700f17074 a{pointer-events:auto!important;cursor:pointer!important}@keyframes fi{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes ev-spin{to{transform:rotate(360deg)}}.z98e3c983c3{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;display:flex;justify-content:center;align-items:center;color:white;overflow:hidden;background:#1a1a1a}.z94da2a94d2{background:#0a0a12}.z8fa02b1407{width:400px;max-width:calc(100vw - 40px);text-align:center;position:relative;z-index:10;pointer-events:auto;animation:fi 0.65s cubic-bezier(0.22,1,0.36,1) forwards;background:rgba(18,22,30,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:22px;box-shadow:0 24px 64px rgba(0,0,0,0.45)}.z723eab9149{background:rgba(8,12,20,0.68)!important;backdrop-filter:blur(28px) saturate(1.5);border-color:rgba(255,255,255,0.1)!important;box-shadow:0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.07)!important}.z5c581ff096{padding:26px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.07)}.z334b97d6c5{padding:28px 28px 24px}.z5d345208e8{padding:8px 28px 16px;border-top:1px solid rgba(255,255,255,0.06)}.z748ff630d8{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px}.zf3ae9704ff{font-size:42px;font-weight:600;color:#fff}.z2805b3ce88{font-size:16px;color:rgba(255,255,255,0.32);letter-spacing:0.01em;margin:0}.z2805b3ce88 a{color:rgba(255,255,255,0.42);text-decoration:none;transition:color 0.2s}.z2805b3ce88 a:hover{color:var(--zfac1aa6210,#5ac8b4)}.z9460ef5cce{display:flex;flex-direction:column;align-items:center;gap:14px;min-height:90px;justify-content:center}.z32f5bde783{position:relative;width:38px;height:38px;flex:none}.z04fca24d53{position:absolute;inset:0;border-radius:50%;border:2.5px solid rgba(255,255,255,0.07);border-top-color:var(--zfac1aa6210,#5ac8b4);animation:ev-spin 0.8s linear infinite}#z18b9b2fb3d{font-size:14px;color:var(--zfac1aa6210,#5ac8b4);line-height:1.65;margin:0;transition:color 0.25s}#z2baeff64d4{font-size:12px;color:rgba(255,255,255,0.27);letter-spacing:0.06em;margin:0;pointer-events:none;font-variant-numeric:tabular-nums}.z4917569771{display:block;color:var(--zfac1aa6210,#5ac8b4);font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:16px}.z4ebc120a67{display:inline-flex;align-items:center;gap:5px;background:rgba(255,82,82,0.08);border:1px solid rgba(255,82,82,0.22);color:#ff8a80;font-size:11px;border-radius:7px;padding:5px 14px;margin-bottom:14px;letter-spacing:0.04em}.zb224a43bf9{display:flex;width:100%;align-items:center;justify-content:center;gap:9px;background:var(--zfac1aa6210,#5ac8b4);color:#061210;text-decoration:none;border:none;padding:15px 24px;font-size:14.5px;font-weight:700;border-radius:13px;cursor:pointer;letter-spacing:0.05em;box-shadow:0 4px 12px rgba(var(--zca31986c2e,90,200,180),0.15);transition:transform 0.18s cubic-bezier(0.22,1,0.36,1),box-shadow 0.18s,filter 0.18s;position:relative;z-index:9999;overflow:hidden;box-sizing:border-box}.zb224a43bf9::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.14) 0%,transparent 55%);pointer-events:none;border-radius:inherit}.zb224a43bf9:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(var(--zca31986c2e,90,200,180),0.22);filter:brightness(1.07)}.zb224a43bf9:active{transform:scale(0.98);filter:brightness(0.94)}#zcf88fe7534{background:transparent;color:rgba(255,255,255,0.22);border:none;padding:5px 10px;font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.03em;transition:color 0.2s}#zf590f2b623,#z05d82bf652{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) translateY(50px)!important;z-index:9999990!important;pointer-events:auto!important}', 
            function(e) {
                const t = W();
                t ? t.appendChild(e) : document.head.appendChild(e);
            }(n);
            const o = document.createElement("div");
            o.id = "zf700f17074";
            const a = t ? "z8fa02b1407 z723eab9149 vt-card vt-glass vt-glass--thick" : "z8fa02b1407 vt-card vt-glass vt-glass--thick", i = t ? "z98e3c983c3 z94da2a94d2" : "z98e3c983c3", r = e.accentColor || "#5ac8b4", s = ce(r), l = s.r + "," + s.g + "," + s.b;
            o.innerHTML = '<div id="z4602579d17" class="' + i + '"><div class="' + a + '"><div class="z5c581ff096"><div class="z748ff630d8"><span class="zf3ae9704ff">Evade</span></div><p class="z2805b3ce88">by <a href="https://skipped.lol/" target="_blank" rel="noopener">skipped.lol</a></p></div><div class="z334b97d6c5"><div id="z7e72fe9c99" class="z9460ef5cce"><div class="z32f5bde783"><div class="z04fca24d53"></div></div><p id="z18b9b2fb3d">Bypassing your link...</p></div></div><div class="z5d345208e8" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button id="zcf88fe7534" class="vt-btn vt-btn--ghost vt-btn--sm" type="button">Copy session data</button><button id="ev-bypass-detection-btn" class="vt-btn vt-btn--primary vt-btn--sm" type="button" title="Relance une fois sans mode brutal (avec délai de sécurité)">Bypass detection</button></div></div></div>', 
            G(o);
            const c = B("z4602579d17");
            if (c && (c.style.setProperty("--zfac1aa6210", r), c.style.setProperty("--zca31986c2e", l)), 
            F(), (() => {
                const b = B("ev-bypass-detection-btn");
                b && !b.dataset.bound && (b.dataset.bound = "1", b.addEventListener("click", () => {
                    try {
                        GM_setValue("evBypassDetectionOnce", !0);
                    } catch (e) {}
                    location.reload();
                }));
            })(), t) {
                const e = B("z4602579d17");
                e && Fe(e);
            }
            ue = Date.now(), "workink" !== d && "linkvertise" !== d ? D() : V();
        }
        function Ye(e) {
            try {
                Array.isArray(H.statusLog) || (H.statusLog = []), H.statusLog.push((new Date).toISOString() + " " + String(e));
            } catch {}
            if (unsafeWindow.zc69a55d19a && e !== unsafeWindow.zcc3602d3ff) return;
            const t = B("z18b9b2fb3d") || B("z7e72fe9c99");
            t && (t.textContent = e);
        }
        function Qe(e) {
            const t = R(), n = t ? `Bypassed in ${t}!` : "Bypass complete!", o = B("z7e72fe9c99");
            if (o) {
                const t = le().openNewTab ? "_blank" : "_self";
                o.innerHTML = `\n                <span class="z4917569771">${n}</span>\n                <a id="z25fc58ecfa" href="${e}" target="${t}" rel="noopener" referrerpolicy="origin" class="zb224a43bf9">Open Destination</a>\n            `;
                const a = B("z25fc58ecfa");
                l.call(a, "click", n => {
                    if (n.stopImmediatePropagation(), window.top !== window.self) try {
                        window.top.postMessage({
                            zad57a4438a: !0,
                            url: e
                        }, "*");
                    } catch (e) {}
                    "_blank" === t ? window.open(e, "_blank", "noopener") : window.location.href = e;
                }, !0);
                if (__brutal() && "workink" !== d) {
                    try {
                        if (window.top !== window.self) window.top.postMessage({
                            zad57a4438a: !0,
                            url: e
                        }, "*"); else location.assign(e);
                    } catch (err) {
                        location.assign(e);
                    }
                }
            }
        }
        function Xe(e) {
            const t = R(), n = t ? `Bypassed in ${t}!` : "Bypass complete!", o = B("z7e72fe9c99");
            if (!o) return;
            o.innerHTML = `\n            <span class="z4917569771">${n}</span>\n            <button id="z31e8523e60" class="zb224a43bf9">Copy to Clipboard</button>\n        `;
            const a = B("z31e8523e60");
            l.call(a, "click", t => {
                t.stopImmediatePropagation(), navigator.clipboard.writeText(e).then(() => {
                    a.textContent = "Copied!", setTimeout(() => {
                        a.textContent = "Copy to Clipboard";
                    }, 2e3);
                }).catch(() => {
                    a.textContent = "Copy failed", setTimeout(() => {
                        a.textContent = "Copy to Clipboard";
                    }, 2e3);
                });
            }, !0);
        }
        function Ze() {
            return new Promise((e, t) => {
                if (!document.getElementById("z80bf5cc53f")) {
                    const e = document.createElement("script");
                    e.id = "z80bf5cc53f", e.src = "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=on&sentry=false", 
                    e.async = !0, e.defer = !0, e.onerror = () => t(new Error("hCaptcha script failed to load")), 
                    document.head.appendChild(e);
                }
                const n = B("z05d82bf652");
                n && n.remove();
                const o = document.createElement("div");
                o.id = "z05d82bf652", o.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) translateY(50px);z-index:9999990;pointer-events:auto;", 
                G(o);
                const a = setInterval(() => {
                    if (void 0 !== unsafeWindow.hcaptcha && "function" == typeof unsafeWindow.hcaptcha.render) {
                        clearInterval(a);
                        try {
                            unsafeWindow.hcaptcha.render(o, {
                                sitekey: "74184788-498a-4910-ba14-be9c2acc3f98",
                                theme: "dark",
                                callback: t => {
                                    try {
                                        o.remove();
                                    } catch (e) {}
                                    e(t);
                                },
                                "error-callback": e => {
                                    try {
                                        o.remove();
                                    } catch (e) {}
                                    t(new Error("hCaptcha error: " + e));
                                },
                                "expired-callback": () => {}
                            });
                        } catch (e) {
                            o.remove(), t(e);
                        }
                    }
                }, 100);
            });
        }
        function et(e) {
            return new Promise(t => {
                if (!document.getElementById("zfa694ba100")) {
                    const e = document.createElement("script");
                    e.id = "zfa694ba100", e.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", 
                    e.async = !0, e.defer = !0, document.head.appendChild(e);
                }
                const n = B("zf590f2b623");
                n && n.remove();
                const o = document.createElement("div");
                o.id = "zf590f2b623", o.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) translateY(50px);z-index:9999990;pointer-events:auto;", 
                G(o), Ye("Please complete the security check below...");
                const a = setInterval(() => {
                    if (void 0 === unsafeWindow.turnstile) return;
                    clearInterval(a);
                    const n = {
                        sitekey: "0x4AAAAAAAJoXhmMXwq7jgK9",
                        theme: "dark",
                        callback: e => {
                            o.remove(), t(e);
                        }
                    };
                    e && (n.action = e), unsafeWindow.turnstile.render(o, n);
                }, 100);
            });
        }
        function tt({label: e, notice: t, placeholder: n, buttonLabel: o, type: a}) {
            return new Promise(i => {
                const r = B("z7e72fe9c99");
                if (!r) return void i("");
                const s = t ? `<p style="font-size:12px;color:#ff9800;margin:0 0 12px;line-height:1.5;opacity:0.9;">${t}</p>` : "";
                r.innerHTML = `\n                <p style="font-size:14px;color:var(--zfac1aa6210,#5ac8b4);margin:0 0 12px;">${e}</p>\n                ${s}\n                <input id="z1018ae8417" type="${a || "text"}" placeholder="${n || ""}" autocomplete="off" style="width:100%;padding:12px 14px;font-family:inherit;font-size:14px;color:#fff;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;outline:none;box-sizing:border-box;margin-bottom:12px;">\n                <button id="z75c0194a52" class="zb224a43bf9" type="button">${o || "Continue"}</button>\n                <p id="za728f9f398" style="font-size:11px;color:#ff8a80;margin:8px 0 0;min-height:14px;"></p>\n            `;
                const c = B("z1018ae8417"), d = B("z75c0194a52"), u = B("za728f9f398");
                try {
                    c.focus();
                } catch {}
                const p = () => {
                    const e = (c.value || "").trim();
                    e ? i(e) : u.textContent = "Required.";
                };
                l.call(d, "click", e => {
                    e.stopImmediatePropagation(), p();
                }, !0), l.call(c, "keydown", e => {
                    "Enter" === e.key && (e.preventDefault(), p());
                }, !0);
            });
        }
        async function nt() {
            let e = null, o = null;
            if ("workink" === d) {
                if (Ke(), setInterval(() => {
                    document.querySelectorAll('[class*="fc-"]').forEach(e => e.remove());
                }, 200), !await De()) return;
                let i = null;
                try {
                    i = localStorage.getItem("customerToken");
                } catch (e) {}
                if (!i) return void await async function() {
                    Ye("Preparing premium account...");
                    const e = async (e, t) => {
                        const n = await fetch(e, {
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json"
                            },
                            ...t
                        }), o = await n.text();
                        let a = null;
                        try {
                            a = JSON.parse(o);
                        } catch {}
                        return {
                            ok: n.ok,
                            status: n.status,
                            text: o,
                            body: a
                        };
                    };
                    Ye("Complete the security check to unlock premium...");
                    const t = await et("premium_login");
                    Ye("Provisioning temporary email...");
                    const o = le(), a = await new Promise(e => {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: n + "api/evade/et",
                            headers: {
                                "Content-Type": "application/json",
                                ...o.premiumKey ? {
                                    "X-Evade-Premium-Key": o.premiumKey
                                } : {}
                            },
                            data: JSON.stringify({}),
                            onload: t => {
                                try {
                                    e(JSON.parse(t.responseText));
                                } catch {
                                    e(null);
                                }
                            },
                            onerror: () => e(null),
                            ontimeout: () => e(null),
                            timeout: 2e4
                        });
                    }), i = a?.email, r = "manual" === i, s = a?.eid;
                    if (!(r || i && s)) throw Ye("Failed to provision email. Please refresh."), new Error("/et missing email or eid");
                    let l;
                    j("premiumMode", r ? "manual" : "auto");
                    let c, d = null;
                    if (r) {
                        let n;
                        l = await tt({
                            label: "Enter your email address to log in:",
                            notice: "You must have access to this email. Work.ink will send you a 2FA code.",
                            placeholder: "you@example.com",
                            buttonLabel: "Send code",
                            type: "email"
                        }), j("premiumEmail", l), Ye("Sending 2FA code to your email...");
                        try {
                            n = await e("https://work.ink/_api/v2/premium/sendLoginCode", {
                                method: "POST",
                                body: JSON.stringify({
                                    email: l,
                                    turnstileToken: t
                                })
                            });
                        } catch (e) {
                            throw Ye("Failed to request login code (network). Please refresh."), e;
                        }
                        if (!n.ok || !0 !== n.body?.mailSent) throw Ye("Failed to request login code (" + n.status + "). Please refresh."), 
                        new Error("sendLoginCode failed");
                        d = await tt({
                            label: "Enter the 2FA code sent to your email:",
                            placeholder: "123456",
                            buttonLabel: "Verify",
                            type: "text"
                        });
                    } else {
                        let o;
                        l = i, j("premiumEmail", l), j("premiumPollId", s), Ye("Requesting premium login code...");
                        try {
                            o = await e("https://work.ink/_api/v2/premium/sendLoginCode", {
                                method: "POST",
                                body: JSON.stringify({
                                    email: l,
                                    turnstileToken: t
                                })
                            });
                        } catch (e) {
                            throw Ye("Failed to request login code (network). Please refresh."), e;
                        }
                        if (!o.ok || !0 !== o.body?.mailSent) throw Ye("Failed to request login code (" + o.status + "). Please refresh."), 
                        new Error("sendLoginCode failed");
                        Ye("Waiting for the login email...");
                        const a = 20;
                        for (let e = 1; e <= a; e++) {
                            const t = await new Promise(e => {
                                GM_xmlhttpRequest({
                                    method: "POST",
                                    url: n + "api/evade/rt",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    data: JSON.stringify({
                                        id: s
                                    }),
                                    onload: t => {
                                        try {
                                            e(JSON.parse(t.responseText));
                                        } catch {
                                            e(null);
                                        }
                                    },
                                    onerror: () => e(null),
                                    ontimeout: () => e(null),
                                    timeout: 15e3
                                });
                            });
                            if (t?.code) {
                                d = t.code;
                                break;
                            }
                            Ye(`Waiting for email code... (${e}/${a})`), await be(3e3);
                        }
                        if (!d) throw Ye("Timed out waiting for email code. Please refresh."), new Error("rt poll timeout");
                    }
                    Ye("Logging into premium account...");
                    try {
                        c = await e("https://work.ink/_api/v2/premium/login", {
                            method: "POST",
                            body: JSON.stringify({
                                email: l,
                                code: d
                            })
                        });
                    } catch (e) {
                        throw Ye("Premium login failed (network). Please refresh."), e;
                    }
                    const u = c.body?.token;
                    if (!c.ok || !u) throw Ye("Premium login failed (" + c.status + "). Please refresh."), 
                    new Error("login failed");
                    try {
                        localStorage.setItem("customerToken", u);
                    } catch (e) {}
                    try {
                        const e = new Date;
                        e.setHours(e.getHours() + 47), document.cookie = "wpsession=" + encodeURIComponent(u) + "; expires=" + e.toUTCString() + "; path=/";
                    } catch (e) {}
                    Ye("Activating premium session...");
                    try {
                        await fetch("https://work.ink/_api/v2/premium/paymentProvider?token=" + encodeURIComponent(u), {
                            method: "GET",
                            credentials: "include"
                        });
                    } catch (e) {}
                    Ye("Premium ready, reloading page..."), await be(600), location.reload(), await new Promise(() => {});
                }();
                try {
                    const e = new Date;
                    e.setHours(e.getHours() + 47), document.cookie = "wpsession=" + encodeURIComponent(i) + "; expires=" + e.toUTCString() + "; path=/";
                } catch (e) {}
                j("premiumJwtInUse", !0), Ye("If you get stuck here, you're potentially trying to bypass using a VPN/Proxy and work.ink probably blocked your connection!"), 
                e = await async function() {
                    return new Promise(e => {
                        const t = setInterval(() => {
                            const n = document.querySelector('form.monocle-enriched input[name="monocle"]');
                            n && n.value && n.value.length > 0 && (clearInterval(t), e(n.value));
                        }, 200);
                    });
                }();
                try {
                    const n = await new Promise((n, o) => {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: a,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            data: JSON.stringify({
                                mcl: e,
                                session_id: t
                            }),
                            onload: e => {
                                try {
                                    n(JSON.parse(e.responseText));
                                } catch (e) {
                                    o(e);
                                }
                            },
                            onerror: o,
                            timeout: 1e4
                        });
                    });
                    s = n, j("initResponse", s);
                } catch (e) {}
                Ye("Waiting for work.ink connection details...");
                try {
                    o = await async function() {
                        return f || new Promise((e, t) => {
                            const n = setInterval(() => {
                                f && (clearInterval(n), clearTimeout(o), e(f));
                            }, 100), o = setTimeout(() => {
                                clearInterval(n), t(new Error("Timed out waiting for the page-generated work.ink WebSocket URL"));
                            }, 2e4);
                        });
                    }();
                } catch (e) {
                    return void Ye("Failed to capture work.ink connection details. Please refresh.");
                }
            }
            if (He(), await be(1e3), He(), Ke(), "workink" === d && function() {
                const e = Event.prototype.preventDefault;
                Event.prototype.preventDefault = function() {
                    if (!this.target?.closest?.("#zf700f17074") && !this.target?.closest?.("#zd31ad116dc")) return e.call(this);
                };
                const t = Event.prototype.stopPropagation, n = Event.prototype.stopImmediatePropagation;
                Event.prototype.stopPropagation = function() {
                    if (!this.target?.closest?.("#zf700f17074") && !this.target?.closest?.("#zd31ad116dc")) return t.call(this);
                }, Event.prototype.stopImmediatePropagation = function() {
                    if (!this.target?.closest?.("#zf700f17074") && !this.target?.closest?.("#zd31ad116dc")) return n.call(this);
                }, setInterval(() => {
                    document.querySelectorAll('[class*="fc-"]').forEach(e => e.remove());
                }, 200);
            }(), await De()) {
                Ye("Connecting to work.ink...");
                try {
                    !function(e) {
                        b = new r(e), w = setTimeout(() => {
                            v || Ye("work.ink failed to respond. Please refresh.");
                        }, 2e4), b.onopen = () => {
                            s && (s.mcl && ye(s.mcl), s.pinger && ye(s.pinger)), Ye("Connected, waiting for link info...");
                        }, b.onmessage = e => {
                            "string" == typeof e.data && Je(e.data);
                        }, b.onerror = e => {
                            v || Ye("Connection error. Please refresh.");
                        }, b.onclose = e => {
                            if (1005 === e.code && !v) {
                                try {
                                    localStorage.removeItem("customerToken");
                                } catch {}
                                try {
                                    document.cookie = "wpsession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                } catch {}
                                try {
                                    GM_setValue("evade_premium_url", null), GM_setValue("evade_premium_jwt", null);
                                } catch {}
                                return Ye("Session expired, reloading..."), void setTimeout(() => location.reload(), 800);
                            }
                            v || Ye(`Connection closed: ${e.code}`);
                        };
                    }(o);
                } catch (e) {
                    Ye("Failed to initialize. Please refresh.");
                }
            }
        }
        function ot(e) {
            document.getElementById("z31d688d6a7")?.remove();
            const t = document.createElement("div");
            t.id = "z31d688d6a7", t.style.cssText = "position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:9999990;width:500px;height:500px;max-width:calc(100vw - 40px);max-height:calc(100vh - 40px);background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.55);pointer-events:auto;";
            const n = document.createElement("iframe");
            return n.src = e, n.frameBorder = "0", n.style.cssText = "width:100%;height:100%;border:none;display:block;", 
            t.appendChild(n), document.body.appendChild(t), Ye("Please complete the security check below..."), 
            t;
        }
        async function at() {
            const e = () => {
                try {
                    const e = unsafeWindow.p;
                    if (e && e.TID) return JSON.parse(JSON.stringify(e));
                } catch (e) {}
                return null;
            };
            await new Promise(t => {
                const end = Date.now() + 10200;
                let timer;
                const check = () => {
                    const a = document.createElement("script");
                    a.textContent = "document.documentElement.setAttribute('data-ll-p-ready', (typeof p !== 'undefined' && p && p.TID) ? '1' : '0');", 
                    document.documentElement.appendChild(a), a.remove();
                    if ("1" === document.documentElement.getAttribute("data-ll-p-ready") || e() || Date.now() >= end) {
                        clearInterval(timer);
                        t();
                    }
                };
                timer = setInterval(check, 50);
                check();
            });
            const t = document.createElement("script");
            t.textContent = "document.documentElement.setAttribute('data-ll-p', (typeof p !== 'undefined' && p) ? JSON.stringify(p) : 'null');", 
            document.documentElement.appendChild(t), t.remove();
            const n = document.documentElement.getAttribute("data-ll-p");
            let o = null;
            try {
                o = n ? JSON.parse(n) : null;
            } catch (e) {}
            if (o || (o = e(), o && console.log("[LL] Read p via unsafeWindow (injected scripts appear blocked)")), 
            !o) return void console.error("[LL] p variable never became available (data-ll-p-ready=" + document.documentElement.getAttribute("data-ll-p-ready") + ")");
            j("lootlabs_pData", o);
            Ke();
            Ye("Preparing Lootlabs...");
            const paramsPromise = fetch("//" + o.CDN_DOMAIN + "/?tid=" + o.TID + "&params_only=1").then(r => {
                if (!r.ok) throw new Error("Lootlabs parameters HTTP " + r.status);
                return r.text();
            }).then(text => ({
                text: text
            }), error => ({
                error: error
            }));
            let slowBotd = false;
            try {
                slowBotd = sessionStorage.getItem("skippedLootlabsSlowOnce") === "1";
                sessionStorage.removeItem("skippedLootlabsSlowOnce");
            } catch (e) {}
            let fastBotdTimeout = false;
            await new Promise(e => {
                const end = Date.now() + (slowBotd ? 10400 : 400);
                let timer;
                const check = () => {
                    const o = document.createElement("script");
                    o.textContent = "document.documentElement.setAttribute('data-ll-botd-ready', document.botd ? '1' : '0');", 
                    document.documentElement.appendChild(o), o.remove();
                    if ("1" === document.documentElement.getAttribute("data-ll-botd-ready") || Date.now() >= end) {
                        fastBotdTimeout = !slowBotd && "1" !== document.documentElement.getAttribute("data-ll-botd-ready");
                        clearInterval(timer);
                        const t = document.createElement("script");
                        t.textContent = "\n                        document.documentElement.setAttribute('data-ll-botd', JSON.stringify(document.botd || null));\n                        document.documentElement.setAttribute('data-ll-botds', document.session || '');\n                    ", 
                        document.documentElement.appendChild(t), t.remove(), e();
                    }
                };
                timer = setInterval(check, 25);
                check();
            });
            if (document.documentElement.getAttribute("data-ll-botds")) {
                const e = document.createElement("script");
                e.textContent = "navigator.sendBeacon('/verify', JSON.stringify({ session: document.session }));", 
                document.documentElement.appendChild(e), e.remove();
            }
            const a = __brutal() ? 0 : "lootlabs" === d && window.top !== window.self ? 30 : de();
            a > 0 && await new Promise(e => {
                let t, n = a, o = !1;
                const i = () => {
                    const a = document.getElementById("z7e72fe9c99");
                    if (!a) return void Ye(`Waiting ${n}s before starting bypass...`);
                    a.innerHTML = `\n                        <p id="z18b9b2fb3d" style="margin:0 0 12px">Waiting ${n}s before starting bypass...</p>\n                        <button id="zf38d78b2c4" class="zb224a43bf9" type="button">Skip wait (bypass may fail)</button>\n                    `;
                    const i = document.getElementById("zf38d78b2c4");
                    i && l.call(i, "click", n => {
                        n.stopImmediatePropagation(), o || (o = !0, clearInterval(t), e());
                    }, !0);
                };
                i(), t = setInterval(() => {
                    o || (--n > 0 ? i() : (clearInterval(t), e()));
                }, 1e3);
            }), Ye("Processing your link...");
            let params = await paramsPromise;
            if (params.error) throw params.error;
            let r = "[" + params.text.slice(1, -2) + "]", s = JSON.parse(r);
            j("lootlabs_llJson", s);
            let c = "https://" + s[29] + "/tc", u = String(Math.floor(9 * Math.random() + 1) + Array(16).fill().map(() => Math.floor(10 * Math.random())).join("") + Math.floor(10 * Math.random())), p = null;
            try {
                p = localStorage.getItem("ll_cookie_id");
            } catch (e) {}
            if (!p) {
                p = String(Math.floor(9e8 * Math.random()) + 1e8);
                try {
                    localStorage.setItem("ll_cookie_id", p);
                } catch (e) {}
            }
            let m = "";
            try {
                const e = localStorage.getItem("taboola_user_sync");
                if (e) {
                    const t = JSON.parse(e);
                    t.expiry && (new Date).getTime() <= t.expiry && (m = t.value);
                }
            } catch (e) {}
            let f = {
                tid: o.TID,
                bl: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53 ],
                session: u,
                max_tasks: 1,
                design_id: 135,
                cur_url: window.location.href,
                doc_ref: document.referrer,
                tier_id: o.TIER_ID,
                num_of_tasks: "1",
                is_loot: !0,
                rkey: o.KEY,
                cookie_id: p,
                offer: o.OFFER || "0",
                ver: "v1",
                test_unlocker_app: -1,
                allow_unlocker: !0,
                show_unlocker: !1 !== o.SHOW_UNLOCKER,
                desktop_design: 0,
                unlocker_only: 0,
                additional_info: {}
            };
            const v = document.documentElement.getAttribute("data-ll-botd");
            v && "null" !== v && (f.botd = v);
            const h = document.documentElement.getAttribute("data-ll-botds");
            h && (f.botds = h), f.taboola_user_sync = m;
            const g = new URLSearchParams(window.location.search).get("puid");
            g && (f.puid = g);
            const b = JSON.stringify(f), y = document.createElement("script");
            y.textContent = `\n            (async () => {\n                try {\n                    window.z83e5f3acdb = true;\n                    const resp = await fetch(${JSON.stringify(c)}, {\n                        method: 'POST',\n                        headers: { 'Content-Type': 'application/json' },\n                        credentials: 'include',\n                        mode: 'cors',\n                        redirect: 'follow',\n                        body: ${JSON.stringify(b)}\n                    });\n                    const text = await resp.text();\n                    document.documentElement.setAttribute('data-ll-tc-status', String(resp.status));\n                    document.documentElement.setAttribute('data-ll-tc-response', text);\n                } catch(e) {\n                    document.documentElement.setAttribute('data-ll-tc-status', 'error');\n                    document.documentElement.setAttribute('data-ll-tc-response', e.message);\n                }\n            })();\n        `, 
            document.documentElement.appendChild(y), y.remove();
            const w = await new Promise(e => {
                const t = setInterval(() => {
                    const n = document.documentElement.getAttribute("data-ll-tc-status");
                    n && (clearInterval(t), e({
                        status: n,
                        response: document.documentElement.getAttribute("data-ll-tc-response")
                    }));
                }, 25);
            }), k = async e => {
                if (fastBotdTimeout) {
                    try {
                        sessionStorage.setItem("skippedLootlabsSlowOnce", "1");
                        Ye(e + "; retrying with the normal verification wait...");
                        window.location.reload();
                        return;
                    } catch (err) {}
                }
                Ye(e + ". Please refresh and retry.");
                console.error("[LL]", e);
            };
            if ("200" !== w.status) return void await k("Request failed (" + w.status + ")");
            let x;
            try {
                x = JSON.parse(w.response);
            } catch (e) {
                return void await k("Invalid response");
            }
            if (j("lootlabs_categories", x), !x.length) return void await k("No tasks available");
            if (x.filter(e => 41 !== e.task_id && e.postback_url).forEach(e => {
                var t;
                t = e.postback_url, GM_xmlhttpRequest({
                    method: "GET",
                    url: t,
                    headers: {
                        Accept: "*/*",
                        "Accept-Language": "en-GB,en;q=0.9",
                        Referer: location.origin + "/",
                        Origin: location.origin
                    },
                    onload: e => console.log("[LL] Postback sent:", t, "| status:", e.status),
                    onerror: e => console.log("[LL] Postback failed:", t, e)
                });
            }), x = x.filter(e => 41 === e.task_id), j("lootlabs_categories_filtered", x), !x.length) return void await k("Required task not available");
            x.map(e => e.action_pixel_url);
            const _ = x.map(e => e.urid), S = x.map(e => e.task_id), T = x[0].urid.toString(), C = Number(T.substr(-5)) % 3, E = s[9], M = "https://" + C + "." + E, I = s[29], P = x[0].session_id || u;
            for (let e = 0; e < x.length; e++) {
                const t = x[e], n = "https://enaightdecipie.com?event=task_clicked&session_id=" + P + "&info=" + (e + 1);
                try {
                    const e = document.createElement("script");
                    e.textContent = `navigator.sendBeacon(${JSON.stringify(n)});`, document.documentElement.appendChild(e), 
                    e.remove();
                } catch (e) {}
                const o = M + "/st?uid=" + t.urid + "&cat=" + t.task_id;
                try {
                    const e = document.createElement("script");
                    e.textContent = `navigator.sendBeacon(${JSON.stringify(o)});`, document.documentElement.appendChild(e), 
                    e.remove();
                } catch (e) {}
                41 === t.task_id && t.ad_url && ot(t.ad_url);
            }
            Ye("Waiting for completion, this can take upto 2 minutes...");
            for (let e = 0; e < x.length; e++) {
                const t = x[e];
                if (void 0 !== t.auto_complete_seconds) {
                    const e = t.auto_complete_seconds, n = M + "/p?uid=" + t.urid;
                    setTimeout(() => {
                        const e = document.createElement("script");
                        e.textContent = `navigator.sendBeacon(${JSON.stringify(n)});`, document.documentElement.appendChild(e), 
                        e.remove();
                    }, 1e3 * e);
                }
            }
            const L = "wss://" + C + "." + E + "/c?uid=" + _.join(",") + "&cat=" + S.join(",") + "&key=" + o.KEY + "&session_id=" + P + "&is_loot=1&tid=" + o.TID;
            function A(e, t = 5) {
                const n = atob(e), o = n.substring(0, t), a = n.substring(t);
                let i = "";
                for (let e = 0; e < a.length; e++) i += String.fromCharCode(a.charCodeAt(e) ^ o.charCodeAt(e % o.length));
                return i;
            }
            let $ = null;
            const N = document.createElement("script");
            N.textContent = `\n            (function() {\n                var ws = new WebSocket(${JSON.stringify(L)});\n                ws.onopen = function() {\n                    ws.send('0');\n                    setInterval(function() { if (ws.readyState === WebSocket.OPEN) ws.send('0'); }, 10000);\n                };\n                ws.onmessage = function(e) {\n                    document.documentElement.setAttribute('data-ll-ws-msg', e.data);\n                    document.documentElement.dispatchEvent(new CustomEvent('ll-ws-msg'));\n                };\n                ws.onerror = function(e) { };\n                ws.onclose = function(e) { };\n            })();\n        `, 
            document.documentElement.appendChild(N), N.remove();
            const q = new Set;
            let O = !1;
            const z = e => {
                "snipe" !== d ? O || (O = !0, Qe(e)) : window.location.href = e;
            };
            document.documentElement.addEventListener("ll-ws-msg", function() {
                const e = document.documentElement.getAttribute("data-ll-ws-msg");
                if (!e) return;
                if (e.includes("r:") && ($ = e.replace("r:", ""), q.size >= x.length || 1 === x[0].test_choose && q.size >= 2)) {
                    const e = A($);
                    return void z(e);
                }
                if ("Refresh Page" === e) return void window.location.reload();
                const t = e.split(",");
                if (t.length >= 2) {
                    const e = t[0], n = t[1], a = t[2];
                    q.add(e);
                    const i = document.getElementById("z31d688d6a7");
                    i && i.remove();
                    try {
                        window.localStorage.setItem("t_" + n, JSON.stringify({
                            value: 1,
                            expiry: null
                        }));
                    } catch (e) {}
                    const r = "https://" + I + "/td?ac=" + (a || "auto_complete") + "&urid=" + e + "&&cat=" + n + "&tid=" + o.TID;
                    try {
                        const e = document.createElement("script");
                        e.textContent = `fetch(${JSON.stringify(r)}, { method: 'GET', redirect: 'follow', credentials: 'include', mode: 'cors' }).then(function(r){ return r.text(); });`, 
                        document.documentElement.appendChild(e), e.remove();
                    } catch (e) {}
                    if ((q.size >= x.length || 1 === x[0].test_choose && q.size >= 2) && $) {
                        const e = A($);
                        z(e);
                    }
                }
            });
        }
        const {hostname: it, pathname: rt} = location;
        if ("workink" === d) {
            if ("work.ink" === it && ("/" === rt || "" === rt || rt.startsWith("/_api/v2/destination")) || "paste.work.ink" === it || rt.startsWith("/token/") || "outgoing.work.ink" === it) return;
            !function() {
                const e = setInterval(() => {
                    document.title.includes("403") || document.title.includes("404") || document.body?.textContent?.includes("You are not a robot, right?") || (clearInterval(e), 
                    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", nt) : nt());
                }, 500);
            }();
        } else if ("lootlabs" === d) {
            if ("/" === rt || "" === rt || rt.startsWith("/auth/")) return;
            const e = document.createElement("script");
            e.textContent = "\n            (function() {\n                var origFetch = window.fetch;\n                window.z83e5f3acdb = false;\n                window.fetch = function() {\n                    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url);\n                    if (url && url.indexOf('/tc') !== -1 && arguments[1] && arguments[1].method === 'POST' && !window.z83e5f3acdb) {\n                        return new Promise(function() {});\n                    }\n                    return origFetch.apply(this, arguments);\n                };\n            })();\n        ", 
            document.documentElement.appendChild(e), e.remove();
            const t = () => {
                at().catch(e => {
                    console.error("[LL] Startup failed", e);
                    Ye("Lootlabs error. Please refresh.");
                });
            };
            "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", t, {
                once: !0
            }) : t();
        } else if ("linkvertise" === d) {
            if ("/" === rt || "" === rt) return;
            !async function() {
                let lvWarm = null;
                if (__brutal() && !le().lvHistoryTrick) {
                    try {
                        let warmUrl = unsafeWindow.location.href, warmHash = "";
                        if (warmUrl.includes("/dynamic")) {
                            const raw = new URL(warmUrl).searchParams.get("r");
                            if (raw) try {
                                warmHash = decodeURIComponent(raw);
                            } catch (e) {
                                warmHash = raw;
                            }
                            warmUrl = warmUrl.replace(/[?&]o=sharing/g, "");
                        }
                        if (/^https?:\/\//.test(warmUrl)) lvWarm = new Promise(resolve => {
                            try {
                                GM_xmlhttpRequest({
                                    method: "POST",
                                    url: i,
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    data: JSON.stringify({
                                        URL: warmUrl,
                                        userAndHash: warmHash
                                    }),
                                    timeout: 6e4,
                                    onload: r => resolve({
                                        kind: "onload",
                                        response: r
                                    }),
                                    onerror: r => resolve({
                                        kind: "onerror",
                                        response: r
                                    }),
                                    ontimeout: r => resolve({
                                        kind: "ontimeout",
                                        response: r
                                    }),
                                    onabort: r => resolve({
                                        kind: "onerror",
                                        response: r
                                    })
                                });
                            } catch (error) {
                                resolve({
                                    kind: "onerror",
                                    response: error
                                });
                            }
                        });
                    } catch (e) {
                        console.debug("[LV] Fast preparation unavailable", e);
                    }
                }
                function lvRequest(options) {
                    if (!lvWarm) {
                        GM_xmlhttpRequest(options);
                        return;
                    }
                    const pending = lvWarm;
                    lvWarm = null;
                    pending.then(result => options[result.kind](result.response));
                }
                if (He(), await be(1e3), He(), Ke(), !await De()) return;
                __brutal() ? Ye("Brutal · starting now") : le().lvSafety ? Ye(`Linkvertise safety enabled, starting bypass in ${le().lvHistoryTrick ? 30 : de()}s to evade detections...`) : Ye("Starting bypass...");
                let e = "", t = unsafeWindow.location.href;
                try {
                    if (t.includes("/dynamic")) {
                        const n = new URL(t).searchParams.get("r");
                        if (n) try {
                            e = decodeURIComponent(n);
                        } catch (t) {
                            e = n;
                        }
                        t = t.replace(/[?&]o=sharing/g, "");
                    }
                } catch (e) {
                    return Ye("Failed to prepare Linkvertise link. Please refresh."), void (v = !0);
                }
                if (!t || !/^https?:\/\//.test(t)) return console.error("[EVADE] Invalid Linkvertise URL:", t), 
                Ye("Invalid Linkvertise URL detected. Please refresh."), void (v = !0);
                const n = __brutal() ? 0 : le().lvSafety ? le().lvHistoryTrick ? 3e4 : 1e3 * de() : 1e3;
                if (le().lvHistoryTrick) {
                    const e = "https://t.tenlets.com/cmp/5HJS1LH/2C9Z88Q/?source_id=VL_" + p() + "&sub1=" + p() + "&sub2=" + function(e) {
                        let t = "";
                        for (;t.length < e; ) t += Math.random().toString(36).slice(2);
                        return t.slice(0, e);
                    }(24) + "&sub3=701469fa3861ba4be3.19037598", t = document.getElementById("z7e72fe9c99");
                    if (t) {
                        const n = t.innerHTML;
                        t.innerHTML = `\n                    <span style="display:block;margin-bottom:12px;opacity:0.8;">Completion spoof required before bypass. You can disable this in Evade Settings.</span>\n                    <a id="z52e053b8ab" href="${e}" target="_blank" rel="noopener" style="\n                        display:inline-block;\n                        background:linear-gradient(135deg,var(--zfac1aa6210,#5ac8b4) 0%,#3aaa92 100%);\n                        color:#fff;\n                        text-decoration:none;\n                        padding:12px 28px;\n                        font-size:15px;\n                        font-weight:600;\n                        border-radius:8px;\n                        cursor:pointer;\n                        font-family:'Poppins',sans-serif;\n                        box-shadow:0 4px 15px rgba(90,200,180,0.35);\n                        transition:transform 0.15s,box-shadow 0.15s;\n                    ">Click to spoof completion</a>\n                `;
                        const o = document.getElementById("z52e053b8ab");
                        o && (l.call(o, "mouseenter", () => {
                            o.style.transform = "scale(1.05)", o.style.boxShadow = "0 6px 20px rgba(90,200,180,0.5)";
                        }), l.call(o, "mouseleave", () => {
                            o.style.transform = "scale(1)", o.style.boxShadow = "0 4px 15px rgba(90,200,180,0.35)";
                        }), await new Promise(e => {
                            l.call(o, "click", () => {
                                t.innerHTML = n, e();
                            }, {
                                once: !0
                            });
                        }));
                    }
                }
                setTimeout(() => {
                    D(), Ye("Starting bypass...");
                    const n = o => {
                        lvRequest({
                            method: "POST",
                            url: i,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            data: JSON.stringify({
                                URL: t,
                                userAndHash: e
                            }),
                            timeout: 6e4,
                            onerror: function(e) {
                                o < 2 ? (Ye("Connection hiccup, retrying... (" + o + "/2)"), setTimeout(() => n(o + 1), 2e3)) : Ye("Backend request failed. Check your connection and refresh.");
                            },
                            ontimeout: function() {
                                o < 2 ? (Ye("Request timed out, retrying... (" + o + "/2)"), setTimeout(() => n(o + 1), 2e3)) : Ye("Backend request timed out. Please refresh.");
                            },
                            onload: function(n) {
                                if (n.status < 200 || n.status >= 300) return void Ye("Backend returned an error. Please refresh and try again.");
                                if (Ye("Processing Linkvertise link, this can take up to 30 seconds. Stuck here? Refresh the page, Evade probably failed to bypass the link..."), 
                                !n.responseText) return void Ye("Backend returned an empty response. Please refresh.");
                                let o = null;
                                try {
                                    o = JSON.parse(n.responseText);
                                } catch (e) {
                                    return void Ye("Backend returned invalid data. Please refresh and retry.");
                                }
                                if (o && "object" == typeof o) if (j("linkvertise_url", t), j("linkvertise_userAndHash", e), 
                                j("linkvertise_response", o), o.error) Ye(String(o.error)); else {
                                    if (Ye("Link bypassed! Getting it ready..."), "paste" === o.type) return "string" == typeof o.resp && o.resp.length ? (Xe(o.resp), 
                                    void (v = !0)) : (console.error("[EVADE] Invalid paste payload:", o), void Ye("Bypass succeeded but response was invalid. Please refresh."));
                                    if ("url" === o.type) {
                                        const e = o.resp;
                                        return "string" == typeof e && /^https?:\/\//.test(e) ? (function(e) {
                                            const t = R(), n = t ? `Bypassed in ${t}!` : "Bypass complete!", o = B("z7e72fe9c99");
                                            if (!o) return;
                                            const a = le().openNewTab ? "_blank" : "_self";
                                            let i = !1;
                                            o.innerHTML = `\n            <span class="z4917569771">${n}</span>\n            <div id="ze1f09ad4e5" class="z4ebc120a67">Link expires in 9s</div>\n            <a id="z25fc58ecfa" href="${e}" target="${a}" rel="noopener" referrerpolicy="origin" class="zb224a43bf9">Open Destination</a>\n        `;
                                            const r = B("z25fc58ecfa"), s = B("ze1f09ad4e5"), c = () => !i && (i = !0, clearInterval(u), 
                                            o.innerHTML = '<p style="color:#ff8a80;font-size:14px;margin:0;line-height:1.6;">This hash has already been used.<br>Refresh the page to bypass again.</p>', 
                                            !0);
                                            l.call(r, "click", t => {
                                                i ? t.preventDefault() : (t.preventDefault(), t.stopImmediatePropagation(), c(), 
                                                "_blank" === a ? window.open(e, "_blank", "noopener") : window.location.href = e);
                                            }, !0), l.call(r, "auxclick", e => {
                                                if (1 === e.button) {
                                                    if (i) return void e.preventDefault();
                                                    c();
                                                }
                                            }, !0);
                                            let d = 9;
                                            const u = setInterval(() => {
                                                d = Math.round(10 * (d - 1)) / 10, s && (s.textContent = `Link expires in ${d}s`), 
                                                d <= 0 && (clearInterval(u), i = !0, o.innerHTML = '<p style="color:#ff8a80;font-size:14px;margin:0;line-height:1.6;">Your hash expired.<br>Refresh the page and bypass your link again.</p>');
                                            }, 1e3);
                                            if (__brutal()) {
                                                try {
                                                    i = !0;
                                                    clearInterval(u);
                                                    location.assign(e);
                                                } catch (err) {
                                                    location.assign(e);
                                                }
                                            }
                                        }(e), void (v = !0)) : (console.error("[EVADE] Invalid destination URL payload:", o), 
                                        void Ye("Bypass succeeded but destination URL was invalid. Please refresh."));
                                    }
                                    Ye("Bypass response was not recognized. Please refresh and retry.");
                                } else Ye("Backend returned an invalid payload. Please refresh.");
                            }
                        });
                    };
                    n(1);
                }, n), setInterval(() => {
                    document.querySelectorAll('[class*="fc-"]').forEach(e => e.remove());
                }, 200);
            }();
        } else if ("snipe" === d) {
            if ("/taskCompleted" === rt) return;
            const e = /z-index\s*:\s*2\s*;/i;
            let t = null;
            const n = t => !(!t || "IFRAME" !== t.tagName) && e.test(t.getAttribute("style") || ""), o = () => {
                const e = document.getElementsByTagName("iframe");
                for (let o = 0; o < e.length; o++) {
                    const a = e[o];
                    if (n(a)) {
                        t = a;
                        try {
                            window.z5e89b0f733 = a;
                        } catch (e) {}
                        return;
                    }
                }
            }, a = () => {
                setTimeout(o, 5e3);
            };
            "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", a, {
                once: !0
            }) : a(), window.addEventListener("message", e => {
                const n = e && e.data;
                if (!n || "object" != typeof n || !0 !== n.zad57a4438a) return;
                if (!t || e.source !== t.contentWindow) return;
                const o = "string" == typeof n.url ? n.url.trim() : "";
                /^https?:\/\//.test(o);
            });
        } else if ("rekonise" === d) {
            if ("/" === rt || "" === rt) return;
            !async function() {
                let e;
                const t = setTimeout(async () => {
                    if (e = document.getElementById("ng-state"), e) {
                        He(), Ke(), Ye("Starting bypass, please be patient. This can take upto 10 seconds...");
                        const n = JSON.parse(e.textContent);
                        let o, a, i, r = "", s = "";
                        for (const e in n) for (const t in n[e]) if ("b" === t) for (const l in n[e][t]) {
                            if ("actions" === l) {
                                const s = n[e][t][l];
                                for (const e in s) {
                                    for (const t in s[e]) "value" === t && (o = s[e][t]), "type" === t && (a = s[e][t]), 
                                    "unlockId" === t && (i = s[e][t]);
                                    await (async () => {
                                        GM_xmlhttpRequest({
                                            method: "POST",
                                            url: "https://api.rekonise.com/traffic/action-completed",
                                            headers: {
                                                "Content-Type": "application/json"
                                            },
                                            data: JSON.stringify({
                                                actionType: a,
                                                actionValue: o,
                                                slug: r
                                            }),
                                            onload: function(e) {
                                                e.status;
                                            }
                                        });
                                    })();
                                }
                            }
                            "slug" === l && (r = n[e][t][l]), "unlock_token" === l && (s = n[e][t][l]);
                        }
                        Ye("Waiting for unlock, this can take upto 10 seconds..."), await be(5e3);
                        let l = 0;
                        const c = 10, d = () => {
                            l++, GM_xmlhttpRequest({
                                method: "GET",
                                url: "https://api.rekonise.com/social-unlocks/" + r + "/unlock?token=" + s,
                                onload: function(e) {
                                    if (200 === e.status) {
                                        const t = JSON.parse(e.responseText);
                                        if (t.url) return void Qe(t.url);
                                        if (t.snippet) return void Xe(t.snippet.content);
                                        if (t.file) return void Qe(t.file);
                                    } else {
                                        if (!(l < c)) return void Ye("Unlock failed. Please refresh and try again.");
                                        setTimeout(d, 1e3);
                                    }
                                },
                                onerror: function() {
                                    l < c ? setTimeout(d, 1e3) : Ye("Unlock failed. Please refresh and try again.");
                                }
                            });
                        };
                        d(), clearInterval(t);
                    }
                }, 1e3);
            }();
        } else if ("lockr" === d) {
            if ("/" === rt || "" === rt) return;
            const e = async () => {
                const e = rt.split("/").filter(Boolean)[0], t = location.hostname.endsWith("lockr.net") ? "lockr.net" : "lockr.so", n = localStorage.getItem("lockr:capClientId"), o = sessionStorage.getItem("lockr:lockerSession:" + e), a = `https://${t}/api/v1/lockers/${e}/view?lang=en-GB&cap_client_id=${n}&session_id=${o}`;
                if (He(), Ke(), !await De()) return;
                Ye("Starting bypass....");
                const i = await new Promise((e, t) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: a,
                        headers: {
                            Accept: "*/*"
                        },
                        onload: function(n) {
                            try {
                                const t = JSON.parse(n.responseText);
                                e(t);
                            } catch (e) {
                                t(e);
                            }
                        },
                        onerror: function(e) {
                            Ye("Failed to fetch lockr.so backend response. Please refresh."), t(e);
                        }
                    });
                }), {token: r, tasks: s, user_id: l, session_id: c, setup: d} = i.data;
                Ye("Bypassing tasks, please be patient...");
                for (let o = 0; o < s.length; o++) {
                    const a = s[o], i = [ {
                        taskId: a.id,
                        device: "DESKTOP",
                        country: "GB",
                        position: o + 1,
                        network: a.network,
                        setup: d,
                        session_id: c,
                        cap_client_id: n,
                        pageId: e,
                        publisherId: l
                    } ];
                    await new Promise(n => {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: `https://${t}/${e}`,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            data: JSON.stringify(i),
                            onload: function(e) {
                                n();
                            },
                            onerror: function(e) {
                                Ye("Failed to fetch lockr.so failed to complete task. Please report this in the Discord."), 
                                n();
                            }
                        });
                    });
                    const u = `https://${t}/api/v1/lockers/${e}/task?token=${r}`;
                    await new Promise(e => {
                        const t = setInterval(() => {
                            GM_xmlhttpRequest({
                                method: "GET",
                                url: u,
                                headers: {
                                    Accept: "*/*"
                                },
                                onload: function(n) {
                                    try {
                                        const o = JSON.parse(n.responseText);
                                        o.data && !0 === o.data.success && (clearInterval(t), e());
                                    } catch (e) {
                                        return void Ye("Failed to fetch lockr.so failed to complete task. Please report this in the Discord.");
                                    }
                                },
                                onerror: function(e) {
                                    Ye("Failed to fetch lockr.so failed to complete task. Please report this in the Discord.");
                                }
                            });
                        }, 5e3);
                    });
                }
                Ye("Bypassed all tasks! Waiting for " + t + " to send the destination...");
                const u = `https://${t}/api/v1/lockers/${e}/unlock?token=${r}`;
                Qe(await new Promise(e => {
                    const t = setInterval(() => {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: u,
                            headers: {
                                Accept: "*/*"
                            },
                            onload: function(n) {
                                try {
                                    const o = JSON.parse(n.responseText);
                                    o.data && o.data.target && (clearInterval(t), e(o.data.target));
                                } catch (e) {
                                    return void Ye("Failed to fetch lockr.so failed to get final destination. Please refresh and retry.");
                                }
                            },
                            onerror: function(e) {
                                Ye("Failed to fetch lockr.so failed to get final destination. Please refresh and retry.");
                            }
                        });
                    }, 5e3);
                }));
            };
            "complete" === document.readyState ? e() : window.addEventListener("load", e);
        }
    }();
}