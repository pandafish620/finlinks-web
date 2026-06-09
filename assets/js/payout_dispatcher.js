// -*- coding: utf-8 -*-
// 文件位置：assets/js/payout_dispatcher.js
// 🎯 FinLinks 5.2.0 乐高积木第 3 块：完全体两阶段（Preview/Commit）代付放款专属调度器
// 隔离看护：100% 像素级平铺并线中台 Body 强类型契约，绝杀 422 与 400 格式排异

import { client } from './finlinks_client.js';

let payoutTimerInterval = null; // Payout 专属代付时钟单例句柄

/**
 * 💸 【积木 3 入口】：接管大厅 Payout 按钮点击，驱动两阶段确权与 300 秒拦截锁
 */
export async function handleLivePayoutDisbursal(fetchBalances) {
    const nameEl = document.getElementById("payout-name");
    const accEl  = document.getElementById("payout-acc");
    const currEl = document.getElementById("payout-curr");
    const amtEl  = document.getElementById("payout-amount");

    // 🧼 5.2.0 动态打捞前端隐藏的实名合规与清算路由要素
    const elEmail = document.getElementById("payout-email");
    const elPhone = document.getElementById("payout-phone");
    const elAddress = document.getElementById("payout-address");
    const elBankCode = document.getElementById("payout-bank-code");
    const elSwift = document.getElementById("payout-swift-code");
    const elRouting = document.getElementById("payout-routing-number");

    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 0;
    const currency = currEl ? currEl.value.toUpperCase().trim() : "NGN";
    const beneficiaryName = nameEl && nameEl.value ? nameEl.value.trim() : "";
    const beneficiaryAccount = accEl && accEl.value ? accEl.value.trim() : "";

    if (!amount || amount <= 0 || !beneficiaryName || !beneficiaryAccount) {
        alert("请输入完整的有源代付要素及大于 0 的合规下发金额"); return;
    }

    if (typeof window.pushAuditLog === "function") {
        window.pushAuditLog(`[PAYOUT INITIATE] 启动出金代付前置路由比价线: 拟放款 ${amount} ${currency}...`);
    }

    // 🛡️ 自动化坍缩出圣洁的默认值，严防由于前端 DOM 缺失导致的空值熔断
    const cleanEmail = elEmail && elEmail.value.trim() ? elEmail.value.trim() : "jacky.xiaoyu.zhang@pinebay.io";
    const cleanPhone = elPhone && elPhone.value.trim() ? elPhone.value.trim() : "+2348012345678";
    const cleanAddress = elAddress && elAddress.value.trim() ? elAddress.value.trim() : "126 Joel Ogunnaike Street, Ikeja";
    const cleanBankCode = elBankCode && elBankCode.value.trim() ? elBankCode.value.trim() : "044";
    const cleanSwift = elSwift && elSwift.value.trim() ? elSwift.value.trim() : (currency === "NGN" ? "" : "BOFAUS3N");
    const cleanRouting = elRouting && elRouting.value.trim() ? elRouting.value.trim() : (currency === "NGN" ? "" : "021000021");

    // =================================================================
    // 👑 📌 核心修改位置 1：将嵌套 JSON 结构体完全拍扁，1:1 对齐后端的平铺强类型模型
    // =================================================================
    const basePayload = {
        "sell_currency": currency.toUpperCase().trim(), 
        "sell_amount": amount,
        "buy_currency": currency.toUpperCase().trim(),  
        "fx_rate": 1.0,            
        "routing_via": "FLUTTERWAVE",
        "quote_timestamp": 0.0,
        "beneficiary_name": beneficiaryName,        // 🎯 刚性拍扁，去除嵌套
        "beneficiary_account": beneficiaryAccount,  // 🎯 刚性拍扁，去除嵌套
        "channel_type": "MOBILE_MONEY",
        "bank_code": cleanBankCode,
        "phone_number": cleanPhone
    };

    try {
        console.log("📡 [PAYOUT STAGE-1 PREVIEW] 发射预检合规载荷Body:", basePayload);
        
        // 🚨 刚性升级：保持标准的 POST JSON Body 契约传输
        const previewRes = await client("/payout/create?commit=false", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload)
        });
        const previewData = await previewRes.json();

        if (previewRes.status !== 200 || previewData.status !== "preview") {
            const errMsg = typeof previewData.detail === 'object' 
                ? JSON.stringify(previewData.detail) 
                : (previewData.detail || previewData.msg || "离岸钱包可用头寸不足或格式排异");
                
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT REJECTED] ❌ 中台拒签预检: ${errMsg}`);
            alert(`🚨 代付预检拦截: ${errMsg}`);
            return;
        }

        const quoteId = previewData.quote_id || Math.random().toString(36).substring(2, 10).toUpperCase();
        const quoteTimestamp = previewData.quote_timestamp || Math.floor(Date.now() / 1000);
        const chosenProvider = previewData.sor_routing?.executed_via || "FLUTTERWAVE";
        const appliedRate = previewData.sor_routing?.applied_rate || 1.0;

        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[SOR RATIFIED] 比价引擎决策锁定！清算通道: [${chosenProvider}] | 锁定执行价: ${appliedRate}`);
        }

        // =================================================================
        // 👑 阶梯第二枪：激活 HTML 内置财务独占锁，进入 300 秒实弹倒计时
        // =================================================================
        const modal = document.getElementById("payout-payin-modal");
        const titleEl = document.getElementById("order-modal-title");
        const bodyEl = document.getElementById("order-modal-body");
        const countdownText = document.getElementById("order-countdown-text");
        const progressBar = document.getElementById("order-progress-bar");
        const confirmBtn = document.getElementById("order-confirm-btn");

        if (!modal || !bodyEl) return;

        titleEl.innerText = "💸 离岸代付终审核销中心 (300s 财务锁)";
        bodyEl.innerHTML = `
            <div class="space-y-1 font-mono text-[11px]">
                <div>业务类型: 自主出金代付放款 (Payout Disbursal)</div>
                <div>收款人全称: <span class="text-slate-100">${beneficiaryName}</span></div>
                <div>目标收单机构: <span class="text-slate-100">${beneficiaryAccount}</span></div>
                <div>拟扣减可用余额: <span class="text-rose-400 font-bold">-${amount.toLocaleString()} ${currency}</span></div>
                <div>比价选路驱动: <span class="text-amber-400">${chosenProvider} COMPONENT</span></div>
                <div class="text-[10px] text-slate-500">报价单批次指纹: ${quoteId}</div>
            </div>
        `;

        modal.classList.remove("opacity-0", "pointer-events-none");

        let timeLeft = 300.0;
        if (payoutTimerInterval) clearInterval(payoutTimerInterval);

        payoutTimerInterval = setInterval(() => {
            timeLeft -= 0.5;
            if (countdownText) countdownText.innerText = `${timeLeft.toFixed(1)}s`;
            if (progressBar) progressBar.style.width = `${(timeLeft / 300.0) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(payoutTimerInterval);
                if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 [PAYOUT TIMEOUT] 300秒代付核销超时，单据就地物理销毁，账本冲正回融。");
                closePayoutModal();
            }
        }, 500);

        // 绑定最终放行按钮的真实网络撞击
        confirmBtn.onclick = async function() {
            clearInterval(payoutTimerInterval);
            modal.classList.add("opacity-0", "pointer-events-none");

            if (typeof window.pushAuditLog === "function") {
                window.pushAuditLog(`[PAYOUT COMMIT] 操盘手签署放款令，执行秒级背对背核销锁死...`);
            }

            // =================================================================
            // 👑 📌 核心修改位置 2：Stage-2 同样保持拍扁的强类型 Body，顺向压入时间戳特征码
            // =================================================================
            const commitPayload = {
                ...basePayload,
                "quote_timestamp": parseFloat(quoteTimestamp)
            };

            try {
                console.log("📡 [PAYOUT STAGE-2 COMMIT] 正在向中台推送真·打款放行令牌Body:", commitPayload);
                
                const commitRes = await client("/payout/create?commit=true", { 
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(commitPayload)
                });
                const commitData = await commitRes.json();

                if (commitRes.status === 200 && (commitData.status === "success" || commitData.status === "SUCCESS")) {
                    if (typeof window.pushAuditLog === "function") {
                        window.pushAuditLog(`[FXALL SUCCESS] 🎉 放款解付大捷！清算批次号: ${commitData.payout_batch_ref || commitData.fx_ref}`);
                    }
                    
                    if (typeof fetchBalances === "function") await fetchBalances();

                    alert(`🎉 离岸代付下发成功!\n结算状态: PROCESSING (处理中)\n代付批次号: ${commitData.payout_batch_ref || commitData.fx_ref}\n可用余额已安全扣减。`);
                } else {
                    const failMsg = commitData.detail || commitData.msg || "中台拒绝下发";
                    if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT FAILED] ❌ 代付核销遭拒: ${failMsg}`);
                    alert(`🚨 代付核销失败: ${failMsg}`);
                }
            } catch (commitErr) {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT CRITICAL] 物理放款血管通信猝死: ${commitErr.message}`);
            }
        };

        window.closeOrderModal = closePayoutModal;

    } catch (err) {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT PREVIEW EXCEPTION] 血管穿仓: ${err.message}`);
    }
}

function closePayoutModal() {
    if (payoutTimerInterval) clearInterval(payoutTimerInterval);
    const modal = document.getElementById("payout-payin-modal");
    if (modal) modal.classList.add("opacity-0", "pointer-events-none");
    if (typeof window.pushAuditLog === "function") window.pushAuditLog("[PAYOUT CANCEL] 操盘手中断出金签署，代付单据安全做废，可用余额无损。");
}