// -*- coding: utf-8 -*-
// 文件位置：assets/js/new_auth_sentinel.js
// 🎯 FinLinks 5.2.0 前端主权鉴权安全哨兵总线（完全对齐老线缓存键名与 Bcrypt 脉络）

const MODERN_AUTH_API = "https://finlinks-backend.onrender.com/api/v1/modern-auth";
const ONBOARDING_API = "https://finlinks-backend.onrender.com/api/v1/auth/onboarding";

class NewAuthSentinel {
    /**
     * 🛡️ 1. 全局零信任大厅拦截哨兵
     * 100% 兼容老线小写 `finlinks_auth_token` 特征，绝不破坏大厅既有网络底座！
     */
    static guardDashboard() {
        // 🔌 【兼容焊接点】：严格读取老线命名空间的 Token 键名，防范缓存投毒分裂！
        const liveToken = localStorage.getItem("finlinks_auth_token");
        const activeMid = localStorage.getItem("FINLINKS_ACTIVE_MID");

        if (!liveToken || !activeMid || liveToken.includes("finlinks_mock_signature")) {
            console.warn("🚨 [SECURITY BREACH] 零信任哨兵强力拦截非法无令牌入场（或存量伪沙箱令牌）！");
            localStorage.removeItem("finlinks_auth_token");
            localStorage.removeItem("FINLINKS_ACTIVE_MID");
            window.location.href = "../login.html"; // 物理放逐至确权大厅
            return false;
        }
        return true;
    }

    /**
     * 📥 2. 衔接已有 KYB 注册新线（初次开户申请）
     * 轰击后端已经跑通的原生 Bcrypt 物理端点 /auth/onboarding/register-pending
     */
    static async registerMerchant(payload, successCb, errorCb) {
        try {
            // ======= 🟢 【前线实弹弹道：直接物理焊死完全体路径】 =======
                const response = await fetch("https://finlinks-backend.onrender.com/api/v1/auth/onboarding/register-pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_name: payload.customer_name,
                    phone_with_code: payload.phone_with_code,
                    email: payload.email.trim().toLowerCase(),
                    company_name: payload.company_name,
                    password: payload.password
                })
            });
            const result = await response.json();
            if (response.status === 200 || result.status === "success") {
                if (typeof successCb === "function") successCb(result);
            } else {
                if (typeof errorCb === "function") errorCb(result.detail || "提交开户由于合规卡锁遭拒");
            }
        } catch (err) {
            if (typeof errorCb === "function") errorCb(`中台物理断路: ${err.message}`);
        }
    }

    /**
     * 📡 3. 现代凭证自愈核销与 Token 锁死大闸
     * 精准叩击新路由器 /api/v1/modern-auth/login-gateway
     */
    static async loginMerchant(email, password, successCb, errorCb) {
        try {
            const cleanEmail = email.trim().toLowerCase();
            const response = await fetch(`${MODERN_AUTH_API}/login-gateway?email=${cleanEmail}&password=${password}`, {
                method: "POST"
            });
            const result = await response.json();
            
            if (response.status === 200 && result.status === "authenticated") {
                // =============================================================
                // 👑 【核心咬合点】：将实弹 JWT 令牌塞进老线小写的 `finlinks_auth_token` 里面！
                // 彻底让老线 verifyAndPatchToken() 检测到这是一个 100% 正印的 JWT，自发顺畅通流！
                // =============================================================
                localStorage.setItem("finlinks_auth_token", result.token);
                localStorage.setItem("FINLINKS_ACTIVE_MID", result.merchant_id); // 邮箱作为 MID 指纹
                localStorage.setItem("FINLINKS_COMPANY_NAME", result.company_name);
                localStorage.setItem("FINLINKS_ACCOUNT_STATUS", result.account_status);
                
                if (typeof successCb === "function") successCb(result);
            } else {
                if (typeof errorCb === "function") errorCb(result.detail || "中台凭证核销失败");
            }
        } catch (err) {
            if (typeof errorCb === "function") errorCb(`通信断路: ${err.message}`);
        }
    }
}

// 🔌 挂载最高全局提权大闸
window.authGuard = NewAuthSentinel.guardDashboard;
window.authSentinel = NewAuthSentinel;