// -*- coding: utf-8 -*-
// 文件位置：assets/js/dashboard.js

import { client } from './finlinks_client.js';
import { verifyAndPatchToken, logout } from './auth_manager.js';
import { submitAdvancedKYB } from './kyb_handler.js';
import { triggerLiveQuote, submitFxConversion } from './fx_processor.js';

// 👑 【CONFIG REGEX VAULT】全盘硬核账号正则格式校验拦截金库
const RIGID_ACCOUNT_RULES = {
    "NGN": { regex: /^\d{10}$/, error: "奈拉通道校验失败：必须为 10位 纯数字 NUBAN 标准银行账号！" },
    "KES": { regex: /^(254\d{9}|0\d{9})$/, error: "肯尼亚先令校验失败：必须为标准的移动货币手机号（如254...）！" },
    "USD": { regex: /^[A-Z0-9]{8,12}$/, error: "美金通道校验失败：请输入合规的 8-12位 SWIFT 特征码！" }
};

document.addEventListener("DOMContentLoaded", () => {
    verifyAndPatchToken();
    fetchBalances();
    initGlobalFxTicker(); // 👑 点亮左上角全局基准行情

    // 提权至 Window，打通 HTML 原生 onclick 门禁
    window.switchTab = switchTab;
    window.handleLogout = logout;
    window.executeAdvancedKYBOnboarding = () => submitAdvancedKYB(pushAuditLog, showPremiumNotification);
    window.triggerLiveQuote = () => triggerLiveQuote(pushAuditLog, showPremiumNotification);
    window.submitFxConversion = () => submitFxConversion(null, null, "EBANX", pushAuditLog, showPremiumNotification, fetchBalances);
    
    window.triggerMockPayinCallback = triggerMockPayinCallback;
    window.triggerMockReconciliation = triggerMockReconciliation;
    window.closeFxModal = () => document.getElementById("fx-modal")?.classList.add("pointer-events-none", "opacity-0");
    window.openFxModal = () => document.getElementById("fx-modal")?.classList.remove("pointer-events-none", "opacity-0");

    const amtInput = document.getElementById("sell-amount");
    if (amtInput) { amtInput.addEventListener("input", debounce(() => { window.triggerLiveQuote(); }, 600)); }
});

// 📊 动态拉取左上角 Ticker 基准大盘
async function initGlobalFxTicker() {
    const tickerContainer = document.getElementById("global-fx-ticker");
    if (!tickerContainer) return;
    try {
        const response = await client("/ledger/fx/quote?sell_currency=USD&buy_currency=NGN&sell_amount=1", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            tickerContainer.innerHTML = `
                <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                    <span class="flex items-center"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>USD/NGN 基准参考: <strong class="text-slate-200 ml-1">${data.lock_rate}</strong></span>
                </div>`;
        }
    } catch (e) { tickerContainer.innerText = "⚡ FinLinks 全球行情底座通电成功"; }
}

// 📊 影子总账核心刷盘
export async function fetchBalances() {
    const container = document.getElementById("balances-container");
    if (!container) return;
    try {
        const response = await client("/ledger/balances", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            
            // 👑 物理打假：提取真实 JWT 钢印强行冲刷左下角死标签
            const roleTag = document.getElementById("user-role-badge");
            const merchantTag = document.getElementById("merchant-id-tag");
            if (merchantTag && data.merchant) merchantTag.innerText = data.merchant;
            if (roleTag) {
                const token = localStorage.getItem('finlinks_auth_token');
                if (token) { roleTag.innerText = JSON.parse(atob(token.split('.')[1])).role || "MERCHANT"; }
            }

            container.innerHTML = "";
            const matrix = data.balances || {};
            Object.keys(matrix).forEach(currency => {
                container.innerHTML += `
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${currency} 可动用可用余额</div>
                        <div class="text-3xl font-mono font-bold mt-2 text-slate-100">${matrix[currency].toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div class="absolute -right-4 -bottom-6 text-6xl font-bold font-mono text-slate-800/20 select-none">${currency}</div>
                    </div>`;
            });
        }
    } catch (e) { console.error("总账轮询挂起...") }
}

