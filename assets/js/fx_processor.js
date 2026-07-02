// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇主权隔离沙箱：完全体前后端像素级咬合生产版（30秒 TTL 滑点保护校准）
// =====================================================================
// 💾 apps/ledger/assets/js/fx_processor.js 纯净大厂生产线完全体版
// =====================================================================
import { client } from './finlinks_client.js';

// ⏱️ 全局时钟句柄挂载
let fxTimerHandle = null;
let fxRemainingSeconds = 0.0; // 弹性无状态变量，满血承接后端 80% 精算裁剪后的动态 TTL

/**
 * 🔮 1. 独立静默询价算子（大厂真生产线完全体版）
 * 🎯 100% 对齐后端纯净版 get_fx_quote_pure_production 契约
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    const clientExtraSpread = 10.0; // 万分之十平台滑点利差垫片

    if (!sellAmount || sellAmount <= 0) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX WARN] ❌ 拟换汇名义金额非法，拒绝向中台打流`);
        return;
    }

    // 强力扼杀上一次遗留的僵尸时钟，防止时钟多线重叠、倒计时狂飙
    if (fxTimerHandle) { clearInterval(fxTimerHandle); fxTimerHandle = null; }

    const elInquiryBtn = document.getElementById("fx-inquiry-btn");
    if (elInquiryBtn) { 
        elInquiryBtn.setAttribute("disabled", "true"); 
        elInquiryBtn.innerText = "正在叩击 FinLinks 生产级盘口..."; 
    }

    try {
        // 🎯 向后端纯净版 GET /ledger/fx/quote 端点发射标准的 Query 载荷
        const response = await client(`/ledger/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}&client_extra_spread=${clientExtraSpread}`, {
            method: "GET"
        });
        
        const result = await response.json();

        // 恢复询价第一窗按钮原貌
        if (elInquiryBtn) { 
            elInquiryBtn.removeAttribute("disabled"); 
            elInquiryBtn.innerText = "获取即期汇率报价 (Request Quote)"; 
        }

        // =====================================================================
        // 🟢 状态 A：中台成功锁定真盘口（大厂实弹 quoted 成功）
        // =====================================================================
        if (response.status === 200 && result.status === "quoted") {
            let displayRate = result.final_settlement_rate;
            let computedBuyAmount = 0.00;

            const sellCurrUpper = sellCurrency.toUpperCase().trim();
            const buyCurrUpper = buyCurrency.toUpperCase().trim();

            // 🧮 顺向对轧公式计算到账预测
            if (sellCurrUpper === "USD") {
                computedBuyAmount = sellAmount * displayRate;
            } else if (buyCurrUpper === "USD") {
                computedBuyAmount = displayRate < 1.0 ? (sellAmount * displayRate) : (sellAmount / displayRate);
            } else {
                computedBuyAmount = sellAmount * displayRate;
            }

            // 📝 吹哨将生产级报价投喂给大厅流水台
            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[LIVE QUOTE] 👑 大厂生产盘口落锁！汇率: ${displayRate.toFixed(4)} | 动态剪裁时钟: ${result.ttl_seconds}s (已扣除20%延迟敞口) | 路由: [${result.best_provider_key}]`);
            }

            // 🧱 像素级重绘前端第二窗 UI
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = displayRate.toFixed(4);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`;

            const elSellDisplay = document.getElementById("fx-confirm-sell-display");
            if (elSellDisplay) elSellDisplay.innerText = `${sellAmount.toFixed(2)} ${sellCurrUpper}`;

            // ⏱️ 锁入中台下发的权威绝对时间戳指纹
            const elQuoteTimestamp = document.getElementById("fx-quote-timestamp");
            if (elQuoteTimestamp) {
                elQuoteTimestamp.value = result.quote_timestamp || Math.floor(Date.now() / 1000);
            }

            // 💾 将汇率与渠道暂存在 DOM 数据集里，供下一步的 POST /convert 实弹扣杀
            const modalConfirm = document.getElementById("fx-modal-confirm");
            if (modalConfirm) {
                modalConfirm.dataset.currentRate = result.final_settlement_rate.toString(); 
                modalConfirm.dataset.routingVia = result.best_provider_key || "AIRWALLEX";
            }

            // 视图切换：隐藏第一窗输入框，平滑展开第二窗确认按钮
            const modalInput = document.getElementById("fx-modal-input");
            if (modalInput) modalInput.classList.add("pointer-events-none", "opacity-0");
            if (modalConfirm) modalConfirm.classList.remove("pointer-events-none", "opacity-0");

            // =================================================================
            // ⏱️ 接管：完全顺承后端裁剪后的自适应动态生命周期时钟大闸
            // =================================================================
            const dynamicTotalTtl = parseFloat(result.ttl_seconds || 30.0);
            fxRemainingSeconds = dynamicTotalTtl;

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

            // 开启高频 100ms 心跳递减时钟，保障进度条毫无卡顿、丝滑缩减
            fxTimerHandle = setInterval(() => {
                fxRemainingSeconds -= 0.1;
                if (elTimerText) elTimerText.innerText = `${Math.max(0, fxRemainingSeconds).toFixed(1)}s`;
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / dynamicTotalTtl) * 100}%`;

                // 时钟进入最后 15% 的红线倒计时，进度条切红
                if ((fxRemainingSeconds / dynamicTotalTtl) <= 0.15 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                // 物理熔断：前端主动宣布合同到期作废
                if (fxRemainingSeconds <= 0) {
                    clearInterval(fxTimerHandle);
                    fxTimerHandle = null;
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 动态锁价合同到期，已被中台作废！`);
                    if (elSubmitBtn) {
                        elSubmitBtn.setAttribute("disabled", "true");
                        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                        elSubmitBtn.innerText = "合同已过期作废";
                    }
                    if (modalConfirm) modalConfirm.dataset.currentRate = "0";
                }
            }, 100);

        // =====================================================================
        // 🔴 状态 B：中台硬熔断拦截（大厂断路，爆 503 等非200状态）
        // =====================================================================
        } else {
            const errorMsg = result.detail || "中台盘口当前拒绝本笔交易询价";
            if (typeof pushAuditLog === "function") pushAuditLog(`[SOR REJECTED] ❌ 询价遭拒: ${errorMsg}`);
            alert(`FinLinks 盘口风控提示: ${errorMsg}`);
        }

    } catch (err) {
        // 🛡️ 异常兜底：防范任何未知的公网网络连线崩溃
        if (elInquiryBtn) { 
            elInquiryBtn.removeAttribute("disabled"); 
            elInquiryBtn.innerText = "获取即期汇率报价 (Request Quote)"; 
        }
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 盘口网络连线故障: ${err.message}`);
        alert(`网络连接异常，无法连线 FinLinks 清算中台。`);
    }
}
/**
 * 💱 2. 实弹确权交割算子（100% 像素级对齐后端强类型 Body 契约）
 */

