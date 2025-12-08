/**
 * @author neishe321
 * @function 微博去广告
 * @date 2025-10-30
 */

const url = $request.url;
if (!$response|| !$response.body)  $done({});
let obj = JSON.parse($response.body);

/**
 * cleanExtend(obj) 帖子详情页广告清理逻辑
 * cleanUser(user) 用户信息清理逻辑
 * cleanComment(item) 单个评论清理逻辑
 * removeVipSuffix(data)  清理 data.screen_name_suffix_new 中的 VIP 图标、超话标识等(主要是超话信息流)
 * processCommentArray(array = []) 评论区列表清理逻辑
 * processFeedArray(array = []) 信息流列表清理逻辑 
 */

function cleanExtend(obj) {
    // 帖子详情页广告清理逻辑
    if (!obj) return;
    delete obj.reward_info; // 点赞是美意
    delete obj.head_cards; // 底部广告卡片
    delete obj.report_data; // 举报类型
    delete obj.snapshot_share_customize_dic; // 该博主其他信息
    delete obj.top_cards; // 大家都在搜
    delete obj.comment_data; // 友善评论
    delete obj.dynamic_share_items;
    delete obj.trend; // 好物种草 相关推荐
    delete obj.follow_data;
    delete obj.loyal_fans_guide_info; // 忠诚粉丝指南
    delete obj.topic_struct;
    delete obj.extend_info;
    delete obj.common_struct;
    delete obj.tag_struct; // 推广标签

    // delete obj.pic_infos; // 文案带的图片
    delete obj.pic_bg_new;
    delete obj.pic_bg_new_dark;
    delete obj.hot_page;
    delete obj.semantic_brand_params;
    delete obj.ad_tag_nature;
    delete obj.buttons;
    delete obj.extra_button_info;
    delete obj.page_info;
    delete obj?.sharecontent?.additional_indication_icon_url; // 底部按钮贴图广告
    delete obj.detail_top_right_button; // 右上角搜索

    delete obj?.title_source?.flag_img;    // tab超话的信息流头像的超话等级
    delete obj?.title_source?.right_icon;    // 超话帖子详情 最上边超话等级图标2
    if (obj?.title_source?.show_verified) obj.title_source.show_verified = false;
    delete obj?.header_info?.avatar?.flag_img;
    if (obj?.header_info?.show_verified) obj.header_info.show_verified = false;
    
    delete obj?.pageinfo?.icon_list;    // 超话帖子详情用户后边一串图标 title_more
    delete obj?.pageinfo?.title_more;   // 超话帖子详情 最上边超话等级图标1
    // delete obj?.pageinfo?.button;    // 关注按钮
    // delete obj?.pageinfo?.desc_more;   // 帖子和粉丝量
}

function cleanUser(user) {
    // 用户信息清理逻辑
    if (!user) return;
    delete user.icons;
    delete user.avatar_extend_info; // 头像挂件
    delete user.mbtype;
    delete user.mbrank;
    delete user.level;
    delete user.type;
    delete user.vvip;
    delete user.svip;
    delete user.verified_type;
}

function cleanComment(item) {
    // 单个评论清理逻辑
    if (!item) return;
    // 气泡 用户标签 背景
    delete item.comment_bubble;
    delete item.vip_button;
    delete item.pic_bg_new;
    delete item.pic_bg_new_dark;
    delete item.pic_bg_type;
    cleanUser(item.user);

    // 递归处理子评论
    const comments = item.comments;
    if (Array.isArray(comments)) {
        for (let i = comments.length - 1; i >= 0; i--) {
            if (comments[i]) cleanComment(comments[i]);
        }
    }
}

function removeVipSuffix(data) {
    // 清理 data.screen_name_suffix_new 中的 VIP 图标、超话标识等
    if (!Array.isArray(data?.screen_name_suffix_new)) return;
    for (const suffix of data.screen_name_suffix_new) {
        if (Array.isArray(suffix.icons)) {
            suffix.icons = suffix.icons.filter(icon => icon?.type === "chaohua");
        }
    }
}

