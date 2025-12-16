import { Client, GatewayIntentBits, Events, ChannelType } from "discord.js";
import { deleteCmd, insertCmd } from "./command";

//////

export const client = new Client({
  intents: [
    // discord botが使う情報をここに書く　権限以上のことを書くとエラーになる
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

// チャンネルIDはdiscordのチャンネルの部分を右クリックすると入手できる
// ギルドというのがサーバー
const CHANNEL_GENERAL = "1446799876917694598";


async function sendMessage(channelId: string, message: string) {
  const channel = await client.channels.fetch(channelId);
  // 型チェック
  if (channel === null || channel.type !== ChannelType.GuildText) {
    console.log(
      "channel作れませんでしたもしくはテキストチャンネルではありませんでした"
    );
  } else {
    // これでメッセージを送れる
    await channel.send(message);
  }
}

// addEventListenerみたいなやつ
// client.onceは条件に当てはまったら一度だけ実行される
client.once(Events.ClientReady, (c) => {
  console.log(`準備完了！ ${c.user.tag} としてログインしました。`);
  // ログイン時に1度だけメッセージを送れる
  sendMessage(CHANNEL_GENERAL, "yeah!");
});

// client.onは条件に当てはまるたびに実行される
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === "Pong!") {
    await message.reply("Pong!");
  }
});

// コマンドの処理
client.on(Events.InteractionCreate, async (interaction) => {
  // チャットコマンド以外（ボタンなど）は無視
  if (!interaction.isChatInputCommand()) return;

  // コマンド名で分岐
  if (interaction.commandName === "insert") {
    await insertCmd(client, interaction);
  } else if (interaction.commandName === "delete") {
    await deleteCmd(client, interaction);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
