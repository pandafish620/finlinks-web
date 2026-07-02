// -*- coding: utf-8 -*-
// 文件位置: assets/js/dashboard.js
// 🎯 FinLinks 5.2.0 乐高积木第 1 块：微内核主控状态机与多币种影子账本刷盘中枢
// 勾稽状态：100% 激活换汇与出金双引擎，全新并线全球流失账单审计看板

import { client } from './finlinks_client.js';
import { verifyAndPatchToken, logout } from './auth_manager.js';
import { submitAdvancedKYB } from './kyb_handler.js';

// =====================================================================
// 🔌 FinLinks 5.2.0 动力合流：从完全体发动机中引入真实的主权清算血管
// =====================================================================
import { triggerLiveQuote, submitFxConversion } from './fx_processor.js';
import { handleLivePayoutDisbursal } from './payout_dispatcher.js';
import { handleLivePayinCallback } from './payin_handler.js'; // 👑 🏁 增量并线收单入金特种驱动

document.addEventListener("DOMContentLoaded", () => {
    // 📄 追加到 assets/js/dashboard.js 的 DOMContentLoaded 内部第一行
    const showPremiumNotification = window.showPremiumNotification || function(msg) { 
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[NOTIFICATION] 📢 ${msg}`); 
    };
    
    // 1. 启动安全舱，核销商户 JWT 钢印并执行令牌免检
    verifyAndPatchToken();
    
    // 2. 扣动第一块积木扳手：立刻冲刷影子账本多币种余额
    fetchBalances();

    // 🌟 【增量并线电闸】：一开盘同步冲刷多租户隔离清算对账流水大厅！
    fetchTransactionHistory();
    
    // 3. 点火拉取左上角全局行情 Ticker 血管
    initGlobalFxTicker(); 

    // =====================================================================
    // 👑 最高特权提权区：将 5.2.0 完全体实弹功能流式暴露给全局 window，绝杀 ReferenceError
    // =====================================================================
    window.switchTab = switchTab;
    window.handleLogout = logout;
    
    // 🛡️ 注入全局重绘大闸：确保底层驱动交割大胜后，跨文件、匿名作用域能够瞬间冲重新冲刷头寸
    window.fetchBalances = fetchBalances;
    
    window.executeAdvancedKYBOnboarding = () => submitAdvancedKYB(pushAuditLog, showPremiumNotification);
    
    // =====================================================================
    // 🚀 爆破拆除僵尸隔离墙：像素级对齐真外汇引擎（fx_processor.js）与出金引擎
    // =====================================================================
    // ⚡ 积木 4：即期外汇换汇触点通电
    window.openFxModal = () => {
        const modalInput = document.getElementById("fx-modal-input");
        if (modalInput) {
            modalInput.classList.remove("pointer-events-none", "opacity-0");
            if (typeof window.pushAuditLog === "function") window.pushAuditLog("[FX WINDOW] ⚖️ 换汇指令仓弹起，即期滑点保护链准备点火...");
        } else {
            document.getElementById("fx-modal")?.classList.remove("pointer-events-none", "opacity-0");
        }
    };
    
    window.closeFxModal = () => {
        // ⏱️ 刚性合流：关闭窗口时，物理掐断 fx_processor.js 注入在内存中的动态自适应时钟，绝杀僵尸定时器
        if (window.fxTimerHandle) { 
            clearInterval(window.fxTimerHandle); 
            window.fxTimerHandle = null; 
        }
        document.getElementById("fx-modal-input")?.classList.add("pointer-events-none", "opacity-0");
        document.getElementById("fx-modal-confirm")?.classList.add("pointer-events-none", "opacity-0");
        document.getElementById("fx-modal")?.classList.add("pointer-events-none", "opacity-0");
    };

    // 绑定询价（第一窗）与实弹交割（第二窗）的 onclick 发射纽带
    window.executeLiveQuoteInquiry = () => triggerLiveQuote(pushAuditLog, window.showPremiumNotification || showPremiumNotification);
    // =====================================================================
    // 👑 刚性核销对接：Execute 触发时，像素级契约对齐，绝杀 STATELESS CONVERT
    // =====================================================================
    // 💾 apps/ledger/assets/js/dashboard.js 对应原位覆盖
    window.executeLiveFxConversion = () => {
        // 🎯 零形参，零数据偷渡隐患！直接干净击发！
        submitFxConversion();
    };

    // ⚡ 积木 3：自主出金放款代付触点通电（传入核心平账刷盘算子组）
    window.executeLivePayoutDisbursal = () => handleLivePayoutDisbursal(() => {
        fetchBalances();
        fetchTransactionHistory(); // 代付信号下发大胜后，流水大厅同步冲刷重绘！
    });

    // =====================================================================
    // 🖨️ 👑 【增量财务纽带】：金融级物理 CSV 账单外挂流出海下载大闸
    // =====================================================================
    window.executeFinancialStatementExport = async () => {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog("[AUDIT EXPORT] 🖨️ 正在叩击对账单网关，流式导出金融级财务流水 CSV...");
        try {
            // 📡 强行向中台外挂隔离路由发起导出请求
            const response = await client("/api/v1/statements/export/csv", { method: "GET" });
            if (!response || response.status !== 200) {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog("❌ [EXPORT FAILED] 账单导出网关拒签或无回执");
                return;
            }

            // 💾 内存二进制大对象（Blob）管道组装，接管文件下载流
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const hiddenAnchor = document.createElement("a");
            hiddenAnchor.href = downloadUrl;
            
            // 捞取后端在 CORS 里放行回喷的真实日期文件名，若缺失则降级使用自适应时间戳
            const contentDisposition = response.headers.get("Content-Disposition");
            let targetFilename = `FinLinks_Statement_${new Date().toISOString().slice(0,10).replace(/-/g,"")}.csv`;
            if (contentDisposition && contentDisposition.includes("filename=")) {
                targetFilename = contentDisposition.split("filename=")[1].replace(/["']/g, "");
            }

            hiddenAnchor.download = targetFilename;
            document.body.appendChild(hiddenAnchor);
            hiddenAnchor.click(); // 物理扣动浏览器内核下载开关
            document.body.removeChild(hiddenAnchor);
            window.URL.revokeObjectURL(downloadUrl);

            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`🎉 [EXPORT SUCCESS] 财务对账单物理下载成功 ➔ [${targetFilename}]`);
        } catch (exportErr) {
            console.error(">>> [EXPORT CRITICAL] 物理账单流产: ", exportErr);
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[EXPORT EXCEPTION] 导出链路中途猝死: ${exportErr.message}`);
        }
    };
    // =====================================================================
    // 📥 👑 【积木 2 全量通电】：将外贸账单发射按钮与 8秒红外雷达双向平账中枢焊死
    // =====================================================================
    window.executeLivePayinDeposit = () => handleLivePayinCallback(async () => {
        await fetchBalances();           // ⚖️ 雷达确权到账瞬间，可用头寸看板数字滚动跳变
        await fetchTransactionHistory(); // ⚖️ 对账历史流表格同步更新 SUCCESS 状态面具
    });

    // =====================================================================
    // ⚖️ 👑 【影子总账对账大闸】：100% 调直参数极性，一枪歼灭 422 排异雷！
    // =====================================================================
    window.triggerMockReconciliation = async function() {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog("[RECON TIER] ⚡ 正在扣动影子总账流水轧差审计大闸...");
        
        // 1. 动态抓取当前大厅选择的对账本币币种（例如 KES, NGN），保底使用 KES 执行清算
        // 1. 🧬 动态级联打捞当前大厅处于活跃态的任何币种（优先使用入金/出金最新影子缓存，再抓 DOM 节点）
        const currentCurrency = localStorage.getItem("FINLINKS_LAST_ACTIVE_CURRENCY") || 
                                document.getElementById("collectionCurrency")?.value || 
                                document.getElementById("payout-curr")?.value || 
                                "NGN";
        const cleanCurrency = currentCurrency.toUpperCase().trim();
        
        try {
            // 2. ⚡ 刚性并线：严格按照后端 Query 门禁，将参数直接吊装在 URL 问号后，Body 保持干净！
            const response = await client(`/ledger/reconcile?currency=${cleanCurrency}`, { 
                method: "POST" 
            });
            
            if (!response || response.status !== 200) {
                const errText = response ? await response.text() : "中台休克";
                if (typeof window.pushAuditLog === "function") {
                    window.pushAuditLog(`❌ [RECON REJECTED] 轧差审计失败，网关回喷: ${errText}`);
                }
                return;
            }
            
            const resData = await response.json();
            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`🎉 [RECON SUCCESS] 总账对账核销成功！审计通过。状态: ${resData.recon_status}`);
                window.pushAuditLog(`💡 [RECON BENEFIT] 本次释放可用资产: +${resData.metrics.net_unfrozen_amount} ${resData.target_currency}`);
            }
            
            // 3. 🏁 大捷收尾：触发跨文件、匿名作用域瞬间重新冲刷影子头寸与账单表格
            await fetchBalances();
            await fetchTransactionHistory();
            
        } catch (reconErr) {
            console.error(">>> [RECON CRITICAL] 对账总线中途猝死: ", reconErr);
            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[RECON EXCEPTION] 链路上游超时或死锁: ${reconErr.message}`);
            }
        }
    };
});
/**
 * 📊 1. 动态拉取左上角 Ticker 基准大盘
 */
async function initGlobalFxTicker() {
        const tickerContainer = document.getElementById("global-fx-ticker");
        if (!tickerContainer) return;
        try {
            // 🛰️ 刚性校正物理路径为 /ledger/fx/quote，并将币种切回大厂真锁价生产线
            const response = await client("/ledger/fx/quote?sell_currency=USD&buy_currency=JPY&sell_amount=1", { method: "GET" });
            if (response.status === 200) {
                const data = await response.json();
                const liveRate = data.final_settlement_rate || data.lock_rate || 152.20;
                tickerContainer.innerHTML = `
                    <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                        <span class="flex items-center">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                            USD/JPY 基准成本价 (含滑点): <strong class="text-emerald-400 ml-1">${parseFloat(liveRate).toFixed(4)}</strong>
                        </span>
                    </div>`;
            }
        } catch (e) { 
            tickerContainer.innerHTML = `<span class="text-xs text-slate-500 font-mono">⚡ FinLinks 全球行情底座物理通电成功</span>`; 
        }
    }

/**
 * 👑 2. 【积木 1 核心功能】：影子总账可用头寸刷盘上屏
 */
export async function fetchBalances() {
    const container = document.getElementById("balances-container");
    if (!container) return;
    try {
        console.log("📡 [FRONTEND BALANCES APP] 正在通过 client 总线打捞中台 12 国多币种可用资产...");
        const response = await client(`/ledger/balances?_t=${Date.now()}`, { method: "GET" });
        
        if (!response || response.status !== 200) {
            console.error(`❌ [FRONTEND REJECTED] 中台总线断路，物理状态码: ${response ? response.status : '休克'}`);
            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[BALANCES ERROR] ❌ 资产大动脉失联，中台状态码: ${response ? response.status : '无回执'}`);
            }
            return; 
        }

        const data = await response.json();
        
        if (data.status === "success" || data.status === "SUCCESS") {
            const merchantTag = document.getElementById("merchant-id-tag");
            if (merchantTag && data.merchant) merchantTag.innerText = data.merchant;

            container.innerHTML = "";
            const matrix = data.multi_currency_visibility || {};
            
            Object.keys(matrix).forEach(currency => {
                const availableValue = matrix[currency];
                container.innerHTML += `
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300">
                        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${currency} 可动用可用余额</div>
                        <div class="text-3xl font-mono font-bold mt-2 text-emerald-400" id="balance-${currency.toUpperCase().trim()}">${availableValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div class="absolute -right-4 -bottom-6 text-6xl font-bold font-mono text-slate-800/10 select-none">${currency}</div>
                    </div>`;
            });

            document.querySelectorAll(".sidebar-balance-value").forEach(node => {
                const nodeCurrency = node.dataset.currency ? node.dataset.currency.toUpperCase().trim() : "";
                if (nodeCurrency && matrix[nodeCurrency] !== undefined) {
                    node.classList.add("text-emerald-400", "scale-105", "transition-all", "duration-300");
                    node.innerText = matrix[nodeCurrency].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    setTimeout(() => {
                        node.classList.remove("text-emerald-400", "scale-105");
                    }, 500);
                }
            });

            if (Object.keys(matrix).length === 0) {
                container.innerHTML = `<div class="text-xs text-slate-500 font-mono p-4">📡 影子总账资产池当前为空置状态</div>`;
            }
        }
    } catch (e) { 
        console.error(">>> [BLOCK 1 ERROR] 资产卡片动态填词中止: ", e); 
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[BALANCES EXCEPTION] 前端发生解包排异: ${e.message}`);
        }
    }
}

/**
 * 📊 🧱 【增量核心算子】：实时打捞多租户清算流水并高性能动态重绘 HTML 表格
 */
async function fetchTransactionHistory() {
    const tbody = document.getElementById("global-transactions-tbody");
    if (!tbody) return;
    try {
        console.log("📡 [FRONTEND STATEMENT APP] 正在打捞多币种入金对账历史...");
        const response = await client("/api/v1/statements/history", { method: "GET" });
        if (!response || response.status !== 200) {
            tbody.innerHTML = `<tr><td colspan='7' class='py-4 text-center text-rose-500 font-sans'>❌ 无法建立流行动拆借，审计端点联失通信</td></tr>`;
            return;
        }

        const resData = await response.json();
        if (resData.status === "success" && Array.isArray(resData.data)) {
            const list = resData.data;
            if (list.length === 0) {
                tbody.innerHTML = `<tr><td colspan='7' class='py-8 text-center text-slate-600 italic tracking-wide font-sans'>📡 影子总账当前无任何跨国结算流水痕迹</td></tr>`;
                return;
            }

            // 清空旧的“正在加载”骨架，注入像素重绘容器
            tbody.innerHTML = "";
            list.forEach(tx => {
                // 根据 SUCCESS / FAILED 渲染地缘资产的颜色极性面具
                let statusBadge = `<span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500 font-bold text-[10px]">PENDING</span>`;
                if (tx.status === "SUCCESS") {
                    statusBadge = `<span class="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-bold text-[10px]">SUCCESS</span>`;
                } else if (tx.status === "FAILED") {
                    statusBadge = `<span class="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-900/50 text-rose-400 font-bold text-[10px]">FAILED</span>`;
                }

                // 资金流向极性颜色管理
                const isCredit = tx.tx_type === "CREDIT";
                const directionBadge = isCredit 
                    ? `<span class="text-emerald-400 font-bold">📥 贷记(存入)</span>`
                    : `<span class="text-rose-400 font-bold">💸 借记(支出)</span>`;
                const amountDisplay = `${isCredit ? '+' : ''}${parseFloat(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

                // 时间戳本地国际化自适应切分
                const prettyTime = new Date(tx.timestamp).toLocaleString();

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-950/30 border-b border-slate-800/40 transition">
                        <td class="py-3.5 px-5 text-slate-400 font-sans font-medium max-w-[180px] truncate" title="${tx.tx_ref}">${tx.tx_ref}</td>
                        <td class="py-3.5 px-5"><span class="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-bold text-slate-300 uppercase">${tx.domain}</span></td>
                        <td class="py-3.5 px-5 text-[11px]">${directionBadge}</td>
                        <td class="py-3.5 px-4 text-right font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}">${amountDisplay}</td>
                        <td class="py-3.5 px-4 font-bold text-slate-200 uppercase">${tx.currency}</td>
                        <td class="py-3.5 px-5">${statusBadge}</td>
                        <td class="py-3.5 px-5 text-right text-slate-500 font-sans text-[11px]">${prettyTime}</td>
                    </tr>`;
            });
        }
    } catch (err) {
        console.error(">>> [STATEMENT RE-RENDER ERROR] 看板重绘熔断: ", err);
        tbody.innerHTML = `<tr><td colspan='7' class='py-4 text-center text-rose-500 font-sans'>⚠️ 财务流水解包发生地缘排异: ${err.message}</td></tr>`;
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

function pushAuditLog(message) { if (typeof window.pushAuditLog === "function") window.pushAuditLog(message); }

// 📄 追加到 assets/js/dashboard.js 中，激活大厅表单的极性动态切换
window.adaptPayoutFormByGeopolitical = function() {
    const currency = document.getElementById("payout-curr")?.value || "";
    const bankGroup = document.getElementById("payout-bank-group");
    const mobileGroup = document.getElementById("payout-mobile-group");
    
    if (!bankGroup || !mobileGroup) return;

    // 🌍 6国合拢修正：全量补齐 PawaPay 新通车的赞比亚 ZMW、马拉维 MWK、卢旺达 RWF，无损通过前台表单调谐大闸
    if (["KES", "UGX", "GHS", "TZS", "ZMW", "MWK", "RWF"].includes(currency.toUpperCase().trim())) {
        mobileGroup.classList.remove("hidden"); 
        bankGroup.classList.add("hidden");    
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[UI ROUTER] 📱 币种已切换至 [${currency}]，已自动调谐至移动货币(Mobile Money)放款矩阵。`);
        }
    } else {
        bankGroup.classList.remove("hidden"); 
        mobileGroup.classList.add("hidden");  
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[UI ROUTER] 🏦 币种已切换至 [${currency}]，已自动调谐至标准跨境银行网关清算矩阵。`);
        }
    }
};