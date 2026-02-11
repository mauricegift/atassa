const { gmd, toPtt } = require("../gift");
const yts = require("yt-search");
const axios = require("axios");
const {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  normalizeMessageContent,
} = require("gifted-baileys");
const { sendButtons } = require("gifted-btns");


gmd(
  {
    pattern: "sendaudio",
    aliases: ["sendmp3", "dlmp3", "dlaudio"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from url",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatAudio } =
      conText;

    if (!q) {
      await react("❌");
      return reply("Please provide audio url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatAudio(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the audio file.");
      }
      await Gifted.sendMessage(
        from,
        {
          audio: convertedBuffer,
          mimetype: "audio/mpeg",
          caption: `> *${botFooter}*`,
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

gmd(
  {
    pattern: "sendvideo",
    aliases: ["sendmp4", "dlmp4", "dvideo"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from url",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatVideo } =
      conText;

    if (!q) {
      await react("❌");
      return reply("Please provide video url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatVideo(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the video file.");
      }
      await Gifted.sendMessage(
        from,
        {
          document: convertedBuffer,
          fileName: "Video.mp4",
          mimetype: "video/mp4",
          caption: `> *${botFooter}*`,
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);


async function queryAPI(query, endpoints, conText, timeout = 45000) {
  const { GiftedTechApi, GiftedApiKey } = conText;
  
  for (const endpoint of endpoints) {
    try {
      const apiUrl = `${GiftedTechApi}/api/download/${endpoint}?apikey=${GiftedApiKey}&url=${encodeURIComponent(query)}`;
      
      const res = await axios.get(apiUrl, { timeout });
      
      if (res.data.success && res.data.result?.download_url) {
        return {
          success: true,
          data: res.data,
          endpoint: endpoint,
          download_url: res.data.result.download_url
        };
      }
    } catch (error) {
      continue;
    }
  }
  
  return { success: false, error: "All endpoints failed" };
}

const audioEndpoints = [
  'yta',
  'savetubemp3',
  'ytmp3',
  'dlmp3',
  'savemp3'
];

const videoEndpoints = [
  'ytv',
  'savetubemp4',
  'ytmp4',
  'dlmp4',
  'savemp4'
];

async function sendAudioOptions(Gifted, from, video, buffer, botName, botFooter, botPic) {
  const dateNow = Date.now();
  
  await sendButtons(Gifted, from, {
    title: `${botName} 𝐒𝐎𝐍𝐆 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑`,
    text: `⿻ *Title:* ${video.title}\n⿻ *Duration:* ${video.timestamp}\n\n*Select download format:*`,
    footer: botFooter,
    image: video.thumbnail || botPic,
    buttons: [
      { id: `id1_${video.id}_${dateNow}`, text: "Audio 🎶" },
      { id: `id2_${video.id}_${dateNow}`, text: "Voice Message 🔉" },
      { id: `id3_${video.id}_${dateNow}`, text: "Audio Document 📄" },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Watch on Youtube",
          url: video.url,
        }),
      },
    ],
  });
}

async function setupResponseHandler(Gifted, from, video, buffer, type) {
  const dateNow = Date.now();
  
  const handleResponse = async (event) => {
    const messageData = event.messages[0];
    if (!messageData.message) return;

    const templateButtonReply = messageData.message?.templateButtonReplyMessage;
    if (!templateButtonReply) return;

    const selectedButtonId = templateButtonReply.selectedId;

    const isFromSameChat = messageData.key?.remoteJid === from;
    if (!isFromSameChat) return;

    await Gifted.react(messageData.key, "⬇️");

    try {
      if (!selectedButtonId.includes(`_${dateNow}`)) {
        return;
      }

      const buttonType = selectedButtonId.split("_")[0];

      switch (buttonType) {
        case "id1":
          await Gifted.sendMessage(
            from,
            {
              audio: buffer,
              mimetype: "audio/mpeg",
            },
            { quoted: messageData },
          );
          break;

        case "id2":
          const pttBuffer = await toPtt(buffer);
          await Gifted.sendMessage(
            from,
            {
              audio: pttBuffer,
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
              waveform: [1000, 0, 1000, 0, 1000, 0, 1000],
            },
            { quoted: messageData },
          );
          break;

        case "id3":
          await Gifted.sendMessage(
            from,
            {
              document: buffer,
              mimetype: "audio/mpeg",
              fileName: `${video.title}.mp3`.replace(/[^\w\s.-]/gi, ""),
              caption: `${video.title}`,
            },
            { quoted: messageData },
          );
          break;

        default:
          await Gifted.sendMessage(from, { text: "Invalid option selected. Please use the buttons provided." }, { quoted: messageData });
          return;
      }

      await Gifted.react(messageData.key, "✅");
      Gifted.ev.off("messages.upsert", handleResponse);
    } catch (error) {
      console.error("Error sending media:", error);
      await Gifted.react(messageData.key, "❌");
      await Gifted.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
      Gifted.ev.off("messages.upsert", handleResponse);
    }
  };

  Gifted.ev.on("messages.upsert", handleResponse);

  setTimeout(() => {
    Gifted.ev.off("messages.upsert", handleResponse);
  }, 120000);
}

gmd(
  {
    pattern: "play",
    aliases: ["ytmp3", "ytmp3doc", "audiodoc", "yta"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from Youtube",
  },
  async (from, Gifted, conText) => {
    const {
      q,
      mek,
      reply,
      react,
      sender,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      newsletterJid,
      gmdJson,
      gmdBuffer,
      formatAudio,
      GiftedTechApi,
      GiftedApiKey,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a song name");
    }

    try {
      const searchResponse = await yts(q);

      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = firstVideo.url;
      
      await react("🔍");
      const endpointResult = await queryAPI(videoUrl, audioEndpoints, conText);
      
      if (!endpointResult.success) {
        await react("❌");
        return reply("All download services are currently unavailable. Please try again later.");
      }
      
      const bufferRes = await gmdBuffer(endpointResult.download_url);
      
      const sizeMB = bufferRes.length / (1024 * 1024);
      if (sizeMB > 20) {
        await reply("File is large, processing might take a while...");
      }

      const convertedBuffer = await formatAudio(bufferRes);
      await sendAudioOptions(Gifted, from, firstVideo, convertedBuffer, botName, botFooter, botPic);
      await setupResponseHandler(Gifted, from, firstVideo, convertedBuffer, "audio");
      
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

async function sendVideoOptions(Gifted, from, video, botName, botFooter, botPic) {
  const dateNow = Date.now();
  
  await sendButtons(Gifted, from, {
    title: `${botName} 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑`,
    text: `⿻ *Title:* ${video.title}\n⿻ *Duration:* ${video.timestamp}\n\n*Select download format:*`,
    footer: botFooter,
    image: video.thumbnail || botPic,
    buttons: [
      { id: `vid1_${video.id}_${dateNow}`, text: "Video 🎥" },
      { id: `vid2_${video.id}_${dateNow}`, text: "Video Document 📄" },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Watch on Youtube",
          url: video.url,
        }),
      },
    ],
  });
}

async function setupVideoResponseHandler(Gifted, from, video, buffer) {
  const dateNow = Date.now();
  
  const handleResponse = async (event) => {
    const messageData = event.messages[0];
    if (!messageData.message) return;

    const templateButtonReply = messageData.message?.templateButtonReplyMessage;
    if (!templateButtonReply) return;

    const selectedButtonId = templateButtonReply.selectedId;

    const isFromSameChat = messageData.key?.remoteJid === from;
    if (!isFromSameChat) return;

    await Gifted.react(messageData.key, "⬇️");

    try {
      if (!selectedButtonId.includes(`_${dateNow}`)) {
        return;
      }

      const buttonType = selectedButtonId.split("_")[0];

      switch (buttonType) {
        case "vid1":
          await Gifted.sendMessage(
            from,
            {
              video: buffer,
              mimetype: "video/mp4",
              fileName: `${video.title}.mp4`.replace(/[^\w\s.-]/gi, ""),
              caption: `🎥 ${video.title}`,
            },
            { quoted: messageData },
          );
          break;

        case "vid2":
          await Gifted.sendMessage(
            from,
            {
              document: buffer,
              mimetype: "video/mp4",
              fileName: `${video.title}.mp4`.replace(/[^\w\s.-]/gi, ""),
              caption: `📄 ${video.title}`,
            },
            { quoted: messageData },
          );
          break;

        default:
          await Gifted.sendMessage(from, { text: "Invalid option selected. Please use the buttons provided." }, { quoted: messageData });
          return;
      }
      await Gifted.react(messageData.key, "✅");
      Gifted.ev.off("messages.upsert", handleResponse);
    } catch (error) {
      console.error("Error sending media:", error);
      await Gifted.react(messageData.key, "❌");
      await Gifted.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
      Gifted.ev.off("messages.upsert", handleResponse);
    }
  };

  Gifted.ev.on("messages.upsert", handleResponse);

  setTimeout(() => {
    Gifted.ev.off("messages.upsert", handleResponse);
  }, 120000);
}

gmd(
  {
    pattern: "video",
    aliases: ["ytmp4doc", "mp4", "ytmp4", "dlmp4"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from Youtube",
  },
  async (from, Gifted, conText) => {
    const {
      q,
      mek,
      reply,
      react,
      sender,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      newsletterJid,
      gmdJson,
      gmdBuffer,
      formatVideo,
      GiftedTechApi,
      GiftedApiKey,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a video name");
    }

    try {
      const searchResponse = await yts(q);

      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = firstVideo.url;
      
      await react("🔍");
      const endpointResult = await queryAPI(videoUrl, videoEndpoints, conText);
      
      if (!endpointResult.success) {
        await react("❌");
        return reply("All download services are currently unavailable. Please try again later.");
      }
      
      const response = await gmdBuffer(endpointResult.download_url);
      
      const sizeMB = response.length / (1024 * 1024);
      if (sizeMB > 20) {
        await reply("File is large, processing might take a while...");
      }

      const convertedBuffer = response;
      await sendVideoOptions(Gifted, from, firstVideo, botName, botFooter, botPic);
      await setupVideoResponseHandler(Gifted, from, firstVideo, convertedBuffer);
      
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);
