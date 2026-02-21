const { gmd, commands, monospace, formatBytes } = require("../gift"),
  fs = require("fs"),
  axios = require("axios"),
  BOT_START_TIME = Date.now(),
  { totalmem: totalMemoryBytes, freemem: freeMemoryBytes } = require("os"),
  moment = require("moment-timezone"),
  more = String.fromCharCode(8206),
  readmore = more.repeat(4001),
  ram = `${formatBytes(freeMemoryBytes)}/${formatBytes(totalMemoryBytes)}`;
const { sendButtons } = require("gifted-btns");

gmd(
  {
    pattern: "ping",
    aliases: ["pi", "p"],
    react: "⚡",
    category: "general",
    description: "Check bot response speed",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      react,
      newsletterJid,
      newsletterUrl,
      botFooter,
      botName,
      botPrefix,
    } = conText;
    const startTime = process.hrtime();

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(80 + Math.random() * 420)),
    );

    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor(elapsed[0] * 1000 + elapsed[1] / 1000000);

    await sendButtons(Gifted, from, {
      title: "Bot Speed",
      text: `⚡ Pong: ${responseTime}ms`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}uptime`, text: "⏱️ Uptime" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "WaChannel",
            url: newsletterUrl,
          }),
        },
      ],
    });

    /*await Gifted.sendMessage(from, {
      text: 
      contextInfo: {
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterJid,
          newsletterName: botName,
          serverMessageId: 143
        }
      }
    }, { quoted: mek });*/
    await react("✅");
  },
);

gmd(
  {
    pattern: "report",
    aliases: ["request"],
    react: "💫",
    description: "Request New Features.",
    category: "owner",
  },
  async (from, Gifted, conText) => {
    const { mek, q, sender, react, pushName, botPrefix, isSuperUser, reply } =
      conText;
    const reportedMessages = {};
    const devlopernumber = "254799916673";
    try {
      if (!isSuperUser) return reply("*Owner Only Command*");
      if (!q)
        return reply(
          `Example: ${botPrefix}request hi dev downloader commands are not working`,
        );
      const messageId = mek.key.id;
      if (reportedMessages[messageId]) {
        return reply(
          "This report has already been forwarded to the owner. Please wait for a response.",
        );
      }
      reportedMessages[messageId] = true;
      const textt = `*| REQUEST/REPORT |*`;
      const teks1 = `\n\n*User*: @${sender.split("@")[0]}\n*Request:* ${q}`;
      Gifted.sendMessage(
        devlopernumber + "@s.whatsapp.net",
        {
          text: textt + teks1,
          mentions: [sender],
        },
        {
          quoted: mek,
        },
      );
      reply(
        "Tʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ʏᴏᴜʀ ʀᴇᴘᴏʀᴛ. Iᴛ ʜᴀs ʙᴇᴇɴ ꜰᴏʀᴡᴀʀᴅᴇᴅ ᴛᴏ ᴛʜᴇ ᴏᴡɴᴇʀ. Pʟᴇᴀsᴇ ᴡᴀɪᴛ ꜰᴏʀ ᴀ ʀᴇsᴘᴏɴsᴇ.",
      );
      await react("✅");
    } catch (e) {
      reply(e);
      console.log(e);
    }
  },
);

gmd(
  {
    pattern: "menus",
    aliases: ["mainmenu", "mainmens"],
    description: "Display Bot's Uptime, Date, Time, and Other Stats",
    react: "📜",
    category: "general",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
      ownerNumber,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter(
        (command) => command.pattern,
      ).length;

      let menus = `
*🦄 Uᴘᴛɪᴍᴇ :* ${monospace(uptime)}
*🍁 Dᴀᴛᴇ Tᴏᴅᴀʏ:* ${monospace(date)}
*🎗 Tɪᴍᴇ Nᴏᴡ:* ${monospace(time)}

➮Fᴏᴜɴᴅᴇʀ - Gifted Tech
➮Usᴇʀ - ${monospace(pushName)}
➮Nᴜᴍ - ${monospace(ownerNumber)} 
➮Mᴇᴍᴏʀʏ - ${monospace(ram)}

*🧑‍💻 :* ${monospace(botName)} Iꜱ Aᴠᴀɪʟᴀʙʟᴇ

╭──❰ *ALL MENU* ❱
│🏮 Lɪꜱᴛ
│🏮 Cᴀᴛᴇɢᴏʀʏ
│🏮 Hᴇʟᴘ
│🏮 Aʟɪᴠᴇ
│🏮 Uᴘᴛɪᴍᴇ
│🏮 Wᴇᴀᴛʜᴇʀ
│🏮 Lɪɴᴋ
│🏮 Cᴘᴜ
│🏮 Rᴇᴘᴏꜱɪᴛᴏʀʏ
╰─────────────⦁`;

      const giftedMess = {
        image: { url: botPic },
        caption: menus.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "list",
    aliases: ["listmenu", "listmen"],
    description: "Show All Commands and their Usage",
    react: "📜",
    category: "general",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter(
        (command) => command.pattern,
      ).length;

      let list = `
╭━━〔 *${monospace(botName)}* 〕━━╮
│ ✦ *Mᴏᴅᴇ* : ${monospace(botMode)}
│ ✦ *Pʀᴇғɪx* : [ ${monospace(botPrefix)} ]
│ ✦ *Usᴇʀ* : ${monospace(pushName)}
│ ✦ *Pʟᴜɢɪɴs* : ${monospace(totalCommands.toString())}
│ ✦ *Vᴇʀsɪᴏɴ* : ${monospace(botVersion)}
│ ✦ *Uᴘᴛɪᴍᴇ* : ${monospace(uptime)}
│ ✦ *Tɪᴍᴇ Nᴏᴡ* : ${monospace(time)}
│ ✦ *Dᴀᴛᴇ Tᴏᴅᴀʏ* : ${monospace(date)}
│ ✦ *Tɪᴍᴇ Zᴏɴᴇ* : ${monospace(timeZone)}
│ ✦ *Sᴇʀᴠᴇʀ Rᴀᴍ* : ${monospace(ram)}
╰─────────────╯${readmore}\n`;

      commands.forEach((gmd, index) => {
        if (gmd.pattern && gmd.description) {
          list += `*${index + 1} ${monospace(gmd.pattern)}*\n  ${gmd.description}\n`;
        }
      });

      const giftedMess = {
        image: { url: botPic },
        caption: list.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "menu",
    aliases: ["help", "men", "allmenu"],
    react: "🪀",
    category: "general",
    description: "Fetch bot main menu",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const regularCmds = commands.filter((c) => c.pattern && !c.on);
      const bodyCmds = commands.filter((c) => c.pattern && c.on === "body");
      const totalCommands = regularCmds.length + bodyCmds.length;

      const categorized = commands.reduce((menu, gmd) => {
        if (gmd.pattern && !gmd.dontAddCommandList) {
          if (!menu[gmd.category]) menu[gmd.category] = [];
          menu[gmd.category].push({
            pattern: gmd.pattern,
            isBody: gmd.on === "body",
          });
        }
        return menu;
      }, {});

      const sortedCategories = Object.keys(categorized).sort((a, b) =>
        a.localeCompare(b),
      );
      for (const cat of sortedCategories) {
        categorized[cat].sort((a, b) => a.pattern.localeCompare(b.pattern));
      }

      let header = `╭══〘〘 *${monospace(botName)}* 〙〙═⊷
┃❍ *Mᴏᴅᴇ:*  ${monospace(botMode)}
┃❍ *Pʀᴇғɪx:*  [ ${monospace(botPrefix)} ]
┃❍ *Usᴇʀ:*  ${monospace(pushName)}
┃❍ *Pʟᴜɢɪɴs:*  ${monospace(totalCommands.toString())}
┃❍ *Vᴇʀsɪᴏɴ:*  ${monospace(botVersion)}
┃❍ *Uᴘᴛɪᴍᴇ:*  ${monospace(uptime)}
┃❍ *Tɪᴍᴇ Nᴏᴡ:*  ${monospace(time)}
┃❍ *Dᴀᴛᴇ Tᴏᴅᴀʏ:*  ${monospace(date)}
┃❍ *Tɪᴍᴇ Zᴏɴᴇ:*  ${monospace(timeZone)}
┃❍ *Sᴇʀᴠᴇʀ Rᴀᴍ:*  ${monospace(ram)}
╰═════════════════⊷\n${readmore}\n`;

      const formatCategory = (category, gmds) => {
        const title = `╭━━━━❮ *${monospace(category.toUpperCase())}* ❯━⊷ \n`;
        const body = gmds
          .map((gmd) => {
            const prefix = gmd.isBody ? "" : botPrefix;
            return `┃◇ ${monospace(prefix + gmd.pattern)}`;
          })
          .join("\n");
        const footer = `╰━━━━━━━━━━━━━━━━━⊷\n`;
        return `${title}${body}\n${footer}\n`;
      };

      let menu = header;
      for (const category of sortedCategories) {
        menu += formatCategory(category, categorized[category]) + "\n";
      }

      const giftedMess = {
        image: { url: botPic },
        caption: `${menu.trim()}\n\n> *${botFooter}*`,
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "return",
    aliases: ["details", "det", "ret"],
    react: "⚡",
    category: "owner",
    description:
      "Displays the full raw quoted message using Baileys structure.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      reply,
      react,
      quotedMsg,
      isSuperUser,
      botName,
      botFooter,
      newsletterJid,
      newsletterUrl,
    } = conText;

    if (!isSuperUser) {
      return reply(`Owner Only Command!`);
    }

    if (!quotedMsg) {
      return reply(`Please reply to/quote a message`);
    }

    try {
      const jsonString = JSON.stringify(quotedMsg, null, 2);
      const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

      for (const chunk of chunks) {
        const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

        await sendButtons(Gifted, from, {
          title: "",
          text: formattedMessage,
          footer: `> *${botFooter}*`,
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy",
                copy_code: formattedMessage,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "WaChannel",
                url: newsletterUrl,
              }),
            },
          ],
        });

        /* await Gifted.sendMessage(
        from,
        {
          text: formattedMessage,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 143
            },
          },
        },
        { quoted: mek }
      );*/
        await react("✅");
      }
    } catch (error) {
      console.error("Error processing quoted message:", error);
      await reply(`❌ An error occurred while processing the message.`);
    }
  },
);

gmd(
  {
    pattern: "uptime",
    aliases: ["up"],
    react: "⏳",
    category: "general",
    description: "check bot uptime status.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      react,
      newsletterJid,
      newsletterUrl,
      botFooter,
      botName,
      botPrefix,
    } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;

    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await sendButtons(Gifted, from, {
      title: "",
      text: `⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}ping`, text: "⚡ Ping" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "WaChannel",
            url: newsletterUrl,
          }),
        },
      ],
    });
    await react("✅");
  },
);

gmd(
  {
    pattern: "repo",
    aliases: ["sc", "rep", "script"],
    react: "💜",
    category: "general",
    description: "Fetch bot script.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      ownerName,
      newsletterJid,
      giftedRepo,
    } = conText;

    const response = await axios.get(
      `https://api.github.com/repos/${giftedRepo}`,
    );
    const repoData = response.data;
    const {
      full_name,
      name,
      forks_count,
      stargazers_count,
      created_at,
      updated_at,
      owner,
    } = repoData;
    const messageText = `Hello *_${pushName}_,*\nThis is *${botName},* A Whatsapp Bot Built by *${ownerName},* Enhanced with Amazing Features to Make Your Whatsapp Communication and Interaction Experience Amazing\n\n*❲❒❳ ɴᴀᴍᴇ:* ${name}\n*❲❒❳ sᴛᴀʀs:* ${stargazers_count}\n*❲❒❳ ғᴏʀᴋs:* ${forks_count}\n*❲❒❳ ᴄʀᴇᴀᴛᴇᴅ ᴏɴ:* ${new Date(created_at).toLocaleDateString()}\n*❲❒❳ ʟᴀsᴛ ᴜᴘᴅᴀᴛᴇᴅ:* ${new Date(updated_at).toLocaleDateString()}`;

    const dateNow = Date.now();
    await sendButtons(Gifted, from, {
      title: "",
      text: messageText,
      footer: `> *${botFooter}*`,
      image: { url: botPic },
      buttons: [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "Copy Link",
            copy_code: `https://github.com/${giftedRepo}`,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Visit Repo",
            url: `https://github.com/${giftedRepo}`,
          }),
        },
        {
          id: `repo_dl_${dateNow}`,
          text: "📥 Download Zip",
        },
      ],
    });

    const handleResponse = async (event) => {
      const messageData = event.messages[0];
      if (!messageData?.message) return;

      const templateButtonReply =
        messageData.message?.templateButtonReplyMessage;
      if (!templateButtonReply) return;

      const selectedButtonId = templateButtonReply.selectedId;
      if (!selectedButtonId?.includes(`repo_dl_${dateNow}`)) return;

      const isFromSameChat = messageData.key?.remoteJid === from;
      if (!isFromSameChat) return;

      try {
        const zipUrl = `https://github.com/${giftedRepo}/archive/refs/heads/main.zip`;
        await Gifted.sendMessage(
          from,
          {
            document: { url: zipUrl },
            fileName: `${name}.zip`,
            mimetype: "application/zip",
          },
          { quoted: messageData },
        );
        await react("✅");
      } catch (dlErr) {
        await Gifted.sendMessage(from, { text: "Failed to download repo zip: " + dlErr.message }, { quoted: messageData });
      }

      Gifted.ev.off("messages.upsert", handleResponse);
    };

    Gifted.ev.on("messages.upsert", handleResponse);
    setTimeout(
      () => Gifted.ev.off("messages.upsert", handleResponse),
      120000,
    );

    await react("✅");
  },
);

