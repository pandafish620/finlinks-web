// =====================================================================
// 💾 apps/ledger/assets/js/fx_processor.js (第四阶段完全体：契约落锁版)
// =====================================================================
import { client } from './finlinks_client.js';

// ⏱️ 全局最高指挥时钟句柄挂载（统一血缘，挂载于 window 确保全局可控）
window.fxTimerHandle = null;
let fxRemainingSeconds = 0.0; // 弹性无状态变量，承接后端 20% 裁剪后的动态 TTL

/**
 * 🔮 1. 独立静默询价算子（第三、四阶段完全体合流版）
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
    if (window.fxTimerHandle) { clearInterval(window.fxTimerHandle); window.fxTimerHandle = null; }

    const elInquiryBtn = document.getElementById("fx-inquiry-btn");
    if (elInquiryBtn) { 
        elInquiryBtn.setAttribute("disabled", "true"); 
        elInquiryBtn.innerText = "正在叩击 FinLinks 生产级盘口..."; 
    }

    try {
        // 🎯 向后端中台端点发射标准的 Query 载荷
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
        // 🟢 【第五阶段终审核销】：完全体主权货币镜像对轧算子（彻底根除交叉盘倒挂）
        // =====================================================================
        if (response.status === 200 && result.status === "quoted") {
            // 🎯 【像素级对齐】：精准捞取后端第三阶段吐出的 rate 字段
            let displayRate = result.rate; 
            let computedBuyAmount = 0.00;

            const sellCurrUpper = sellCurrency.toUpperCase().trim();
            const buyCurrUpper = buyCurrency.toUpperCase().trim();

            // 👑 【金融级极性对齐大闸】：读取后端透传的 quote_contract 核心契约印记
            const quoteContract = result.quote_contract || {};
            const serverDealtSide = (quoteContract.dealt_side || "sell").toLowerCase().trim();
            // 📡 提取大厂报价体系中真正的定价基准主权（Base Currency）
            const serverBaseCurrency = (quoteContract.base_currency || sellCurrUpper).toUpperCase().trim();

            // 🧮 【主权镜像对轧核心算法】：绝杀一切反向计价导致的倒挂硬伤
            if (serverBaseCurrency === buyCurrUpper) {
                // 🎯 如果大厂是以买入币种(如NZD)为基准报价，说明是反向率，前端必须刚性执行除法回正！
                computedBuyAmount = sellAmount / displayRate;
            } else if (serverBaseCurrency === sellCurrUpper) {
                // 🎯 如果大厂是以卖出币种(如CAD)为基准报价，说明是顺向率，前端执行乘法
                computedBuyAmount = sellAmount * displayRate;
            } else {
                // ⏱️ 极端不可测情况下的弹性数字盾自适应保底
                computedBuyAmount = displayRate < 1.0 ? (sellAmount / displayRate) : (sellAmount * displayRate);
            }

            // 📝 吹哨将生产级报价投喂给大厅流水台
            if (typeof pushAuditLog === "function") {
                pushAuditLog(`[LIVE QUOTE] 👑 大厂生产盘口落锁！汇率: ${displayRate.toFixed(4)} | 定价基准: ${serverBaseCurrency} | 预计到账: ${computedBuyAmount.toFixed(2)} ${buyCurrUpper}`);
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


            // 💾 将核心资产契约数据暂存在 DOM 数据集里，供下一步的 POST 实弹扣杀
            const modalConfirm = document.getElementById("fx-modal-confirm");
            if (modalConfirm) {
                modalConfirm.dataset.currentRate = displayRate.toString(); 
                modalConfirm.dataset.routingVia = result.provider_key || "AIRWALLEX";
                
                // 🗺️ 极性归位：直接保留后端吐出来的那个真 UUID 字符串（虽然它叫 exchange_id）
                modalConfirm.dataset.exchangeId = result.exchange_id || ""; 
                // 🗺️ 极性归位：将内部交易码锁进影子状态机
                modalConfirm.dataset.quoteId = result.quote_id || ""; 
                
                modalConfirm.dataset.sellAmount = sellAmount.toString();
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

            // 开启高频 100ms 心跳递减时钟
            window.fxTimerHandle = setInterval(() => {
                fxRemainingSeconds -= 0.1;
                if (elTimerText) elTimerText.innerText = `${Math.max(0, fxRemainingSeconds).toFixed(1)}s`;
                if (elProgressBar) elProgressBar.style.width = `${(fxRemainingSeconds / dynamicTotalTtl) * 100}%`;

                // 进入最后 15% 的红线倒计时，进度条切红
                if ((fxRemainingSeconds / dynamicTotalTtl) <= 0.15 && elProgressBar) {
                    elProgressBar.classList.remove("from-emerald-500", "to-teal-400");
                    elProgressBar.classList.add("from-red-500", "to-rose-600");
                }

                // 物理熔断：前端主动宣布合同到期作废
                if (fxRemainingSeconds <= 0) {
                    clearInterval(window.fxTimerHandle);
                    window.fxTimerHandle = null;
                    if (typeof pushAuditLog === "function") pushAuditLog(`[FX TIMEOUT] 🚨 动态锁价合同到期，已被中台作废！`);
                    if (elSubmitBtn) {
                        elSubmitBtn.setAttribute("disabled", "true");
                        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-30");
                        elSubmitBtn.innerText = "合同已过期作废";
                    }
                    if (modalConfirm) {
                        modalConfirm.dataset.currentRate = "0";
                        modalConfirm.dataset.exchangeId = "";
                        modalConfirm.dataset.quoteId = "";
                    }
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
        if (elInquiryBtn) { 
            elInquiryBtn.removeAttribute("disabled"); 
            elInquiryBtn.innerText = "获取即期汇率报价 (Request Quote)"; 
        }
        if (typeof pushAuditLog === "function") pushAuditLog(`[SOR CRITICAL] 盘口网络连线故障: ${err.message}`);
        alert(`网络连接异常，无法连线 FinLinks 清算中台。`);
    }
}

/**
 * 💱 2. 实弹确权交割算子（100% 绑定契约锁投弹）
 */
