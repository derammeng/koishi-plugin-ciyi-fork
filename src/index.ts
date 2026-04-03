import * as fs from 'fs/promises';
import * as path from 'path';
import { Context, h, Random, Schema, Session } from "koishi";
import allWords from "./data/allWords.json";
import questionList from "./data/questionList.json";

export const name = "ciyi";
export const usage = `## 使用

1. 设置指令别名。
2. 发送 \`ciyi\` 查看帮助。
3. 发送 \`ciyi 开始\` 开始一轮新游戏。
4. 当开始新一轮游戏时，用户可以直接发送两字词语（不带 \`ciyi 猜\` 前缀）来猜测。
4. 移除每日限制，改为使用本地词库（词库文件放置在data/ciyi）

## 原项目地址

* https://github.com/araea/koishi-plugin-ciyi`;
export const inject = ["database"];
export interface Config {
  atReply: boolean;
  quoteReply: boolean;
  isEnableMiddleware: boolean;
  maxHistory: number;
  maxRank: number;
}
export const Config: Schema<Config> = Schema.object({
  atReply: Schema.boolean().default(false).description("响应时 @"),
  quoteReply: Schema.boolean().default(true).description("响应时引用"),
  isEnableMiddleware: Schema.boolean().default(false).description("是否启用中间件（若启用，猜测词语时可以不使用指令直接猜测）"),
  maxHistory: Schema.number().default(10).min(0).description("最大历史记录数"),
  maxRank: Schema.number().default(10).min(0).description("最大排行榜人数"),
});

declare module "koishi" {
  interface Tables {
    ciyi: Ciyi;
    ciyi_rank: CiyiRank;
  }
}

export interface Ciyi {
  id: number;
  channelId: string;
  answer: string;
  lastStartTimestamp: Date;
  guessedWords: string[];
  guessedHistoryInOneGame: string[];
  rankList: string[];
  history: History[];
  isOver: boolean;
}
export interface CiyiRank {
  id: number;
  userId: string;
  username: string;
  score: number;
}
interface History {
  guess: string;
  rank: number;
  leftHint: string;
  rightHint: string;
}

