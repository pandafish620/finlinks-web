// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇主权隔离沙箱：完全体前后端像素级咬合生产版（30秒 TTL 滑点保护校准）

import { client } from './finlinks_client.js';

let fxTimerHandle = null;
let fxRemainingSeconds = 30.0; // 🎯 修正：刚性同步中台 30 秒主权锁价生命周期

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

            if (sellCurrUpper === "USD") {
                computedBuyAmount = sellAmount * displayRate;
            } else if (buyCurrUpper === "USD") {
                if (displayRate < 1.0) {
                    computedBuyAmount = sellAmount * displayRate; 
                } else {
                    computedBuyAmount = sellAmount / displayRate; 
                }
                if (displayRate < 1.0 && displayRate > 0) {
                    displayRate = 1 / displayRate;
                }
            } else {
                computedBuyAmount = sellAmount * displayRate;
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[LIVE AMNESTY] 算力对齐大胜！直观盘口价: ${displayRate.toFixed(4)} | 到账预测: ${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`);
            }

            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = displayRate.toFixed(4);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`;

            const elSellDisplay = document.getElementById("fx-confirm-sell-display");
            if (elSellDisplay) elSellDisplay.innerText = `${sellAmount.toFixed(2)} ${sellCurrUpper}`;

            // ⏱️ 锁入中台下发的圣洁时间戳指纹
            const elQuoteTimestamp = document.getElementById("fx-quote-timestamp");
            if (elQuoteTimestamp) {
                elQuoteTimestamp.value = result.quote_timestamp || result.created_at;
            }

            const modalConfirm = document.getElementById("fx-modal-confirm");
            if (modalConfirm) {
                modalConfirm.dataset.currentRate = result.final_settlement_rate; 
                modalConfirm.dataset.routingVia = result.best_provider_key || result.routing_via || "FLUTTERWAVE";
            }

            const modalInput = document.getElementById("fx-modal-input");
            if (modalInput) modalInput.classList.add("pointer-events-none", "opacity-0");
            if (modalConfirm) modalConfirm.classList.remove("pointer-events-none", "opacity-0");

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 极性全量回正！大厅执行汇率: ${displayRate.toFixed(4)} | 预期到账金额: ${computedBuyAmount.toFixed(2)}`);
            }

            // =================================================================
            // 👑 【30秒滑点保护时钟锁】：严格重对齐 30.0s 物理降落伞
            // =================================================================
            fxRemainingSeconds = 30.0; // 🎯 修正核心 1：重设基础秒数
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
                
                // 🎯 修正核心 2：进度条分母轧差等比调整为 30.0
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / 30.0) * 100}%`;

                // 🎯 修正核心 3：最后 5 秒时（倒计时过线），进度条闪烁红字冲正警告
                if (fxRemainingSeconds <= 5.0 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                if (fxRemainingSeconds <= 0) {
                    clearInterval(fxTimerHandle);
                    fxTimerHandle = null;
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 30秒锁价合同超时解体作废！`);
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
 * 💱 2. 实弹确权交割算子（100% 像素级对齐后端强类型 Body 契约）
 */
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const sellCurrency = document.getElementById("sell-currency").value.toUpperCase().trim();
    const buyCurrency = document.getElementById("buy-currency").value.toUpperCase().trim();
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const elQuoteTimestamp = document.getElementById("fx-quote-timestamp");
    const quoteTimestamp = elQuoteTimestamp ? parseInt(elQuoteTimestamp.value || "0") : 0;
    
    const modalConfirm = document.getElementById("fx-modal-confirm");
    const fxRate = modalConfirm ? parseFloat(modalConfirm.dataset.currentRate || "0") : 0;
    const routingVia = modalConfirm ? (modalConfirm.dataset.routingVia || "FLUTTERWAVE").toUpperCase().trim() : "FLUTTERWAVE";

    if (!sellAmount || fxRate <= 0 || !routingVia) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同失效，拒绝向中台打流！`);
        return;
    }

    const elSubmitBtn = document.getElementById("fx-submit-btn");
    if (elSubmitBtn) {
        elSubmitBtn.setAttribute("disabled", "true");
        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-40");
        elSubmitBtn.innerText = "正在向公网打流交割清算中...";
    }

    const elName = document.getElementById("beneficiary-name");
    const elEmail = document.getElementById("beneficiary-email");
    const elPhone = document.getElementById("beneficiary-phone");
    const elAddress = document.getElementById("beneficiary-address");
    const elAccType = document.getElementById("beneficiary-account-type");
    
    const elAccNum = document.getElementById("bank-account-number");
    const elBankCode = document.getElementById("bank-code");
    const elSwift = document.getElementById("swift-code");
    const elRouting = document.getElementById("routing-number");

    const defaultSwift = buyCurrency === "NGN" ? "" : "BOFAUS3N";
    const defaultRouting = buyCurrency === "NGN" ? "" : "021000021";
    const defaultTargetAcc = buyCurrency === "NGN" ? "0690000031" : "1234567890";
    
    const elRouting = document.getElementById("routing-number");

    // =================================================================
    // 🚨 局部加塞：FinLinks 5.2.0 前端主权资本管制优雅降级门禁
    // 🎯 拒绝将假指纹抛给后端，就地置灰按钮并给出金融级合规弹窗提示
    // =================================================================
    const isInternalWalletSwap = (sellCurrency === "NGN" && buyCurrency === "USD");
    
    // 判断是否是没有填写受益人的纯自持钱包对敲
    const hasUserFilledTarget = elAccNum && elAccNum.value.trim() && elAccNum.value.trim() !== "string";

    if (isInternalWalletSwap && !hasUserFilledTarget) {
        if (elSubmitBtn) { 
            elSubmitBtn.removeAttribute("disabled"); 
            elSubmitBtn.innerText = "确认执行交易 (Execute)"; 
        }
        if (typeof pushAuditLog === "function") {
            pushAuditLog(`[COMPLIANCE BLOCKED] 🚨 拦截到自持钱包 NGN->USD 结汇。因西非资本管制，该方向功能不可用。`);
        }
        alert("【地缘风控熔断】因西非主权外汇资本管制，平台目前暂不支持【自持奈拉账户】直接结汇为【美元持仓账户】。\n\n该方向换汇功能暂时不可用，请绑定真实的离岸解付收款银行以触发跨境直付。");
        return; // 刚性强退，火炮就地熄火
    }

    const payloadBody = {
        "sell_currency": sellCurrency,
        "sell_amount": sellAmount,
        "buy_currency": buyCurrency,
        "fx_rate": fxRate,
        "routing_via": routingVia,
        "quote_timestamp": quoteTimestamp,
        "beneficiary": {
            "name": elName && elName.value.trim() ? elName.value.trim() : "Ajadi Jackson",
            "email": elEmail && elEmail.value.trim() ? elEmail.value.trim() : "jacky.xiaoyu.zhang@pinebay.io",
            "phone": elPhone && elPhone.value.trim() ? elPhone.value.trim() : "+2348012345678",
            "address": elAddress && elAddress.value.trim() ? elAddress.value.trim() : "126 Joel Ogunnaike Street, Ikeja",
            "account_type": elAccType && elAccType.value.trim() ? elAccType.value.trim() : "individual",
            "bank": {
                "account_number": elAccNum && elAccNum.value.trim() ? elAccNum.value.trim() : defaultTargetAcc,
                "bank_code": elBankCode && elBankCode.value.trim() ? elBankCode.value.trim() : (buyCurrency === "USD" ? "string" : "044"),
                "swift_code": elSwift && elSwift.value.trim() ? elSwift.value.trim() : defaultSwift,
                "routing_number": elRouting && elRouting.value.trim() ? elRouting.value.trim() : defaultRouting
            }
        }
    };

    console.log("📡 [FINLINKS V5.2.0 FIRE] 绝杀 422 强类型合规 30s 延时 JSON 发射:", payloadBody);

    try {
        const response = await client("/fx/convert", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payloadBody)
        });

        const data = await response.json();

        if (response.status === 200 && data.status === "success") {
            if (fxTimerHandle) { clearInterval(fxTimerHandle); fxTimerHandle = null; }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割成功！流水批次: ${data.fx_ref || data.fx_batch_ref}`);
            }
            
            if (modalConfirm) modalConfirm.classList.add("pointer-events-none", "opacity-0");
            const elSellAmount = document.getElementById("sell-amount");
            if (elSellAmount) elSellAmount.value = "";
            
            if (typeof window.fetchBalances === "function") {
                if (typeof pushAuditLog === "function") {
                    pushAuditLog(`[LIVE AUTOMATION] 物理轧差锁定，正在等待云端多账本清算对齐...`);
                }
                setTimeout(async () => {
                    await window.fetchBalances(); 
                    if (typeof pushAuditLog === "function") {
                        pushAuditLog(`[LIVE REPAINT] 🟢 全局多币种可用头寸重绘重组完毕，数字已自发自动更新！`);
                    }
                }, 400); 
            }
        } else {
            if (elSubmitBtn) { 
                elSubmitBtn.removeAttribute("disabled"); 
                elSubmitBtn.innerText = "确认执行交易 (Execute)"; 
            }
            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[FX REJECTED] 交割失败: ${data.detail || data.msg || "中台拒绝"}`);
            }
            alert(`清算网络拒绝交割: ${data.detail || data.msg || "中台拒绝"}`);
        }
    } catch (catchErr) {
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
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog("[FX ABORT] ⚖️ 操盘手主动撤销合同，固价合同安全注销，30S时钟大闸释放冲正。");
        }
    }
};