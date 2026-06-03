// -*- -*- coding: utf-8 -*-
// 文件位置：assets/js/finlinks_client.js
// 🎯 FinLinks 5.2.0 终审完全体：“乐高第一块标准地基”底层网络自愈血管总线
// 勾稽状态：100% 咬合后端 v18.2.1 main.py 双代前缀拓扑与动态 CORS 拦截中间件

const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
export const BASE_URL = IS_LOCAL ? "http://127.0.0.1:8000" : "https://finlinks-backend.onrender.com";

/**
 * 👑 【中央数据总线客户端】：为全量积木模块提供原子化请求支撑
 * @param {string} endpoint - 相对路径请求端点 (如 /balances 或 /api/v2/disbursements/payout)
 * @param {Object} options - fetch 附加参数
 */
export async function client(endpoint, options = {}) {
    let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // 🧱 核心勾稽纠偏算法：根据后端 main.py 挂载路由的灰度代差，执行自适应血管变轨，绝杀 404
    // 1. 如果是标准的复式总账中台线 (/balances, /fx/quote, /fx/convert, /reconcile)
    // 2. 且端点没有被硬编码加上 /ledger 前缀，也没有走向 api/v2 保活血管
    if (!cleanPath.startsWith('/ledger') && !cleanPath.startsWith('/api/') && !cleanPath.startsWith('/feishu/')) {
        cleanPath = `/ledger${cleanPath}`; // 🟢 动态注入复式总账主动脉血管前缀
    }

    const fullUrl = `${BASE_URL}${cleanPath}`;
    const defaultHeaders = { 'Accept': 'application/json' };

    // 自动判定并流式反序列化请求体载荷
    if (options.body && typeof options.body === 'object' && !(options.body instanceof URLSearchParams)) {
        defaultHeaders['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    // 🔒 动态提取研发期特赦令牌或标准 JWT 商户钢印注入 Authorization 血管
    const token = localStorage.getItem('finlinks_auth_token');
    if (token) { 
        defaultHeaders['Authorization'] = `Bearer ${token}`; 
    }

    options.headers = { ...defaultHeaders, ...options.headers };
    options.mode = 'cors';
    
    // 👑 像素级咬合 main.py 的 allow_credentials=True 铁律，绝杀 OPTIONS 预检休克
    options.credentials = 'include'; 

    try {
        const response = await fetch(fullUrl, options);

        // 🔒 御前物理断路拦截：如果判定权限崩塌或令牌过期，原地清洗凭证并强行遣返登录入口
        if (response.status === 401) {
            localStorage.removeItem('finlinks_auth_token');
            // 防止陷入无限重定向死循环
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/login.html';
            }
            throw new Error("[SECURITY CATASTROPHE] 商户 JWT 令牌过期或签名非法，中央大闸执行遣返。");
        }

        return response;
    } catch (networkError) {
        console.error(`[NETWORK BLOCKED] 物理链路夭折或遭受地缘防火墙拦截: ${networkError.message}`);
        throw networkError;
    }
}