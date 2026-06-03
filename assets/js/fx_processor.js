// -*- coding: utf-8 -*-
// 文件位置：assets/js/fx_processor.js
// 🎯 FinLinks 5.2.0 外汇即期交割独立沙箱：100% 采用统一 client，杜绝硬编码与跨域熔断

import { client } from './finlinks_client.js';

/**
 * 🔮 1. 独立沙箱即期询价（完美对齐 backend 独立路由）
 */
export async function triggerLiveQuote(pushAuditLog, showPremiumNotification) {
    const sellCurrency = document.getElementById("sell-currency").value;
    const buyCurrency = document.getElementById("buy-currency").value;
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);
    
    // 📈 散户个性化加点：可以从特定的输入框拉取，默认给 10 Bps 的溢价保护垫
    const clientExtraSpread = 10.0; 

    if (!sellAmount || sellAmount <= 0) return;

    try {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SANDBOX FX] 正在通过统一 client 总线发起独立外汇询价...`);
        
        // 🔌 像素级对齐后端新设的 fx_router.py /ledger/fx/quote 血管，加入 client_extra_spread 参数
        const response = await client(`/fx/quote?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmount}&client_extra_spread=10.0`, {
            method: "GET"
        });
        const result = await response.json();

        if (response.status === 200 && result.status === "quoted") {
            let currentRate = result.final_settlement_rate;
            
            // 检测本位币左侧交易，执行反转算力
            if (sellCurrency.toUpperCase() === "USD") {
                currentRate = 1 / currentRate;
                if (typeof pushAuditLog === "function") pushAuditLog(`[SOR RATIO] 识别到本位币左侧交易，重绘倒数算力。`);
            }

            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[SOR QUOTE] 外汇沙箱对撞大胜！清算通道: ${result.routing_via} | 最终执行价: ${currentRate.toFixed(6)}`);
            }

            // 渲染大厅前端文本节点
            const elRateDisplay = document.querySelector(".fx-rate-display");
            if (elRateDisplay) elRateDisplay.innerText = currentRate.toFixed(6);
            
            const elPreview = document.getElementById("buy-amount-preview");
            if (elPreview) elPreview.innerText = `${result.expected_buy_amount.toFixed(2)} ${buyCurrency}`;

            // 将核心锁价资产凭证打入 DOM 状态
            document.getElementById("fx-quote-timestamp").value = result.quote_timestamp;
            const modal = document.getElementById("fx-modal");
            if (modal) {
                modal.dataset.currentRate = result.final_settlement_rate; 
                modal.dataset.routingVia = result.routing_via;
            }
        }
    } catch (err) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 外汇沙箱网络被阻断: ${err.message}`);
    }
}

/**
 * 💱 2. 外汇确权实弹交割（100% 资金轧差，呼叫常驻侧边栏二次点火自愈）
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
        if (typeof showPremiumNotification === "function") {
            showPremiumNotification("⚠️ 结算指令遭拒", "固价合同残缺，请重新获取活体盘口报价！", "rose");
        }
        return;
    }

    if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE CONVERT] 操盘手签署签署交割令，打出 Query 实弹电报...`);

    try {
        // 🔌 穿透统一 client 发射，带齐新设路由前缀参数
        const response = await client(`/fx/convert?sell_currency=${sellCurrency.toUpperCase()}&sell_amount=${sellAmount}&buy_currency=${buyCurrency.toUpperCase()}&fx_rate=${fxRate}&routing_via=${routingVia.toUpperCase()}&quote_timestamp=${quoteTimestamp}`, {
            method: "POST"
        });
        const data = await response.json();

        if (response.status === 200 && data.status === "success") {
            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割大胜！物理流水号: ${data.fx_batch_ref}`);
            if (typeof showPremiumNotification === "function") {
                showPremiumNotification("📥 跨币种轧差交割成功", `卖出核销: -${data.exchange_details.sell}<br>买入注入: +${data.exchange_details.buy}`, "emerald");
            }
            if (modal) modal.classList.add("pointer-events-none", "opacity-0");
            document.getElementById("sell-amount").value = "";
            
            // 👑 核心平账点：交割大胜，瞬间调用第一块积木的活体刷盘指针，逼迫侧边栏与大厅数字自发流式跳动！
            if (typeof fetchBalances === "function") await fetchBalances(); 
        } else {
            const errorMsg = data.detail || "中台拒绝交割";
            if (typeof pushAuditLog === "function") pushAuditLog(`[FX REJECTED] 交割拒绝: ${errorMsg}`);
        }
    } catch (catchErr) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 外汇核销血管通信猝死: ${catchErr.message}`);
    }
}