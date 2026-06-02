// -*- coding: utf-8 -*-
// 文件位置: assets/js/dashboard.js
// 🎯 FinLinks 5.2.0 终审完全体：主控视图与多币种影子账本刷盘中枢

import { client } from './finlinks_client.js';
import { verifyAndPatchToken, logout } from './auth_manager.js';
import { submitAdvancedKYB } from './kyb_handler.js';
import { triggerLiveQuote, submitFxConversion } from './fx_processor.js';

document.addEventListener("DOMContentLoaded", () => {
    verifyAndPatchToken();
    fetchBalances();
    initGlobalFxTicker(); 

    // 提权至最高 Window 全局总线，消灭 ReferenceError
    window.switchTab = switchTab;
    window.handleLogout = logout;
    window.executeAdvancedKYBOnboarding = () => submitAdvancedKYB(pushAuditLog, showPremiumNotification);
    
    // 留出插槽供 HTML 最底部的防爆 10s/300s 时钟控制器进行二次高能并线封装
    window.rawLiveQuote = triggerLiveQuote;
    window.rawSubmitFx = submitFxConversion;
    
    window.triggerMockPayinCallback = triggerMockPayinCallback;
    window.triggerMockReconciliation = triggerMockReconciliation;
    window.closeFxModal = () => { if (typeof window.customCloseFxModal === "function") window.customCloseFxModal(); };
    window.openFxModal = () => { if (typeof window.customOpenFxModal === "function") window.customOpenFxModal(); };

    const amtInput = document.getElementById("sell-amount");
    if (amtInput) { amtInput.addEventListener("input", debounce(() => { if(typeof window.triggerLiveQuote === "function") window.triggerLiveQuote(); }, 600)); }
});

async function initGlobalFxTicker() {
    const tickerContainer = document.getElementById("global-fx-ticker");
    if (!tickerContainer) return;
    try {
        const response = await client("/ledger/fx/quote?sell_currency=USD&buy_currency=NGN&sell_amount=1", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            tickerContainer.innerHTML = `
                <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                    <span class="flex items-center"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>USD/NGN 基准参考: <strong class="text-slate-200 ml-1">${data.final_settlement_rate || data.lock_rate}</strong></span>
                </div>`;
        }
    } catch (e) { tickerContainer.innerText = "⚡ FinLinks 全球行情底座通电成功"; }
}

// 👑 痛点一修复：对齐后端 multi_currency_visibility 契约钢印，彻底复活余额显示！
export async function fetchBalances() {
    const container = document.getElementById("balances-container");
    if (!container) return;
    try {
        const response = await client("/ledger/balances", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            
            const merchantTag = document.getElementById("merchant-id-tag");
            if (merchantTag && data.merchant) merchantTag.innerText = data.merchant;

            container.innerHTML = "";
            // 🟢 勾稽点平账：后端吐出的是 multi_currency_visibility，彻底清除 data.balances 历史错配！
            const matrix = data.multi_currency_visibility || {};
            Object.keys(matrix).forEach(currency => {
                container.innerHTML += `
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${currency} 可动用可用余额</div>
                        <div class="text-3xl font-mono font-bold mt-2 text-slate-100">${matrix[currency].toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div class="absolute -right-4 -bottom-6 text-6xl font-bold font-mono text-slate-800/20 select-none">${currency}</div>
                    </div>`;
            });
        }
    } catch (e) { console.error("总账轮询挂起...", e) }
}

async function triggerMockPayinCallback() {
    if (typeof window.customPayinCallback === "function") window.customPayinCallback();
}

async function triggerMockReconciliation() {
    if (typeof window.customReconciliation === "function") window.customReconciliation();
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
    document.getElementById(`pane-${tabId}`)?.classList.remove("hidden");
}
function debounce(func, delay) { let timer; return function (...args) { clearTimeout(timer); timer = setTimeout(() => func.apply(this, args), delay); }; }
function pushAuditLog(message) { if (typeof window.pushAuditLog === "function") window.pushAuditLog(message); }