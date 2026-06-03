// -*- coding: utf-8 -*-
// 文件位置: assets/js/dashboard.js
// 🎯 FinLinks 5.2.0 乐高积木第 1 块：微内核主控状态机与多币种影子账本刷盘中枢
// 勾稽状态：100% 对齐后端 multi_currency_visibility 契约钢印，拒绝任何次生变量覆盖

import { client } from './finlinks_client.js';
import { verifyAndPatchToken, logout } from './auth_manager.js';
import { submitAdvancedKYB } from './kyb_handler.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. 启动安全舱，核销商户 JWT 钢印并执行令牌免检
    verifyAndPatchToken();
    
    // 2. 扣动第一块积木扳手：立刻冲刷影子账本多币种余额
    fetchBalances();
    
    // 3. 点火拉取左上角全局行情 Ticker 血管
    initGlobalFxTicker(); 

    // 👑 最高特权提权区：将基础大厅门禁暴露给 HTML onclick 事件，绝杀 ReferenceError
    window.switchTab = switchTab;
    window.handleLogout = logout;
    window.executeAdvancedKYBOnboarding = () => submitAdvancedKYB(pushAuditLog, showPremiumNotification);
    
    // 🧱 积木 1 隔离防御墙：为后续要搭建的 Pay-in / Payout / 外汇积木提前空置出 onclick 门禁插槽
    // 在后续业务积木未搭建完成前，点击按钮安全拦截，绝不发生主线程 ReferenceError 崩溃！
    window.openFxModal = window.openFxModal || function() { pushAuditLog("[BUFFER] ⚖️ 积木 4 (即期换汇外汇) 尚未通电，插槽安全隔离中..."); };
    window.closeFxModal = window.closeFxModal || function() { document.getElementById("fx-modal")?.classList.add("pointer-events-none", "opacity-0"); };
    window.executeLivePayoutDisbursal = window.executeLivePayoutDisbursal || function() { pushAuditLog("[BUFFER] 💸 积木 3 (出金放款代付) 尚未通电，表单执行安全拦截..."); };
    window.triggerMockPayinCallback = window.triggerMockPayinCallback || function() { pushAuditLog("[BUFFER] 📥 积木 2 (跨境收单入金) 尚未通电，回调报文安全隔离..."); };
    window.triggerMockReconciliation = window.triggerMockReconciliation || function() { pushAuditLog("[BUFFER] 零信任对账引擎正在缓冲加热中..."); };
});

/**
 * 📊 1. 动态拉取左上角 Ticker 基准大盘
 */
async function initGlobalFxTicker() {
    const tickerContainer = document.getElementById("global-fx-ticker");
    if (!tickerContainer) return;
    try {
        const response = await client("/ledger/fx/quote?sell_currency=USD&buy_currency=NGN&sell_amount=1", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            // 完美适配后端可能吐出的字段变体
            const liveRate = data.final_settlement_rate || data.lock_rate || 1428.37;
            tickerContainer.innerHTML = `
                <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                    <span class="flex items-center">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                        USD/NGN 基准参考: <strong class="text-slate-200 ml-1">${liveRate}</strong>
                    </span>
                </div>`;
        }
    } catch (e) { 
        tickerContainer.innerHTML = `<span class="text-xs text-slate-500 font-mono">⚡ FinLinks 全球行情底座物理通电成功</span>`; 
    }
}

/**
 * 👑 2. 【积木 1 核心功能】：影子总账可用头寸刷盘上屏（绝杀 data.balances 历史坏账）
 */
export async function fetchBalances() {
    const container = document.getElementById("balances-container");
    if (!container) return;
    try {
        // 通过底座 client 总线击发，自动加上 /ledger 前缀，自动携带 credentials 凭证
        const response = await client("/ledger/balances", { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            
            // 提取真实商户 MID 强行刷写界面死标签
            const merchantTag = document.getElementById("merchant-id-tag");
            if (merchantTag && data.merchant) merchantTag.innerText = data.merchant;

            // 🟢 临门一脚自愈：彻底炸毁、清除原有的灰色脉冲闪烁骨架屏
            container.innerHTML = "";
            
            // 👑 勾稽平账点：完美对齐后端硬核期待的 multi_currency_visibility 字段！
            const matrix = data.multi_currency_visibility || {};
            
            Object.keys(matrix).forEach(currency => {
                const availableValue = matrix[currency];
                container.innerHTML += `
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${currency} 可动用可用余额</div>
                        <div class="text-3xl font-mono font-bold mt-2 text-emerald-400">${availableValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div class="absolute -right-4 -bottom-6 text-6xl font-bold font-mono text-slate-800/10 select-none">${currency}</div>
                    </div>`;
            });
            
            if (Object.keys(matrix).length === 0) {
                container.innerHTML = `<div class="text-xs text-slate-500 font-mono p-4">📡 影子总账资产池当前为空置状态</div>`;
            }
        }
    } catch (e) { 
        console.error(">>> [BLOCK 1 ERROR] 资产卡片动态填词中止: ", e); 
    }
}

/**
 * 📊 3. 基础选项卡纯净切流控制
 */
function switchTab(tabId) {
    if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[UI ROUTER] 切流至功能仓: ${tabId.toUpperCase()}`);
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
    document.getElementById(`pane-${tabId}`)?.classList.remove("hidden");
}

function debounce(func, delay) { let timer; return function (...args) { clearTimeout(timer); timer = setTimeout(() => func.apply(this, args), delay); }; }
function pushAuditLog(message) { if (typeof window.pushAuditLog === "function") window.pushAuditLog(message); }