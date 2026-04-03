koishi-plugin-ciyi-localization
==================

[![npm](https://img.shields.io/npm/v/koishi-plugin-ciyi-localization?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ciyi-localization)
[![GitHub](https://img.shields.io/github/license/derammeng/koishi-plugin-ciyi-localization?style=flat-square)](https://github.com/derammeng/koishi-plugin-ciyi-localization/blob/main/LICENSE)

Koishi 的词意（猜词游戏）插件 – **本地化增强版**

> 基于 [araea/koishi-plugin-ciyi](https://github.com/araea/koishi-plugin-ciyi) 二次开发，移除了每日限制，改用本地词库，并支持直接发送词语猜词。

## 使用

1. 设置指令别名。
2. 发送 `ciyi` 查看帮助。

## 致谢

* [Koishi](https://koishi.chat/)
* [词影](https://cy.surprising.studio/)

## QQ 群

* 956758505

## 改动

1. **移除每日限制**，改为使用本地词库（词库文件需自行放置于 `src/data/` 目录）
2. **增强交互体验**：当插件配置中启用 `isEnableMiddleware: true` 后，用户可直接发送两字词语进行猜测，无需输入 `ciyi 猜` 前缀。

#### License

<sup>
Licensed under either of <a href="LICENSE-APACHE">Apache License, Version
2.0</a> or <a href="LICENSE-MIT">MIT license</a> at your option.
</sup>

<br>

<sub>
Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this crate by you, as defined in the Apache-2.0 license, shall
be dual licensed as above, without any additional terms or conditions.
</sub>
