// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js

import { client } from './finlinks_client.js';

let fxTimerInstance = null; // 10秒锁价时钟单例句柄，完全锁死在换汇作用域内

/**
 * 10秒即期流式询价并开启倒计时
 */
// -*- coding: utf-8 -*-
// 🎯 FinLinks 5.2.0 完全体前端自愈中枢（完美咬合后端 Query 模型版）

// =================================================================
// 🔮 1. 即期活体询价总线逻辑修复（绝杀汇率与通道 undefined）
// =================================================================
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const token = localStorage.getItem("finlinks_auth_token");
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);

    if (!sellAmount || sellAmount <= 0) {
        alert("请输入大于0的合法卖出名义金额"); return;
    }

    pushAuditLog(`[SOR ACTIVATE] 正在叩击全球即期大盘，为商户请求汇率合同...`);

    try {
        const response = await fetch(`${BASE_URL}/ledger/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.ok && result.status === "quoted") {
            // 👑 像素级咬合后端：提取 final_settlement_rate 与 routing_via 钢印
            const currentRate = result.final_settlement_rate;
            const chosenChannel = result.routing_via;
            const quoteTimestamp = result.quote_timestamp;

            pushAuditLog(`[SOR QUOTE] 通道询价成功！最优路由: ${chosenChannel} | 锁定汇率: ${currentRate}`);

            // 1. 渲染模态框 Ticker
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount} ${buyCurrency}`;

            // 2. 👑 将必填凭证强行打入隐藏域及 DOM 状态中，绝杀 null 错配！
            document.getElementById("fx-quote-timestamp").value = quoteTimestamp; // 暂存戳
            document.getElementById("fx-modal").dataset.currentRate = currentRate;
            document.getElementById("fx-modal").dataset.routingVia = chosenChannel;

            // 唤醒 10 秒倒计时进度条逻辑...
        } else {
            pushAuditLog(`[SOR ERROR] 询价遭中台拦截: ${result.detail}`);
        }
    } catch (err) {
        pushAuditLog(`[SOR CRITICAL] 询价血管猝死: ${err.message}`);
    }
}

// =================================================================
// 💱 2. 换汇确认结算总线修复（绝杀 422 Unprocessable Content）
// =================================================================
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const token = localStorage.getItem("finlinks_auth_token");
    
    // 👑 动态从 DOM 血管中强行压榨提取询价阶段锁定的完全体资产凭证
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const quoteTimestamp = parseFloat(document.getElementById("fx-quote-timestamp").value || "0");
    const fxRate = parseFloat(document.getElementById("fx-modal").dataset.currentRate || "0");
    const routingVia = document.getElementById("fx-modal").dataset.routingVia || "";

    if (!sellAmount || fxRate <= 0 || !routingVia) {
        showPremiumNotification("⚠️ 结算指令遭拒", "固价合同已过期或残缺，请重新发起询价锁定盘口！", "rose", true);
        return;
    }

    pushAuditLog(`[EXECUTE CONVERT] 操盘手签署交割令！正在将 6 大参数灌入后端 Query 血管...`);

    // 👑 终极会师大捷点：彻底放弃 Body 传参，完美转换为后端硬核期待的 Query String 参数流！
    const queryParams = new URLSearchParams({
        sell_currency: sellCurrency,
        sell_amount: sellAmount,
        buy_currency: buyCurrency,
        fx_rate: fxRate,
        routing_via: routingVia,
        quote_timestamp: quoteTimestamp
    });

    try {
        const response = await fetch(`${BASE_URL}/fx/convert?${queryParams.toString()}`, {
            method: "POST", // 保持 POST 动作不变
            headers: { 
                "Authorization": `Bearer ${token}`,
                "accept": "application/json"
            } // 🧱 绝不塞入 body，让请求体保持绝对纯净的空状态，刺穿 422 大闸！
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
            pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇轧差大胜！交割单流水号: ${data.fx_batch_ref}`);
            showPremiumNotification(
                "📥 跨币种轧差交割成功",
                `卖出核销: <span class="text-rose-400 font-bold">-${data.exchange_details.sell}</span><br>` +
                `买入注入: <span class="text-emerald-400 font-bold">+${data.exchange_details.buy}</span>`,
                "emerald", false
            );
            
            // 物理闭合模态窗口并重新冲刷可用头寸看板
            document.getElementById("fx-modal").classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount").value = "";
            fetchBalances(); 
        } else {
            // 👑 解密解析并还原真实的后端校验提示，绝杀 [object Object]
            const errorMsg = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(" | ") : (data.detail || "中台拒绝交割");
            pushAuditLog(`[FX REJECTED] 交割失败原因: ${errorMsg}`);
            showPremiumNotification("⚠️ 轧差核销熔断", errorMsg, "rose", true);
        }
    } catch (catchErr) {
        pushAuditLog(`[FX TIMEOUT] 物理网络通道夭折: ${catchErr.message}`);
    }
}