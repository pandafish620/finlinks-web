// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 终审完全体：外汇即期清算专属血管（100% 对齐后端 Query 与路径前缀）

// 引入全局 BASE_URL
const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const BASE_URL = IS_LOCAL ? "http://127.0.0.1:8000" : "https://finlinks-backend.onrender.com";

// =================================================================
// 🔮 1. 即期活体询价（对齐后端字段名 final_settlement_rate，动态换算倒数）
// =================================================================
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const token = localStorage.getItem("finlinks_auth_token");
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);

    if (!sellAmount || sellAmount <= 0) return;

    try {
        // 加上 /ledger 核心血管路径前缀
        const response = await fetch(`${BASE_URL}/ledger/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();

        if (response.ok && result.status === "quoted") {
            let currentRate = result.final_settlement_rate;
            
            // 👑 痛点四修复：卖出货币是 USD 时，底下的清算汇率动态取倒数，完美向左侧交易看齐！
            if (sellCurrency.toUpperCase() === "USD") {
                currentRate = 1 / currentRate;
                if (typeof pushAuditLog === "function") pushAuditLog(`[SOR RATIO] 检测到本位币左侧交易，执行汇率反转算力。`);
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 通道询价成功！最优路由: ${result.routing_via} | 锁定汇率: ${currentRate.toFixed(6)}`);
            }

            // 渲染前端 UI 节点
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount} ${buyCurrency}`;

            // 将核心锁价资产凭证打入 DOM 状态，绝不溢出
            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp;
            const modal = document.getElementById("fx-modal");
            if (modal) {
                modal.dataset.currentRate = result.final_settlement_rate; // 保持后端原始率值用于交割
                modal.dataset.routingVia = result.routing_via;
            }
        }
    } catch (err) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 询价网关阻断: ${err.message}`);
    }
}

// =================================================================
// 💱 2. 换汇确权交割（彻底纠偏 404 报错，纯净 Query 参数击发）
// =================================================================
export async function submitFxConversion(null1, null2, null3, pushAuditLog, showPremiumNotification, fetchBalances) {
    const token = localStorage.getItem("finlinks_auth_token");
    
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    const quoteTimestamp = parseFloat(document.getElementById("fx-quote-timestamp").value || "0");
    const modal = document.getElementById("fx-modal");
    const fxRate = modal ? parseFloat(modal.dataset.currentRate || "0") : 0;
    const routingVia = modal ? modal.dataset.routingVia || "" : "";

    if (!sellAmount || fxRate <= 0 || !routingVia) {
        if (typeof showPremiumNotification === "function") {
            showPremiumNotification("⚠️ 结算指令遭拒", "固价合同已过期或残缺，请重新发起询价锁定盘口！", "rose");
        }
        return;
    }

    if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE CONVERT] 签署交割令！正在将参数灌入 Query 血管...`);

    const queryParams = new URLSearchParams({
        sell_currency: sellCurrency.toUpperCase(),
        sell_amount: sellAmount,
        buy_currency: buyCurrency.toUpperCase(),
        fx_rate: fxRate,
        routing_via: routingVia.toUpperCase(),
        quote_timestamp: quoteTimestamp
    });

    try {
        // 👑 痛点二修复：加上 /ledger 前缀，彻底熔断 404 崩溃！
        const targetUrl = `${BASE_URL}/ledger/fx/convert?${queryParams.toString()}`;
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇轧差大胜！流水: ${data.fx_batch_ref}`);
            if (typeof showPremiumNotification === "function") {
                showPremiumNotification("📥 跨币种轧差交割成功", `卖出核销: -${data.exchange_details.sell}<br>买入注入: +${data.exchange_details.buy}`, "emerald");
            }
            if (modal) modal.classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount").value = "";
            if (typeof fetchBalances === "function") fetchBalances(); 
        } else {
            const errorMsg = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(" | ") : (data.detail || "中台拒绝交割");
            if (typeof pushAuditLog === "function") pushAuditLog(`[FX REJECTED] 交割失败原因: ${errorMsg}`);
        }
    } catch (catchErr) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 物理网络断路: ${catchErr.message}`);
    }
}