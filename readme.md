koishi-plugin-ciyi-localization
==================

本插件是基于 [koishi-plugin-ciyi](https://github.com/araea/koishi-plugin-ciyi) 的二次开发版本
[<img alt="github" src="https://img.shields.io/badge/github-araea/ci_yi-8da0cb?style=for-the-badge&labelColor=555555&logo=github" height="20">](https://github.com/araea/koishi-plugin-ciyi)
[<img alt="npm" src="https://img.shields.io/npm/v/koishi-plugin-ciyi.svg?style=for-the-badge&color=fc8d62&logo=npm" height="20">](https://www.npmjs.com/package/koishi-plugin-ciyi)

Koishi 的词意（猜词游戏）插件。根据词语的含义相似程度，猜测正确的词语。

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
