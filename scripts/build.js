// scripts/build.js
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// 读取 package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

// --- 自动递增版本号逻辑 ---
function incrementVersion(version) {
    const parts = version.split('.');
    if (parts.length === 3) {
        parts[2] = parseInt(parts[2], 10) + 1;
        return parts.join('.');
    }
    return version;
}

const oldVersion = packageJson.version || '1.0.0';
const newVersion = incrementVersion(oldVersion);
// 版本变更待成功后回写
console.log(`🆙 计划升级版本: v${oldVersion} -> v${newVersion}`);

const APP_VERSION = newVersion;

async function build() {
    // 解析命令行参数
    const useCdn = process.argv.includes('--cdn');

    console.log(`🚀 开始构建 v${APP_VERSION} [模式: ${useCdn ? 'CDN字体' : '全内联'}]...`);

    // --- 1. 处理 HTML (Vite Build) ---
    console.log('⚡ 执行 Vite 构建...');
    try {
        const env = { ...process.env, VITE_USE_CDN_FONTS: useCdn ? 'true' : 'false' };
        require('child_process').execSync('npx vite build --config src/frontend/vite.config.mjs', {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'),
            env: env
        });
    } catch (e) {
        console.error('❌ Vite 构建失败，请检查前端代码。');
        process.exit(1);
    }

    const htmlPath = path.join(__dirname, '../dist/index.html');
    const tempJsPath = path.join(__dirname, '../src/html-template.js');

    console.log('📄 读取构建产物 (dist/index.html)...');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // 步骤 A: 替换版本号变量
    htmlContent = htmlContent.replace(/\$\{APP_VERSION\}/g, `v${APP_VERSION}`);

    // 步骤 B: 处理 CDN 链接
    const cdnFontLink = '<link href="https://fonts.loli.net/css2?family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700;800&display=swap" rel="stylesheet">';
    if (useCdn) {
        htmlContent = htmlContent.replace('<!-- CDN_FONTS_PLACEHOLDER -->', cdnFontLink);
    } else {
        htmlContent = htmlContent.replace('<!-- CDN_FONTS_PLACEHOLDER -->', '');
    }

    // 步骤 C: 生成 JS 字符串
    const jsContent = `export const HTML = ${JSON.stringify(htmlContent)};`;

    fs.writeFileSync(tempJsPath, jsContent);

    // --- 2. 打包 Backend (Worker 代码依然会被 esbuild 压缩，这是安全的) ---
    console.log('📦 打包 Worker 到根目录...');
    try {
        await esbuild.build({
            entryPoints: [path.join(__dirname, '../src/backend/index-new.js')],
            bundle: true,
            minify: true, // 后端代码压缩没问题
            outfile: path.join(__dirname, '../_worker.js'),
            format: 'esm',
            target: 'es2020',
            charset: 'utf8',
            define: {
                'process.env.NODE_ENV': '"production"',
                '__BUILD_VERSION__': JSON.stringify(`v${APP_VERSION}`)
            }
        });
    } catch (e) {
        console.error('❌ 打包失败:', e);
        process.exit(1);
    } finally {
        // --- 3. 清理临时文件 ---
        if (fs.existsSync(tempJsPath)) {
            fs.unlinkSync(tempJsPath);
        }
    }

    console.log('✅ 构建完成! 请重新部署 _worker.js');

    // --- 4. 构建成功后，更新版本号文件 ---
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`💾 已保存新版本号: v${newVersion} -> package.json`);

    const packageDockerJsonPath = path.join(__dirname, '../package-docker.json');
    if (fs.existsSync(packageDockerJsonPath)) {
        try {
            const packageDockerJson = require(packageDockerJsonPath);
            packageDockerJson.version = newVersion;
            fs.writeFileSync(packageDockerJsonPath, JSON.stringify(packageDockerJson, null, 2));
            console.log(`💾 已保存新版本号: v${newVersion} -> package-docker.json`);
        } catch (e) {
            console.warn('⚠️ 无法更新 package-docker.json:', e.message);
        }
    }
}

build();