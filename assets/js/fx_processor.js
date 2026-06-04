// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇主权隔离沙箱：完美支持双窗解耦生命周期

import { client } from './finlinks_client.js';

let fxTimerHandle = null;
let fxRemainingSeconds = 10.0;

/**
 * 🔮 1. 独立静默询价算子（敲击第一窗底部的提交，点火第二窗时钟）
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    const clientExtraSpread = 10.0; 

    if (!sellAmount || sellAmount <= 0) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX WARN] ❌ 拟换汇名义金额非法，拒绝向中台打流`);
        return;
    }

    // 强制关闭上一次遗留的僵尸时钟
    if (fxTimerHandle) { clearInterval(fxTimerHandle); fxTimerHandle = null; }

    const elInquiryBtn = document.getElementById("fx-inquiry-btn");
    if (elInquiryBtn) { elInquiryBtn.setAttribute("disabled", "true"); elInquiryBtn.innerText = "正在叩击大厂 V4 盘口..."; }

    try {
        const response = await client(`/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}&client_extra_spread=${clientExtraSpread}`, {
            method: "GET"
        });
        const result = await response.json();

        // 恢复第一窗按钮状态
        if (elInquiryBtn) { elInquiryBtn.removeAttribute("disabled"); elInquiryBtn.innerText = "获取即期汇率报价 (Request Quote)"; }

        if (response.status === 200 && result.status === "quoted") {
            let currentRate = result.final_settlement_rate;
            if (sellCurrency.toUpperCase() === "USD") { currentRate = 1 / currentRate; }

            // A. 【硬伤 3 完美闭环】：秒级向左上角常驻 Ticker 气泡视窗灌入活体执行价！
            const tickerContainer = document.getElementById("global-fx-ticker");
            if (tickerContainer) {
                tickerContainer.innerHTML = `
                    <div class="flex items-center space-x-1 text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-emerald-400 animate-pulse">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 inline-block"></span>
                        即期锁价: ${sellCurrency.toUpperCase()}/${buyCurrency.toUpperCase()} -> <span class="text-white font-bold ml-1">${currentRate.toFixed(5)}</span>
                    </div>`;
            }

            // B. 动态挂载第二窗文本节点值
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount.toFixed(2)} ${buyCurrency}`;

            const elSellDisplay = document.getElementById("fx-confirm-sell-display");
            if (elSellDisplay) elSellDisplay.innerText = `${sellAmount.toFixed(2)} ${sellCurrency.toUpperCase()}`;

            // 封印时间戳
            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp;
            const modalConfirm = document.getElementById("fx-modal-confirm");
            if (modalConfirm) {
                modalConfirm.dataset.currentRate = result.final_settlement_rate; 
                modalConfirm.dataset.routingVia = result.routing_via;
            }

            // =================================================================
            // 👑 【时序齿轮咬合】：静默隐藏第一窗，满血跳出霸屏第二确认窗！
            // =================================================================
            const modalInput = document.getElementById("fx-modal-input");
            if (modalInput) modalInput.classList.add("pointer-events-none", "opacity-0");
            if (modalConfirm) modalConfirm.classList.remove("pointer-events-none", "opacity-0");

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 大厂报价解算完成！固价合同已锁定。渠道: ${result.routing_via} | 执行价: ${currentRate.toFixed(6)}`);
            }

            // =================================================================
            // 👑 【10秒滑点保护时钟锁】：在第二窗大卡片跳出后，正式点火！
            // =================================================================
            fxRemainingSeconds = 10.0;
            const elTimerText = document.getElementById("fx-countdown-timer");
            const elProgressBar = document.getElementById("fx-progress-bar");
            const elSubmitBtn = document.getElementById("fx-submit-btn");

            if (elSubmitBtn) {
                elSubmitBtn.removeAttribute("disabled");
                elSubmitBtn.classList.remove("cursor-not-allowed", "opacity-40");
                elSubmitBtn.innerText = "确认执行交易 (Execute)";
            }
            if (elProgressBar) {
                elProgressBar.style.width = "100%";
                elProgressBar.classList.remove("from-red-500", "to-rose-600");
                elProgressBar.classList.add("from-emerald-500", "to-teal-400", "opacity-100");
            }

            fxTimerHandle = setInterval(() => {
                fxRemainingSeconds -= 0.1;
                if (elTimerText) elTimerText.innerText = `${Math.max(0, fxRemainingSeconds).toFixed(1)}s`;
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / 10.0) * 100}%`;

                if (fxRemainingSeconds <= 3.0 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                if (fxRemainingSeconds <= 0) {
                    clearInterval(fxTimerHandle);
                    fxTimerHandle = null;
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 锁价合同超时解体作废！`);
                    if (elSubmitBtn) {
                        elSubmitBtn.setAttribute("disabled", "true");
                        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                        elSubmitBtn.innerText = "合同已过期作废";
                    }
                    if (modalConfirm) modalConfirm.dataset.currentRate = "0";
                }
            }, 100);

        } else {
            const errorMsg = result.detail || "中台拒绝本笔交易";
            if (typeof pushAuditLog === "function") pushAuditLog(`[SOR REJECTED] ❌ 询价遭拒: ${errorMsg}`);
            alert(`中台拒绝报价: ${errorMsg}`);
        }
    } catch (err) {
        if (elInquiryBtn) { elInquiryBtn.removeAttribute("disabled"); elInquiryBtn.innerText = "获取即期汇率报价 (Request Quote)"; }
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 通信断路: ${err.message}`);
    }
}

/**
 * 💱 2. 实弹确权交割算子（【硬伤 2 完美绝杀】：大胜后自动、流式扣动 fetchBalances 重绘全局）
 */
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const quoteTimestamp = parseFloat(document.getElementById("fx-quote-timestamp").value || "0");
    const modalConfirm = document.getElementById("fx-modal-confirm");
    const fxRate = modalConfirm ? parseFloat(modalConfirm.dataset.currentRate || "0") : 0;
    const routingVia = modalConfirm ? modalConfirm.dataset.routingVia || "" : "";

    if (!sellAmount || fxRate <= 0 || !routingVia) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同失效，拒绝向中台打流！`);
        return;
    }

    // 金融级一次性防刷锁，斩断高频重复打码
    const elSubmitBtn = document.getElementById("fx-submit-btn");
    if (elSubmitBtn) {
        elSubmitBtn.setAttribute("disabled", "true");
        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-40");
        elSubmitBtn.innerText = "正在向公网打流交割清算中...";
    }

    try {
        const response = await client(`/fx/convert?sell_currency=${sellCurrency.toUpperCase()}&sell_amount=${sellAmount}&buy_currency=${buyCurrency.toUpperCase()}&fx_rate=${fxRate}&routing_via=${routingVia.toUpperCase()}&quote_timestamp=${quoteTimestamp}`, {
            method: "POST"
        });

        // =================================================================
        // 🟢 【第一刀纠偏完全体】：大获全换汇结算处理
        // =================================================================
        if (response.status === 200) {
            const data = await response.json();
            if (fxTimerHandle) { clearInterval(fxTimerHandle); fxTimerHandle = null; }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割成功！流水批次: ${data.fx_batch_ref}`);
            }
            
            // 顺利退出第二合同确认窗
            if (modalConfirm) modalConfirm.classList.add("pointer-events-none", "opacity-0");
            const elSellAmount = document.getElementById("sell-amount");
            if (elSellAmount) elSellAmount.value = "";
            
            // 🔌 绝杀点：直接检查并呼叫全局 window.fetchBalances，彻底解决匿名作用域丢失！
            if (typeof window.fetchBalances === "function") {
                if (typeof pushAuditLog === "function") {
                    pushAuditLog(`[LIVE AUTOMATION] 物理轧差锁定，正在等待云端多账本清算对齐...`);
                }
                setTimeout(async () => {
                    await window.fetchBalances(); 
                    if (typeof pushAuditLog === "function") {
                        pushAuditLog(`[LIVE REPAINT] 🟢 全局多币种可用头寸重绘重组完毕，数字已自发自动更新！`);
                    }
                }, 400); // ⚡ 刚性延迟 400 毫秒，彻底防止对账引擎抢仓，确保抓回最新结转账目！
            }
        } else {
            // ❌ 如果第一发网关请求被中台拒绝（非 200 分支），恢复确认按钮通电状态供重新发起
            if (elSubmitBtn) { 
                elSubmitBtn.removeAttribute("disabled"); 
                elSubmitBtn.innerText = "确认执行交易 (Execute)"; 
            }
            const data = await response.json();
            if (typeof pushAuditLog === "function") pushAuditLog(`[FX REJECTED] 交割失败: ${data.detail || "中台拒绝"}`);
        }
    } catch (catchErr) {
        // 🛡️ 只有进入物理断路舱，才恢复按钮状态并安全吃掉异常
        if (elSubmitBtn) { 
            elSubmitBtn.removeAttribute("disabled"); 
            elSubmitBtn.innerText = "确认执行交易 (Execute)"; 
        }
        if (typeof pushAuditLog === "function") {
            pushAuditLog(`[FX TIMEOUT] 外汇物理通信断路: ${catchErr.message}`);
        }
    }
}
/**
 * 🔒 3. 强力注销红字冲正算子
 */
window.forceCancelFxTimer = function() {
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
        window.pushAuditLog("[FX ABORT] ⚖️ 操盘手主动撤销合同，固价合同安全注销，10S时钟大闸释放冲正。");
    }
};