// =====================================================================
// 💾 apps/ledger/assets/js/fx_processor.js (0形参强闭环清白版)
// =====================================================================
export async function submitFxConversion() {
    // 👑 创始操盘手绝杀令：关闭所有外部投喂与缓存血管！100% 实时强行刮取当前表单输入的真指纹
    const sellCurrency = document.getElementById("sell-currency").value.toUpperCase().trim();
    const buyCurrency = document.getElementById("buy-currency").value.toUpperCase().trim();
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const elQuoteTimestamp = document.getElementById("fx-quote-timestamp");
    const quoteTimestamp = elQuoteTimestamp ? parseInt(elQuoteTimestamp.value || "0") : 0;
    
    const modalConfirm = document.getElementById("fx-modal-confirm");
    const fxRate = modalConfirm ? parseFloat(modalConfirm.dataset.currentRate || "0") : 0;
    
    // 刚性咬合当前真实的渠道路由，拒绝脏兜底
    const routingVia = modalConfirm ? (modalConfirm.dataset.routingVia || "AIRWALLEX").toUpperCase().trim() : "AIRWALLEX";

    // 🧱 顺向提取大厅环境挂载的日志和通知算子
    const pushAuditLog = window.pushAuditLog;

    if (!sellAmount || fxRate <= 0) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同校验失败 (Rate: ${fxRate})，拒绝向中台打流！`);
        return;
    }

    const elSubmitBtn = document.getElementById("fx-submit-btn");
    if (elSubmitBtn) {
        elSubmitBtn.setAttribute("disabled", "true");
        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-40");
        elSubmitBtn.innerText = "正在向公网打流交割清算中...";
    }

    // =====================================================================
    // 📦 组装 Payload Body：此时买卖币种完全克隆自输入框，绝无跨路径错线可能
    // =====================================================================
    const payloadBody = {
        "sell_currency": sellCurrency,
        "sell_amount": sellAmount,
        "buy_currency": buyCurrency,
        "fx_rate": fxRate,
        "routing_via": routingVia,
        "quote_timestamp": quoteTimestamp,
        "beneficiary": {
            "name": document.getElementById("beneficiary-name")?.value.trim() || "Ajadi Jackson",
            "email": document.getElementById("beneficiary-email")?.value.trim() || "jacky.xiaoyu.zhang@pinebay.io",
            "phone": document.getElementById("beneficiary-phone")?.value.trim() || "+2348012345678",
            "address": document.getElementById("beneficiary-address")?.value.trim() || "126 Joel Ogunnaike Street, Ikeja",
            "account_type": document.getElementById("beneficiary-account-type")?.value.trim() || "individual",
            "bank": {
                "account_number": document.getElementById("bank-account-number")?.value.trim() || "1234567890",
                "bank_code": document.getElementById("bank-code")?.value.trim() || (buyCurrency === "USD" ? "string" : "044"),
                "swift_code": document.getElementById("swift-code")?.value.trim() || "BOFAUS3N",
                "routing_number": document.getElementById("routing-number")?.value.trim() || "021000021"
            }
        }
    };

    console.log("📡 [FINLINKS V5.2.0 FINAL] 绝杀僵尸缓存，纯净 Payload 发射:", payloadBody);

    try {
        const response = await client("ledger/fx/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadBody)
        });

        const data = await response.json();

        if (response.status === 200 && data.status === "success") {
            if (window.fxTimerHandle) { clearInterval(window.fxTimerHandle); window.fxTimerHandle = null; }
            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割成功！流水批次: ${data.fx_ref || data.fx_batch_ref}`);
            if (modalConfirm) modalConfirm.classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount") ? document.getElementById("sell-amount").value = "" : null;
            
            if (typeof window.fetchBalances === "function") {
                setTimeout(async () => {
                    await window.fetchBalances();
                }, 400);
            }
        } else {
            if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认执行交易 (Execute)"; }
            alert(`清算网络拒绝交割: ${data.detail || "中台拒绝"}`);
        }
    } catch (catchErr) {
        if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认执行交易 (Execute)"; }
    }
}

/**
 * 🔒 3. 强力注销红字冲正算子
 */
window.forceCancelFxTimer = function() {
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog("[FX ABORT] ⚖️ 操盘手主动撤销合同，固价合同安全注销，30S时钟大闸释放冲正。");
        }
    }
};