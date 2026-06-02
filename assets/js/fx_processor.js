// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js

import { client } from './finlinks_client.js';

let fxTimerInstance = null; // 10秒锁价时钟单例句柄，完全锁死在换汇作用域内

/**
 * 10秒即期流式询价并开启倒计时
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurr = document.getElementById("sell-currency")?.value;
    const buyCurr = document.getElementById("buy-currency")?.value;
    const sellAmt = parseFloat(document.getElementById("sell-amount")?.value || 0);

    if (!sellAmt || sellAmt <= 0) return;
    if (fxTimerInstance) clearInterval(fxTimerInstance); // 强制核销存量老时钟，防止内存穿仓

    try {
        const response = await client(`/ledger/fx/quote?sell_currency=${sellCurr}&buy_currency=${buyCurr}&sell_amount=${sellAmt}`, { method: "GET" });
        if (response.status === 200) {
            const data = await response.json();
            
            // 像素级刷新模态框内部组件
            document.querySelectorAll(".fx-rate-display").forEach(el => el.innerText = data.lock_rate);
            const previewAmt = document.getElementById("buy-amount-preview");
            const stampInput = document.getElementById("fx-quote-timestamp");
            const progressBar = document.getElementById("fx-progress-bar");
            const timerTxt = document.getElementById("fx-countdown-timer");

            if (previewAmt) previewAmt.innerText = data.expected_buy_amount.toLocaleString(undefined, {minimumFractionDigits: 2});
            if (stampInput) stampInput.value = data.quote_timestamp;

            pushAuditLog(`[SOR QUOTE] 通道询价成功！最优路由: EBANX | 锁定汇率: ${data.lock_rate}`);

            // 👑 10秒时钟锁并线点火
            let timeLeft = 10.0;
            if (timerTxt) timerTxt.innerText = `${timeLeft.toFixed(1)}s`;
            if (progressBar) progressBar.style.width = "100%";

            fxTimerInstance = setInterval(() => {
                timeLeft -= 0.1;
                if (timerTxt) timerTxt.innerText = `${Math.max(0, timeLeft).toFixed(1)}s`;
                if (progressBar) progressBar.style.width = `${(timeLeft / 10) * 100}%`;

                if (timeLeft <= 0) {
                    clearInterval(fxTimerInstance);
                    pushAuditLog(`[SOR TIMEOUT] 10秒即期固价时钟锁触发硬熔断！当前报价作废。`);
                    document.getElementById("fx-modal")?.classList.add("pointer-events-none", "opacity-0");
                    showPremiumNotification("⚠️ 报价超时熔断", "即期汇率已发生漂移，请重新触发行情询价。", "amber");
                }
            }, 100);
        }
    } catch (error) {
        pushAuditLog(`[SOR ERROR] 询价网络挂起: ${error.message}`);
    }
}

/**
 * 确权核销交割
 */
export async function submitFxConversion(evt, btn, forcedRouting, pushAuditLog, showPremiumNotification, fetchBalances) {
    if (fxTimerInstance) clearInterval(fxTimerInstance); // 一旦操盘手确权，立刻解脱时钟，防止重叠熔断

    const sellCurr = document.getElementById("sell-currency")?.value;
    const buyCurr = document.getElementById("buy-currency")?.value;
    const sellAmt = parseFloat(document.getElementById("sell-amount")?.value || 0);
    const fxRate = parseFloat(document.querySelectorAll(".fx-rate-display")[0]?.innerText || 0);
    const timestamp = document.getElementById("fx-quote-timestamp")?.value;

    try {
        const payload = {
            sell_currency: sellCurr,
            sell_amount: sellAmt,
            buy_currency: buyCurr,
            fx_rate: fxRate,
            quote_timestamp: parseInt(timestamp),
            routing_via: forcedRouting || "EBANX"
        };

        const response = await client("/ledger/fx/convert", { method: "POST", body: payload });
        if (response.status === 200) {
            pushAuditLog(`[SUCCESS] 跨币种原子化对冲大胜！`);
            showPremiumNotification("🏁 外汇交割核销大捷", `资产已成功划转`, "emerald");
            await fetchBalances(); // 触发主控刷新
            document.getElementById("fx-modal")?.classList.add("pointer-events-none", "opacity-0");
        } else {
            const result = await response.json().catch(() => ({}));
            pushAuditLog(`[FX REJECTED] 中台拒绝交割: ${result.detail}`);
        }
    } catch (error) {
        pushAuditLog(`[FX CRITICAL ERROR] 通路中断: ${error.message}`);
    }
}