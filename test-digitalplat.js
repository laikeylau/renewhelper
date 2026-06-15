#!/usr/bin/env node

/**
 * DigitalPlat API 连接测试脚本
 * 测试多种认证方式和 API 端点
 */

const API_ENDPOINTS = [
    'https://dash.domain.digitalplat.org/api/v1',
    'https://domain-api.digitalplat.org/api/v1'
];

// 从环境变量或命令行参数获取 API 密钥
const API_KEY = process.env.DIGITALPLAT_API_KEY || process.argv[2] || '';
const API_SECRET = process.env.DIGITALPLAT_API_SECRET || process.argv[3] || '';

// 如果没有提供 API 密钥，测试无认证的端点
const TEST_WITHOUT_AUTH = !API_KEY && !API_SECRET;

const AUTH_METHODS = [
    // No auth test (for connectivity check)
    ...(TEST_WITHOUT_AUTH ? [{ name: 'No Auth', getHeaders: () => ({ 'Content-Type': 'application/json' }) }] : []),
    // With auth
    { name: 'Bearer Token (apiSecret)', getHeaders: (key, secret) => ({ 'Authorization': `Bearer ${secret || key}`, 'X-API-Secret': secret || '', 'Content-Type': 'application/json' }) },
    { name: 'Bearer Token (apiKey)', getHeaders: (key, secret) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }) },
    { name: 'X-API-Key + X-API-Secret', getHeaders: (key, secret) => ({ 'X-API-Key': key, 'X-API-Secret': secret, 'Content-Type': 'application/json' }) },
    { name: 'Token + Secret', getHeaders: (key, secret) => ({ 'Authorization': `Token ${secret || key}`, 'X-API-Secret': secret || '', 'Content-Type': 'application/json' }) },
    { name: 'ApiKey Auth', getHeaders: (key, secret) => ({ 'Authorization': `ApiKey ${key}`, 'X-API-Secret': secret || '', 'Content-Type': 'application/json' }) },
    { name: 'API-KEY + API-SECRET', getHeaders: (key, secret) => ({ 'API-KEY': key, 'API-SECRET': secret, 'Content-Type': 'application/json' }) },
];

async function testEndpoint(endpoint, authMethod, key, secret) {
    const url = `${endpoint}/domains?per_page=5`;
    const headers = authMethod.getHeaders(key, secret);
    
    console.log(`\n📡 测试: ${endpoint}`);
    console.log(`🔐 认证方式: ${authMethod.name}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        const status = response.status;
        const statusText = response.statusText;
        const contentType = response.headers.get('content-type') || '';
        
        console.log(`\n📥 响应:`);
        console.log(`   Status: ${status} ${statusText}`);
        console.log(`   Content-Type: ${contentType}`);
        
        // 检查是否是 Cloudflare Challenge
        const body = await response.text();
        
        if (body.includes('Just a moment') || body.includes('cf-chl') || body.includes('challenge-platform')) {
            console.log(`   ❌ 被 Cloudflare Challenge 拦截`);
            console.log(`   💡 建议: 联系 DigitalPlat 将 Worker IP 加入白名单`);
            return { success: false, error: 'Cloudflare Challenge', status };
        }
        
        // 检查是否是 HTML 响应
        if (contentType.includes('text/html') || body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
            console.log(`   ❌ 返回 HTML 而非 JSON`);
            console.log(`   📄 响应前200字符: ${body.substring(0, 200)}...`);
            return { success: false, error: 'HTML Response', status };
        }
        
        // 尝试解析 JSON
        try {
            const data = JSON.parse(body);
            console.log(`   ✅ JSON 响应成功`);
            console.log(`   📊 数据结构: ${JSON.stringify(data).substring(0, 500)}`);
            
            // 提取域名列表
            const domains = data.domains || data.data || data.result || data.items || (Array.isArray(data) ? data : []);
            if (domains.length > 0) {
                console.log(`   🌐 找到 ${domains.length} 个域名`);
                console.log(`   📝 前3个域名:`);
                domains.slice(0, 3).forEach((d, i) => {
                    console.log(`      ${i + 1}. ${d.name || d.domain || d.id}`);
                });
            }
            
            return { success: true, data, domains };
        } catch (parseError) {
            console.log(`   ❌ JSON 解析失败: ${parseError.message}`);
            console.log(`   📄 响应前200字符: ${body.substring(0, 200)}...`);
            return { success: false, error: 'JSON Parse Error', status };
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`   ❌ 请求超时`);
            return { success: false, error: 'Timeout' };
        }
        console.log(`   ❌ 网络错误: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testAllCombinations(key, secret) {
    console.log('🚀 DigitalPlat API 连接测试');
    console.log('=' .repeat(60));
    
    if (!key && !secret) {
        console.log('⚠️  未提供 API 密钥，将测试端点连通性...');
        console.log('用法: node test-digitalplat.js [API_KEY] [API_SECRET]');
        console.log('或设置环境变量: DIGITALPLAT_API_KEY, DIGITALPLAT_API_SECRET');
        console.log('\n继续测试端点连通性...\n');
    }
    
    console.log(`🔑 API Key: ${key ? key.substring(0, 8) + '***' : '(未设置)'}`);
    console.log(`🔑 API Secret: ${secret ? secret.substring(0, 8) + '***' : '(未设置)'}`);
    
    const results = [];
    
    for (const endpoint of API_ENDPOINTS) {
        for (const authMethod of AUTH_METHODS) {
            const result = await testEndpoint(endpoint, authMethod, key, secret);
            results.push({
                endpoint,
                authMethod: authMethod.name,
                ...result
            });
            
            // 如果成功，不需要测试其他组合
            if (result.success) {
                console.log('\n🎉 找到可用的配置组合!');
                console.log(`✅ 成功组合:`);
                console.log(`   端点: ${endpoint}`);
                console.log(`   认证: ${authMethod.name}`);
                
                // 保存成功配置到文件
                const config = {
                    endpoint,
                    authMethod: authMethod.name,
                    headers: authMethod.getHeaders(key, secret),
                    timestamp: new Date().toISOString()
                };
                
                const fs = require('fs');
                const configPath = __dirname + '/digitalplat-success-config.json';
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`   💾 配置已保存到: ${configPath}`);
                
                return config;
            }
        }
    }
    
    // 打印所有失败的结果
    console.log('\n' + '=' .repeat(60));
    console.log('❌ 所有测试均失败');
    console.log('\n📊 测试结果摘要:');
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.endpoint} - ${r.authMethod}: ${r.error || 'Failed'}`);
    });
    
    return null;
}

// 主函数
async function main() {
    try {
        await testAllCombinations(API_KEY, API_SECRET);
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = { testAllCombinations, testEndpoint };