gmd(
  {
    pattern: "save",
    aliases: ["sv", "s", "sav", "."],
    react: "⚡",
    category: "owner",
    description:
      "Save messages (supports images, videos, audio, stickers, and text).",
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, sender, isSuperUser, getMediaBuffer } = conText;

    if (!isSuperUser) {
      return reply(`❌ Owner Only Command!`);
    }

    const quotedMsg =
      mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMsg) {
      return reply(`⚠️ Please reply to/quote a message.`);
    }

    try {
      let mediaData;

      if (quotedMsg.imageMessage) {
        const buffer = await getMediaBuffer(quotedMsg.imageMessage, "image");
        mediaData = {
          image: buffer,
          caption: quotedMsg.imageMessage.caption || "",
        };
      } else if (quotedMsg.videoMessage) {
        const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
        mediaData = {
          video: buffer,
          caption: quotedMsg.videoMessage.caption || "",
        };
      } else if (quotedMsg.audioMessage) {
        const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
        mediaData = {
          audio: buffer,
          mimetype: "audio/mp4",
        };
      } else if (quotedMsg.stickerMessage) {
        const buffer = await getMediaBuffer(
          quotedMsg.stickerMessage,
          "sticker",
        );
        mediaData = {
          sticker: buffer,
        };
      } else if (quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage?.message?.documentMessage) {
        const docMsg = quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage.message.documentMessage;
        const buffer = await getMediaBuffer(docMsg, "document");
        mediaData = {
          document: buffer,
          fileName: docMsg.fileName || "document",
          mimetype: docMsg.mimetype || "application/octet-stream",
        };
      } else if (
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text
      ) {
        const text =
          quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
        mediaData = {
          text: text,
        };
      } else if (quotedMsg.buttonsMessage || quotedMsg.templateMessage || quotedMsg.interactiveMessage || quotedMsg.listMessage || quotedMsg.buttonsResponseMessage || quotedMsg.templateButtonReplyMessage) {
        let text = "";
        if (quotedMsg.buttonsMessage) {
          text = quotedMsg.buttonsMessage.contentText || quotedMsg.buttonsMessage.text || "";
        } else if (quotedMsg.templateMessage?.hydratedTemplate) {
          text = quotedMsg.templateMessage.hydratedTemplate.hydratedContentText || "";
        } else if (quotedMsg.interactiveMessage?.body?.text) {
          text = quotedMsg.interactiveMessage.body.text;
        } else if (quotedMsg.listMessage) {
          text = quotedMsg.listMessage.description || quotedMsg.listMessage.title || "";
        } else if (quotedMsg.buttonsResponseMessage) {
          text = quotedMsg.buttonsResponseMessage.selectedDisplayText || "";
        } else if (quotedMsg.templateButtonReplyMessage) {
          text = quotedMsg.templateButtonReplyMessage.selectedDisplayText || "";
        }
        if (!text) {
          return reply(`❌ Could not extract text from the quoted message.`);
        }
        mediaData = {
          text: text,
        };
      } else {
        return reply(`❌ Unsupported message type.`);
      }

      await Gifted.sendMessage(sender, mediaData, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Save Error:", error);
      await reply(`❌ Failed to save the message. Error: ${error.message}`);
    }
  },
);
