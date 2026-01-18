/**
 * Forward Widget - Trakt Sync (Fix Version)
 */

// 1. 配置定义 (Forward 会读取这里的配置来生成界面)
// 注意：如果你的 .json 仓库文件中没有写 "args"，Forward 会尝试读取这里的 config
const config = {
  script: "SyncTraktHistory",
  functionName: "SyncTraktHistory",
  args: [
    {
      type: "input",
      name: "clientId",
      label: "Client ID",
      placeholder: "输入 Client ID",
      required: true
    },
    {
      type: "input",
      name: "accessToken",
      label: "Access Token",
      placeholder: "输入 Access Token",
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
      placeholder: "例如: 27205",
      required: true
    }
  ]
};

// 2. 核心处理函数
async function SyncTraktHistory(params = {}) {
  try {
    // [修复1] 增加空值保护，防止 params 为空时崩溃
    if (!params) params = {};

    // 检查参数是否填写，没填则返回提示卡片（而不是抛错导致崩溃）
    if (!params.clientId || !params.accessToken || !params.tmdbId) {
      return [{
        id: "tips",
        type: "url",
        title: "⚙️ 需要配置",
        description: "请长按组件 -> 编辑 -> 填写 Token 和 ID",
        posterPath: "https://trakt.tv/assets/logos/header-icon-360d039956.png",
        mediaType: "tv",
        link: "",
        playerType: "system"
      }];
    }

    const API_URL = "https://api.trakt.tv/sync/history";
    const tmdbId = parseInt(params.tmdbId);
    
    // 构造 Body
    let requestBodyRaw = {};
    if (params.mediaType === "movies") {
      requestBodyRaw = { movies: [{ ids: { tmdb: tmdbId } }] };
    } else {
      requestBodyRaw = { episodes: [{ ids: { tmdb: tmdbId } }] };
    }

    // [修复2] 显式转换为 JSON 字符串
    const requestBody = JSON.stringify(requestBodyRaw);

    const options = {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": params.clientId,
        "Authorization": `Bearer ${params.accessToken}`,
        "User-Agent": "ForwardWidget/1.0"
      }
    };

    // 发送请求
    const response = await Widget.http.post(API_URL, requestBody, options);
    
    // [修复3] 安全解析响应数据 (兼容字符串或对象)
    let result = response.data;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("Trakt 返回数据格式错误");
      }
    }

    // 解析结果
    let addedCount = 0;
    // 增加对 result.added 的空值检查
    if (result && result.added) {
      if (params.mediaType === "movies") {
        addedCount = result.added.movies;
      } else {
        addedCount = result.added.episodes;
      }
    } else {
        // 如果 Trakt 返回了 401 等错误信息，result 可能不包含 added
        console.log("Trakt Response:", JSON.stringify(result));
    }

    const statusTitle = addedCount > 0 ? "✅ 同步成功" : "⚠️ 未变动";
    const statusDesc = `ID: ${tmdbId} | 类型: ${params.mediaType}`;

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
    // 即使出错，也必须返回一个符合格式的对象数组，否则就会报 "Data Missing"
    return [
      {
        id: "error",
        type: "url",
        title: "❌ 发生错误",
        description: error.message || "未知错误",
        posterPath: "https://trakt.tv/assets/logos/header-icon-360d039956.png",
        mediaType: "tv",
        link: "",
        playerType: "system"
      }
    ];
  }
}
// [修复4] 删除了 module.exports，防止环境不支持导致崩溃
