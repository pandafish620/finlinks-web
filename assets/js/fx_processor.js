// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇主权沙箱：引入 10s 流式时钟进度条锁，超时自动单据解体绝杀

import { client } from './finlinks_client.js';

// 🔒 声明一个全局独占的时钟句柄与剩余秒数，确保多次点击时自发执行红字红单冲正，决不发生内存泄漏
let fxTimerHandle = null;
let fxRemainingSeconds = 10.0;

/**
 * 🔮 1. 即期活体询价（对齐后端 /ledger/fx/quote，高能点火 10 秒时钟锁）
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    // 📈 散户个性化加点：默认叠加入场 10 Bps 的溢价保护垫
    const clientExtraSpread = 10.0; 

    if (!sellAmount || sellAmount <= 0) return;

    // 🛡️ 防御前置：如果上一次的时钟还在跑，就地强行将其按死清理，防止多重时钟踩踏！
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
    }

    try {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR LIVE] 正在发起独立外汇算力询价: ${sellCurrency} -> ${buyCurrency}`);
        
        const response = await client(`/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}&client_extra_spread=${clientExtraSpread}`, {
            method: "GET"
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "quoted") {
            let currentRate = result.final_settlement_rate;
            
            // 场景 A 汇率反转校准：卖出侧是 USD 时，底下的执行汇率取倒数，完美向左侧交易看齐
            if (sellCurrency.toUpperCase() === "USD") {
                currentRate = 1 / currentRate;
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 通道锁价大胜！路由通道: ${result.routing_via} | 锁定执行价: ${currentRate.toFixed(6)}`);
            }

            // 1. 动态渲染前端 UI 节点值
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount.toFixed(2)} ${buyCurrency}`;

            // 2. 封印核心锁价合同资产凭证到 DOM 状态
            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp;
            const modal = document.getElementById("fx-modal");
            if (modal) {
                modal.dataset.currentRate = result.final_settlement_rate; 
                modal.dataset.routingVia = result.routing_via;
            }

            // =================================================================
            // 👑 👑 👑 【 10秒即期滑点保护时钟大闸正式点火 】 👑 👑 👑
            // =================================================================
            fxRemainingSeconds = 10.0;
            const elTimerText = document.getElementById("fx-countdown-timer");
            const elProgressBar = document.getElementById("fx-progress-bar");
            const elSubmitBtn = document.getElementById("fx-submit-btn");

            // 恢复确认按钮的通电状态
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

            // 扣动每 100 毫秒高频刷新的流式进度条扳手（100ms 刷新一次，体验极其丝滑）
            fxTimerHandle = setInterval(() => {
                fxRemainingSeconds -= 0.1;
                
                // A. 冲刷时间文本上屏
                if (elTimerText) elTimerText.innerText = `${Math.max(0, fxRemainingSeconds).toFixed(1)}s`;
                
                // B. 动态缩减 Tailwind 进度条宽度
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / 10.0) * 100}%`;

                // C. 风控警告警告提示：当时间只剩 3 秒时，进度条流式飙红警告！
                if (fxRemainingSeconds <= 3.0 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                // D. 💥 自动熔断死锁：10 秒时间耗尽，强制执行固价合同原地销毁解体！
                if (fxRemainingSeconds <= 0) {
                    clearInterval(fxTimerHandle);
                    fxTimerHandle = null;
                    
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 10s 即期滑点锁超时熔断！固价合同就地解体作废，防线就地挂闸！`);
                    
                    // 强制就地废除确认按钮，杜绝商户在超时后依旧强行跨域交割
                    if (elSubmitBtn) {
                        elSubmitBtn.setAttribute("disabled", "true");
                        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                        elSubmitBtn.innerText = "合同已过期作废";
                    }
                    if (modal) {
                        modal.dataset.currentRate = "0"; // 原地抹除内存汇率
                    }
                }
            }, 100);
        }
    } catch (err) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 外汇沙箱网络断路: ${err.message}`);
    }
}

/**
 * 💱 2. 换汇确权交割（100% 资金轧差，交割大胜后自动解体注销时钟）
 */
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const quoteTimestamp = parseFloat(document.getElementById("fx-quote-timestamp").value || "0");
    const modal = document.getElementById("fx-modal");
    const fxRate = modal ? parseFloat(modal.dataset.currentRate || "0") : 0;
    const routingVia = modal ? modal.dataset.routingVia || "" : "";

    // 双重安全卡位：如果汇率已经被时钟抹除为0，拒绝发射
    if (!sellAmount || fxRate <= 0 || !routingVia) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同已过期作废或被操盘手熔断，指令严禁下发！`);
        return;
    }

    try {
        const response = await client(`/fx/convert?sell_currency=${sellCurrency.toUpperCase()}&sell_amount=${sellAmount}&buy_currency=${buyCurrency.toUpperCase()}&fx_rate=${fxRate}&routing_via=${routingVia.toUpperCase()}&quote_timestamp=${quoteTimestamp}`, {
            method: "POST"
        });
        const data = await response.json();

        if (response.status === 200 && data.status === "success") {
            // 🔌 大获全胜，第一件事立刻注销销毁当前的 10 秒倒计时，防止其余温继续引发熔断！
            if (fxTimerHandle) {
                clearInterval(fxTimerHandle);
                fxTimerHandle = null;
            }

            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割大胜！物理流水: ${data.fx_batch_ref}`);
            if (modal) modal.classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount").value = "";
            
            if (typeof fetchBalances === "function") await fetchBalances(); 
        } else {
            const errorMsg = data.detail || "中台拒绝交割";
            if (typeof pushAuditLog === "function") pushAuditLog(`[FX REJECTED] 交割拒绝原因: ${errorMsg}`);
        }
    } catch (catchErr) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 通信血管猝死: ${catchErr.message}`);
    }
}

/**
 * 🔒 3. 操盘手主动中途叉叉弹窗（closeFxModal）时的财务红字冲正机制
 */
window.closeFxModal = function() {
    const modal = document.getElementById("fx-modal");
    if (modal) modal.classList.add("pointer-events-none", "opacity-0");
    
    // 🔌 核心平账点：操盘手关闭弹窗，说明放弃本次签署权，立刻强行刹车、震碎注销当前的 10 秒滑点时钟，释放内存资源！
    if (fxTimerHandle) {
        clearInterval(fxTimerHandle);
        fxTimerHandle = null;
        window.pushAuditLog("[FX ABORT] ⚖️ 操盘手主动撤销签署权，固价合同在途注销，时钟锁就地强制释放冲正。");
    }
};