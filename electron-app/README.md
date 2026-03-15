<div align="center">
  <h1>🎙️ VoiceInk – Electron 跨平台版</h1>
  <p>基于 Electron + React + TypeScript 重构的跨平台语音转文字桌面应用</p>

  [![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
  ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen)
  ![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
  ![Electron](https://img.shields.io/badge/electron-33-blue)
</div>

---

## 简介

VoiceInk Electron 版是原 macOS 原生应用的跨平台重构版本，使用 **Electron + React + TypeScript** 构建，可在 Windows、macOS 和 Linux 上运行。核心转录引擎依然基于 [whisper.cpp](https://github.com/ggerganov/whisper.cpp)，保证本地化、高精度、完全离线的语音识别能力。

---

## 功能特性

- 🎙️ **高精度转录**：集成本地 Whisper.cpp 模型，接近实时的语音识别，准确率高达 99%
- 🔒 **完全离线**：所有处理均在本地完成，语音数据不离开设备
- ⚡ **Power Mode**：根据当前活跃应用自动切换预设配置
- 🤖 **AI 增强**：可接入 OpenAI / 本地 LLM 对转录文本进行智能润色
- 🎯 **全局快捷键**：支持自定义快捷键快速录音与一键粘贴
- 📝 **个人词典**：添加专业术语、自定义替换词，提高识别精准度
- 📊 **历史记录**：查看和管理所有转录历史，支持导出
- 🌍 **跨平台支持**：Windows / macOS / Linux 一套代码，统一体验

---

## 系统要求

| 平台 | 最低版本 | 架构 |
|------|---------|------|
| Windows | Windows 10 (1809+) | x64、ARM64 |
| macOS | macOS 12 Monterey+ | x64、Apple Silicon (ARM64) |
| Linux | Ubuntu 20.04+ / 主流发行版 | x64、ARM64 |

**Node.js 版本**：>= 18（仅构建时需要）

---

## 安装

### 方式一：下载预编译安装包（推荐）

前往 [Releases 页面](../../releases) 下载对应平台的安装包：

| 平台 | 文件格式 | 说明 |
|------|---------|------|
| Windows | `.exe`（NSIS 安装程序）| 双击运行，按向导安装 |
| Windows | `.exe`（Portable）| 免安装，直接运行 |
| macOS | `.dmg` | 拖拽到 Applications 文件夹 |
| Linux | `.AppImage` | `chmod +x` 后直接运行 |
| Linux | `.deb` | `sudo dpkg -i` 安装 |

### 方式二：从源码构建

请参阅 [本地构建指南](#本地构建)。

---

## 快速上手

### 第一次启动

1. **安装并打开 VoiceInk**
2. **完成引导流程（Onboarding）**
   - 授予麦克风权限
   - 选择并下载 Whisper 语言模型（首次需联网下载，之后完全离线）
3. **设置全局快捷键**（可选）
   - 进入 `Settings → Hotkeys`，设置录音触发快捷键

### 开始转录

1. 点击主窗口的 **"开始录音"** 按钮，或按全局快捷键
2. 对着麦克风说话
3. 再次点击按钮或松开快捷键停止录音
4. 转录文本自动显示并复制到剪贴板

### 功能导航

| 功能模块 | 路径 | 说明 |
|---------|------|------|
| 主录音界面 | 主窗口 | 一键录音/停止，实时音量可视化 |
| 迷你悬浮窗 | Mini Recorder | 常驻浮窗，不遮挡工作区 |
| 历史记录 | History | 查看/搜索/导出转录历史 |
| 语音模型管理 | Models | 下载/切换不同大小的 Whisper 模型 |
| AI 增强设置 | Enhancement | 配置 AI 润色提示词和 API 密钥 |
| 词典管理 | Dictionary | 添加自定义词汇和文本替换规则 |
| Power Mode | Power Mode | 按应用场景自动切换配置 |
| 系统设置 | Settings | 快捷键、外观、音频输入设备等 |
| 音频文件转录 | Transcribe Audio | 对本地音频文件进行批量转录 |

---

## Whisper 模型说明

VoiceInk 使用 [whisper.cpp](https://github.com/ggerganov/whisper.cpp) GGML 格式模型，应用内支持一键下载：

| 模型 | 大小 | 速度 | 精度 | 推荐场景 |
|------|------|------|------|---------|
| tiny | ~75 MB | 最快 | 一般 | 低配机器、实时场景 |
| base | ~145 MB | 快 | 较好 | 日常使用 |
| small | ~466 MB | 中等 | 好 | **推荐** |
| medium | ~1.5 GB | 慢 | 很好 | 高精度需求 |
| large-v3 | ~3.1 GB | 最慢 | 最优 | 专业场景 |

首次使用请在 **Models** 页面选择并下载模型（需联网），下载后完全离线运行。

---

## AI 增强功能

VoiceInk 支持通过 LLM 对转录文本进行二次加工（可选功能）：

1. 进入 `Enhancement` 页面
2. 填写 API Key（支持 OpenAI 兼容接口）
3. 选择或自定义增强模式（如：纠错、润色、摘要等）
4. 在录音结束后自动应用

> 此功能为可选项，不配置也不影响基础转录使用。

---

## 本地构建

### 前置依赖

- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) >= 9（随 Node.js 安装）
- Git

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Yintel12138/VoiceInk-windows.git
cd VoiceInk-windows/electron-app

# 2. 安装依赖
npm install

# 3. 开发模式启动（含热重载）
npm run dev

# 4. 构建生产版本
npm run build

# 5. 打包安装程序
npm run dist          # 当前平台
npm run dist:win      # Windows
npm run dist:mac      # macOS
npm run dist:linux    # Linux
```

打包完成后，安装包位于 `electron-app/release/` 目录。

### 运行测试

```bash
cd electron-app
npm test                 # 运行所有单元测试
npm run test:coverage    # 生成覆盖率报告
```

---

## GitHub Actions 自动构建发布

本项目已配置 CI/CD 工作流（`.github/workflows/electron-build.yml`），支持：

- **自动触发**：推送 `v*` 格式的 Git 标签时（如 `v1.0.0`）自动为 Windows、macOS、Linux 三平台构建并发布 Release
- **手动触发**：在 GitHub Actions 页面手动触发构建，可选择是否创建草稿 Release

### 发布新版本

```bash
git tag v1.0.0
git push origin v1.0.0
```

推送标签后，GitHub Actions 将自动：
1. 在三个平台并行构建
2. 将安装包上传为 Release 附件
3. 自动生成更新日志

---

## 常见问题

**Q: 麦克风没有声音 / 录音失败**
- Windows：检查系统隐私设置，确保已授予应用麦克风权限
- macOS：在「系统偏好设置 → 隐私与安全性 → 麦克风」中允许 VoiceInk
- Linux：检查 PulseAudio / PipeWire 是否正常，尝试以 root 权限运行一次以排查权限问题

**Q: 模型下载失败**
- 检查网络连接，模型托管在 Hugging Face（可能需要科学上网）
- 下载完成前请不要关闭应用

**Q: 转录速度很慢**
- 尝试切换到更小的模型（如 tiny 或 base）
- 确保 CPU/内存资源充足，关闭其他占用资源的程序

**Q: Linux 下 AppImage 无法运行**
```bash
chmod +x VoiceInk-*.AppImage
./VoiceInk-*.AppImage --no-sandbox
```

---

## 项目结构

```
electron-app/
├── src/
│   ├── main/               # Electron 主进程
│   │   ├── main.ts         # 入口文件
│   │   ├── preload.ts      # 预加载脚本
│   │   ├── services/       # 后端服务（音频、转录、AI、设置等）
│   │   ├── managers/       # 窗口管理
│   │   └── ipc/            # IPC 通信处理
│   ├── renderer/           # React 渲染进程
│   │   ├── App.tsx         # 根组件
│   │   ├── views/          # 各功能页面
│   │   └── components/     # 可复用组件
│   └── shared/             # 主/渲染进程共享类型和常量
├── tests/                  # 单元测试
├── public/                 # 静态资源
└── package.json
```

---

## 贡献

欢迎提交 Issue 反馈问题或建议。如需提交 PR，请先开 Issue 讨论方案。

---

## 许可证

本项目基于 [GNU GPL v3.0](../LICENSE) 开源。
