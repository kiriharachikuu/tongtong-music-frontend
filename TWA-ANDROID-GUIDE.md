# 瞳瞳音乐 - Android TWA 打包指南

本文档介绍如何将 Vue PWA 项目打包成 Android App (TWA 方式)。

## 前提条件

- ✅ PWA 已部署在 HTTPS 域名：`https://tongtong-music-frontend.vercel.app/`
- ✅ 项目已配置 `vite-plugin-pwa`
- ✅ 本地已安装 Node.js 18+

## 一、Asset Links 配置

TWA 需要 Android 应用与网站建立信任关系，通过 Asset Links 文件实现。

### 1. 文件位置

```
tongtong-music-frontend/
└── public/
    └── .well-known/
        └── assetlinks.json
```

### 2. 文件内容

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

### 3. 部署到 Vercel

```powershell
cd tongtong-music-frontend
git add public/.well-known/assetlinks.json
git commit -m "Add asset links for TWA"
git push
```

### 4. 验证部署

访问：`https://tongtong-music-frontend.vercel.app/.well-known/assetlinks.json`

确认文件可正常访问。

---

## 二、安装依赖

### 1. 安装 Java JDK 17+

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

### 2. 安装 Android SDK

**方式一：安装 Android Studio**（推荐）
- 下载：https://developer.android.com/studio
- 安装后打开 SDK Manager，安装 SDK Platform 33 和 Build Tools

**方式二：仅安装命令行工具**
- 下载：https://developer.android.com/studio#command-line-tools-only
- 解压到 `C:\Android\sdk`

配置环境变量：
```powershell
$env:ANDROID_HOME = "C:\Android\sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

### 3. 安装 Bubblewrap

```powershell
npm install -g @bubblewrap/cli
```

验证：
```powershell
bubblewrap --version
```

---

## 三、生成 Android 项目

### 1. 初始化 TWA 项目

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

### 2. 项目结构

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

## 四、获取签名证书指纹

### 1. 使用调试签名（测试用）

调试签名位置：`~/.android/debug.keystore` (Windows: `C:\Users\<用户名>\.android\debug.keystore`)

```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -alias androiddebugkey
```

输出中的 SHA256 指纹即为所需值，格式如：
```
SHA256: 14:6D:E9:83:C5:CE:...
```

### 2. 创建发布签名（正式用）

```powershell
keytool -genkey -v -keystore tongtong-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tongtong
```

获取指纹：
```powershell
keytool -list -v -keystore tongtong-release.jks -alias tongtong
```

---

## 五、更新 Asset Links

### 1. 更新 assetlinks.json

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

### 2. 提交并部署

```powershell
cd tongtong-music-frontend
git add public/.well-known/assetlinks.json
git commit -m "Update asset links with signing certificate"
git push
```

**重要：** 必须等待 Vercel 部署完成后再构建 APK。

---

## 六、构建 APK

### 1. 调试版 APK

```powershell
cd twa-android
bubblewrap build
```

输出位置：`android-app/app/build/outputs/apk/debug/app-debug.apk`

### 2. 发布版 APK

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

## 七、安装测试

### 1. 通过 ADB 安装

```powershell
adb install app-debug.apk
```

### 2. 手动安装

将 APK 传输到手机，点击安装（需开启"允许安装未知来源应用"）。

---

## 八、常见问题

### Q1: 安装后打开显示白屏

**原因：** Asset Links 未正确配置或未生效

**解决：**
1. 访问 `https://tongtong-music-frontend.vercel.app/.well-known/assetlinks.json` 确认可访问
2. 确认 `sha256_cert_fingerprints` 与签名证书一致
3. 清除应用数据重试

### Q2: 构建失败 "SDK location not found"

**解决：** 创建 `local.properties` 文件：
```powershell
cd twa-android/android-app
echo "sdk.dir=C:\\Android\\sdk" > local.properties
```

### Q3: 签名不匹配

**原因：** 调试签名和发布签名不同

**解决：** 使用相同的签名证书构建 APK 和配置 Asset Links

### Q4: PWA 缓存问题

**解决：** 应用会使用 TWA 容器缓存，在应用设置中清除数据即可

---

## 九、发布到应用商店

### Google Play Store

1. 创建开发者账号：https://play.google.com/console
2. 上传 APK/AAB
3. 填写应用信息

### 国内应用商店

需单独对接各商店开发者平台：
- 华为应用市场
- 小米应用商店
- OPPO/vivo 应用商店
- 腾讯应用宝

---

## 十、参考链接

- [Bubblewrap 官方文档](https://github.com/nicholasni/bubblewrap)
- [TWA 官方指南](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Asset Links 生成器](https://developers.google.com/digital-asset-links/tools/generator)
- [Android 签名配置](https://developer.android.com/studio/publish/app-signing)