# 瞳瞳音乐 - Android TWA 打包指南

本文档介绍如何将 Vue PWA 项目打包成 Android App (TWA 方式)。

> **重要说明：** 本指南提供三种打包方式，其中方案一（PWA Builder）和方案二（Bubblewrap 命令行）**均无需安装 Android Studio**，只需 Java JDK 和 Android SDK 命令行工具即可。

## 前提条件

- ✅ PWA 已部署在 HTTPS 域名：`https://tongtong-music-frontend.vercel.app/`
- ✅ 项目已配置 `vite-plugin-pwa`
- ✅ 本地已安装 Node.js 18+

---

## 方案选择

| 方案 | 是否需要 Android Studio | 是否需要本地环境 | 自定义程度 | 推荐场景 |
|------|------------------------|-----------------|-----------|---------|
| 方案一：PWA Builder | ❌ 不需要 | ❌ 不需要 | 低 | 快速测试、一次性打包 |
| 方案二：Bubblewrap CLI | ❌ 不需要 | ✅ 需要 JDK + Android SDK CLI | 高 | 频繁打包、需要自定义配置 |
| 方案三：GitHub Actions | ❌ 不需要 | ❌ 不需要 | 中 | 自动化构建、CI/CD |

---

## 方案一：PWA Builder 在线构建（推荐新手）

**完全无需本地环境，一键生成 APK。**

### 1. 访问 PWA Builder

打开：https://www.pwabuilder.com/

### 2. 输入 PWA 网址

输入：`https://tongtong-music-frontend.vercel.app/`

点击 "Start" 进行检测。

### 3. 生成 Android 包

- 检测通过后，点击 "Build My PWA"
- 选择 "Android" 平台
- 下载生成的 APK 或 AAB 文件

**优点：** 零环境配置，5分钟搞定
**缺点：** 自定义选项有限，无法修改包名等深层配置

---

## 方案二：Bubblewrap 命令行工具（推荐进阶用户）

**无需 Android Studio，仅需命令行工具。**

### 一、Asset Links 配置

TWA 需要 Android 应用与网站建立信任关系，通过 Asset Links 文件实现。

#### 1. 文件位置

```
tongtong-music-frontend/
└── public/
    └── .well-known/
        └── assetlinks.json
```

#### 2. 文件内容

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tongtong.music",
      "sha256_cert_fingerprints": ["YOUR_SIGNING_CERT_FINGERPRINT"]
    }
  }
]
```

**说明：**
- `package_name`：Android 应用包名，后续在 Bubblewrap 中配置
- `sha256_cert_fingerprints`：签名证书指纹，生成 Android 项目后获取

#### 3. 部署到 Vercel

```powershell
cd tongtong-music-frontend
git add public/.well-known/assetlinks.json
git commit -m "Add asset links for TWA"
git push
```

#### 4. 验证部署

访问：`https://tongtong-music-frontend.vercel.app/.well-known/assetlinks.json`

确认文件可正常访问。

---

### 二、安装依赖

#### 1. 安装 Java JDK 17+

下载地址：https://adoptium.net/

配置环境变量：
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
$env:Path += ";$env:JAVA_HOME\bin"
```

验证：
```powershell
java -version
```

#### 2. 安装 Android SDK 命令行工具（无需 Android Studio）

**重要：本指南仅使用命令行工具，无需安装完整的 Android Studio（约 1GB），命令行工具仅约 200MB。**

##### 下载

访问：https://developer.android.com/studio#command-line-tools-only

下载 Windows 版本的 `commandlinetools-win-xxx_latest.zip`。

##### 安装步骤

```powershell
# 1. 解压到指定目录（例如 D:\android_sdk）
Expand-Archive commandlinetools-win-xxx_latest.zip -DestinationPath D:\android_sdk

# 2. 重命名目录（sdkmanager 要求特定目录结构）
cd D:\android_sdk
Rename-Item cmdline-tools latest
mkdir cmdline-tools
Move-Item latest cmdline-tools\
```

最终目录结构应为：
```
D:\android_sdk\
└── cmdline-tools\
    └── latest\
        ├── bin\
        ├── lib\
        └── ...
```

##### 安装必要组件

```powershell
# 接受许可证
cd D:\android_sdk\cmdline-tools\latest\bin
.\sdkmanager --licenses

# 安装必要组件（SDK Platform 33 和 Build Tools）
.\sdkmanager "platforms;android-33" "build-tools;33.0.0" "platform-tools"
```

##### 配置环境变量

**方式一：临时配置（当前 PowerShell 会话）**
```powershell
$env:ANDROID_HOME = "D:\android_sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
```

**方式二：永久配置（推荐）**

在 PowerShell 中执行（无需管理员权限，配置当前用户）：
```powershell
# 设置用户环境变量
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "D:\android_sdk", "User")

# 添加到 PATH
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = $oldPath + ";D:\android_sdk\platform-tools;D:\android_sdk\cmdline-tools\latest\bin"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

> 配置完成后，**关闭并重新打开** PowerShell 窗口使其生效。

##### 验证安装

重新打开 PowerShell 后执行：
```powershell
sdkmanager --version
adb version
```

#### 3. 安装 Bubblewrap

```powershell
npm install -g @bubblewrap/cli
```

验证：
```powershell
bubblewrap --version
```

---

### 三、生成 Android 项目

#### 1. 初始化 TWA 项目

```powershell
cd e:\code\xingtong-song
mkdir twa-android
cd twa-android

bubblewrap init --manifest="https://tongtong-music-frontend.vercel.app/manifest.webmanifest"
```

