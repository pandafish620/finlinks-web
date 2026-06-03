// -*- coding: utf-8 -*-
// 文件位置：assets/js/payout_dispatcher.js
// 🎯 FinLinks 5.2.0 乐高积木第 3 块：自主出金两阶段（Preview/Commit）放款专属代付调度器
// 隔离看护：独立原子作用域，除触发 fetchBalances 扣款冲刷外，对大厅其他文件 0 污染

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

    try {
        // =================================================================
        // 🟢 👑 阶梯第一枪：commit=false 发起询价预判与头寸可用性安全检修
        // =================================================================
        const previewUrl = `/payout/create?beneficiary_name=${encodeURIComponent(beneficiaryName)}&beneficiary_account=${encodeURIComponent(beneficiaryAccount)}&amount=${amount}&currency=${currency}&commit=false&quote_timestamp=0&channel_type=MOBILE_MONEY`;
        
        const previewRes = await client(previewUrl, { method: "POST" });
        const previewData = await previewRes.json();

        if (previewRes.status !== 200 || previewData.status !== "preview") {
            const errMsg = previewData.detail || "离岸钱包可用头寸不足或格式排异";
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT REJECTED] ❌ 中台拒签预检: ${errMsg}`);
            alert(`🚨 代付预检拦截: ${errMsg}`);
            return;
        }

        // 提取比价引擎锁定的通道数据和时间戳
        const quoteId = previewData.quote_id;
        const quoteTimestamp = previewData.quote_timestamp;
        const chosenProvider = previewData.sor_routing.executed_via;
        const appliedRate = previewData.sor_routing.applied_rate;

        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog(`[SOR RATIFIED] 比价引擎决策锁定！清算通道: [${chosenProvider}] | 锁定执行价: ${appliedRate}`);
        }

        // =================================================================
        // 🟢 👑 阶梯第二枪：激活 HTML 内置财务独占锁，进入 300 秒实弹倒计时
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
                <div>拟扣减可用可用余额: <span class="text-rose-400 font-bold">-${amount.toLocaleString()} ${currency}</span></div>
                <div>比价选路驱动: <span class="text-amber-400">${chosenProvider} COMPONENT</span></div>
                <div class="text-[10px] text-slate-500">报价单批次指纹: ${quoteId}</div>
            </div>
        `;

        // 展现代付弹窗
        modal.classList.remove("opacity-0", "pointer-events-none");

        let timeLeft = 300.0;
        if (payoutTimerInterval) clearInterval(payoutTimerInterval);

        payoutTimerInterval = setInterval(() => {
            timeLeft -= 0.5;
            if (countdownText) countdownText.innerText = `${timeLeft.toFixed(1)}s`;
            if (progressBar) progressBar.style.width = `${(timeLeft / 300.0) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(payoutTimerInterval);
                if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 [PAYOUT TIMEOUT] 300秒代付核销超时，单据就地物理销毁，账本冲正回滚。");
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

            try {
                // 带上 commit=true 以及真实的时间戳特征码敲击中台
                const commitUrl = `/payout/create?beneficiary_name=${encodeURIComponent(beneficiaryName)}&beneficiary_account=${encodeURIComponent(beneficiaryAccount)}&amount=${amount}&currency=${currency}&commit=true&quote_timestamp=${quoteTimestamp}&channel_type=MOBILE_MONEY`;
                
                const commitRes = await client(commitUrl, { method: "POST" });
                const commitData = await commitRes.json();

                if (commitRes.status === 200 && commitData.status === "success") {
                    if (typeof window.pushAuditLog === "function") {
                        window.pushAuditLog(`[FXALL SUCCESS] 🎉 放款解付大捷！清算批次号: ${commitData.payout_batch_ref}`);
                    }
                    
                    // 核心平账点：扣款成功后，瞬间调用第一块积木，把侧边栏的可用数字动态减掉，完成闭环！
                    if (typeof fetchBalances === "function") await fetchBalances();

                    alert(`🎉 离岸代付下发成功!\n结算状态: PROCESSING (处理中)\n代付批次号: ${commitData.payout_batch_ref}\n可用可用余额已安全扣减。`);
                } else {
                    const failMsg = commitData.detail || "中台拒绝下发";
                    if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT FAILED] ❌ 代付核销遭拒: ${failMsg}`);
                    alert(`🚨 代付核销失败: ${failMsg}`);
                }
            } catch (commitErr) {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYOUT CRITICAL] 物理放款血管通信猝死。`);
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