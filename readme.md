# chrome-quick-jump

快速切换标签页！

## 安装

1. chrome 扩展商店： https://chrome.google.com/webstore/detail/quick-jump/oifpnmkojnlofddkdjmcjnkpcmemjded
2. 在浏览器地址栏右侧区域点击扩展图标，配置快捷键
3. 在任意页面按下快捷键

## 效果预览

![quick jump](./docs/quick-jump.gif)

## 写给开发者

* 执行 `yarn install` 安装依赖
* 执行 `yarn start` 启动 webpack-dev-server，这将监听 src/ 目录下的文件，并将文件打包到 quick-jump/dist/quick-jump.js
* 注意除了 src/ 目录下的文件之外，quick-jump/ 目录下也有一部分的源文件，例如 background.js
* 执行 `yarn build` 执行生产环境下的打包，输出位于 quick-jump/dist/quick-jump.js
* 在发布之前需要执行 `yarn build` 构建最新的包；更新 package.json 与 quick-jump/manifest.json 中的 `version` 字段；将 quick-jump/ 目录下的所有文件添加到一个压缩文件，前往 chrome 开发者信息中心进行发布