按提示输入配置：
- Application name: `瞳瞳音乐`
- Short name: `瞳瞳`
- Package name: `com.tongtong.music`
- Start URL: `/`
- Theme color: `#8B00FF`
- Background color: `#ffffff`
- Display mode: `standalone`
- Status bar color: `#8B00FF`
- Orientation: `default`

#### 2. 项目结构

```
twa-android/
├── android-app/          # Android 项目目录
│   ├── app/
│   │   ├── build.gradle  # 包含签名配置
│   │   └── src/
│   └── gradle/
├── twa-manifest.json     # TWA 配置文件
└── project.log
```

---

### 四、获取签名证书指纹

#### 1. 使用调试签名（测试用）

调试签名位置：`~/.android/debug.keystore` (Windows: `C:\Users\<用户名>\.android\debug.keystore`)

```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -alias androiddebugkey
```

输出中的 SHA256 指纹即为所需值，格式如：
```
SHA256: 14:6D:E9:83:C5:CE:...
```

#### 2. 创建发布签名（正式用）

```powershell
keytool -genkey -v -keystore tongtong-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tongtong
```

获取指纹：
```powershell
keytool -list -v -keystore tongtong-release.jks -alias tongtong
```

---

### 五、更新 Asset Links

#### 1. 更新 assetlinks.json

将获取的 SHA256 指纹（去掉 `SHA256:` 前缀，保留冒号分隔格式）更新到：

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tongtong.music",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:CE:..."
      ]
    }
  }
]
```

#### 2. 提交并部署

```powershell
cd tongtong-music-frontend
git add public/.well-known/assetlinks.json
git commit -m "Update asset links with signing certificate"
git push
```

**重要：** 必须等待 Vercel 部署完成后再构建 APK。

---

### 六、构建 APK

#### 1. 调试版 APK

```powershell
cd twa-android
bubblewrap build
```

输出位置：`android-app/app/build/outputs/apk/debug/app-debug.apk`

#### 2. 发布版 APK

先在 `android-app/app/build.gradle` 配置签名：

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../tongtong-release.jks")
            storePassword "your_store_password"
            keyAlias "tongtong"
            keyPassword "your_key_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

构建：
```powershell
cd twa-android/android-app
./gradlew assembleRelease
```

输出位置：`app/build/outputs/apk/release/app-release.apk`

---

### 七、安装测试

#### 1. 通过 ADB 安装

```powershell
adb install app-debug.apk
```

#### 2. 手动安装

将 APK 传输到手机，点击安装（需开启"允许安装未知来源应用"）。

---

### 八、常见问题

#### Q1: 安装后打开显示白屏

**原因：** Asset Links 未正确配置或未生效

**解决：**
1. 访问 `https://tongtong-music-frontend.vercel.app/.well-known/assetlinks.json` 确认可访问
2. 确认 `sha256_cert_fingerprints` 与签名证书一致
3. 清除应用数据重试

#### Q2: 构建失败 "SDK location not found"

**解决：** 创建 `local.properties` 文件：
```powershell
cd twa-android/android-app
echo "sdk.dir=D:\\android_sdk" > local.properties
```

#### Q3: 签名不匹配

**原因：** 调试签名和发布签名不同

**解决：** 使用相同的签名证书构建 APK 和配置 Asset Links

#### Q4: PWA 缓存问题

**解决：** 应用会使用 TWA 容器缓存，在应用设置中清除数据即可

---

### 九、发布到应用商店

#### Google Play Store

1. 创建开发者账号：https://play.google.com/console
2. 上传 APK/AAB
3. 填写应用信息

#### 国内应用商店

需单独对接各商店开发者平台：
- 华为应用市场
- 小米应用商店
- OPPO/vivo 应用商店
- 腾讯应用宝

---

## 方案三：GitHub Actions 自动化构建（推荐团队协作）

**完全无需本地环境，推送代码后自动构建 APK。**

### 1. 创建 GitHub 仓库

将项目推送到 GitHub：

```powershell
cd tongtong-music-frontend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/tongtong-music-frontend.git
git push -u origin main
```

### 2. 创建 GitHub Actions 工作流

在项目根目录创建 `.github/workflows/build-twa.yml`：

```yaml
name: Build TWA APK

on:
  push:
    branches: [main]
  workflow_dispatch: # 手动触发

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli
      
      - name: Initialize TWA
        run: |
          mkdir twa-android
          cd twa-android
          bubblewrap init --manifest="https://tongtong-music-frontend.vercel.app/manifest.webmanifest" \
            --directory="." \
            --androidPackage="com.tongtong.music" \
            --appName="瞳瞳音乐"
      
      - name: Build APK
        run: |
          cd twa-android
          bubblewrap build
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: tongtong-music-apk
          path: twa-android/android-app/app/build/outputs/apk/debug/app-debug.apk
```

### 3. 触发构建

- **自动触发：** 推送代码到 `main` 分支
- **手动触发：** 在 GitHub Actions 页面点击 "Run workflow"

### 4. 下载 APK

构建完成后，在 Actions 页面的 Artifacts 区域下载 `tongtong-music-apk.zip`。

**优点：**
- 无需本地环境，云端自动构建
- 每次代码更新自动生成新版本 APK
- 团队协作友好，所有人都能获取最新 APK

**缺点：**
- 首次配置需要了解 GitHub Actions 基础
- Asset Links 需要手动配置签名证书指纹（无法使用调试签名）

---

## 参考链接

- [Bubblewrap 官方文档](https://github.com/nicholasni/bubblewrap)
- [TWA 官方指南](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Asset Links 生成器](https://developers.google.com/digital-asset-links/tools/generator)
- [Android 签名配置](https://developer.android.com/studio/publish/app-signing)
- [PWA Builder 官网](https://www.pwabuilder.com/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)