function processCommentArray(array = []) {
    // 评论区列表清理逻辑
    for (let i = array.length - 1; i >= 0; i--) {
        const item = array[i];

        // 移除广告
        if (
            item?.adType ||
            item?.business_type === "hot" ||
            item?.commentAdType ||
            item?.commentAdSubType ||
            item?.data?.adType ||
            item?.data?.itemid === "ai_summary_entrance_real_show" // 罗伯特总结
        ) {
            array.splice(i, 1);
            continue;
        }

        // 清理当前评论项
        cleanComment(item);
        if (item.data) cleanComment(item.data);
    }
}

function processFeedArray(array = []) {
    // 信息流列表清理逻辑
    if (!Array.isArray(array)) return;

    const groupItemIds = new Set([
        "card86_card11_cishi",
        "card86_card11",
        "INTEREST_PEOPLE",
        "trend_top_qiehuan",
        "profile_collection",
        "realtime_tag_groug",
    ]);

    const cardItemIds = new Set([
        "finder_channel", // 发现页热搜滚动横幅下方广告
        "finder_window",  // 发现页热搜下方滚动横幅
        "tongcheng_usertagwords",
        // "mine_topics",    // 我的超话列表一键签到
        "top_searching",  // 帖子详情下方大家都在搜 2025/10/15
    ]);

    const keywords = [
        "hot_character",
        "local_hot_band",
        "hot_video",
        "hot_chaohua_list",
        "hot_link_mike",
        "chaohua_discovery_banner",
        "bottom",
        "hot_search",
        "广告",
        "hot_spot_name",
        // "mid",
    ];

    for (let i = array.length - 1; i >= 0; i--) {
        const item = array[i];
        const data = item?.data || item?.status; // 兼容 data / status

        if (
            item?.item_category === "hot_ad" ||
            item?.item_category === "trend" ||
            item?.mblogtypename === "广告" ||
            item?.isInsert === false ||
            item?.category === "wboxcard" || // 帖子下方广告横幅
            data?.mblogtypename === "广告" ||
            data?.ad_state === 1 ||
            data?.card_type === 196 ||
            data?.desc === "相关搜索" ||
            data?.card_ad_style === 1 ||
            data?.is_ad_card === 1 ||
            data?.promotion?.ad === "ad" ||
            data?.promotion?.adtype === 1 ||    // 热搜下方横幅漏网之鱼
            data?.is_detail === true || // 可能误杀
            data?.card_id === "search_card" ||
            (data?.group && data?.anchorId) ||
            data?.card_type === 227 || // 此条微博讨论情况
            (item?.category === "group" && groupItemIds.has(item?.itemId)) ||
            (item?.category === "card" && cardItemIds.has(data?.itemid)) ||
            (item?.itemId && keywords.some(k => String(item.itemId).includes(k))) ||
            (data?.itemid && keywords.some(k => String(data.itemid).includes(k))) ||
            // || (item?.category === "group" && item?.type === "vertical" && item?.header?.title?.content === "相关推荐")
            // || (item?.category === "group" && item?.type === "vertical" && item?.header?.title?.content === "博主好物种草")
            (item?.category === "group" && item?.type === "vertical" && item?.header) || // 统一去掉有header的
            (item?.category === "detail" && item?.type === "trend") // 帖子左下转发广告
        ) {
            array.splice(i, 1);
            continue;
        }

        // 清理 data/status
        if (data) {
            cleanUser(data.user);        // 清理用户信息
            cleanExtend(data);           // 清理帖子详情广告及多余字段
            removeVipSuffix(data);       // 清理 data.screen_name_suffix_new 中的 VIP 图标、超话标识等
        }

        // 递归调用
        if (Array.isArray(item.items)) {
            processFeedArray(item.items);
        }
    }
}


// 处理不同 API 的响应 

// 帖子评论区新接口 2025/10/15
// mix 关注的人关注的帖子
if (url.includes("statuses/container_detail_comment") || url.includes("statuses/container_detail_mix")) {
    if (Array.isArray(obj.items)) processCommentArray(obj.items);
}

