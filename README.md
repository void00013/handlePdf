# PDF 区域处理工具

这是一个基于 Electron 和 Vue.js 开发的桌面应用程序，用于批量处理 PDF 文件中的特定区域。

## 主要功能

- 批量上传 PDF 文件
- 可视化 PDF 查看器
- 交互式区域选择器
- 批量处理 PDF 文件
- 自动打包处理结果为 ZIP 文件

## 技术栈

- Electron：跨平台桌面应用框架
- Vue 3：前端框架
- Pinia：状态管理
- PDF.js：PDF 渲染
- pdf-lib：PDF 处理
- fabric.js：交互式画布
- JSZip：ZIP 文件处理

## 核心功能模块

### PDF 上传器 (PdfUploader.vue)
- 支持多文件上传
- 文件列表管理
- 文件选择和删除

### PDF 查看器 (PdfViewer.vue)
- PDF 文件渲染
- 页面缩放功能
- 显示文件尺寸信息

### 区域选择器 (RegionSelector.vue)
- 基于 fabric.js 的交互式画布
- 支持绘制、调整和删除区域
- 显示区域坐标信息（像素坐标和百分比坐标）
- 支持键盘快捷键操作

### 处理控制器 (ProcessingControls.vue)
- 显示处理状态信息
- PDF 批量处理
- 区域覆盖处理
- ZIP 打包功能

## 使用说明

1. 上传一个或多个 PDF 文件
2. 选择一个文件和页面作为示例
3. 在示例页面上标记要去除的区域
4. 点击"开始处理"按钮
5. 选择保存位置，等待处理完成

注意：只有与示例页面尺寸相同的页面会被处理。

## 区域选择操作说明

- 点击并拖动鼠标在 PDF 上绘制要去除的区域
- 可以调整已绘制区域的大小和位置
- 选中区域后按 Delete 键可删除
- 所有选中的区域将在处理时被去除

## 处理流程

1. 获取示例页面的尺寸信息
2. 对每个上传的 PDF 文件进行处理：
   - 读取 PDF 文件
   - 创建新的 PDF 文档
   - 处理每一页（如果尺寸匹配）
   - 用白色矩形覆盖选定区域
3. 将所有处理后的文件打包成 ZIP
4. 保存到用户指定位置

## 开发环境要求

- Node.js
- npm 或 yarn
- Electron
- Vue CLI

## 项目结构

```
src/
├── main/           # Electron 主进程
├── preload/        # 预加载脚本
└── renderer/       # Vue 渲染进程
    ├── src/
    │   ├── components/
    │   │   ├── PdfUploader.vue
    │   │   ├── PdfViewer.vue
    │   │   ├── ProcessingControls.vue
    │   │   └── RegionSelector.vue
    │   ├── stores/
    │   │   └── pdfInfo.js
    │   └── App.vue
    └── index.html
```

## 特点

- 支持批量处理 PDF 文件
- 精确的区域选择和调整
- 实时预览 PDF 内容
- 自动保存处理结果
- 友好的用户界面
- 详细的处理状态反馈