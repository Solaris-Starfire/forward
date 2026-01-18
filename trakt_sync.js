// 文件名: trakt_sync.js
// 这是实际的逻辑代码，请将其上传并获取直链
{
  "script": "SyncTraktHistory",
  "args": [
    {
      "type": "input",
      "name": "clientId",
      "label": "Client ID",
      "placeholder": "Trakt API Client ID",
      "required": true
    },
    {
      "type": "input",
      "name": "accessToken",
      "label": "Access Token",
      "placeholder": "Trakt OAuth Access Token",
      "required": true
    },
    {
      "type": "enumeration",
      "name": "mediaType",
      "label": "媒体类型",
      "options": [
        { "label": "电影 (Movie)", "value": "movies" },
        { "label": "剧集 (Episode)", "value": "episodes" }
      ],
      "defaultValue": "movies"
    },
    {
      "type": "input",
      "name": "tmdbId",
      "label": "TMDB ID",
      "placeholder": "例如: 27205",
      "required": true
    }
  ],
  "functionName": "SyncTraktHistory"
}

// 分隔符：以下是函数实现，通常 Forward 会将其与上面的配置合并处理，
// 或者你需要将上面的 JSON 作为 config 导出。
// 根据 Forward 规范，通常是在同一个 JS 文件中既包含配置也包含函数。
// 如果是纯 JS 文件托管，请确保文件结构符合 Forward 加载要求。

async function SyncTraktHistory(params = {}) {
  try {
    if (!params.clientId || !params.accessToken || !params.tmdbId) {
      throw new Error("配置缺失：请填写 Client ID, Access Token 和 TMDB ID");
    }

    const API_URL = "https://api.trakt.tv/sync/history";
    const tmdbId = parseInt(params.tmdbId);
    let requestBody = {};

    if (params.mediaType === "movies") {
      requestBody = { movies: [{ ids: { tmdb: tmdbId } }] };
    } else {
      requestBody = { episodes: [{ ids: { tmdb: tmdbId } }] };
    }

    const options = {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": params.clientId,
        "Authorization": `Bearer ${params.accessToken}`,
        "User-Agent": "ForwardWidget/1.0"
      }
    };

    const response = await Widget.http.post(API_URL, requestBody, options);
    const result = response.data;
    
    let addedCount = (params.mediaType === "movies") ? 
                     (result.added ? result.added.movies : 0) : 
                     (result.added ? result.added.episodes : 0);

    return [{
        id: `trakt_sync_${tmdbId}`,
        type: "url",
        title: addedCount > 0 ? "✅ 同步成功" : "⚠️ 未添加 (可能已存在)",
        description: `TMDB ID: ${tmdbId} | 响应: ${JSON.stringify(result.added)}`,
        posterPath: "https://trakt.tv/assets/logos/header-icon-360d039956.png",
        mediaType: "tv",
        link: `https://trakt.tv/search/tmdb/${tmdbId}?id_type=tmdb`,
        playerType: "system"
    }];

  } catch (error) {
    console.error("Trakt Sync Error:", error);
    return [{
        id: "error",
        type: "url",
        title: "❌ 同步失败",
        description: error.message,
        posterPath: "",
        mediaType: "tv",
        link: "",
        playerType: "system"
    }];
  }
}
