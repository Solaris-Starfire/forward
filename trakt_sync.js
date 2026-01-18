/**
 * Forward Widget - Trakt Sync
 * * 核心修改点：
 * 1. 使用 `args` 定义输入框，Forward 会在界面上渲染这些选项。
 * 2. 脚本中不再包含任何硬编码的 Token，保护隐私。
 * 3. 每次运行组件时，Forward 会把界面上填的值传给 params。
 */

// --- 1. 组件配置 (UI 定义) ---
const config = {
  script: "SyncTraktHistory",  // 必须与下方函数名一致
  functionName: "SyncTraktHistory",
  args: [
    {
      type: "input",
      name: "clientId",
      label: "Client ID",
      placeholder: "在此粘贴 Trakt Client ID",
      required: true
    },
    {
      type: "input",
      name: "accessToken",
      label: "Access Token",
      placeholder: "在此粘贴 Access Token",
      required: true
    },
    {
      type: "enumeration",
      name: "mediaType",
      label: "媒体类型",
      options: [
        { label: "电影 (Movie)", value: "movies" },
        { label: "剧集 (Episode)", value: "episodes" }
      ],
      defaultValue: "movies"
    },
    {
      type: "input",
      name: "tmdbId",
      label: "TMDB ID",
      placeholder: "例如: 27205 (每次同步前修改此项)",
      required: true
    }
  ]
};

// --- 2. 逻辑处理函数 ---
async function SyncTraktHistory(params = {}) {
  try {
    // 验证：检查用户是否在界面上填写了参数
    if (!params.clientId || !params.accessToken) {
      throw new Error("❌ 未配置授权信息！请长按组件进入编辑模式填写 Token。");
    }
    if (!params.tmdbId) {
      throw new Error("❌ 请输入 TMDB ID");
    }

    const API_URL = "https://api.trakt.tv/sync/history";
    const tmdbId = parseInt(params.tmdbId);
    
    // 构造 Trakt API 需要的数据包
    let requestBody = {};
    if (params.mediaType === "movies") {
      requestBody = { 
        movies: [{ ids: { tmdb: tmdbId } }] 
      };
    } else {
      requestBody = { 
        episodes: [{ ids: { tmdb: tmdbId } }] 
      };
    }

    // 设置请求头
    const options = {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": params.clientId,
        "Authorization": `Bearer ${params.accessToken}`,
        "User-Agent": "ForwardWidget/1.0"
      }
    };

    // 发送 POST 请求 (只推不拉，单向)
    const response = await Widget.http.post(API_URL, requestBody, options);
    const result = response.data;

    // 解析结果用于展示
    let addedCount = 0;
    if (params.mediaType === "movies") {
      addedCount = result.added ? result.added.movies : 0;
    } else {
      addedCount = result.added ? result.added.episodes : 0;
    }
    
    // 生成状态卡片
    const statusTitle = addedCount > 0 ? "✅ 同步成功" : "⚠️ 未变动 (可能已存在)";
    const statusDesc = `ID: ${tmdbId} | 类型: ${params.mediaType === 'movies' ? '电影' : '剧集'}`;

    return [
      {
        id: `trakt_res_${tmdbId}_${Date.now()}`,
        type: "url",
        title: statusTitle,
        description: statusDesc,
        posterPath: "https://trakt.tv/assets/logos/header-icon-360d039956.png",
        mediaType: "tv",
        link: `https://trakt.tv/search/tmdb/${tmdbId}?id_type=tmdb`,
        playerType: "system"
      }
    ];

  } catch (error) {
    console.error("Trakt Widget Error:", error);
    return [
      {
        id: "error",
        type: "url",
        title: "❌ 错误",
        description: error.message || "未知网络错误",
        posterPath: "",
        mediaType: "tv",
        link: "",
        playerType: "system"
      }
    ];
  }
}

// 某些运行环境需要导出 config，视具体实现而定，建议保留
if (typeof module !== 'undefined') {
  module.exports = config;
}
