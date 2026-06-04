// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇主权隔离沙箱：完美支持双窗解耦生命周期

import { client } from './finlinks_client.js';

let fxTimerHandle = null;
let fxRemainingSeconds = 10.0;

/**
 * 🔮 1. 独立静默询价算子（完全对齐直接标价法与三角套汇清算逻辑）
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

        // =================================================================
        // 👑 🟢 【中央自愈并线大闸】：全面对齐直接标价与 1500/100=15 轧差公式
        // =================================================================
        if (response.status === 200 && result.status === "quoted") {
            let displayRate = result.final_settlement_rate;
            let computedBuyAmount = 0.00;

            const sellCurrUpper = sellCurrency.toUpperCase().trim();
            const buyCurrUpper = buyCurrency.toUpperCase().trim();

            // =================================================================
            // 👑 【第二刀防投毒解算闸】：智能适配单边大盘价、倒数价与三角交叉盘
            // =================================================================
            if (sellCurrUpper === "USD") {
                // 极性 1：卖美金换法币（左侧交易） -> 10 USD * 1500 = 15000 NGN
                computedBuyAmount = sellAmount * displayRate;
            } else if (buyCurrUpper === "USD") {
                // 极性 2：卖法币换美金（右侧交易） 
                // 🔌 智能化拦截：如果后端直接吐出了倒数汇率（如 0.000664），则直接相乘！
                // 如果后端吐出的是大盘直观价（如 1423.98），则执行除法！彻底绝杀一亿美金的魔幻错误数字！
                if (displayRate < 1.0) {
                    computedBuyAmount = sellAmount * displayRate; // 0.000664 极性自愈
                } else {
                    computedBuyAmount = sellAmount / displayRate; // 1423.98 极性自愈
                }
                
                // 为了保障操盘手对大盘的直观感知，如果抓到的是倒数，前台屏幕高能回正为大盘价显示！
                if (displayRate < 1.0 && displayRate > 0) {
                    displayRate = 1 / displayRate;
                }
            } else {
                // 极性 3：地缘小币种交叉盘（如 KES -> NGN 或 NGN -> KES）
                // 后端三角套汇分支已回正为标准的直接大盘比值（如 15.00），前台直接稳健执行乘法！
                computedBuyAmount = sellAmount * displayRate;
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[LIVE AMNESTY] 算力对齐大胜！直观盘口价: ${displayRate.toFixed(4)} | 到账预测: ${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`);
            }

            // =================================================================
            // 👑 下方原本刷写 DOM 节点、隐藏第一窗、弹起第二窗、10S 进度条时钟点火逻辑完全保留
            // =================================================================
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = displayRate.toFixed(4);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`;

            const elSellDisplay = document.getElementById("fx-confirm-sell-display");
            if (elSellDisplay) elSellDisplay.innerText = `${sellAmount.toFixed(2)} ${sellCurrUpper}`;

            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp || result.created_at;
            const modalConfirm = document.getElementById("fx-modal-confirm");
            if (modalConfirm) {
                modalConfirm.dataset.currentRate = result.final_settlement_rate; 
                modalConfirm.dataset.routingVia = result.best_provider_key || result.routing_via;
            }

            // =================================================================
            // 👑 【时序齿轮轮转】：静默收卷第一输入窗，霸屏跳出第二合同确认窗！
            // =================================================================
            const modalInput = document.getElementById("fx-modal-input");
            if (modalInput) modalInput.classList.add("pointer-events-none", "opacity-0");
            if (modalConfirm) modalConfirm.classList.remove("pointer-events-none", "opacity-0");

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 极性全量回正！大厅执行汇率: ${displayRate.toFixed(4)} | 预期到账金额: ${computedBuyAmount.toFixed(2)}`);
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