export function apply(ctx: Context, cfg: Config) {
  ctx.model.extend("ciyi", { id: "unsigned", channelId: "string", answer: "string", lastStartTimestamp: "timestamp", guessedWords: "list", guessedHistoryInOneGame: "list", rankList: "list", history: { type: "json", initial: [] }, isOver: "boolean", }, { autoInc: true, primary: "id" });
  ctx.model.extend("ciyi_rank", { id: "unsigned", userId: "string", username: "string", score: "unsigned", }, { autoInc: true, primary: "id" });

  const logger = ctx.logger("ciyi");
  const random = new Random(() => Math.random());

  if (cfg.isEnableMiddleware) {
    ctx.middleware(async (session, next) => {
      const text = `${h.select(session.event.message.elements, "text")}`;
      if (text.length !== 2) { return await next(); }
      if (!allWords.includes(text)) { return await next(); }
      const gameInfo = await ctx.database.get("ciyi", { channelId: session.channelId, });
      if (gameInfo.length === 0 || gameInfo[0].isOver) { return await next(); }
      await session.execute(`ciyi.猜 ${text}`);
    });
  }

  ctx.command("ciyi", "词意（猜词游戏）");
  ctx.command("ciyi.开始", "开始一轮新的词意挑战").action(async ({ session }) => { return await startGame(session); });
  ctx.command("ciyi.猜 <guess:string>").action(async ({ session }, guess) => { return await c(session, guess?.trim()); });
  ctx.command("ciyi.排行榜").action(async ({ session }) => { return await phb(session); });

  function getNewUniqueAnswer(oldGuessedWords: string[]): string | null {
    const usedWordsSet = new Set(oldGuessedWords);
    const availableWords = questionList.filter((word) => !usedWordsSet.has(word));
    if (availableWords.length === 0) { return null; }
    return random.pick(availableWords);
  }

  function formatCiyiRanks(ranks: CiyiRank[]): string {
    ranks.sort((a, b) => b.score - a.score);
    const maxRank = cfg.maxRank;
    const needsSlicing = maxRank !== undefined && maxRank < ranks.length;
    const slicedRanks = needsSlicing ? ranks.slice(0, maxRank) : ranks;
    const formattedString = slicedRanks.map((rank, index) => `${index + 1}. ${rank.username} ${rank.score}`).join("\n");
    return needsSlicing ? `${formattedString}\n...` : formattedString;
  }

  function formatHistories(histories: History[]): string {
    const sortedHistories = histories.sort((a, b) => a.rank - b.rank);
    const maxHistory = cfg.maxHistory;
    const needsSlicing = maxHistory !== undefined && maxHistory < sortedHistories.length;
    const slicedHistories = needsSlicing ? sortedHistories.slice(0, maxHistory) : sortedHistories;
    const formattedString = slicedHistories.map((history, index) => {
        const leftHintChar = history.leftHint.length > 1 ? history.leftHint[1] : "？";
        const rightHintChar = history.rightHint.length > 0 ? history.rightHint[0] : "？";
        return `${index + 1}. ？${leftHintChar}）${history.guess}（${rightHintChar}？ #${history.rank}`;
      }).join("\n");
    return needsSlicing ? `${formattedString}\n...` : formattedString;
  }

  function getHistory(targetString: string, stringArray: string[]): History | null {
    const index = stringArray.indexOf(targetString);
    if (index === -1) { return null; }
    const rank = index + 1;
    const leftHint = index > 0 ? stringArray[index - 1] : "";
    const rightHint = index < stringArray.length - 1 ? stringArray[index + 1] : "";
    return { guess: targetString, rank, leftHint, rightHint, };
  }

  async function phb(session: Session) {
    const ranks = await ctx.database.get("ciyi_rank", {});
    const formattedRanks = formatCiyiRanks(ranks);
    return await sendMsg(session, `词意排行榜：\n${formattedRanks}`);
  }

  async function c(session: Session, guess: string) {
    if (!guess || guess.length !== 2) { return await sendMsg(session, "请输入两字词语！"); }
    if (!allWords.includes(guess)) { return await sendMsg(session, `${guess} 不在词库中`); }

    let gameInfo = (await ctx.database.get("ciyi", { channelId: session.channelId, }))[0];

    if (!gameInfo || gameInfo.isOver) {
      const timestamp = session.timestamp;
      const oldGuessedWords = gameInfo ? gameInfo.guessedWords : [];
      let answer = getNewUniqueAnswer(oldGuessedWords);
      if (!answer) { return sendMsg(session, "题库已尽，无法开始新游戏。"); }
      const rankList = (await fetchCiYi(answer))?.trim().split("\n");
      if (!rankList) { return sendMsg(session, "开始新挑战失败：无法获取词库，请稍后再试。"); }
      const newGameData = { channelId: session.channelId, answer, lastStartTimestamp: new Date(timestamp), guessedWords: [...oldGuessedWords, answer], rankList, isOver: false, guessedHistoryInOneGame: [], history: [], };
      if (!gameInfo) { await ctx.database.create("ciyi", newGameData); } else { await ctx.database.set("ciyi", { channelId: session.channelId }, newGameData); }
      gameInfo = (await ctx.database.get("ciyi", { channelId: session.channelId, }))[0];
      await sendMsg(session, "新一轮挑战已自动开始！");
    }

    if (gameInfo.isOver) { return await sendMsg(session, "当前没有进行中的挑战，请发送“ciyi 开始”来启动新一轮游戏。"); }
    if (gameInfo.guessedHistoryInOneGame.includes(guess)) { return await sendMsg(session, `${guess} 已猜过`); }

    if (guess === gameInfo.answer) {
      await ctx.database.set("ciyi", { channelId: session.channelId }, { isOver: true, history: [], guessedHistoryInOneGame: [], });
      const msg = `恭喜你猜对了！\n答案：${gameInfo.answer}\n猜测：${gameInfo.history.length + 1} 次`;
      const playerInfo = await ctx.database.get("ciyi_rank", { userId: session.userId, });
      if (playerInfo.length === 0) { await ctx.database.create("ciyi_rank", { userId: session.userId, username: session.username, score: 1, }); } else { await ctx.database.set("ciyi_rank", { userId: session.userId }, { username: session.username, score: playerInfo[0].score + 1, }); }
      return await sendMsg(session, msg);
    }

    const rankList = gameInfo.rankList;
    const history = [...gameInfo.history, getHistory(guess, rankList)];
    await ctx.database.set("ciyi", { channelId: session.channelId }, { guessedHistoryInOneGame: [...gameInfo.guessedHistoryInOneGame, guess], history, });
    return await sendMsg(session, formatHistories(history));
  }

  async function startGame(session: Session) {
    const gameInfoArr = await ctx.database.get("ciyi", { channelId: session.channelId, });
    const gameInfo = gameInfoArr.length > 0 ? gameInfoArr[0] : null;
    if (gameInfo && !gameInfo.isOver) { return await sendMsg(session, "存在未完成的挑战！请先猜出当前词语。"); }

    let oldGuessedWords = gameInfo ? gameInfo.guessedWords : [];
    let answer = getNewUniqueAnswer(oldGuessedWords);
    if (!answer) { return sendMsg(session, "开始新挑战失败：题库已尽。"); }

    const rankList = (await fetchCiYi(answer))?.trim().split("\n");
    if (!rankList) { return sendMsg(session, "开始新挑战失败：无法获取词库，请稍后再试。"); }

    const newGameData = { channelId: session.channelId, answer, lastStartTimestamp: new Date(session.timestamp), guessedWords: [...oldGuessedWords, answer], rankList, isOver: false, guessedHistoryInOneGame: [], history: [], };
    if (!gameInfo) { await ctx.database.create("ciyi", newGameData); } else { await ctx.database.set("ciyi", { channelId: session.channelId }, newGameData); }

    const msg = `词意挑战开始！\n\n目标\n    猜出系统选择的两字词语\n\n反馈\n    每次猜测后，获得相似度排名与相邻词提示\n\n    例如: \`?好) 企业 (地? #467\`\n        #467      → 相似度排名 (越小越近)\n        ?好 / 地? → 相邻词提示 (? 为隐藏字)\n\n周期\n    猜对即可开始下一轮`;
    return await sendMsg(session, msg);
  }

  async function fetchCiYi(word: string): Promise<string> {
    const filePath = path.join(ctx.root.baseDir, 'data', 'ciyi', `${word}.txt`);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`读取本地词库文件失败 ${filePath}:`, error);
      return null;
    }
  }
  
  async function sendMsg(session: Session, msg: string) {
    if (cfg.atReply) { msg = `${h.at(session.userId)}${h("p", "")}${msg}`; }
    if (cfg.quoteReply) { msg = `${h.quote(session.messageId)}${msg}`; }
    await session.send(msg);
  }
}