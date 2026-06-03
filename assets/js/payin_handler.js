// -*- coding: utf-8 -*-
// 文件位置：assets/js/payin_handler.js
// 🎯 FinLinks 5.2.0 乐高积木第 2 块：出海离岸收单入金专属拦截与时钟处理器
// 隔离看护：完全独立原子闭环，除触发 fetchBalances 刷新外，对大厅其他文件 0 侵入

import { client } from './finlinks_client.js';

let payinTimerInterval = null; // 300秒代收专属时钟单例句柄

// 👑 【CONFIG REGEX VAULT】全盘硬核账号正则格式校验拦截金库
const RIGID_ACCOUNT_RULES = {
    "NGN": { regex: /^\d{10}$/, error: "奈拉通道校验失败：必须为 10位 纯数字 NUBAN 标准银行账号！" },
    "KES": { regex: /^(254\d{9}|0\d{9})$/, error: "肯尼亚先令校验失败：必须为标准的移动货币手机号（如254...）！" },
    "UGX": { regex: /^\d{9,12}$/, error: "乌干达先令校验失败：请输入合规的东非 Mobile Money 钱包账号！" }
};

/**
 * 📥 【积木 2 入口】：接管大厅 Pay-in 按钮点击，拉起 300 秒拦截确权大闸
 */
export function handleLivePayinCallback(fetchBalances) {
    const amtEl = document.getElementById("collectionAmount");
    const currEl = document.getElementById("collectionCurrency");
    const phoneEl = document.getElementById("collectionPhone");
    const nameEl = document.getElementById("collectionPayerName");
    
    const amount = amtEl && amtEl.value ? parseFloat(amtEl.value) : 0;
    const currency = currEl ? currEl.value.toUpperCase().trim() : "NGN";
    const phoneNumber = phoneEl ? phoneEl.value.trim() : "";
    const payerName = nameEl && nameEl.value ? nameEl.value.trim() : "Jacky Zhang";

    if (!amount || amount <= 0 || !phoneNumber) {
        alert("请输入完整的有源收单要素及大于 0 的合规金额"); return;
    }

    // 1. 👑 物理断路拦截：触发全局正则看护
    const rule = RIGID_ACCOUNT_RULES[currency];
    if (rule && !rule.regex.test(phoneNumber)) {
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[VALIDATION FAILED] ❌ ${rule.error}`);
        alert(`🚨 账户格式非法: ${rule.error}`);
        return; 
    }

    // 2. 👑 激活 HTML 基地内置的 300 秒原子级财务独占锁弹窗
    const modal = document.getElementById("payout-payin-modal");
    const titleEl = document.getElementById("order-modal-title");
    const bodyEl = document.getElementById("order-modal-body");
    const countdownText = document.getElementById("order-countdown-text");
    const progressBar = document.getElementById("order-progress-bar");
    const confirmBtn = document.getElementById("order-confirm-btn");

    if (!modal || !bodyEl) return;

    // 灌入业务审计要素数据
    titleEl.innerText = "📥 出海收单入金确权审查 (300s 财务锁)";
    bodyEl.innerHTML = `
        <div class="space-y-1 font-mono text-[11px]">
            <div>业务类型: 跨境有源收单挂账 (Pay-in Deposit)</div>
            <div>付款人全称: <span class="text-slate-100">${payerName}</span></div>
            <div>付款人账号: <span class="text-slate-100">${phoneNumber}</span></div>
            <div>拟注入水线: <span class="text-emerald-400 font-bold">+${amount.toLocaleString()} ${currency}</span></div>
            <div>通道决策驱动: <span class="text-amber-400">EBANX AGGREGATED LINK</span></div>
        </div>
    `;

    // 展现弹窗骨骼
    modal.classList.remove("opacity-0", "pointer-events-none");

    // 点火启动 300 秒高能时钟轮询
    let timeLeft = 300.0;
    if (payinTimerInterval) clearInterval(payinTimerInterval);
    
    payinTimerInterval = setInterval(() => {
        timeLeft -= 0.5;
        if (countdownText) countdownText.innerText = `${timeLeft.toFixed(1)}s`;
        if (progressBar) progressBar.style.width = `${(timeLeft / 300.0) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(payinTimerInterval);
            if (typeof window.pushAuditLog === "function") window.pushAuditLog("💥 [PAYIN TIMEOUT] 300秒确权独占锁超时失效，单据原地销毁解体！");
            closePayinModal();
        }
    }, 500);

    // 绑定具体的放行执行命令
    confirmBtn.onclick = async function() {
        clearInterval(payinTimerInterval);
        modal.classList.add("opacity-0", "pointer-events-none");
        
        if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN COMMIT] 操盘手签署确权令，通过 client 总线轰击中台...`);

        // 3. 👑 完美对齐后端 Query 模型，通过 client 网络总线统一安全发射
        try {
            const url = `/collection/deposit?amount=${amount}&currency=${currency}&phone_number=${encodeURIComponent(phoneNumber)}&payer_name=${encodeURIComponent(payerName)}&routing_via=EBANX`;
            // client 会自动判定并补齐 /ledger 主动脉前缀，自动处理 credentials 跨域
            const response = await client(url, { method: "POST" });
            const result = await response.json();

            if (response.status === 200 && result.status === "success") {
                if (typeof window.pushAuditLog === "function") {
                    window.pushAuditLog(`[WEBHOOK ACK] 收单大胜！结算批次流水号: ${result.deposit_id}`);
                }
                
                // 动态拉起大厅顶部的刷新，重新冲刷持仓可用数字
                if (typeof fetchBalances === "function") await fetchBalances();
                
                alert(`🎉 离岸代收扣击大捷!\n清算状态: SETTLED (已清偿)\n到账流水: ${result.deposit_id}`);
            } else {
                if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN REJECTED] 中台拒签: ${result.detail || "未知异常"}`);
            }
        } catch (err) {
            if (typeof window.pushAuditLog === "function") window.pushAuditLog(`[PAYIN CRITICAL] 物理通道通信夭折。`);
        }
    };

    // 绑定 HTML 基地点击取消或叉叉的自愈闭合函数
    window.closeOrderModal = closePayinModal;
}

function closePayinModal() {
    if (payinTimerInterval) clearInterval(payinTimerInterval);
    const modal = document.getElementById("payout-payin-modal");
    if (modal) modal.classList.add("opacity-0", "pointer-events-none");
    if (typeof window.pushAuditLog === "function") window.pushAuditLog("[PAYIN CANCEL] 操盘手中止确权，在途入金单据安全撤销，零资产变动。");
}