// 帖子左下角转发目录新接口 2025/10/15
else if (url.includes("statuses/container_detail_forward")) {
    if (obj.items) processFeedArray(obj.items);
}

// 帖子详情新接口 2025/10/15
else if (url.includes("statuses/container_detail")) {
    // 删除除帖子内容和帖子图片外的其他卡片信息
    if (Array.isArray(obj?.pageHeader?.data?.items)) processFeedArray(obj.pageHeader.data.items);
    // 帖子内容
    if (obj?.detailInfo?.status) {
        cleanUser(obj.detailInfo.status.user);
        cleanExtend(obj.detailInfo.status);
        removeVipSuffix(obj.detailInfo.status);
    }
    if (obj?.detailInfo?.extend) {
        cleanUser(obj.detailInfo.extend.user);
        cleanExtend(obj.detailInfo.extend);
        removeVipSuffix(obj.detailInfo.extend); 
    }
}

else if (url.includes("comments/build_comments")) {
    // 折叠评论区处理
    if (Array.isArray(obj.datas)) processCommentArray(obj.datas);
    if (Array.isArray(obj.root_comments)) processCommentArray(obj.root_comments);
    if (Array.isArray(obj.comments)) processCommentArray(obj.comments);
    // 处理评论项
    if (obj?.rootComment) cleanComment(obj.rootComment);
    // 超话帖子评论项
    if (obj?.status) cleanComment(obj.status);
}

else if (url.includes("statuses/container_timeline") || url.includes("profile/container_timeline")) {
    if (obj?.loadedInfo) delete obj.loadedInfo.headers;
    // 信息流和超话流  statuses/container_timeline_top? tab 超话社区
    if (obj.items) processFeedArray(obj.items);
}

else if (url.includes("messageflow/notice")) {
    if (obj.messages) processFeedArray(obj.messages);
}

else if (url.includes("search/finder")) {
    if (Array.isArray(obj?.header?.data?.items)) processFeedArray(obj.header.data.items); // 发现页热搜下方滚动横幅和滚动横幅下方广告1
    if (obj?.header?.insert_data) delete obj.header.insert_data; // 发现页热搜下方滚动横幅和滚动横幅下方广告2
    if (obj?.channelInfo) delete obj.channelInfo.moreChannels; // 下拉功能入口
    if (Array.isArray(obj?.channelInfo?.channels)) {
        const allowedtitles = new Set(['热点', '热问', '热转']); // 发现页热搜下方tab导航筛选
        obj.channelInfo.channels = obj.channelInfo.channels.filter(channel => allowedtitles.has(channel.title));
    }
    const payload = obj.channelInfo?.channels?.find(c => c?.payload)?.payload; // 自动提取tab下的下的信息流
    if (Array.isArray(payload?.items)) processFeedArray(payload.items); // 处理提取的信息流
    if (payload?.loadedInfo?.searchBarContent) delete payload.loadedInfo.searchBarContent; // 处理大家正在搜
    if (payload?.loadedInfo?.headerBack) delete payload.loadedInfo.headerBack; // 搜索框主题 下拉背景
}

else if (url.includes("search/container_discover") || url.includes("search/container_timeline")) {
    // container_timeline 热点信息流
    // container_discover 发现header覆盖
    processFeedArray(obj.items);
    if (obj?.loadedInfo?.searchBarContent) delete obj.loadedInfo.searchBarContent; // 处理大家正在搜
    if (obj?.loadedInfo?.theme) delete obj.loadedInfo.theme;
    if (obj?.loadedInfo?.headerBack) delete obj.loadedInfo.headerBack; // 搜索框主题 下拉背景
}

else if (url.includes("2/flowlist") || url.includes("2/statuses/longtext_show_batch")) { // 热转||长文本动态
    if (obj?.items) processFeedArray(obj.items);
    if (obj?.longtexts?.data) processFeedArray(obj.longtexts.data);
}

else if (url.includes("searchall")) {
    if (obj.items) processFeedArray(obj.items);
}

$done({ body: JSON.stringify(obj) });
