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
// 🎯 【5.6.0 终审并线】：引入分流后的单笔极速与大货批量双翼隔离代付调度器
import { handleSinglePayoutDisbursal, handleBatchPayoutDisbursal } from './payout_dispatcher.js';
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

    // ⚡ 积木 3：【SINGLE 与 BATCH 双翼隔离】代付触点全线通电
    // =====================================================================
    
    // 1. 单笔极速放款电闸（供 SINGLE 选项卡上的确认按钮点击调用）
    window.executeLiveSinglePayoutDisbursal = () => handleSinglePayoutDisbursal(async () => {
        await fetchBalances();
        await fetchTransactionHistory(); // 大胜后，影子账本与流水大厅同步冲刷重绘！
    });

    // 2. 大货批量放款电闸（供 BATCH 选项卡上的确认按钮点击调用）
    window.executeLiveBatchPayoutDisbursal = () => handleBatchPayoutDisbursal(async () => {
        await fetchBalances();
        await fetchTransactionHistory();
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
 /**
 * 📊 1. 动态拉取左上角 Ticker 基准大盘（第四阶段：全链路无损静音版）
 * 🎯 彻底废除开机 1 美元美日询价，绝杀大厂沙箱风控拉黑隐患
 */
async function initGlobalFxTicker() {
    const tickerContainer = document.getElementById("global-fx-ticker");
    if (!tickerContainer) return;
    
    // 👑 操盘手绝杀令：将异步网络流直接截断，100% 切换为静态高奢保底行情垫片
    try {
        const liveRate = 152.2045; // 刚性锁死国际基准保底静态价，0 叩击后端
        tickerContainer.innerHTML = `
            <div class="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                <span class="flex items-center">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                    USD/JPY 基准成本价 (静态保底): <strong class="text-emerald-400 ml-1">${parseFloat(liveRate).toFixed(4)}</strong>
                </span>
            </div>`;
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
// =====================================================================
// 🌍 FinLinks 全球主权币种路由元数据矩阵（含灰度 Feature Flag）
// =====================================================================
// =====================================================================
// 🌍 FinLinks 全球主权币种路由元数据矩阵（2026年7月完全体含灰度 Feature Flag）
// =====================================================================
const GLOBAL_CORRIDOR_MATRIX = {
    // 🏦 第一梯队：首发已打通满血绿轨（Web2 传统大行通道）
    "USD": { status: "active", channel: "BANK", label: "US Bank Account (Fedwire/ACH)", ph: { acc: "Account Number", bcode: "Bank Code", routing: "9-digit Routing Number", swift: "SWIFT BIC" } },
    "GBP": { status: "active", channel: "BANK", label: "UK Bank Account (Sort Code/FPS)", ph: { acc: "Account Number", bcode: "Sort Code (6 digits)", routing: "Not Required", swift: "SWIFT BIC" } },
    "AUD": { status: "active", channel: "BANK", label: "Australia Bank Account (BSB)", ph: { acc: "Account Number", bcode: "BSB Code (6 digits)", routing: "Not Required", swift: "Not Required" } },
    "NGN": { status: "active", channel: "BANK", label: "Nigeria Bank Account (NUBAN Engine)", ph: { acc: "10-digit NUBAN Account Number (e.g., 0123456789)", bcode: "3-digit Central Bank Code (e.g., Wema Bank fill 044)", routing: "Not Required", swift: "Not Required" } },
    // 🇪🇺 欧洲与 🌏 亚太：新增灰度预热特权阻断节点
    "EUR": { status: "coming_soon", channel: "BANK", label: "Eurozone Local Clearing (SEPA)", ph: { acc: "IBAN Number (Starts with Country Code)", bcode: "Not Required (Embedded in IBAN)", routing: "Not Required", swift: "BIC/SWIFT Code Required" } },
    "JPY": { status: "coming_soon", channel: "BANK", label: "Japan Zengin Clearing System", ph: { acc: "Account Number (7 digits)", bcode: "Bank Code + Branch Code", routing: "Account Category (Checking/Savings)", swift: "Not Required" } },
    
    // 东南亚代付长廊（ASEAN Payout Corridors）➔ 强行拉满技术大厂逼格
    "IDR": { status: "coming_soon", channel: "BANK", label: "Indonesia Local (BI-FAST / SKN)", ph: { acc: "Bank Account Number", bcode: "3-digit Bank Clearing Code", routing: "Not Required", swift: "Not Required" } },
    "PHP": { status: "coming_soon", channel: "BANK", label: "Philippines Local (InstaPay / PESONet)", ph: { acc: "Account Number", bcode: "Bank Identifier Code (BIC)", routing: "Not Required", swift: "Not Required" } },
    "THB": { status: "coming_soon", channel: "BANK", label: "Thailand Local (PromptPay / Bahtnet)", ph: { acc: "Account Number or Proxy ID", bcode: "Bank Code (3 digits)", routing: "Not Required", swift: "Not Required" } },

    // 💃 拉美双雄：灰度预热特权阻断节点
    "BRL": { status: "coming_soon", channel: "LATAM", label: "Brazil Local (TED/PIX)", ph: { acc: "Bank Account Number", bcode: "3-digit ISPB / Bank Code", routing: "CPF or CNPJ Tax ID Required", swift: "Not Required" } },
    "MXN": { status: "coming_soon", channel: "LATAM", label: "Mexico Local (SPEI)", ph: { acc: "18-digit CLABE Account Number", bcode: "3-digit Bank Code", routing: "Not Required", swift: "Not Required" } },
    
    // 📱 西非移动货币集团（PawaPay/Flutterwave 托管大网）➔ 首发激活状态
    "KES": { status: "active", channel: "MOBILE", label: "Kenya M-Pesa / Mobile Money" },
    "UGX": { status: "active", channel: "MOBILE", label: "Uganda Mobile Money" },
    "GHS": { status: "active", channel: "MOBILE", label: "Ghana Mobile Money" },
    "TZS": { status: "active", channel: "MOBILE", label: "Tanzania Mobile Money" },
    "ZMW": { status: "active", channel: "MOBILE", label: "Zambia Mobile Money" },
    "MWK": { status: "active", channel: "MOBILE", label: "Malawi Mobile Money" },
    "RWF": { status: "active", channel: "MOBILE", label: "Rwanda Mobile Money" }
};
// 👑 [GLOBAL ELEVATION] 破除模块化壁垒，将币种矩阵刚性提权至全局全局 window 对象，绝杀跨文件 ReferenceError
window.GLOBAL_CORRIDOR_MATRIX = GLOBAL_CORRIDOR_MATRIX;

// 👑 [UI REFACTOR] 灰度预热特权拦截大闸
window.showPremiumComingSoonModal = function(currency) {
    const oldOverlay = document.getElementById("finlinks-premium-lock-overlay");
    if (oldOverlay) oldOverlay.remove();

    if (typeof window.pushAuditLog === "function") {
        window.pushAuditLog(`[UI INTERCEPT] 🔒 操盘手试图扣动未开通新兴法域 [${currency}]，特权拦截仓就地锁死。`);
    }

    const modalHtml = `
        <div id="finlinks-premium-lock-overlay" class="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[9999] font-sans">
            <div class="bg-slate-900 border border-amber-500/30 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center space-x-3 border-b border-slate-800 pb-3">
                    <div class="w-9 h-9 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center text-lg font-bold border border-amber-500/20">👑</div>
                    <div>
                        <h3 class="text-amber-400 font-bold text-sm tracking-wide">VIP 通道首发权限申请</h3>
                        <p class="text-[10px] text-slate-500 font-mono">Corridor Access Control: ${currency} Matrix</p>
                    </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed font-sans">
                    尊敬的操盘手，<strong>${currency}（新法域本地清算总线）</strong>目前处于内部灰度小范围跑量测试阶段。为确保多租户隔离舱头寸安全与拉美/亚洲内盘高管辖合规轧差，该高额出港通道目前仅对特批白名单商户开放。
                </p>
                <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                    <div>• 接入网关: AIRWALLEX LATAM/ASIA BUS</div>
                    <div>• 清算极性: 刚性自愈 (TED / SPEI / ZENGIN)</div>
                    <div>• 准入条件: 日流水 > 50,000 USD 或完成高级法团审计</div>
                </div>
                <div class="flex space-x-3">
                    <button onclick="document.getElementById('finlinks-premium-lock-overlay').remove()" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition tracking-wide">
                        返回账本大厅
                    </button>
                    <button onclick="document.getElementById('finlinks-premium-lock-overlay').remove(); window.pushAuditLog('[VIP REQUEST] 操盘手已一键向客户经理发起 ${currency} 白名单申请工单。'); alert('申请已提交！您的客户经理（Relationship Manager）将在1小时内与您联系对接贸易流水评审。');" class="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition tracking-wide shadow-lg shadow-amber-500/10">
                        一键申请开通 VIP 血管
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// 📄 原位覆盖：动态根据地缘法域调谐表单占位符与显隐状态
window.adaptPayoutFormByGeopolitical = function() {
    const currency = (document.getElementById("payout-curr")?.value || "NGN").toUpperCase().trim();
    const bankGroup = document.getElementById("payout-bank-group");
    const mobileGroup = document.getElementById("payout-mobile-group");
    
    if (!bankGroup || !mobileGroup) return;

    // 缓存最后一次选中的活跃币种
    localStorage.setItem("FINLINKS_LAST_ACTIVE_CURRENCY", currency);

    const conf = GLOBAL_CORRIDOR_MATRIX[currency] || { status: "active", channel: "MOBILE" };

    // 1. 灰度拦截：如果是 Coming Soon 节点，直接唤起 VIP 弹窗
    if (conf.status === "coming_soon") {
        window.showPremiumComingSoonModal(currency);
    }

    // 2. 显隐分流
    if (conf.channel === "MOBILE") {
        mobileGroup.classList.remove("hidden"); 
        bankGroup.classList.add("hidden");    
        pushAuditLog(`[UI ROUTER] 📱 币种已切换至 [${currency}]，已自动调谐至移动货币 Mobile Money 矩阵。`);
    } else {
        bankGroup.classList.remove("hidden"); 
        mobileGroup.classList.add("hidden");  
        pushAuditLog(`[UI ROUTER] 🏦 币种已切换至 [${currency}]，已自动调谐至全球标准主权银行网关。`);
        
        // 3. 像素级正畸：根据币种特性动态洗净 Input 的 Placeholder，防止商户填错
        if (conf.ph) {
            const accNode = document.getElementById("payout-acc");
            const bcodeNode = document.getElementById("payout-bank-code");
            const routingNode = document.getElementById("payout-routing-number");
            const swiftNode = document.getElementById("payout-swift-code");

            if (accNode && conf.ph.acc) accNode.placeholder = conf.ph.acc;
            if (bcodeNode && conf.ph.bcode) bcodeNode.placeholder = conf.ph.bcode;
            if (routingNode && conf.ph.routing) routingNode.placeholder = conf.ph.routing;
            if (swiftNode && conf.ph.swift) swiftNode.placeholder = conf.ph.swift;
        }
    }
};