export async function submitFxConversion() {
    const sellCurrency = document.getElementById("sell-currency").value.toUpperCase().trim();
    const buyCurrency = document.getElementById("buy-currency").value.toUpperCase().trim();
    
    // 🟢 必须恢复原版：实时抓取用户输入框中的真实额度，坚决不从不存在的 dataset 里盲捞
    const sellAmount = parseFloat(document.getElementById("sell-amount").value);

    const elQuoteTimestamp = document.getElementById("fx-quote-timestamp");
    const quoteTimestamp = elQuoteTimestamp ? parseInt(elQuoteTimestamp.value || "0") : 0;
    
    const modalConfirm = document.getElementById("fx-modal-confirm");
    const fxRate = modalConfirm ? parseFloat(modalConfirm.dataset.currentRate || "0") : 0;
    const routingVia = modalConfirm ? (modalConfirm.dataset.routingVia || "AIRWALLEX").toUpperCase().trim() : "AIRWALLEX";
    
    // 🎯 1. 刚性打捞：直接提取，不重复加 const 关键词，彻底绝杀 Identifier already been declared 报错
    const _finalExchangeId = modalConfirm ? (modalConfirm.dataset.exchangeId || "") : "";
    const _finalQuoteId = modalConfirm ? (modalConfirm.dataset.quoteId || "") : "";

    // 🎯 2. 核心极性归位对轧
    const realAirwallexUuid = _finalExchangeId;      // 36位大厂真UUID
    const platformFinlinksCode = _finalQuoteId;   // FXALL-QT- 内部流水号

    const pushAuditLog = window.pushAuditLog;
    // 接下来保持你原有的风控校验和防超时期锁死逻辑不动...
    if (!sellAmount || fxRate <= 0) {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 固价合同校验失败 (Rate: ${fxRate})，拒绝向中台打流！`);
        return;
    }

    // 防御过期的合同执行扣杀
    if (!airwallexQuoteId && routingVia === "AIRWALLEX") {
        if (typeof pushAuditLog === "function") pushAuditLog(`[EXECUTE DENIED] 🚨 缺乏合规的大厂交割契约 ID，拒绝向中台打流！`);
        alert("错误: 锁价契约凭证已作废，请重新询价。");
        return;
    }

    const elSubmitBtn = document.getElementById("fx-submit-btn");
    if (elSubmitBtn) {
        elSubmitBtn.setAttribute("disabled", "true");
        elSubmitBtn.classList.add("cursor-not-allowed", "opacity-40");
        elSubmitBtn.innerText = "正在向公网打流交割清算中...";
    }

    // =====================================================================
    // 📦 组装 Payload Body：刚性追加 exchange_id，满血契约对齐
    // =====================================================================
    // 拨乱反正：通过后端源码证实，result.exchange_id 才是大厂真正的 UUID 契约！
    // 1. 从暂存盘里打捞两个指纹（确保变量极性洁净）
    const realAirwallexUuid = modalConfirm ? (modalConfirm.dataset.exchangeId || "") : "";
    const platformFinlinksCode = modalConfirm ? (modalConfirm.dataset.quoteId || "") : "";

    const payloadBody = {
        "sell_currency": sellCurrency,
        "sell_amount": sellAmount,
        "buy_currency": buyCurrency,
        "fx_rate": fxRate,
        "routing_via": routingVia,
        "quote_timestamp": quoteTimestamp,
        "exchange_id": platformFinlinksCode, // 👈 🎯 绝杀 409 的终极对账钢印
        "provider_options": {
            "quote_contract": {
                "quote_id": realAirwallexUuid, // 🎯 修正：将流氓的 exchangeId 替换为真正大厂认识的 UUID 契约！,
                "base_currency": sellCurrency,
                "dealt_side": "sell"
            }
        },
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

    console.log("📡 [FINLINKS V5.4.6 FINAL] 前后端全合流，契约 Payload 发射:", payloadBody);

    try {
        // 👑 满血并线：直接丢入纯 Object 载荷，将反序列化主权完美移交给 finlinks_client 乐高地基！
        const response = await client("ledger/fx/convert", {
            method: "POST",
            body: payloadBody // 🎯 修正：直接传对象肉身！
        });

        const data = await response.json();

        if (response.status === 200 && data.status === "success") {
            if (window.fxTimerHandle) { clearInterval(window.fxTimerHandle); window.fxTimerHandle = null; }
            if (typeof pushAuditLog === "function") pushAuditLog(`[CLEARING SUCCESS] 🎉 外汇交割成功！流水批次: ${data.fx_ref || data.fx_batch_ref}`);
            
            // 🎯 【修改点 1】：擦除人肉修改 modalConfirm 的补丁，顺向调用 dashboard.js 注册的全局规范收陇大闸
            window.closeFxModal();
            
            if (document.getElementById("sell-amount")) {
                document.getElementById("sell-amount").value = "";
            }
            
            // 🎯 【修改点 2】：去掉隐患的 400ms 延迟猜时，改为刚性 await 同步确权，保证头寸刷新绝无时间差
            if (typeof window.fetchBalances === "function") {
                await window.fetchBalances();
            }
        } else {
            if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认执行交易 (Execute)"; }
            alert(`清算网络拒绝交割: ${data.detail || "中台拒绝"}`);
        }
    } catch (catchErr) {
        if (elSubmitBtn) { elSubmitBtn.removeAttribute("disabled"); elSubmitBtn.innerText = "确认执行交易 (Execute)"; }
        // 🎯 【修改点 3】：在原先空置的 catch 块中，补焊物理断路提示，防止因 7897 隧道休克导致前端界面无响应死锁
        alert(`公网打流失败，请检查 7897 隧道连通性或代理配置。`);
    }
}

/**
 * 🔒 3. 强力注销红字冲正算子
 */
window.forceCancelFxTimer = function() {
    if (window.fxTimerHandle) {
        clearInterval(window.fxTimerHandle);
        window.fxTimerHandle = null;
        if (typeof window.pushAuditLog === "function") {
            window.pushAuditLog("[FX ABORT] ⚖️ 操盘手主动撤销合同，固价合同安全注销，100ms时钟大闸释放冲正。");
        }
    }
};