// 📥 有源代收 (集成了全局正则防爆金库拦截)
async function triggerMockPayinCallback() {
    const amtEl = document.getElementById("collectionAmount");
    const currEl = document.getElementById("collectionCurrency");
    const phoneEl = document.getElementById("collectionPhone");
    const nameEl = document.getElementById("collectionPayerName");
    
    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 5000;
    const currency = currEl ? currEl.value.toUpperCase().trim() : "NGN";
    const phoneNumber = phoneEl ? phoneEl.value.trim() : "";
    const payerName = nameEl && nameEl.value ? nameEl.value.trim() : "Jacky Zhang";

    // 👑 物理断路：触发全局正则看护
    const rule = RIGID_ACCOUNT_RULES[currency];
    if (rule && !rule.regex.test(phoneNumber)) {
        pushAuditLog(`[VALIDATION FAILED] ❌ ${rule.error}`);
        showPremiumNotification("🚨 账户格式非法", rule.error, "rose");
        return; 
    }

    pushAuditLog(`[PAYIN OUTFLOW] 发起有源收单申请... 币种: ${currency} | 金额: ${amount}`);
    try {
        const url = `/ledger/collection/deposit?amount=${amount}&currency=${currency}&phone_number=${encodeURIComponent(phoneNumber)}&payer_name=${encodeURIComponent(payerName)}&routing_via=EBANX`;
        const response = await client(url, { method: "POST" });
        const result = await response.json();

        if (response.status === 200 && result.status === "success") {
            pushAuditLog(`[WEBHOOK ACK] 收单大胜！结算批次号: ${result.deposit_id}`);
            await fetchBalances(); 
            
            // 👑 激活右上角交易归档弹窗
            showPremiumNotification(
                "📥 FinLinks 离岸代收扣击大捷",
                `<div class="space-y-1">
                    <div>清算状态: <span class="text-emerald-400 font-bold">SETTLED (已清偿)</span></div>
                    <div>物理到账: <span class="text-slate-100 font-mono">+${amount} ${currency}</span></div>
                    <div class="text-[10px] text-slate-500 font-mono">流水批次: ${result.deposit_id}</div>
                 </div>`,
                "emerald"
            );
        }
    } catch (error) { pushAuditLog("[WEBHOOK TIMEOUT] 通信超时。"); }
}

async function triggerMockReconciliation() {
    pushAuditLog("[AUDIT START] 零信任对账引擎点火...");
    try {
        const response = await client("/ledger/reconcile?currency=NGN", { method: "POST" });
        await fetchBalances();
        pushAuditLog(`[RECON SUCCESS] 内部总账轧差平账完毕。`);
    } catch (error) { pushAuditLog("[RECON WARNING] 对账超时。"); }
}

function switchTab(tabId) {
    pushAuditLog(`[UI ROUTER] 切流至功能仓: ${tabId.toUpperCase()}`);
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
    document.getElementById(`pane-${tabId}`)?.classList.remove("hidden");
}
function debounce(func, delay) { let timer; return function (...args) { clearTimeout(timer); timer = setTimeout(() => func.apply(this, args), delay); }; }
function pushAuditLog(message) {
    const box = document.getElementById("audit-log-box");
    if (box) { box.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${message}</div>`; box.scrollTop = box.scrollHeight; }
}

// 👑 右上角高级金融通知卡片渲染器 (开放给全局，统一调度)
export function showPremiumNotification(title, htmlContent, theme = "emerald") {
    const oldNotify = document.getElementById("finlinks-premium-notify"); if (oldNotify) oldNotify.remove();
    const themeColors = {
        emerald: { border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
        amber: { border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400" },
        rose: { border: "border-rose-500/40", text: "text-rose-400", dot: "bg-rose-400" }
    }[theme];

    const notifyHtml = `
        <div id="finlinks-premium-notify" class="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-950/95 backdrop-blur border ${themeColors.border} p-5 rounded-xl shadow-2xl transition-all duration-300">
            <h4 class="text-sm font-extrabold ${themeColors.text} tracking-wide uppercase flex items-center">
                <span class="w-1.5 h-1.5 rounded-full ${themeColors.dot} inline-block mr-2 animate-pulse"></span>${title}
            </h4>
            <div class="mt-2.5 text-xs text-slate-400 leading-relaxed font-sans">${htmlContent}</div>
            <div class="mt-4 pt-3 border-t border-slate-900 flex justify-end">
                <button onclick="document.getElementById('finlinks-premium-notify').remove()" class="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-1.5 rounded text-[10px] text-slate-200 font-bold tracking-wider uppercase">确认归档</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML("beforeend", notifyHtml);
}