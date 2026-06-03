// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇隔离沙箱完全体：绝杀 130 行语法毒素，全面合拢 3 大核心硬伤

import { client } from './finlinks_client.js';

// 🔒 独立声明外汇微内核独占的活体时钟句柄与滑点计时器，防止多重点击踩踏
let fxTimerHandle = null;
let fxRemainingSeconds = 10.0;

/**
 * 🔮 1. 即期活体询价（对齐后端独立血管，高能点火 10s 瀑布流时钟）
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    // 📈 弹性加点保护：散户/代理商默认叠加入场 10 Bps 的利差垫
    const clientExtraSpread = 10.0; 

    if (!sellAmount || sellAmount <= 0) return;

    // 🛡️ 风控前置：如果上一次的在途计时器还在跑，就地强行注销，决不发生内存泄漏！
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
    }

    try {
        if (typeof pushAuditLog === "function") {
            pushAuditLog(`[SANDBOX FX] 正在通过统一 client 总线发起独立外汇询价...`);
        }
        
        // 🔌 刺穿统一 client 网络总线
        const response = await client(`/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}&client_extra_spread=${clientExtraSpread}`, {
            method: "GET"
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "quoted") {
            let currentRate = result.final_settlement_rate;
            
            // 🔄 左侧交易反转算力：卖出侧是 USD 时，底下的清算汇率取倒数，完美向交易看齐
            if (sellCurrency.toUpperCase() === "USD") {
                currentRate = 1 / currentRate;
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 通道锁价成功！清算通道: ${result.routing_via} | 最优执行价: ${currentRate.toFixed(6)}`);
            }

            // =================================================================
            // 👑 【解决硬伤 3】：将用户输入的即时货币对锁价，秒级强刷进左上角常驻 Ticker 视窗！
            // =================================================================
            const tickerContainer = document.getElementById("global-fx-ticker");
            if (tickerContainer) {
                tickerContainer.innerHTML = `
                    <div class="flex items-center space-x-2 text-[11px] font-mono text-emerald-400 animate-pulse">
                        <span>📡 [当前盘口锁价] ${sellCurrency.toUpperCase()}/${buyCurrency.toUpperCase()} => </span>
                        <strong class="text-white ml-1">${currentRate.toFixed(6)}</strong>
                    </div>`;
            }

            // 2. 动态刷写大弹窗内部的数字文本节点
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount.toFixed(2)} ${buyCurrency}`;

            // 3. 将单据指纹与锁价资产凭证封印到 DOM Dataset 状态机中
            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp;
            const modal = document.getElementById("fx-modal");
            if (modal) {
                modal.dataset.currentRate = result.final_settlement_rate; 
                modal.dataset.routingVia = result.routing_via;
            }

            // =================================================================
            // 👑 【10秒即期滑点保护时钟大闸】：点火流式进度条
            // =================================================================
            fxRemainingSeconds = 10.0;
            const elTimerText = document.getElementById("fx-countdown-timer");
            const elProgressBar = document.getElementById("fx-progress-bar");
            const elSubmitBtn = document.getElementById("fx-submit-btn");

            if (elSubmitBtn) {
                elSubmitBtn.removeAttribute("disabled");
                elSubmitBtn.classList.remove("cursor-not-allowed", "opacity-30");
                elSubmitBtn.innerText = "确认清算结算";
            }
            if (elProgressBar) {
                elProgressBar.style.width = "100%";
                elProgressBar.classList.remove("from-red-500", "to-rose-600");
                elProgressBar.classList.add("from-emerald-500", "to-teal-400", "opacity-100");
            }

            // 扣动每 100ms 刷新一次的流式时钟扳手
            fxTimerHandle = setInterval(() => {
                fxRemainingSeconds -= 0.1;
                
                if (elTimerText) elTimerText.innerText = `${Math.max(0, fxRemainingSeconds).toFixed(1)}s`;
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / 10.0) * 100}%`;

                // 风控红色预警垫：当时间仅剩 3 秒，进度条流式飙红！
                if (fxRemainingSeconds <= 3.0 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                // 💥 自动超时熔断：10秒时间耗尽，强制就地解体作废在途合同！
                if (fxRemainingSeconds <= 0) {
                    clearInterval(fxTimerHandle);
                    fxTimerHandle = null;
                    
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 10s 滑点超时熔断！固价合同就地解体作废，防线就地挂闸！`);
                    
                    if (elSubmitBtn) {
                        elSubmitBtn.setAttribute("disabled", "true");
                        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                        elSubmitBtn.innerText = "合同已过期作废";
                    }
                    if (modal) modal.dataset.currentRate = "0"; // 物理抹除可用率值
                }
            }, 100);

        } else {
            // 中台风控盾拦截处理（如 NGN 逆向拦截拒签）
            const errorMsg = result.detail || "中台风控防火墙拒签本笔指令";
            if (typeof pushAuditLog === "function") pushAuditLog(`[SOR REJECTED] ❌ 询价遭拒: ${errorMsg}`);
            
            const elSubmitBtn = document.getElementById("fx-submit-btn");
            if (elSubmitBtn) {
                elSubmitBtn.setAttribute("disabled", "true");
                elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                elSubmitBtn.innerText = "风控拒签合同";
            }
        }
    } catch (err) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 外汇沙箱网络通信断路: ${err.message}`);
    }
}

/**
 * 💱 2. 换汇确权交割（100% 资金轧差，【解决硬伤 2】自动触发 fetchBalances 重绘大厅与侧边栏）
 */
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const quoteTimestamp = parseFloat(document.getElementById("fx-quote-timestamp").value || "0");
    const modal = document.getElementById("fx-modal");
    const fxRate = modal ? parseFloat(modal.dataset.currentRate || "0") : 0;
    const routingVia = modal ? modal.dataset.routingVia || "" : "";

    if (!sellAmount || fxRate <= 0 || !routingVia) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同已过期作废，指令严禁下发！`);
        return;
    }

    // 🔒 一次性防刷锁：点击后按钮立刻置灰上锁，斩断前端高频重发顶出的 408/500 毒素！
    const elSubmitBtn = document.getElementById("fx-submit-btn");
    if (elSubmitBtn) {
        elSubmitBtn.setAttribute("disabled", "true");
        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-40");
        elSubmitBtn.innerText = "正在向公网打流物理交割中...";
    }

    try {
        const response = await client(`/fx/convert?sell_currency=${sellCurrency.toUpperCase()}&sell_amount=${sellAmount}&buy_currency=${buyCurrency.toUpperCase()}&fx_rate=${fxRate}&routing_via=${routingVia.toUpperCase()}&quote_timestamp=${quoteTimestamp}`, {
            method: "POST"
        });

        // 👑 核心平账自愈判定：我们只认第一发成功返回的 200 OK 绿灯！
        if (response.status === 200) {
            const data = await response.json();
            
            // 顺利交割，注销释放计时器时钟
            if (fxTimerHandle) {
                clearInterval(fxTimerHandle);
                fxTimerHandle = null;
            }

            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割成功！流水: ${data.fx_batch_ref}`);
            
            // 顺畅收卷模态框
            if (modal) modal.classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount").value = "";
            
            // =================================================================
            // 👑 【解决硬伤 2】：瞬间自发叩击积木 1 刷盘指针，逼迫侧边栏与持仓大厅同步飙青刷新！
            // =================================================================
            if (typeof fetchBalances === "function") {
                if (typeof pushAuditLog === "function") pushAuditLog(`[LIVE AUTOMATION] 物理轧差生效！无损重绘全局可用头寸资产舱...`);
                await fetchBalances(); 
            }
        } else {
            // 第一发请求就失败了，解套按钮供重新发起
            if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认清算结算"; }
            const data = await response.json();
            if (typeof pushAuditLog === "function") pushAuditLog(`[FX REJECTED] 交割拒绝原因: ${data.detail || "中台拒绝"}`);
        }
    } catch (catchErr) {
        if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认清算结算"; }
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 外汇通信断路: ${catchErr.message}`);
    }
}

// =================================================================
// 👑 4. 【解决硬伤 1】：将主动关闭弹窗与财务红字冲正机制安全暴露给 window
// =================================================================
window.closeFxModal = function() {
    const modal = document.getElementById("fx-modal");
    if (modal) modal.classList.add("pointer-events-none", "opacity-0");
    
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
        window.pushAuditLog("[FX ABORT] ⚖️ 操盘手撤销签署权，固价合同在途注销，时钟锁就地强制释放。");
    }
};