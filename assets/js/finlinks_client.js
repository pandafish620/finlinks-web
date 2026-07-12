// -*- coding: utf-8 -*-
// 文件位置：assets/js/finlinks_client.js
// 🎯 FinLinks 5.2.0 终审完全体：“乐高第一块标准地基”底层网络自愈血管总线
// 勾稽状态：100% 绝杀 Content-Type 漏装导致的 422 畸变 ＆ 自动对齐双轨认证令牌

const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
export const BASE_URL = IS_LOCAL ? "http://127.0.0.1:8000" : "https://finlinks-backend.onrender.com";

/**
 * 👑 【中央数据总线客户端】：为全量积木模块提供原子化请求支撑
 * @param {string} endpoint - 相对路径请求端点 (如 /balances 或 /fx/convert)
 * @param {Object} options - fetch 附加参数
 */
export async function client(endpoint, options = {}) {
    let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // 🧱 核心勾稽纠偏算法：根据后端 main.py 挂载路由的灰度代差，执行自适应血管变轨，绝杀 404
    // 🎯 【5.6.0 终审拨乱反正】：刚性追加 !cleanPath.startsWith('/payout') 拦截特区
    // 彻底绝杀 Payout 核心业务流量被底层垫片误导、强行串舱坠入复式总账（/ledger）的技术债悲剧！
    if (!cleanPath.startsWith('/ledger') && 
        !cleanPath.startsWith('/payout') && 
        !cleanPath.startsWith('/api/') && 
        !cleanPath.startsWith('/feishu/')) {
        
        cleanPath = `/ledger${cleanPath}`; // 🟢 动态注入复式总账主动脉血管前缀
    }

    const fullUrl = `${BASE_URL}${cleanPath}`;
    const defaultHeaders = { 'Accept': 'application/json' };

    // =================================================================
    // 🧼 5.2.0 强力 Content-Type 嗅探盾：无论是纯 Object 还是已序列化的 JSON 串，刚性补齐标头
    // =================================================================
    if (options.body) {
        const isUrlSearchParams = options.body instanceof URLSearchParams;
        const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
        
        if (!isUrlSearchParams && !isFormData) {
            // 只要不是表单流，全线刚性锁死 JSON 钢印
            defaultHeaders['Content-Type'] = 'application/json';
            
            // 如果传入的是原始对象，在底层统一执行流式反序列化
            if (typeof options.body === 'object') {
                options.body = JSON.stringify(options.body);
            }
        }
    }

    // =================================================================
    // 🔒 认证血管双轨自愈：同时兼容 finlinks_auth_token 和单质 token，严防 401 权限坍塌
    // =================================================================
    const token = localStorage.getItem('finlinks_auth_token') || localStorage.getItem('token');
    if (token) { 
        defaultHeaders['Authorization'] = `Bearer ${token.replace('Bearer ', '').trim()}`; 
    }

    // 层级无损兼并，允许业务层传入自定义 Headers 覆盖标准地基
    options.headers = { ...defaultHeaders, ...options.headers };
    options.mode = 'cors';
    
    // 👑 像素级咬合 main.py 的 allow_credentials=True 铁律，绝杀 OPTIONS 预检休克
    options.credentials = 'include'; 

    try {
        console.log(`📡 [FINLINKS VIA FETCH] 发射管道: ${options.method || 'GET'} ➔ ${fullUrl}`);
        const response = await fetch(fullUrl, options);

        // 🔒 御前物理断路拦截：如果判定权限崩塌或令牌过期，原地清洗凭证并强行遣返登录入口
        if (response.status === 401) {
            localStorage.removeItem('finlinks_auth_token');
            localStorage.removeItem('token');
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