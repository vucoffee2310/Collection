import re

# --- Optimizations ---
# 1. Pre-compile regex patterns ONCE outside the function.
# This avoids expensive recompilation in the loop.
_UNWANTED_TAGS_RE = re.compile(r'<(script|style|svg|pre)[^>]*>.*?</\1>|<!--.*?-->', flags=re.DOTALL | re.IGNORECASE)

# 2. Use a set for O(1) average time lookups.
_ALLOWED_ATTRS = {'alt', 'placeholder', 'title', 'content'}

# 3. Pre-compile patterns for attribute value validation.
#    First, define the patterns as a list of raw strings.
_ATTR_VALUE_PATTERNS_STRINGS = [
            r'[^a-zA-Z]*',                           # Contains no alphabetic characters
            r'\d+(\.\d+)?[a-zA-Z]',                  # Looks like a measurement (e.g., "12px")
            r'(\s*(&?(nbsp;|amp;))\s*){2,}',         # Multiple consecutive space entities
            r'(@[\w.-]+|[\w\.-]+@[\w\.-]+\.\w+)',    # Social handle or Email address
            r'(https?://|/)\S+',                     # Absolute or relative URL
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:[0-5]\d)?([+-]\d{2}:\d{2}|Z)?', # ISO 8601 Timestamp
            r'\d{1,2}:\d{2}\s+\d{2}/\d{2}/\d{4}',    # US-style timestamp
            r'\d{1,2}:\d{2}',                        # Simple time (e.g., "14:30")
            r'\S{16,}'                               # Long, likely random string/ID
        ]
#    FIX: Now, compile each string pattern into a regex object.
_ATTR_VALUE_PATTERNS_RE = [re.compile(p) for p in _ATTR_VALUE_PATTERNS_STRINGS]


# 4. Pre-compile patterns for parsing tags and attributes efficiently.
_TAG_PARSER_RE = re.compile(r'<(\w+)([^>]*)>')
_ATTR_PARSER_RE = re.compile(r'\s+([a-zA-Z]+)="([^"]*)"')

# Use a single pattern with capture groups to find either a tag (group 1) or text (group 2)
# This allows using a memory-efficient iterator (re.finditer).
_HTML_TOKENIZER_RE = re.compile(r'(<[^>]+>)|([^<]+)')

def _encode_entities(s):
    """Helper to encode '&' and '\"'."""
    return s.replace('&', '&amp;').replace('"', '&quot;')

def clean_html_optimized(html):
    """
    Cleans HTML with optimized performance by pre-compiling regex, using sets,
    and using iterators to reduce memory overhead.
    """
    # Step 1: Remove unwanted tags and comments in one pass
    html = _UNWANTED_TAGS_RE.sub('', html)

    processed_parts = []
    
    # Step 2: Use a memory-efficient iterator instead of re.findall()
    for match in _HTML_TOKENIZER_RE.finditer(html):
        # The pattern has two capture groups. One will be a tag, the other will be None.
        tag_part = match.group(1)
        text_part = match.group(2)

        if tag_part: # It's a tag
            if tag_part.startswith('</'):
                # Closing tag, keep unchanged
                processed_parts.append(tag_part)
                continue

            # It's an opening tag, process its attributes
            tag_match = _TAG_PARSER_RE.match(tag_part)
            if tag_match:
                tagname = tag_match.group(1)
                attrs_str = tag_match.group(2)
                
                kept_attrs = []
                # Iterate through attributes found by the pre-compiled parser
                for attr, value in _ATTR_PARSER_RE.findall(attrs_str):
                    # Use fast set lookup and pre-compiled regex patterns
                    if attr.lower() in _ALLOWED_ATTRS and value.strip():
                        # This loop now works correctly as `p` is a compiled regex object
                        is_unwanted = any(p.fullmatch(value) for p in _ATTR_VALUE_PATTERNS_RE)
                        if not is_unwanted:
                            encoded_value = _encode_entities(value)
                            kept_attrs.append(f' {attr}="{encoded_value}"')
                
                # Reconstruct tag
                new_tag = f'<{tagname}{"".join(kept_attrs)}>'
                processed_parts.append(new_tag)
            else:
                # Malformed tag or non-standard tag (e.g., <!DOCTYPE>), keep as is
                processed_parts.append(tag_part)
        
        elif text_part: # It's text content
            processed_parts.append(_encode_entities(text_part))

    # Step 3: Filter out empty/whitespace parts and join
    final_parts = [p.strip() for p in processed_parts if p.strip()]
    return '\n'.join(final_parts)

# Example usage (renamed the function for comparison):
if __name__ == "__main__":
    sample_html = '''<html lang="vi" class="wf-sfdbold-n4-active wf-active"><head><script src="https://connect.facebook.net/vi_VN/sdk.js?hash=dd6e00c03d5f7b9fa3b52eb108ccb30e" async="" crossorigin="anonymous"></script><script async="" src="https://oauth.vietid.net/session/wcheck?_=1749625905989"></script><script type="text/javascript" async="" src="//static.trunkpkg.com/core/wbqevent.js"></script>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia</title>
    <meta name="description" content="Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi">
    <meta name="keywords" content="HLV Kim Sang-sik, tuyển Việt Nam">
    <meta name="news_keywords" content="HLV Kim Sang-sik, tuyển Việt Nam">
    <meta property="og:title" content="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
    <meta property="og:description" content="Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn">
    <meta property="og:image" content="https://kenh14cdn.com/zoom/600_315/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-67-0-405-645-crop-1749609338003412152981.webp">
    <meta property="og:image:type" content="image/jpg">
    <meta property="og:image:width" content="600">
    <meta property="og:image:height" content="315">
    <meta property="twitter:image" content="https://kenh14cdn.com/zoom/600_315/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-67-0-405-645-crop-1749609338003412152981.webp">
    <meta property="twitter:card" content="summary_large_image">
    <link rel="canonical" href="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn">
    <link rel="alternate" media="only screen and (max-width: 640px)" href="https://m.kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn">
    <link rel="alternate" media="handheld" href="https://m.kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn">
    <meta property="fb:app_id" content="1462475467145496">
    <meta property="fb:pages" content="390567570966109">
    <meta name="google-site-verification" content="XgyQeQB03FjD7tYPTfURGI294W9Ec_DBIvTB6xPrL6Q">
            <meta property="article:published_time" content="2025-06-11T09:36:00">
                <meta property="article:author" content="Hải Đăng">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, minimal-ui">
    <meta name="robots" content="max-image-preview:large,index,follow,all">
    <meta name="Language" content="vi">
    <meta name="distribution" content="Global">
    <meta http-equiv="audience" content="General">
    <meta name="resource-type" content="Document">
    <meta name="revisit-after" content="1 days">
    <meta name="GENERATOR" content="https://kenh14.vn">
    <meta name="RATING" content="GENERAL">
    <link rel="shortcut icon" href="https://kenh14cdn.com/web_images/kenh14-favicon.ico" type="image/png">
    <meta name="site_path" content="https://kenh14.vn">
    <meta name="author" content="VCCorp.vn">
    <meta property="og:site_name" content="https://kenh14.vn">
    <meta name="copyright" content="Copyright (c) by Công ty cổ phần Vccorp">
    <meta http-equiv="x-dns-prefetch-control" content="on">
    <link rel="dns-prefetch" href="https://static.mediacdn.vn/">
    <link rel="dns-prefetch" href="https://kenh14cdn.com">
    <link rel="dns-prefetch" href="https://videothumbs.mediacdn.vn/">
    <link rel="dns-prefetch" href="https://videothumbs-ext.mediacdn.vn/">
    <link rel="dns-prefetch" href="https://kenh14cdn.com/">
    <link rel="dns-prefetch" href="https://www.googletagmanager.com">
    <link rel="dns-prefetch" href="https://media1.admicro.vn">
    <link rel="dns-prefetch" href="https://adminplayer.sohatv.vn">
    <link rel="dns-prefetch" href="https://ovp.sohatv.vn">
    <link rel="dns-prefetch" href="https://static.amcdn.vn">
    <link rel="dns-prefetch" href="https://itunes.apple.com">
    <link rel="dns-prefetch" href="https://play.google.com">
    <link rel="dns-prefetch" href="https://rec.aiservice.vn">
    <link rel="dns-prefetch" href="https://formalhood.com">
    <link rel="dns-prefetch" href="https://vccorp.mediacdn.vn">
    <link rel="dns-prefetch" href="https://vcplayer.mediacdn.vn">
    <link rel="dns-prefetch" href="https://video-thumbs.mediacdn.vn">
    <link rel="dns-prefetch" href="https://ccd.mediacdn.vn">
    <link rel="dns-prefetch" href="https://ims.mediacdn.vn">
    <link rel="dns-prefetch" href="https://statics.lotuscdn.vn">
    <link rel="dns-prefetch" href="https://event.mediacdn.vnn">
    <link rel="dns-prefetch" href="https://static.mediacdn.vn">
    <link rel="dns-prefetch" href="https://hot14.mediacdn.vn">
    <link rel="dns-prefetch" href="https://apigames.kenh14.vn">
    <link rel="preconnect" href="https://rec.aiservice.vn">
    <link rel="preconnect" href="https://www.googletagmanager.com">
    <link rel="preconnect" href="https://media1.admicro.vn">
    <link rel="preconnect" href="https://kenh14cdn.com/">
    <link rel="preload" as="style" href="https://kenh14cdn.com/web_css/font.20062024.css">
    <script async="" src="https://www.googletagmanager.com/gtm.js?id=GTM-M5B7X8N"></script><script async="" type="text/javascript" src="https://media1.admicro.vn/k14/admcore.js"></script><script type="text/javascript" async="" src="//static.trunkpkg.com/core/wbqevent.js"></script><script async="" src="//deqik.com/tag/corejs/ATMRDIWTH5LTO.js"></script><script>
    function loadJsAsync(e, t, a) { var n = document.createElement("script"); if (n.type = "text/javascript", n.async = !0, "function" == typeof t && (n.onreadystatechange = n.onload = function () { t() }), n.src = e, void 0 !== a && n.setAttribute("onerror", a), n) { for (var r = document.getElementsByTagName("script"), o = !1, c = 0; c < r.length; c++)r[c].src == e && (o = !0); !o && document.getElementsByTagName("head")[0].appendChild(n) } } function loadJsDefer(e, t, a) { var n = document.createElement("script"); if (n.type = "text/javascript", n.defer = !0, "function" == typeof t && (n.onreadystatechange = n.onload = function () { t() }), n.src = e, void 0 !== a && n.setAttribute("onerror", a), n) { for (var r = document.getElementsByTagName("script"), o = !1, c = 0; c < r.length; c++)r[c].src == e && (o = !0); o || document.getElementsByTagName("head")[0].appendChild(n) } }
    function loadCss(e) { var t = document.getElementsByTagName("head")[0], a = document.createElement("link"); a.rel = "stylesheet", a.type = "text/css", a.href = e, a.media = "all", t.appendChild(a) }
    function getMeta(t) { let e = document.getElementsByTagName("meta"); for (let n = 0; n < e.length; n++)if (e[n].getAttribute("name") === t) return e[n].getAttribute("content"); return "" }
    var hdUserAgent = getMeta("uc:useragent");
    var isNotAllow3rd = hdUserAgent.includes("not-allow-ads");
    var isLightHouse = hdUserAgent.includes("not-allow-ads");

    var pageSettings = Constants={
        Domain: "https://kenh14.vn",
        sharefbApiDomain: "https://sharefb.cnnd.vn",
        videoplayer: "https://vcplayer.mediacdn.vn",
        VideoToken: "L3NlY3VyZS92ZXJpZnkveHZxcmNhZGhlYmZpMHY1dm5zM2Ywd3d3a3Y2MDdkMDgvMTAwMTAyL2V5SmhiR2NpT2lKSVV6STFOaUlzSW5SNWNDSTZJa3BYVkNKOS5leUp5WldZaU9pSWlMQ0poY0hCclpYa2lPaUo0ZG5GeVkyRmthR1ZpWm1rd2RqVjJibk16WmpCM2QzZHJkall3TjJRd09DSXNJbkJzWVhsbGNpSTZJakV3TURFd01pSXNJbWxuYm05eVpVVjRjR2x5WVhScGIyNGlPblJ5ZFdVc0ltbGhkQ0k2TVRVeU5ESTRNRGN6T1N3aVpYaHdJam94TlRJME1qZ3dOems1ZlEuRHZpSzNzS2V5N3lUbkFqam9jN2lWb2kyM2hESzdFWEw1QWVvSWhEOWx2UQ==",
        commentSiteName: "kenh14",
        DomainUtils: "https://utils3.cnnd.vn",
        imageDomain: "https://kenh14cdn.com",
        DomainApiVote: "https://eth.cnnd.vn",
        DomainUtils2: "https://nc68.cnnd.vn",
        mingCheckSessionUrl: "https://vietid.net/login/Checksession",
        mingCommentHost: "https://comment.vietid.net",
        mingAppKey: "d9c694bd04eb35d96f1d71a84141d075",
        apiLiveDomain: 'https://kenh14s.cnnd.vn',
        apiHandlerUrl: 'https://kenh14s.cnnd.vn',
        host: "https://kenh14.vn",
        searchHost: "/tim-kiem.chn",
        apiSignalRDomain: "https://sig.channelvn.net",
        videoHdDomain: "https://vcplayer.mediacdn.vn",
        videoStorage: "https://video-thumbs.mediacdn.vn",
        allow3rd: true && !isNotAllow3rd,
        domainApiAf: "https://s3.afamily.vn",
        apiSignal: 'https://signalr6.cnnd.vn'
    }

    function checkRunInitScroll() {
        if (typeof runinitscroll != "undefined" && runinitscroll.length >= 1) {
            runinitscroll[0]();
            var len = runinitscroll.length;
            var arr = [];
            for (var i = 1; i < len; i++) {
                arr.push(runinitscroll[i]);
            }
            runinitscroll = arr;
        }
        window.setTimeout(function () {
            checkRunInitScroll();
        }, 1);
    }
    setTimeout(function () {
        let e = !1;

        let runInitScrollTimeout = pageSettings.allow3rd ? 1 : 3000;

        function t() {
            try {
                e || (e = !0, document.removeEventListener("scroll", t), function () {
                    let e = document.createElement("script");
                    e.async = !0, e.setAttribute("data-ad-client", ""), document.head.appendChild(e), e.src = ""
                }(), document.removeEventListener("mousemove", t), document.removeEventListener("mousedown", t), document.removeEventListener("touchstart", t)), setTimeout(function () {
                    checkRunInitScroll();
                }, runInitScrollTimeout)

            } catch (err) {
                console.log("init --" + err);
            }
        }
        document.addEventListener("scroll", t, { passive: true }), document.addEventListener("mousemove", t), document.addEventListener("mousedown", t), document.addEventListener("touchstart", t, { passive: true }), document.addEventListener("load", function () {
            document.body.clientHeight != document.documentElement.clientHeight && 0 == document.documentElement.scrollTop && 0 == document.body.scrollTop || t()
        })
    }, 1);
</script>

    <style>
    @font-face { font-family: 'SFD-Heavy'; font-display: swap; src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot'); src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot') format('embedded-opentype'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff2'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff') format('woff'), url('https://kenh14cdn.com/web_font/SFD-Bold.ttf') format('truetype'), url('https://kenh14cdn.com/web_font/SFD-Bold.svg#SFD-Bold') format('svg'); }
    @font-face { font-family: 'SFD-SemiBold'; font-display: swap; src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot'); src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot') format('embedded-opentype'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff2'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff') format('woff'), url('https://kenh14cdn.com/web_font/SFD-Bold.ttf') format('truetype'), url('https://kenh14cdn.com/web_font/SFD-Bold.svg#SFD-Bold') format('svg'); }
    @font-face { font-family: 'SFD-Bold'; font-display: swap; src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot'); src: url('https://kenh14cdn.com/web_font/SFD-Bold.eot') format('embedded-opentype'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff2'), url('https://kenh14cdn.com/web_font/SFD-Bold.woff') format('woff'), url('https://kenh14cdn.com/web_font/SFD-Bold.ttf') format('truetype'), url('https://kenh14cdn.com/web_font/SFD-Bold.svg#SFD-Bold') format('svg'); }
    @font-face { font-family: 'SFD-Light'; font-display: swap; src: url('https://kenh14cdn.com/web_font/SFD-Light.eot'); src: url('https://kenh14cdn.com/web_font/SFD-Light.eot') format('embedded-opentype'), url('https://kenh14cdn.com/web_font/SFD-Light.woff2'), url('https://kenh14cdn.com/web_font/SFD-Light.woff') format('woff'), url('https://kenh14cdn.com/web_font/SFD-Light.ttf') format('truetype'), url('https://kenh14cdn.com/web_font/SFD-Light.svg#SFD-Light') format('svg'); }
    @font-face { font-family: 'SFD-Medium'; font-display: swap; src: url('https://kenh14cdn.com/web_font/SFD-Medium.eot'); src: url('https://kenh14cdn.com/web_font/SFD-Medium.eot') format('embedded-opentype'), url('https://kenh14cdn.com/web_font/SFD-Medium.woff2'), url('https://kenh14cdn.com/web_font/SFD-Medium.woff') format('woff'), url('https://kenh14cdn.com/web_font/SFD-Medium.ttf') format('truetype'), url('https://kenh14cdn.com/web_font/SFD-Medium.svg#SFD-Medium') format('svg'); }

    .kenh14-wrapper.xml .kenh14-header-wrapper .khw-top-header {
        padding-top: 10px;
        margin-top: 0 !important;
    }
</style>
    <link rel="preload" href="https://kenh14cdn.com/web_font/SFD-Bold.woff2" as="font" type="font/woff2" crossorigin="">
    <link rel="preload" href="https://kenh14cdn.com/web_font/SFD-Medium.woff2" as="font" type="font/woff2" crossorigin="">
    <link rel="preload" href="https://kenh14cdn.com/web_font/SFD-Light.woff2" as="font" type="font/woff2" crossorigin="">
    <link rel="preload" as="style" href="https://kenh14cdn.com/web_css/font.01062023.min.css">
    <style>
        html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none}.clearfix:after{visibility:hidden;display:block;font-size:0;content:" ";clear:both;height:0}.fl{float:left}.fr{float:right}.mt-20{margin-top:20px}img{color:transparent}a{text-decoration:none}.swiper-container{margin:0 auto;position:relative;overflow:hidden;z-index:1}.swiper-wrapper{position:relative;width:100%;height:100%;z-index:1;display:-webkit-box;display:-moz-box;display:-ms-flexbox;display:-webkit-flex;display:flex;-webkit-transition-property:-webkit-transform;-moz-transition-property:-moz-transform;-o-transition-property:-o-transform;-ms-transition-property:-ms-transform;transition-property:transform;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.swiper-container-android .swiper-slide,.swiper-wrapper{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);-o-transform:translate(0,0);-ms-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}.swiper-slide{-webkit-flex-shrink:0;-ms-flex:0 0 auto;flex-shrink:0;width:100%;height:100%;position:relative}.swiper-button-next,.swiper-button-prev{position:absolute;top:50%;width:27px;height:44px;margin-top:-22px;z-index:10;cursor:pointer;-moz-background-size:27px 44px;-webkit-background-size:27px 44px;background-size:27px 44px;background-position:center;background-repeat:no-repeat}.swiper-button-next.swiper-button-disabled,.swiper-button-prev.swiper-button-disabled{opacity:.35;cursor:auto;pointer-events:none}.swiper-button-prev,.swiper-container-rtl .swiper-button-next{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M0%2C22L22%2C0l2.1%2C2.1L4.2%2C22l19.9%2C19.9L22%2C44L0%2C22L0%2C22L0%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");left:10px;right:auto}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M27%2C22L27%2C22L5%2C44l-2.1-2.1L22.8%2C22L2.9%2C2.1L5%2C0L27%2C22L27%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");right:10px;left:auto}.swiper-pagination{position:absolute;text-align:center;-webkit-transition:.3s;-moz-transition:.3s;-o-transition:.3s;transition:.3s;-webkit-transform:translate3d(0,0,0);-ms-transform:translate3d(0,0,0);-o-transform:translate3d(0,0,0);transform:translate3d(0,0,0);z-index:10}.swiper-container-horizontal>.swiper-pagination-bullets,.swiper-pagination-custom,.swiper-pagination-fraction{bottom:10px;left:0;width:100%}.swiper-pagination-bullet{width:8px;height:8px;display:inline-block;border-radius:100%;background:#000;opacity:.2}.swiper-pagination-clickable .swiper-pagination-bullet{cursor:pointer}.swiper-pagination-bullet-active{opacity:1;background:#007aff}.swiper-container-horizontal>.swiper-pagination-bullets .swiper-pagination-bullet{margin:0 5px}.sprite{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png");background-repeat:no-repeat}.w1040{width:1040px;margin:0 auto}.w720{width:720px}.w700{width:700px}.w300{width:300px}img{image-rendering:-webkit-optimize-contrast}.kenh14-wrapper{display:block;position:relative;min-width:1120px}.kenh14-header-wrapper{display:block;position:relative}.khw-top-header{background:#f0a52b;height:70px;position:relative;z-index:1}.khw-top-header .w1040{position:relative}.kwtm-toogle{text-align:center;position:absolute;top:19px;right:0}.kwtm-logo{background-position:0 0;width:200px;height:60px;position:absolute;top:7px;left:0;text-decoration:none;background:url(https://kenh14cdn.com/web_images/k14_logo2022.svg) no-repeat !important;background-size:auto 60px !important}.khw-bottom-header{background:#a70e1a;height:40px;position:relative}.kmli{float:left;position:relative;white-space:nowrap}.kmli>a{font-size:15px;color:#fff;padding:0 6px;display:block;text-decoration:none;line-height:40px;position:relative;font-family:SFD-Medium}.kmli.home{padding:0 12px}.kmli.home>a{width:12px;padding:0;background:url('https://kenh14cdn.com/web_images/sprite-k14.20.png') -494px 12px no-repeat;text-indent:-99999px;overflow:hidden}.kmli.expand-icon{padding:0 12px;position:inherit}.kmli.expand-icon>a{background:url('https://kenh14cdn.com/web_images/sprite-k14.20.png') -319px -104px no-repeat;width:20px;padding:0}.kmli:first-of-type>a{padding-left:0}.kbh-menu-list{display:block;height:40px;display:flex}.khw-adk14-wrapper{height:250px;background:#f1f1f1;padding:20px 0;width:100%;display:block;text-align:center}.kbw-content{margin-top:35px;display:block}.kbwcb-left{border-top:1px solid #e4e4e4;position:relative;padding-top:25px}.kbwcb-left:before{background:url("https://kenh14cdn.com/web_images/grd-border.png") top right repeat-y;content:'';position:absolute;top:0;right:-20px;width:20px;height:100%;z-index:-1}.kbwcb-left-wrapper{display:block;padding-right:20px;position:relative}.kscli,.knswli{padding:25px 0;border-bottom:1px solid #ebebeb;list-style:none}.kscliw-ava{display:block;overflow:hidden;position:relative;padding-top:62.5%;background-size:cover;background-position:center top;background-repeat:no-repeat}.kscliw-ava video{width:100%;height:auto;position:absolute;top:0;left:50%;transform:translateX(-50%)}.kscliw-right,.knswli-right{margin-left:270px}.kscliw-title a,.knswli-title a{font-family:SFD-Bold;font-size:20px;line-height:26px;color:#333;text-decoration:none;display:block;margin-bottom:10px;margin-top:-5px}.kscliw-sapo,.knswli-sapo{font-size:13px;font-family:Arial;color:#4d4d4d;line-height:18px;display:block}.knswli-left{width:250px}.knswli-meta{margin-bottom:13px}.knswli-time{position:relative;font-family:SFD-Medium;font-size:14px;color:#777}.knswli-category{font-family:SFD-SemiBold;font-size:14px;color:#41455e;text-decoration:none}.knswli-facebook,.knswli-comment,.knswli-view{margin:5px 0;font-size:12px;color:#888;position:relative}.knswli-relate-wrap{padding-left:15px;display:block;padding-top:5px}.knswli-relate{text-decoration:none;color:#41455e;font-size:13px;line-height:18px;font-family:Arial;position:relative;font-weight:bold}.knswli-relate:before{width:5px;height:5px;border-radius:100%;background:#fb6c27;content:'';position:absolute;top:5px;left:-15px}.knswli-object-wrapper{padding:20px 0 20px 0}.knswli.light .knswli-object-wrapper{background:#f5f5f5;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;border:1px solid #e6e6e6}.knswli.dark .knswli-object-wrapper{position:relative;background:#222;border-top:5px solid #fb6c27}.knswli-object-content{position:relative;overflow:hidden}.knswli.dark .knswli-object-wrapper:before{display:block;position:absolute;width:10%;bottom:0;right:0;height:100%;background:-moz-linear-gradient(left,rgba(255,255,255,0) 0%,#222 100%);background:-webkit-linear-gradient(left,rgba(255,255,255,0) 0%,#222 100%);background:linear-gradient(to right,rgba(255,255,255,0) 0%,#222 100%);filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#ffffff',endColorstr='#ab000000',GradientType=1);content:'';z-index:3}.knswli.dark.video .knswli-object-wrapper:before{display:none}.knswli .knswli-object-title{font-family:SFD-Heavy;font-size:28px;margin-left:60px;color:#fff;text-transform:uppercase;position:relative;margin-bottom:22px}.knswli.light .knswli-object-title{color:#222;margin-left:65px;margin-bottom:18px}.knswli.trend .icon{background-position:-213px 0;width:33px;height:22px;position:absolute;top:4px;left:-45px;display:block}.koli{width:260px;margin-left:20px;float:left;position:relative;background:#fff;overflow:hidden;border-radius:3px}.knswli.light .koli{border:1px solid #e6e6e6;box-shadow:0 1px 5px 0 rgba(0,0,0,.05)}.koli-ava{display:block;width:260px;height:165px;margin-bottom:5px;position:relative}.koli-ava img{width:100%;display:block}.koli-title{padding:0 12px 20px}.koli-title a{color:#333;font-family:SFD-Bold;font-size:18px;line-height:20px;text-decoration:none;display:block}.swiper-pagination-bullet-active{background:#fb512a !important}.knswli.video .knswli-object-wrapper{padding:0;border:0;width:100% !important;margin-left:0 !important}.knswli-video-wrapper{padding:20px 0 30px}.koli-stats{display:block;width:100%;height:35px;position:absolute;bottom:2px;left:0;background:rgba(0,0,0,.8)}.koli-stats span{margin-top:10px;position:relative;font-size:15px;color:#fff;line-height:35px;font-family:Arial;margin-left:40px}.koli-stats.view span:before{display:block;width:24px;height:24px;background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -245px -145px no-repeat;position:absolute;top:-4px;left:-30px;content:''}.koli-count{margin-right:5px}.swiper-button-next,.swiper-button-prev{position:absolute;top:52px;width:35px;height:95px;z-index:10;cursor:pointer}.swiper-button-next{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -115px -137px no-repeat;background-color:rgba(251,108,39,.9);border-top-left-radius:3px;-webkit-border-top-left-radius:3px;-moz-border-radius-topleft:3px;border-bottom-left-radius:3px;-webkit-border-bottom-left-radius:3px;-moz-border-radius-bottomleft:3px}.swiper-button-prev{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -70px -137px no-repeat;background-color:rgba(251,108,39,.9);border-top-right-radius:3px;-webkit-border-top-right-radius:3px;-moz-border-radius-topright:3px;border-bottom-right-radius:3px;-webkit-border-bottom-right-radius:3px;-moz-border-radius-bottomright:3px}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{right:0}.swiper-button-prev,.swiper-container-rtl .swiper-button-next{left:0}.swiper-button-next.swiper-button-disabled,.swiper-button-prev.swiper-button-disabled{display:none}.knswli-object-wrapper .swiper-container-horizontal>.swiper-pagination-bullets{bottom:0}.trend .swiper-button-next,.trend .swiper-button-prev{top:40px}.swiper-pagination{position:relative;margin-top:15px;bottom:0 !important}.swiper-pagination-bullet{margin:0 8px !important;cursor:pointer}.kscliw-ava video{width:100%;height:auto;position:absolute;top:0;left:50%;transform:translateX(-50%)}.koli-ava video,.klwcngl-thumb video,.klwfnswn-thumb video{width:100%;height:auto;display:block}.VCSortableInPreviewMode{text-align:center;width:100%;margin-bottom:35px}.klwfn-left{width:460px}.klwfn-right{width:220px}.klwfnl-thumb{display:block;width:460px;height:289px;margin-bottom:10px;position:relative}.klwfnl-thumb img{display:block;width:460px;height:289px}.klwfnl-title a{font-family:SFD-Bold;font-size:26px;line-height:30px;color:#222;text-decoration:none;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s}.klwfnl-sapo{font-size:14px;line-height:20px;color:#444;margin:10px 0}.klwfnr-thumb,.klwfnr-thumb img{display:block;width:220px;height:289px;position:relative}.klwfnr-title a{display:block;padding:12px 15px 20px;background-image:linear-gradient(#ebebeb,#fff);font-family:SFD-Bold;font-size:19px;line-height:22px;color:#222;text-decoration:none;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s}.klwfn-slide-wrapper{position:relative;margin-top:30px;width:720px;overflow:hidden}.klwfnswn{width:250px;margin-right:20px}.klwfnswn-thumb{display:block;width:250px;height:156px;margin-bottom:8px;position:relative}.klwfnswn-thumb img{display:block;width:250px;height:156px}.klwfnswn-title a{font-family:SFD-Bold;font-size:17px;line-height:22px;color:#2d2d2d;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s;text-decoration:none}.klw-featured-news{padding-bottom:30px;border-bottom:3px solid #ff5e34}.k14-home .knswli.dark.video{border-bottom:none;position:relative}.knswli .knswli-object-wrapper{width:700px;float:left}.backto_school-decumar{width:308px;float:right;position:relative;border:1px solid #f0e7d3;border-radius:5px;background-color:#fcfaf4}.trend .featuredcn{display:flex;justify-content:space-between}.trend .knswli-object-wrapper{margin:0}.flx-trendAd-crsk14{display:flex;justify-content:space-between}.crsk14{width:320px !important}.editor-pick-onstream .editor-pick-header{display:flex;align-items:center;margin-bottom:15px}.editor-pick-onstream .ep-header-icon{margin-right:10px}.editor-pick-onstream .ep-header-text{font-family:SFD-Bold;font-size:24px;color:#333;text-transform:uppercase}.editor-pick-onstream .editor-pick-news{display:flex}.editor-pick-onstream .ep-news-big{width:57%;padding-right:25px;margin-right:25px;border-right:1px solid #e5e5e5;flex-shrink:0}.editor-pick-onstream .ep-news-small{flex-grow:1}.editor-pick-onstream .ep-news-small-li{margin-bottom:20px}.editor-pick-onstream .ep-news-small-li:last-child{margin-bottom:0}.editor-pick-onstream .ep-news-big-ava{margin-bottom:15px}.editor-pick-onstream .ep-news-small-ava{margin-bottom:10px}.editor-pick-onstream .ep-news-small-title a{font-family:SFD-Bold;font-size:16px;line-height:130%;color:#333;text-decoration:none}.category .kbwcb-left{padding-top:0;border-top:0}.category .kbwc-body{margin-top:0}.category .kbw-content{margin-top:0}.category .w300{padding-top:20px}.hidden{display:none!important}.k14h-sprite{background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat}.kfa-list-footer-menu{text-align:center;padding:10px 0;margin-bottom:30px}.footer-bottom .col-title,.footer-bottom .col-title a{font-size:14px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:8px;padding-left:0 !important;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu{display:inline}.kfa-list-footer-menu .kfa-footer-menu a{font-size:12px;font-weight:bold;color:#4a4a4a;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu:before{content:'|';color:#a1a1a1;font-size:12px;margin:0 2px}.kfa-list-footer-menu .kfa-footer-menu:first-child:before{display:none}.new-footer .top-footer{border:1px solid #595959;padding:15px 20px;background:#fff;margin-bottom:30px}.k14-footer-logo{display:block;width:60px;height:90px;background-position:-187px -90px;margin-right:20px;float:left}.top-footer .group-title{font-size:16px;font-weight:bold;line-height:20px;color:#555;text-transform:uppercase}.top-footer p{font-size:12px;line-height:18px;color:#595959}.user-response{float:left}.btn-faq-popup{display:inline-block;height:24px;padding:0 6px 0 28px;border:1px solid #e7e7e7;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-top:3px;font-size:11px;font-weight:bold;color:#333;line-height:24px;text-transform:uppercase;text-decoration:none;margin-right:12px;margin-bottom:5px;position:relative}.btn-faq-popup:before{display:block;width:15px;height:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-257px -119px;content:'';position:absolute;top:5px;left:6px}.faq-mail{display:inline-block;padding-left:20px;font-size:13px;color:#333;text-decoration:none;position:relative}.faq-mail:before{display:block;width:13px;height:9px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-282px -119px;content:'';position:absolute;top:2px;left:0}.footer-col{float:left;padding:0 25px;border-left:1px solid #e7e7e7;width:280px}.footer-bottom .footer-col:first-of-type{padding-left:0;border-left:none}.footer-bottom .footer-col:last-of-type{padding-right:0}.footer-bottom .footer-col:first-of-type,.footer-bottom .footer-col:last-of-type{width:310px}.footer-bottom .col-title{font-size:14px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:8px}.k14-address{margin-bottom:35px}.footer-bottom p{font-size:13px;line-height:18px;color:#595959}.btn-view-map{display:block;height:15px;padding-left:15px;font-size:10px;font-weight:bold;color:#595959;line-height:14px;text-transform:uppercase;text-decoration:none;margin-top:8px;position:relative}.btn-view-map:before{display:block;width:9px;height:13px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-257px -167px;content:'';position:absolute;top:0;left:0}.associate{margin-bottom:18px}.associate p{padding-left:20px}.pl0{padding-left:0 !important}.associate .phone-footer,.associate .admicro-phone-footer{position:relative}.associate .phone-footer:before{display:block;width:8px;height:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-366px -90px;content:'';position:absolute;top:0;left:0}.associate .associate-mail{display:block;padding-left:20px;height:15px;margin-top:5px;font-size:13px;line-height:15px;color:#595959;text-decoration:none;position:relative}.associate .associate-mail:before{width:13px;height:9px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-305px -119px;content:'';position:absolute;top:4px;left:0}.btn-associate-lightbox{display:inline-block;margin-top:15px;height:24px;padding:0 15px;background:#9d2306;font-size:12px;font-weight:bold;color:#fff;text-decoration:none;line-height:24px;text-transform:uppercase;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px}.vccorp-footer-logo{display:block;width:103px;height:23px;margin-bottom:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-328px -119px}.footer-bottom .footer-col:last-of-type .col-title{margin-bottom:15px}.footer-bottom .footer-col:last-of-type p{margin-bottom:15px}.kfa-footer-menu{background:#e9e9e9}.footer-bottom .footer-col:last-of-type .col-title span{font-weight:normal;text-transform:none}.new-footer .top-footer{width:480px;height:98px;box-sizing:initial}.btn-messenger-lightbox{display:inline-flex;margin-top:15px;height:24px;padding:0 15px;background:#0050bd;font-size:12px;font-weight:bold;color:#fff;text-decoration:none;line-height:24px;text-transform:uppercase;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-right:10px}.btn-messenger-lightbox .messenger-icon{display:block;margin-right:5px;width:12px;flex-shrink:0;margin-top:2px}button{background:none;border:0;box-sizing:content-box;color:inherit;cursor:pointer;font:inherit;line-height:inherit;overflow:visible;vertical-align:inherit}.knswlic-welax .VCSortableInPreviewMode{margin-bottom:0}.knswli-left{width:250px}.fl{float:left}.knswli-category{font-family:SFD-SemiBold;font-size:14px;color:#41455e;text-decoration:none}.knswli-time{position:relative;font-family:SFD-Medium;font-size:14px;color:#777}.knswli-meta{margin-bottom:13px}.knswli-left{width:250px}.kscliw-sapo,.knswli-sapo{font-size:13px;font-family:Arial;color:#4d4d4d;line-height:18px;display:block}.toolbar-search-wrapper{height:25px;border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1)}.toolbar-search-wrapper #searchinput{height:25px;border:none;background-color:transparent;box-sizing:border-box;padding:0 6px;font-size:10px;color:#8a8a8a;width:154px;outline:none;float:left;line-height:25px}.t-search-submit-btn{display:block;height:25px;float:right;padding:4px 6px;box-sizing:border-box}.header-kinglive-status{padding:10px 0;height:50px}.knswli .knswli-object-title{font-size:24px}.knswli-object-wrapper{padding-top:15px}#searchinput:empty:not(:focus)::before{content:attr(data-placeholder)}.kenh14-toolbar-wrapper{background:#111;height:25px;position:relative;z-index:1}.k14ti{display:inline-block}.k14ti a{font-family:SFD-Semibold;font-size:12px;line-height:25px;color:#fff;text-transform:uppercase;text-decoration:none;color:#fff;display:block;padding:0 8px}.kbh-menu-list{margin-left:5px}.kmli-menu-expand-wrapper{background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.2);position:absolute;top:40px;left:0;z-index:9999;visibility:hidden;opacity:0;transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s}.list-other-cat-col{padding:20px 0 10px;border-bottom:1px solid #eaeaea}.occ{width:160px;float:left;margin-right:10px}.occ-name a{font-family:SFD-Semibold;font-size:16px;color:#333;text-decoration:none;display:block;margin-bottom:10px;padding-left:6px;border-left:3px solid #ff6610;height:12px;line-height:12px;background-color:transparent !important}.list-occs .occs{margin-bottom:10px}.list-occs .occs a{font-size:13px;color:#666;text-decoration:none;background-color:transparent !important}.kmew-topics-wrapper{padding:20px 0;border-bottom:1px solid #eaeaea}.kmewtw-label{height:20px;padding-left:26px;font-family:SFD-Semibold;font-size:20px;line-height:20px;color:#333;position:relative}.kmewtw-label:before{display:block;width:14px;height:20px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -384px -124px no-repeat;position:absolute;top:0;left:0;content:''}.kmewt{width:190px;height:40px;float:left;margin-right:20px;margin-top:20px}.kmewt a{display:block;width:190px;height:40px;position:relative;overflow:hidden;text-decoration:none;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.kmewt a img{display:block;width:100%;margin-left:0;margin-top:0;-webkit-filter:blur(6px);-moz-filter:blur(6px);filter:blur(6px)}.kmewt a span{padding:0 12px;height:40px;position:absolute;bottom:0;left:0;right:0;font-family:SFD-Medium;font-size:17px;line-height:40px;color:#fff;background:rgba(0,0,0,.2)}.kmew-other-links{padding:20px 0}.kmewol-group{margin-right:30px;float:left}.kmewolg-label,.kmewolg-label a{font-family:SFD-Semibold;font-size:15px;color:#333;text-decoration:none;background-color:transparent !important}.kmewolgi{display:inline;margin-left:10px}.kmewolgi a{font-size:13px;color:#666;text-decoration:none;background-color:transparent !important}.kmewolg-label,.list-kmewolgi{float:left}.khwth-trending-wrapper{height:30px;position:absolute;top:18px;left:230px;padding-left:30px}.khwth-trending-wrapper:before{display:block;width:19px;height:12px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -388px -55px no-repeat;position:absolute;top:10px;left:0;content:''}.khwtht{float:left;margin-right:10px}.khwtht a{display:block;height:28px;padding:0 15px;font-family:SFD-Medium;font-size:14px;line-height:28px;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.5);border-radius:100px;-webkit-border-radius:100px;-moz-border-radius:100px;transition:border .3s;-webkit-transition:border .3s;-moz-transition:border .3s;background:rgba(0,0,0,.02)}.list-k14-toolbar-items .k14ti.top-toolbar a{padding-left:20px;background-image:url(https://kenh14cdn.com/web_images/toolbar-topic-icon.png);background-position:left 6px center;background-repeat:no-repeat}.kbwc-body{position:relative}.kmli.expand-icon{cursor:pointer;height:100%}.kmli.expand-icon a span.eiline{display:block;width:4px;height:4px;background:#fff;border-radius:100px;-webkit-border-radius:100px;-moz-border-radius:100px;visibility:visible;opacity:1;transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s;position:absolute;top:18px}.kmli.expand-icon a span.ei-line1{left:0}.kmli.expand-icon a span.ei-line2{left:8px}.kmli.expand-icon a span.ei-line3{right:0}.trendAd-wrapper{background:#fff;padding:25px 0;position:relative;margin-top:-1px}.trendAd-wrapper:before{content:'';background:#e8e8e8;top:0;left:0;width:100%;height:1px;position:absolute}.trendAd-wrapper:after{content:'';background:#e8e8e8;bottom:0;left:0;width:100%;height:1px;position:absolute}.trendAd-left{background-color:#2b2b2b;border-radius:3px}.trendAd-right{width:450px;float:right}.trendAd{padding:0;border:none}#k14-main-menu-wrapper-sticky-wrapper{position:relative;z-index:9999}.occ.r1,.occ.r2{margin-bottom:20px}.klw-detail-stream,.knswli.dark.video{position:relative}.khwth-trending-wrapper .khwtht a:before{content:'#'}.knswli-readmore{padding-top:12px;margin-top:15px;border-top:1px dotted #d6d6d6}.knswli-readmore .readmore-label{font-size:11px;color:#888;display:block;margin-bottom:8px}.knswli-readmore .readmore-list-news .readmore-news{margin-bottom:8px;position:relative}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link{font-family:SFD-Bold;font-size:14px;line-height:20px;color:#41455e;display:-webkit-box}.knswli-readmore .readmore-list-news .readmore-news:before{display:block;width:4px;height:4px;content:'';background-color:#ff5e34;border-radius:100%;float:left;margin-top:8px;margin-right:9px}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link i{font-size:13px;color:#888;font-family:SFD-Medium}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link i:before{content:' . ';margin-left:3px;margin-right:3px;position:relative;top:-4px}.khw-adk14-wrapper{height:auto;padding-top:15px;padding-bottom:15px}.kbwcb-left{z-index:0}.swiper-container-horizontal ul{transition:all .5s !important;-webkit-transition:all .5s !important;-moz-transition:all .5s !important}.swiper-button-prev{left:-35px;*transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{right:0}.swiper-button-next.swiper-button-disabled,.swiper-button-prev.swiper-button-disabled{background-color:#333 !important;width:35px;opacity:.8;display:block;pointer-events:all}.clearfix:after{visibility:hidden;display:block;font-size:0;content:" ";clear:both;height:0}.koli-title a{font-size:17px !important;line-height:22px !important}.koli:last-child{margin-right:20px}.VCSortableInPreviewMode{margin-bottom:30px}.kenh14-wrapper{overflow:hidden}.knswli-relate{display:inline-block}.knswli.dark .knswli-object-wrapper:before{border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.sticker{position:absolute;top:-20px;left:-20px;width:54px;height:54px;z-index:1}.pos-rlt{position:relative}.k14topic-sapo{float:left;margin-right:10px;margin-top:2px;position:relative;font-family:Arial !important;cursor:pointer}.knswli-right .k14topic-sapo{float:none;padding-bottom:10px}.k14topic-sapo .k14topic-logo{display:block;cursor:pointer;height:18px}.k14topic-sapo .k14topic-logo img{height:18px}.brand-content.k14topic-sapo{float:none;margin-bottom:5px}.stream.brand-content .k14topic-logo,.brand-content .k14topic-logo img{height:20px !important;border-radius:4px}.klwfnl-title a,.klwfnr-title a{font-family:Helvetica,Arial,sans-serif;font-weight:bold;letter-spacing:-1px}.klwfnl-title a,.klwfnr-title a,.klwfnswn-title a{font-family:SFD-Bold;font-weight:normal;letter-spacing:0}.knswlic-welax .VCSortableInPreviewMode>div{width:100% !important;height:100% !important;position:absolute;top:0;left:0}.verticalThumb .kscliw-ava{padding-top:131.82%}#admzone49{min-height:90px}#admzone50{min-height:600px}.knswli.dark .knswli-object-wrapper{background-color:transparent}.k14-videoUpdate .k14-videoUpdate-wrapper{display:flex;justify-content:space-between}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left{width:320px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left .content-video .VCSortableInPreviewMode[type="VideoStream"]{position:relative;margin-bottom:0}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left .content-video .VCSortableInPreviewMode[type="VideoStream"] .videoNewsPlayer{position:absolute;top:0;left:0;width:100%;height:100% !important;background:#f1f1f1 !important}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right{width:360px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info{display:flex;flex-direction:column;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading{display:flex;align-items:center;margin-bottom:10px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading .ih-time{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#888}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content{display:flex;flex-direction:column;justify-content:space-between;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top{display:flex;flex-direction:column}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-title{font-size:20px;line-height:24px;font-family:SFD-Bold;color:#333;margin-bottom:5px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des{display:flex}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#888}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt .ictd-link{font-weight:700;color:#4d4d4d}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom{display:flex;flex-direction:column}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-left{width:500px;flex-shrink:0;margin-right:15px}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-left .content-video .VCSortableInPreviewMode[type=VideoStream]{padding-top:56.4%}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-bottom{display:none}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-top .ict-title{font-size:18px}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt{-webkit-line-clamp:5;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.trendAd-left{display:none}.trendAd-right{max-height:710px !important}.titledecumar-video{font:normal 15px/19px SFD-Bold;color:#fff;position:absolute;display:block;top:0;background:linear-gradient(180deg,#000 0%,rgba(0,0,0,0) 100%);z-index:9;padding:15px 15px 50px;transform:scaleY(1);transform-origin:top;transition:transform .26s ease}#liNewsMostView.knswli{border-bottom:none;padding-bottom:0}.vccorp-footer-logo{background-image:none;background-position:0;width:100px;height:49px}.brand-content.k14topic-sapo{margin-bottom:2px}video.lozad-video{width:100%;height:100%;object-fit:cover}
        .associate .admicro-phone-footer,.associate .phone-footer,.kbwc-body,.kenh14-wrapper,.khw-top-header,.khw-top-header .w1040,.klw-detail-stream,.knswli.dark.video,.swiper-container,.swiper-slide,.swiper-wrapper{position:relative}.knswli,.kscli,ol,ul{list-style:none}.kmli>a,.kwtm-logo,a{text-decoration:none}.kmewt a span,.kmli.home{padding:0 12px}a,abbr,acronym,address,applet,article,aside,audio,b,big,blockquote,body,canvas,caption,center,cite,code,dd,del,details,dfn,div,dl,dt,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hgroup,html,i,iframe,img,ins,kbd,label,legend,li,mark,menu,nav,object,ol,output,p,pre,q,ruby,s,samp,section,small,span,strike,strong,sub,summary,sup,table,tbody,td,tfoot,th,thead,time,tr,tt,u,ul,var,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}blockquote,q{quotes:none}blockquote:after,blockquote:before,q:after,q:before{content:"";content:none}.fr{float:right}.mt-10{margin-top:10px}.mt-20{margin-top:20px}img{color:transparent;image-rendering:-webkit-optimize-contrast}.swiper-container{margin:0 auto;overflow:hidden;z-index:1}.swiper-wrapper{width:100%;height:100%;z-index:1;display:-webkit-box;display:-moz-box;display:-ms-flexbox;display:-webkit-flex;display:flex;-webkit-transition-property:-webkit-transform;-moz-transition-property:-moz-transform;-o-transition-property:-o-transform;-ms-transition-property:-ms-transform;transition-property:transform;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.swiper-container-android .swiper-slide,.swiper-wrapper{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);-o-transform:translate(0,0);-ms-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}.swiper-slide{-webkit-flex-shrink:0;-ms-flex:0 0 auto;flex-shrink:0;width:100%;height:100%}.swiper-button-next,.swiper-button-prev{margin-top:-22px;-moz-background-size:27px 44px;-webkit-background-size:27px 44px;background-size:27px 44px;background-position:center;background-repeat:no-repeat}.w1040,.w1120{margin:0 auto}.swiper-button-next.swiper-button-disabled,.swiper-button-prev.swiper-button-disabled{opacity:.35;cursor:auto;pointer-events:none}.swiper-button-prev,.swiper-container-rtl .swiper-button-next{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M0%2C22L22%2C0l2.1%2C2.1L4.2%2C22l19.9%2C19.9L22%2C44L0%2C22L0%2C22L0%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");right:auto}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M27%2C22L27%2C22L5%2C44l-2.1-2.1L22.8%2C22L2.9%2C2.1L5%2C0L27%2C22L27%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");left:auto}.swiper-pagination{text-align:center;-webkit-transition:.3s;-moz-transition:.3s;-o-transition:.3s;transition:.3s;-webkit-transform:translate3d(0,0,0);-ms-transform:translate3d(0,0,0);-o-transform:translate3d(0,0,0);transform:translate3d(0,0,0);z-index:10}.swiper-container-horizontal>.swiper-pagination-bullets,.swiper-pagination-custom,.swiper-pagination-fraction{bottom:10px;left:0;width:100%}.swiper-pagination-bullet{width:8px;height:8px;display:inline-block;border-radius:100%;background:#000;opacity:.2}.swiper-pagination-clickable .swiper-pagination-bullet{cursor:pointer}.swiper-container-horizontal>.swiper-pagination-bullets .swiper-pagination-bullet{margin:0 5px}.sprite{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") no-repeat}.w1120{width:1120px}.w1040{width:1040px}.w720{width:720px}.w750{width:750px}.w700{width:700px}.w300{width:300px}.kenh14-wrapper{display:block;min-width:1120px;overflow:hidden}.kenh14-header-wrapper{display:block;position:relative}.khw-top-header{background:#f0a52b;height:70px;z-index:1}.kwtm-toogle{text-align:center;position:absolute;top:19px;right:0}.kwtm-logo{width:200px;height:60px;position:absolute;top:7px;left:0;background:url(https://kenh14cdn.com/web_images/k14_logo2022.svg) 0 0/auto 60px no-repeat!important}.khw-bottom-header{background:#a70e1a;height:40px;position:relative}.kmli{float:left;position:relative;white-space:nowrap}.kmli>a{font-size:15px;color:#fff;padding:0 6px;display:block;line-height:40px;position:relative;font-family:SFD-Medium}.kmli.home>a{width:12px;padding:0;background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -494px 12px no-repeat;text-indent:-99999px;overflow:hidden}.kmli.expand-icon{padding:0 12px;position:inherit}.kmli.expand-icon>a{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -319px -104px no-repeat;width:20px;padding:0}.kmli:first-of-type>a{padding-left:0}.kbh-menu-list{display:block;height:40px;display:flex}.khw-adk14-wrapper{background:#f1f1f1;padding:20px 0;width:100%;display:block;text-align:center}.kbw-content{margin-top:35px;display:block}.kbwcb-left{border-top:1px solid #e4e4e4;position:relative;padding-top:25px}.kbwcb-left:before{background:url("https://kenh14cdn.com/web_images/grd-border.png") top right repeat-y;content:"";position:absolute;top:0;right:-20px;width:20px;height:100%;z-index:-1}.kbwcb-left-wrapper{display:block;padding-right:20px;position:relative}.knswli,.kscli{padding:25px 0;border-bottom:1px solid #ebebeb}.kscliw-ava{display:block;overflow:hidden;position:relative;padding-top:62.5%;background-size:cover;background-position:center top;background-repeat:no-repeat}.knswli-right,.kscliw-right{margin-left:270px}.knswli-title a,.kscliw-title a{font-family:SFD-Bold;font-size:20px;line-height:26px;color:#333;text-decoration:none;display:block;margin-bottom:10px;margin-top:-5px}.klwfnl-title a,.klwfnr-title a{color:#222;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s}.knswli-comment,.knswli-facebook,.knswli-view{margin-left:10px;font-size:12px;color:#888;position:relative}.kmew-other-links,.knswli-object-wrapper{padding:20px 0}.knswli.light .knswli-object-wrapper{background:#f5f5f5;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;border:1px solid #e6e6e6}.knswli.dark .knswli-object-wrapper{position:relative;background:0 0;border-top:5px solid #fb6c27}.knswli.dark .knswli-object-wrapper:before{display:block;position:absolute;width:10%;bottom:0;right:0;height:100%;background:-moz-linear-gradient(left,rgba(255,255,255,0) 0,#222 100%);background:-webkit-linear-gradient(left,rgba(255,255,255,0) 0,#222 100%);background:linear-gradient(to right,rgba(255,255,255,0) 0,#222 100%);content:"";z-index:3}.kfa-list-footer-menu .kfa-footer-menu:first-child:before,.knswli.dark.video .knswli-object-wrapper:before{display:none}.swiper-pagination-bullet-active{opacity:1;background:#fb512a!important}.knswli.video .knswli-object-wrapper{padding:0;border:0;width:100%!important;margin-left:0!important}.knswli-video-wrapper{padding:20px 0 30px}.swiper-button-next,.swiper-button-prev{position:absolute;top:52px;width:35px;height:95px;z-index:10;cursor:pointer}.swiper-button-next{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -115px -137px no-repeat rgba(251,108,39,.9);border-top-left-radius:3px;-webkit-border-top-left-radius:3px;-moz-border-radius-topleft:3px;border-bottom-left-radius:3px;-webkit-border-bottom-left-radius:3px;-moz-border-radius-bottomleft:3px}.swiper-button-prev{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -70px -137px no-repeat rgba(251,108,39,.9);border-top-right-radius:3px;-webkit-border-top-right-radius:3px;-moz-border-radius-topright:3px;border-bottom-right-radius:3px;-webkit-border-bottom-right-radius:3px;-moz-border-radius-bottomright:3px}.kmli.expand-icon a span.ei-line1,.swiper-button-prev,.swiper-container-rtl .swiper-button-next{left:0}.trend .swiper-button-next,.trend .swiper-button-prev{top:40px}.swiper-pagination{position:relative;margin-top:15px;bottom:0!important}.swiper-pagination-bullet{margin:0 8px!important;cursor:pointer}.kscliw-ava video{width:100%;height:auto;position:absolute;top:0;left:50%;transform:translateX(-50%)}.klwcngl-thumb video,.klwfnswn-thumb video,.koli-ava video{width:100%;height:auto;display:block}.VCSortableInPreviewMode{text-align:center;width:100%}.klwfn-left{width:460px}.klwfn-right,.trendAd .knswli-left{width:220px}.klwfnl-thumb,.klwfnl-thumb img{width:460px;height:289px;display:block}.klwfnl-thumb{margin-bottom:10px;position:relative}.klwfnl-title a{font-size:26px;line-height:30px;text-decoration:none}.klwfnr-title a,.klwfnswn-title a{line-height:22px;text-decoration:none}.klwfnl-sapo{font-size:14px;line-height:20px;color:#444;margin:10px 0}.klwfnr-thumb,.klwfnr-thumb img{display:block;width:220px;height:289px;position:relative}.klwfnr-title a{display:block;padding:12px 15px 20px;background-image:linear-gradient(#ebebeb,#fff);font-size:19px}.klwfn-slide-wrapper{position:relative;margin-top:30px;width:720px;overflow:hidden}.klwfnswn{width:250px;margin-right:20px}.klwfnswn-thumb{display:block;width:250px;height:156px;margin-bottom:8px;position:relative}.klwfnswn-thumb img{display:block;width:250px;height:156px}.klwfnswn-title a{font-family:SFD-Bold;font-size:17px;color:#2d2d2d;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s}.klw-featured-news{padding-bottom:30px;border-bottom:3px solid #ff5e34}.k14-home .knswli.dark.video{border-bottom:none;position:relative}.knswli .knswli-object-wrapper{width:700px;float:left}.backto_school-decumar{width:308px;float:right;position:relative;border:1px solid #f0e7d3;border-radius:5px;background-color:#fcfaf4}.flx-trendAd-crsk14,.k14-videoUpdate .k14-videoUpdate-wrapper,.trend .featuredcn{display:flex;justify-content:space-between}.trend .knswli-object-wrapper{margin:0}.crsk14{width:320px!important}.editor-pick-onstream .editor-pick-header{display:flex;align-items:center;margin-bottom:15px}.editor-pick-onstream .ep-header-icon,.khwtht{margin-right:10px}.editor-pick-onstream .ep-header-text{font-family:SFD-Bold;font-size:24px;color:#333;text-transform:uppercase}.editor-pick-onstream .editor-pick-news,.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des{display:flex}.editor-pick-onstream .ep-news-big{width:57%;padding-right:25px;margin-right:25px;border-right:1px solid #e5e5e5;flex-shrink:0}.editor-pick-onstream .ep-news-small{flex-grow:1}.editor-pick-onstream .ep-news-small-li,.occ.r1,.occ.r2{margin-bottom:20px}.backto_school-decumar .VCSortableInPreviewMode,.editor-pick-onstream .ep-news-small-li:last-child,.knswlic-welax .VCSortableInPreviewMode{margin-bottom:0}.editor-pick-onstream .ep-news-big-ava,.footer-bottom .footer-col:last-of-type .col-title,.footer-bottom .footer-col:last-of-type p{margin-bottom:15px}.editor-pick-onstream .ep-news-small-ava,.list-occs .occs,.occ-name a{margin-bottom:10px}.editor-pick-onstream .ep-news-small-title a{font-family:SFD-Bold;font-size:16px;line-height:130%;color:#333;text-decoration:none}.footer-bottom .col-title,.top-footer .group-title{color:#555;font-weight:700;text-transform:uppercase}.category .kbwcb-left{padding-top:0;border-top:0}.category .kbw-content,.category .kbwc-body{margin-top:0}.category .w300{padding-top:20px}.hidden{display:none!important}.k14h-sprite{background-image:url("https://kenh14cdn.com/web_images/k14h-sprite_v1.png");background-repeat:no-repeat}.kfa-list-footer-menu{text-align:center;padding:10px 0;margin-bottom:30px}.footer-bottom .col-title,.footer-bottom .col-title a{font-size:14px;font-weight:700;color:#555;text-transform:uppercase;margin-bottom:8px;padding-left:0!important;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu{display:inline}.kfa-list-footer-menu .kfa-footer-menu a{font-size:12px;font-weight:700;color:#a1a1a1;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu:before{content:"|";color:#a1a1a1;font-size:12px;margin:0 2px}.new-footer .top-footer{border:1px solid #e7e7e7;padding:15px 20px;background:#fff;margin-bottom:30px}.associate .associate-mail:before,.associate .phone-footer:before,.btn-faq-popup:before,.btn-view-map:before,.faq-mail:before{background-image:url("https://kenh14cdn.com/web_images/k14h-sprite_v1.png");background-repeat:no-repeat;position:absolute;content:""}.k14-footer-logo{display:block;width:60px;height:90px;background-position:-187px -90px;margin-right:20px;float:left}.btn-faq-popup,.faq-mail{display:inline-block;color:#333;text-decoration:none;position:relative}.top-footer .group-title{font-size:16px;line-height:20px}.top-footer p{font-size:12px;line-height:18px;color:#777}.fl,.khwtht,.kmewolg-label,.kmewt,.list-kmewolgi,.occ,.user-response{float:left}.btn-faq-popup{height:24px;padding:0 6px 0 28px;border:1px solid #e7e7e7;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-top:3px;font-size:11px;font-weight:700;line-height:24px;text-transform:uppercase;margin-right:12px;margin-bottom:5px}.btn-faq-popup:before{display:block;width:15px;height:15px;background-position:-257px -119px;top:5px;left:6px}.faq-mail{padding-left:20px;font-size:13px}.faq-mail:before{display:block;width:13px;height:9px;background-position:-282px -119px;top:2px;left:0}.footer-col{float:left;padding:0 25px;border-left:1px solid #e7e7e7;width:280px}.footer-bottom .footer-col:first-of-type{padding-left:0;border-left:none}.footer-bottom .footer-col:last-of-type{padding-right:0}.footer-bottom .footer-col:first-of-type,.footer-bottom .footer-col:last-of-type{width:310px}.footer-bottom .col-title{font-size:14px;margin-bottom:8px}.k14-address{margin-bottom:35px}.footer-bottom p{font-size:13px;line-height:18px;color:#777}.btn-view-map{display:block;height:15px;padding-left:15px;font-size:10px;font-weight:700;color:#777;line-height:14px;text-transform:uppercase;text-decoration:none;margin-top:8px;position:relative}.btn-associate-lightbox,.btn-messenger-lightbox,.k14ti a{font-size:12px;text-decoration:none;text-transform:uppercase}.btn-view-map:before{display:block;width:9px;height:13px;background-position:-257px -167px;top:0;left:0}.associate{margin-bottom:18px}.associate p{padding-left:20px}.pl0{padding-left:0!important}.btn-associate-lightbox,.btn-messenger-lightbox{margin-top:15px;height:24px;padding:0 15px;line-height:24px;color:#fff;font-weight:700}.associate .phone-footer:before{display:block;width:8px;height:15px;background-position:-366px -90px;top:0;left:0}.associate .associate-mail{display:block;padding-left:20px;height:15px;margin-top:5px;font-size:13px;line-height:15px;color:#777;text-decoration:none;position:relative}.associate .associate-mail:before{width:13px;height:9px;background-position:-305px -119px;top:4px;left:0}.btn-associate-lightbox{display:inline-block;background:#fa5d37;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px}.vccorp-footer-logo{display:block;margin-bottom:15px;background-repeat:no-repeat}.kfa-footer-menu{background:#e9e9e9}.footer-bottom .footer-col:last-of-type .col-title span{font-weight:400;text-transform:none}.new-footer .top-footer{width:480px;height:98px;box-sizing:initial}.btn-messenger-lightbox{display:inline-flex;background:#0084ff;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-right:10px}.btn-messenger-lightbox .messenger-icon{display:block;margin-right:5px;width:12px;flex-shrink:0;margin-top:2px}button{background:0 0;border:0;box-sizing:content-box;color:inherit;cursor:pointer;font:inherit;line-height:inherit;overflow:visible;vertical-align:inherit}.knswli-category{font-family:SFD-SemiBold;font-size:14px;color:#41455e;text-decoration:none}.knswli-time{position:relative;font-family:SFD-Medium;font-size:14px;color:#777}.knswli-meta{margin-bottom:13px}.knswli-left{width:250px}.knswli-sapo,.kscliw-sapo{font-size:13px;font-family:Arial;color:#4d4d4d;line-height:18px;display:block}.k14ti a,.kmewtw-label,.occ-name a{font-family:SFD-Semibold}.toolbar-search-wrapper{height:25px;border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1)}.toolbar-search-wrapper #searchinput{height:25px;border:none;background-color:transparent;box-sizing:border-box;padding:0 6px;font-size:10px;color:#8a8a8a;width:154px;outline:0;float:left;line-height:25px}.t-search-submit-btn{display:block;height:25px;float:right;padding:4px 6px;box-sizing:border-box}.header-kinglive-status{padding:10px 0;height:50px}.knswli-object-wrapper{padding-top:15px}#searchinput:empty:not(:focus)::before{content:attr(data-placeholder)}.kenh14-toolbar-wrapper{background:#111;height:25px;position:relative;z-index:1}.k14ti{display:inline-block}.k14ti a{line-height:25px;color:#fff;display:block;padding:0 8px}.kbh-menu-list{margin-left:5px}.kmli-menu-expand-wrapper{background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.2);position:absolute;top:40px;left:0;z-index:9999;visibility:hidden;opacity:0;transition:.3s;-webkit-transition:.3s;-moz-transition:.3s}.kmewolg-label,.kmewolg-label a,.kmewolgi a,.list-occs .occs a,.occ-name a{background-color:transparent!important;text-decoration:none}.list-other-cat-col{padding:20px 0 10px;border-bottom:1px solid #eaeaea}.occ{width:160px;margin-right:10px}.kmewt,.kmewt a{width:190px;height:40px}.occ-name a{font-size:16px;color:#333;display:block;padding-left:6px;border-left:3px solid #ff6610;height:12px;line-height:12px}.kmewolgi a,.list-occs .occs a{font-size:13px;color:#666}.kmew-topics-wrapper{padding:20px 0;border-bottom:1px solid #eaeaea}.kmewtw-label{height:20px;padding-left:26px;font-size:20px;line-height:20px;color:#333;position:relative}.kmewtw-label:before{display:block;width:14px;height:20px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -384px -124px no-repeat;position:absolute;top:0;left:0;content:""}.kmewt{margin-right:20px;margin-top:20px}.kmewt a{display:block;position:relative;overflow:hidden;text-decoration:none;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.kmewt a img{display:block;width:120%;margin-left:-10%;margin-top:-10%;-webkit-filter:blur(6px);-moz-filter:blur(6px);filter:blur(6px)}.kmewt a span{height:40px;position:absolute;bottom:0;left:0;right:0;font-family:SFD-Medium;font-size:17px;line-height:40px;color:#fff;background:rgba(0,0,0,.2)}.kmewol-group{margin-right:30px;float:left}.kmewolg-label,.kmewolg-label a{font-family:SFD-Semibold;font-size:15px;color:#333}.kmewolgi{display:inline;margin-left:10px}.khwth-trending-wrapper{height:30px;position:absolute;top:18px;left:230px;padding-left:30px}.khwth-trending-wrapper:before{display:block;width:19px;height:12px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -388px -55px no-repeat;position:absolute;top:10px;left:0;content:""}.khwtht a{display:block;height:28px;padding:0 15px;font-family:SFD-Medium;font-size:14px;line-height:28px;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.5);border-radius:100px;-webkit-border-radius:100px;-moz-border-radius:100px;transition:border .3s;-webkit-transition:border .3s;-moz-transition:border .3s;background:rgba(0,0,0,.02)}.list-k14-toolbar-items .k14ti.top-toolbar a{padding-left:20px;background-image:url("https://kenh14cdn.com/web_images/toolbar-topic-icon.png");background-position:left 6px center;background-repeat:no-repeat}.kmli.expand-icon{cursor:pointer;height:100%}.trendAd-wrapper:after,.trendAd-wrapper:before{background:#e8e8e8;height:1px;position:absolute;content:"";left:0;width:100%}.kmli.expand-icon a span.eiline{display:block;width:4px;height:4px;background:#fff;border-radius:100px;-webkit-border-radius:100px;-moz-border-radius:100px;visibility:visible;opacity:1;transition:.3s;-webkit-transition:.3s;-moz-transition:.3s;position:absolute;top:18px}.kmli.expand-icon a span.ei-line2{left:8px}.kmli.expand-icon a span.ei-line3,.swiper-button-next,.swiper-container-rtl .swiper-button-prev{right:0}.trendAd-wrapper{background:#fff;padding:25px 0;position:relative;margin-top:-1px}.trendAd-wrapper:before{top:0}.trendAd-wrapper:after{bottom:0}.trendAd-left{background-color:#2b2b2b;border-radius:3px;display:none}.trendAd-right{width:450px;float:right;max-height:710px!important}.trendAd{padding:0;border:none}.trendAd .knsw-list .knswli:last-child{border-bottom:none}.trendAdl-header{height:40px;padding-left:20px;font-family:SFD-Bold;font-size:20px;line-height:38px;text-transform:uppercase;background:#222;color:#fff;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px;position:relative}.trendAd .knswli,.trendAd .kscli{border-bottom-color:#343434;margin:0 20px}.trendAd .knswli-title a,.trendAd .kscliw-title a{color:#eee}.trendAd .knswli-right,.trendAd .kscliw-right{margin-left:240px}.trendAd .knswli-meta,.trendAd .knswli-title a,.trendAd .kscliw-title a{margin-bottom:8px}#k14-main-menu-wrapper-sticky-wrapper{position:relative;z-index:9999}.khwth-trending-wrapper .khwtht a:before{content:"#"}.knswli-readmore{padding-top:12px;margin-top:15px;border-top:1px dotted #d6d6d6}.knswli-readmore .readmore-label{font-size:11px;color:#888;display:block;margin-bottom:8px}.knswli-readmore .readmore-list-news .readmore-news{margin-bottom:8px;position:relative}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link{font-family:SFD-Bold;font-size:14px;line-height:20px;color:#41455e;display:-webkit-box}.knswli-readmore .readmore-list-news .readmore-news:before{display:block;width:4px;height:4px;content:"";background-color:#ff5e34;border-radius:100%;float:left;margin-top:8px;margin-right:9px}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link i{font-size:13px;color:#888;font-family:SFD-Medium}.knswli-readmore .readmore-list-news .readmore-news .readmore-news-link i:before{content:" . ";margin-left:3px;margin-right:3px;position:relative;top:-4px}.khw-adk14-wrapper{height:auto;padding-top:15px;padding-bottom:15px}.kbwcb-left{z-index:0}.swiper-container-horizontal ul{transition:.5s!important;-webkit-transition:.5s!important;-moz-transition:.5s!important}.swiper-button-prev{left:-35px;transition:.3s;-webkit-transition:.3s;-moz-transition:.3s}.swiper-button-next.swiper-button-disabled,.swiper-button-prev.swiper-button-disabled{background-color:#333!important;width:35px;opacity:.8;display:block;pointer-events:all}.clearfix:after{visibility:hidden;display:block;font-size:0;content:" ";clear:both;height:0}.VCSortableInPreviewMode{margin-bottom:30px}.knswli.dark .knswli-object-wrapper:before{border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.trendAd-left .knswli-view{margin-left:0;padding-left:23px}.light-box .threads .knswli-view:before,.trendAd-left .knswli-view:before{width:14px;height:10px;background-position:-431px -209px;top:1px;position:absolute;left:0;background-image:url("https://kenh14cdn.com/web_images/sprite-k14.20.png");background-repeat:no-repeat;content:""}.trendAd-left .knswli-view:before{width:18px;height:18px;background-position:-166px -97px;background-size:370px;top:-2px}.trendAdl-header:before{display:block;width:4px;height:20px;position:absolute;top:9px;left:0;background-color:#ff5e34;content:""}.k14topic-sapo{float:left;margin-right:10px;margin-top:2px;position:relative;font-family:Arial!important;cursor:pointer}.knswli-right .k14topic-sapo{float:none;padding-bottom:10px}.k14topic-sapo .k14topic-logo{display:block;cursor:pointer;height:18px}.k14topic-sapo .k14topic-logo img{height:18px}.brand-content .k14topic-logo img,.stream.brand-content .k14topic-logo{height:20px!important;border-radius:4px}.klwfnl-title a,.klwfnr-title a{font-family:Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:-1px}.klwfnl-title a,.klwfnr-title a,.klwfnswn-title a{font-family:SFD-Bold;font-weight:400;letter-spacing:0}.knswlic-welax .VCSortableInPreviewMode>div{width:100%!important;height:100%!important;position:absolute;top:0;left:0}.verticalThumb .kscliw-ava{padding-top:131.82%}#admzone49{min-height:90px}#admzone50{min-height:600px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left{width:320px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left .content-video .VCSortableInPreviewMode[type=VideoStream]{position:relative;margin-bottom:0}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left .content-video .VCSortableInPreviewMode[type=VideoStream] .videoNewsPlayer{position:absolute;top:0;left:0;width:100%;height:100%!important;background:#f1f1f1!important}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right{width:360px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info{display:flex;flex-direction:column;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading{display:flex;align-items:center;margin-bottom:10px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt,.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading .ih-time{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#888}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content{display:flex;flex-direction:column;justify-content:space-between;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom,.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top{display:flex;flex-direction:column}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-title{font-size:20px;line-height:24px;font-family:SFD-Bold;color:#333;margin-bottom:5px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt .ictd-link{font-weight:700;color:#4d4d4d}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .read-more{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#888;margin-bottom:10px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news{display:flex;padding:12px;border:1px solid #e5e5e5;box-sizing:border-box;border-radius:4px;background:#fff}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news .rn-thumb{width:80px;position:relative;margin-right:10px;flex-shrink:0}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news .rn-thumb i{display:block;width:100%;padding-top:125%;position:relative}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news .rn-thumb i img{display:block;width:100%;height:100%;position:absolute;top:0;left:0;object-fit:cover}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news .rn-thumb .play-icn{display:flex;width:30px;height:30px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom .related-news .rn-info{font-size:15px;line-height:20px;font-family:SFD-Bold;color:#333}.trendAd .knswli,.trendAd .kscli{padding:25px 0}.titledecumar-video{font:15px/19px SFD-Bold;color:#fff;position:absolute;display:block;top:0;background:linear-gradient(180deg,#000 0,rgba(0,0,0,0) 100%);z-index:9;padding:15px 15px 50px;transform:scaleY(1);transform-origin:top;transition:transform .26s}#liNewsMostView.knswli{border-bottom:none;padding-bottom:0}.vccorp-footer-logo{background-image:url(https://vccorp.mediacdn.vn/vccorp-s.png);background-position:0;width:100px;height:49px}.brand-content.k14topic-sapo{float:none;margin-bottom:2px}video.lozad-video{width:100%;height:100%;object-fit:cover}.icodurationhome{position:absolute;bottom:12px;left:12px;border-radius:6px;background:rgba(0,0,0,.85);padding:6px 12px;font:14px SFD-Regular;color:#fff;display:flex;align-items:center}.icodurationhome svg{margin-right:8px}.category-submenu{padding:16px 0;background:#f5f5f5;border-bottom:1px solid #d9d9d9}.category-submenu .cs-list{display:flex;align-items:center}.category-submenu .cs-list .csli{margin-right:15px}.category-submenu .cs-list .csli:first-child{padding-right:15px;border-right:1px solid #d9d9d9}.category-submenu .cs-list .csli:first-child a{font-family:SFD-Medium;color:#000;font-size:13px;text-transform:uppercase}.category-submenu .cs-list .csli:last-child{margin-right:0}.category-submenu .cs-list .csli a{color:#555;font-family:SFD-Regular;font-size:14px;line-height:normal;white-space: nowrap}.category-submenu .cs-list .csli a:hover{color:#000}

    </style>
    <style>
        html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none}.clearfix:after{visibility:hidden;display:block;font-size:0;content:" ";clear:both;height:0}.fl{float:left}.fr{float:right}.mt-20{margin-top:20px}.mt-40{margin-top:40px}.mb-0{margin-bottom:0 !important}.mb-20{margin-bottom:20px}img{color:transparent}a{text-decoration:none}.swiper-container{margin:0 auto;position:relative;overflow:hidden;z-index:1}.swiper-wrapper{position:relative;width:100%;height:100%;z-index:1;display:-webkit-box;display:-moz-box;display:-ms-flexbox;display:-webkit-flex;display:flex;-webkit-transition-property:-webkit-transform;-moz-transition-property:-moz-transform;-o-transition-property:-o-transform;-ms-transition-property:-ms-transform;transition-property:transform;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.swiper-container-android .swiper-slide,.swiper-wrapper{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);-o-transform:translate(0,0);-ms-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}.swiper-slide{-webkit-flex-shrink:0;-ms-flex:0 0 auto;flex-shrink:0;width:100%;height:100%;position:relative}.swiper-button-next,.swiper-button-prev{position:absolute;top:50%;width:27px;height:44px;margin-top:-22px;z-index:10;cursor:pointer;-moz-background-size:27px 44px;-webkit-background-size:27px 44px;background-size:27px 44px;background-position:center;background-repeat:no-repeat}.swiper-button-prev,.swiper-container-rtl .swiper-button-next{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M0%2C22L22%2C0l2.1%2C2.1L4.2%2C22l19.9%2C19.9L22%2C44L0%2C22L0%2C22L0%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");left:10px;right:auto}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M27%2C22L27%2C22L5%2C44l-2.1-2.1L22.8%2C22L2.9%2C2.1L5%2C0L27%2C22L27%2C22z'%20fill%3D'%23007aff'%2F%3E%3C%2Fsvg%3E");right:10px;left:auto}.swiper-pagination{position:absolute;text-align:center;-webkit-transition:.3s;-moz-transition:.3s;-o-transition:.3s;transition:.3s;-webkit-transform:translate3d(0,0,0);-ms-transform:translate3d(0,0,0);-o-transform:translate3d(0,0,0);transform:translate3d(0,0,0);z-index:10}.sprite{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png");background-repeat:no-repeat}.w1040{width:1040px;margin:0 auto}.w700{width:700px}.w300{width:300px}img{image-rendering:-webkit-optimize-contrast}.kenh14-wrapper{display:block;position:relative;min-width:1120px}.kenh14-header-wrapper{display:block;position:relative}.khw-top-header{background:#f0a52b;height:70px;position:relative;z-index:1}.khw-top-header .w1040{position:relative}.kwtm-toogle{text-align:center;position:absolute;top:19px;right:0}.kwtm-logo{background-position:0 0;width:200px;height:60px;position:absolute;top:7px;left:0;text-decoration:none;background:url(https://kenh14cdn.com/web_images/k14_logo2022.svg) no-repeat !important;background-size:auto 60px !important}.khw-bottom-header{background:#a70e1a;height:40px;position:relative}.kmli{float:left;position:relative;white-space:nowrap}.kmli>a{font-size:15px;color:#fff;padding:0 6px;display:block;text-decoration:none;line-height:40px;position:relative;font-family:SFD-Medium}.kmli:hover>a,.kmli.active>a,.kmli.home:hover{background:#980d17}.kmli.home{padding:0 12px}.kmli.home>a{width:12px;padding:0;background:url('https://kenh14cdn.com/web_images/sprite-k14.20.png') -494px 12px no-repeat;text-indent:-99999px;overflow:hidden}.kmli.expand-icon{padding:0 12px;position:inherit}.kmli.expand-icon>a{background:url('https://kenh14cdn.com/web_images/sprite-k14.20.png') -319px -104px no-repeat;width:20px;padding:0}.kmli:first-of-type>a{padding-left:0}.kbh-menu-list{display:block;height:40px;display:flex}.khw-adk14-wrapper{height:250px;background:#f1f1f1;padding:20px 0;width:100%;display:block;text-align:center}.kbw-submenu{width:100%;height:50px;border-bottom:1px solid #e7e7e7;background:#fff}.kbwsli{margin-right:20px;text-align:center;display:inline-block}.kbwsli a{display:block;font-family:SFD-SemiBold;font-size:15px;line-height:48px;color:#333;text-decoration:none;text-transform:uppercase}.kbwsli.active a,.kbwsli:hover a{border-bottom:4px solid #c81926}.kbw-content{margin-top:35px;display:block}.kenh14-detail .kbw-content{margin-top:0;position:relative}.kbwc-title{font-family:SFD-Bold;font-size:34px;line-height:38px;color:#222;padding-right:50px}.kbwc-meta{margin-top:15px}.kbwcm-author{color:#fb6c27;font-size:13px;font-family:SFD-Semibold;text-transform:uppercase}.kbwcm-source{font-size:13px;font-family:SFD-SemiBold;color:#777;text-transform:uppercase;margin-right:10px}.kbwcm-time{font-family:SFD-SemiBold;font-size:13px;color:#595959;position:relative;padding-left:16px}.kbwcm-time:before{position:absolute;content:'';background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -377px 0 no-repeat;width:15px;height:15px;left:0;top:1px;background-size:496px}.kbwc-socials{display:block;margin-top:20px;margin-bottom:12px;padding-right:30px}.kbwcs-fb,.kbwcs-comment{height:20px;display:block;line-height:20px;text-decoration:none;color:#fff;float:left;margin-right:6px;border-radius:2px;font-family:SFD-Bold;font-size:12px;overflow:hidden;position:relative}.kbwcs-fb{background:#4167b2;padding-left:20px}.kbwcs-fb:before{content:'';background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -227px -66px no-repeat;width:10px;height:16px;position:absolute;top:1px;left:7px;background-size:457px}.kbwcs-number{text-align:center;font-family:SFD-Bold;font-size:12px;padding:0 6px}.kenh14-detail .kbwcb-left{border-top:none}.kbwcb-left{border-top:1px solid #e4e4e4;position:relative;padding-top:25px}.kbwcb-left:before{background:url("https://kenh14cdn.com/web_images/grd-border.png") top right repeat-y;content:'';position:absolute;top:0;right:-20px;width:20px;height:100%;z-index:-1}.kbwcb-left-wrapper{display:block;padding-right:20px;position:relative}.klw-new-content{padding-right:30px;position:relative}.knc-sapo{font-family:"Times New Roman",Georgia,Serif;font-size:17px;line-height:22px;display:block;margin-bottom:20px;padding-top:15px;font-weight:bold;position:relative}.knc-relate-wrapper{display:block;padding:10px 0 7px;margin-top:12px;border-top:1px dotted #d9d9d9;border-bottom:1px dotted #d9d9d9}.krw-list{margin-left:20px}.krwli a{font-size:13px;line-height:16px;color:#383e54;text-decoration:none;position:relative}.krwli{margin-left:-9px;margin-bottom:6px}.krwli a:before{width:5px;height:5px;border-radius:100%;background:#fb6c27;content:'';position:absolute;top:4px;left:-12px}.knc-content>p,.knc-content{font-size:17px;line-height:25px;color:#222;font-family:"Times New Roman",Georgia,Serif;margin-bottom:15px;-webkit-font-smoothing:subpixel-antialiased}.knc-rate-link{padding-top:10px;margin-bottom:30px}.knc-rate-link .krl{background:transparent url("https://kenh14cdn.com/web_images/bg_linkfooter.jpg") no-repeat scroll 0 0;color:#004370;font-size:22px;font-weight:bold;padding-left:25px;font-family:'Times New Roman';text-decoration:none;line-height:26px}.kns-social{padding:20px 0;display:block;border-top:1px solid #e4e4e4;border-bottom:1px solid #e4e4e4;margin-bottom:20px}.klw-new-tags{margin-bottom:70px}.knt-list .kli{float:left;margin-right:10px}.knt-list .kli a{padding:8px 10px;display:block;font-family:Arial;font-size:14px;text-decoration:none;background:#ebebeb;color:#555;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;transition:background .3s,color .3s;-webkit-transition:background .3s,color .3s;-moz-transition:background .3s,color .3s}.klwnc-title{font-family:SFD-Bold;font-size:30px;margin-bottom:13px;color:#333;margin-left:35px;position:relative}.klwnc-title:before{position:absolute;top:6px;left:-30px;content:'';background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -289px -31px no-repeat;width:20px;height:20px}.kds-same-category{position:relative}.kds-same-category:before,.kds-hot-daily:before{content:'';background:url("https://kenh14cdn.com/web_images/bg-split.jpg") top left repeat-x;bottom:0;left:0;width:100%;height:10px;position:absolute}.kds-title{font-family:SFD-Heavy;font-size:28px;position:relative;margin-left:20px;display:block;text-transform:uppercase;margin-top:30px}.kds-title:before{width:6px;height:28px;position:absolute;top:0;left:-20px;content:'';background:#fb6c27}.kscli,.knswli{padding:25px 0;border-bottom:1px solid #ebebeb;list-style:none}.kscli:last-of-type{border-bottom:0;padding-bottom:40px}.kds-hot-daily{position:relative;overflow:hidden;padding-bottom:30px;background:#fff}.knswli-facebook,.knswli-comment,.knswli-view{margin:5px 0;font-size:12px;color:#888;position:relative}.knswli-object-wrapper{padding:20px 0 20px 0}.knswli.light .knswli-object-wrapper{background:#f5f5f5;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;border:1px solid #e6e6e6}.knswli.dark .knswli-object-wrapper{position:relative;background:#222;border-top:5px solid #fb6c27}.knswli-object-content{position:relative;overflow:hidden}.knswli.dark .knswli-object-wrapper:before{display:block;position:absolute;width:10%;bottom:0;right:0;height:100%;background:-moz-linear-gradient(left,rgba(255,255,255,0) 0%,#222 100%);background:-webkit-linear-gradient(left,rgba(255,255,255,0) 0%,#222 100%);background:linear-gradient(to right,rgba(255,255,255,0) 0%,#222 100%);filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#ffffff',endColorstr='#ab000000',GradientType=1);content:'';z-index:3}.knswli.dark.video .knswli-object-wrapper:before{display:none}.knswli .knswli-object-title{font-family:SFD-Heavy;font-size:28px;margin-left:60px;color:#fff;text-transform:uppercase;position:relative;margin-bottom:22px}.knswli.light .knswli-object-title{color:#222;margin-left:65px;margin-bottom:18px}.knswli.dark.dbl .icon{background-position:-352px 0;width:28px;height:28px;position:absolute;top:2px;left:-40px;display:block}.knswli.trend .icon{background-position:-213px 0;width:33px;height:22px;position:absolute;top:4px;left:-45px;display:block}.koli{width:260px;margin-left:20px;float:left;position:relative;background:#fff;overflow:hidden;border-radius:3px}.knswli.light .koli{border:1px solid #e6e6e6;box-shadow:0 1px 5px 0 rgba(0,0,0,.05)}.koli-ava{display:block;width:260px;height:165px;margin-bottom:5px;position:relative}.koli-ava img{width:100%;display:block}.koli-title{padding:0 12px 20px}.koli-title a{color:#333;font-family:SFD-Bold;font-size:18px;line-height:20px;text-decoration:none;display:block}.knswli.video .knswli-object-wrapper{padding:0;border:0;width:100% !important;margin-left:0 !important}.knswli-video-wrapper{padding:20px 0 30px}.knswli.video .knswli-object-title{font-family:SFD-Heavy;font-size:30px;margin-left:60px;margin-bottom:20px}.koli-stats{display:block;width:100%;height:35px;position:absolute;bottom:2px;left:0;background:rgba(0,0,0,.8)}.koli-stats span{margin-top:10px;position:relative;font-size:15px;color:#fff;line-height:35px;font-family:Arial;margin-left:40px}.koli-stats.view span:before{display:block;width:24px;height:24px;background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -245px -145px no-repeat;position:absolute;top:-4px;left:-30px;content:''}.koli-count{margin-right:5px}.swiper-button-next,.swiper-button-prev{position:absolute;top:52px;width:35px;height:95px;z-index:10;cursor:pointer}.swiper-button-next{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -115px -137px no-repeat;background-color:rgba(251,108,39,.9);border-top-left-radius:3px;-webkit-border-top-left-radius:3px;-moz-border-radius-topleft:3px;border-bottom-left-radius:3px;-webkit-border-bottom-left-radius:3px;-moz-border-radius-bottomleft:3px}.swiper-button-prev{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -70px -137px no-repeat;background-color:rgba(251,108,39,.9);border-top-right-radius:3px;-webkit-border-top-right-radius:3px;-moz-border-radius-topright:3px;border-bottom-right-radius:3px;-webkit-border-bottom-right-radius:3px;-moz-border-radius-bottomright:3px}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{right:0}.swiper-button-prev,.swiper-container-rtl .swiper-button-next{left:0}.trend .swiper-button-next,.trend .swiper-button-prev{top:40px}.swiper-pagination{position:relative;margin-top:15px;bottom:0 !important}.k14-fb-like{background:url(https://kenh14cdn.com/web_images/btn-like-fb-1.png) no-repeat;background-size:60px;display:block;width:60px;height:20px}.kbwc-socials{display:flex}#ulTinNoiBat_v2{overflow:initial}.disfex{display:flex;align-items:center}.VCSortableInPreviewMode{text-align:center;width:100%;margin-bottom:35px}.VCSortableInPreviewMode[type=Photo] img{margin-top:0;vertical-align:bottom;max-width:100%}.klwfnswn{width:250px;margin-right:20px}.klwfnswn-thumb{display:block;width:250px;height:156px;margin-bottom:8px;position:relative}.klwfnswn-thumb img{display:block;width:250px;height:156px}.klwfnswn-title a{font-family:SFD-Bold;font-size:17px;line-height:22px;color:#2d2d2d;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s;text-decoration:none}.knswli .knswli-object-wrapper{width:700px;float:left}.trend .knswli-object-wrapper{margin:0}.hidden{display:none!important}.k14h-sprite{background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat}.kfa-list-footer-menu{text-align:center;padding:10px 0;margin-bottom:30px}.footer-bottom .col-title,.footer-bottom .col-title a{font-size:14px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:8px;padding-left:0 !important;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu{display:inline}.kfa-list-footer-menu .kfa-footer-menu a{font-size:12px;font-weight:bold;color:#4a4a4a;text-decoration:none}.kfa-list-footer-menu .kfa-footer-menu:before{content:'|';color:#a1a1a1;font-size:12px;margin:0 2px}.kfa-list-footer-menu .kfa-footer-menu:first-child:before{display:none}.new-footer .top-footer{border:1px solid #595959;padding:15px 20px;background:#fff;margin-bottom:30px}.k14-footer-logo{display:block;width:60px;height:90px;background-position:-187px -90px;margin-right:20px;float:left}.top-footer .group-title{font-size:16px;font-weight:bold;line-height:20px;color:#555;text-transform:uppercase}.top-footer p{font-size:12px;line-height:18px;color:#595959}.user-response{float:left}.btn-faq-popup{display:inline-block;height:24px;padding:0 6px 0 28px;border:1px solid #e7e7e7;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-top:3px;font-size:11px;font-weight:bold;color:#333;line-height:24px;text-transform:uppercase;text-decoration:none;margin-right:12px;margin-bottom:5px;position:relative}.btn-faq-popup:before{display:block;width:15px;height:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-257px -119px;content:'';position:absolute;top:5px;left:6px}.faq-mail{display:inline-block;padding-left:20px;font-size:13px;color:#333;text-decoration:none;position:relative}.faq-mail:before{display:block;width:13px;height:9px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-282px -119px;content:'';position:absolute;top:2px;left:0}.footer-col{float:left;padding:0 25px;border-left:1px solid #e7e7e7;width:280px}.footer-bottom .footer-col:first-of-type{padding-left:0;border-left:none}.footer-bottom .footer-col:last-of-type{padding-right:0}.footer-bottom .footer-col:first-of-type,.footer-bottom .footer-col:last-of-type{width:310px}.footer-bottom .col-title{font-size:14px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:8px}.k14-address{margin-bottom:35px}.footer-bottom p{font-size:13px;line-height:18px;color:#595959}.btn-view-map{display:block;height:15px;padding-left:15px;font-size:10px;font-weight:bold;color:#595959;line-height:14px;text-transform:uppercase;text-decoration:none;margin-top:8px;position:relative}.btn-view-map:before{display:block;width:9px;height:13px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-257px -167px;content:'';position:absolute;top:0;left:0}.associate{margin-bottom:18px}.associate p{padding-left:20px}.pl0{padding-left:0 !important}.associate .phone-footer,.associate .admicro-phone-footer{position:relative}.associate .phone-footer:before{display:block;width:8px;height:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-366px -90px;content:'';position:absolute;top:0;left:0}.associate .associate-mail{display:block;padding-left:20px;height:15px;margin-top:5px;font-size:13px;line-height:15px;color:#595959;text-decoration:none;position:relative}.associate .associate-mail:before{width:13px;height:9px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-305px -119px;content:'';position:absolute;top:4px;left:0}.btn-associate-lightbox{display:inline-block;margin-top:15px;height:24px;padding:0 15px;background:#9d2306;font-size:12px;font-weight:bold;color:#fff;text-decoration:none;line-height:24px;text-transform:uppercase;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px}.vccorp-footer-logo{display:block;width:103px;height:23px;margin-bottom:15px;background-image:url('https://kenh14cdn.com/web_images/k14h-sprite_v1.png');background-repeat:no-repeat;background-position:-328px -119px}.footer-bottom .footer-col:last-of-type .col-title{margin-bottom:15px}.footer-bottom .footer-col:last-of-type p{margin-bottom:15px}.kfa-footer-menu{background:#e9e9e9}.footer-bottom .footer-col:last-of-type .col-title span{font-weight:normal;text-transform:none}.new-footer .top-footer{width:480px;height:98px;box-sizing:initial}.btn-messenger-lightbox{display:inline-flex;margin-top:15px;height:24px;padding:0 15px;background:#0050bd;font-size:12px;font-weight:bold;color:#fff;text-decoration:none;line-height:24px;text-transform:uppercase;border-radius:2px;-webkit-border-radius:2px;-moz-border-radius:2px;margin-right:10px}.btn-messenger-lightbox .messenger-icon{display:block;margin-right:5px;width:12px;flex-shrink:0;margin-top:2px}.light-box-bounder{position:fixed;overflow-y:hidden;overflow-x:hidden;width:100%;height:100%;-webkit-overflow-scrolling:touch;-webkit-transform:translateZ(0);top:0;left:0;right:0;bottom:0;background:rgba(100,100,100,.75);display:none;z-index:9999}.krw-list .icon-show-popup{display:none}.show-popup{position:relative}button{background:none;border:0;box-sizing:content-box;color:inherit;cursor:pointer;font:inherit;line-height:inherit;overflow:visible;vertical-align:inherit}.knswlic-welax .VCSortableInPreviewMode{margin-bottom:0}.fl{float:left}.toolbar-search-wrapper{height:25px;border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1)}.toolbar-search-wrapper #searchinput{height:25px;border:none;background-color:transparent;box-sizing:border-box;padding:0 6px;font-size:10px;color:#8a8a8a;width:154px;outline:none;float:left;line-height:25px}.t-search-submit-btn{display:block;height:25px;float:right;padding:4px 6px;box-sizing:border-box}.header-kinglive-status{padding:10px 0;height:50px}.knswli .knswli-object-title{font-size:24px}.knswli-object-wrapper{padding-top:15px}#searchinput:empty:not(:focus)::before{content:attr(data-placeholder)}.kenh14-toolbar-wrapper{background:#111;height:25px;position:relative;z-index:1}.k14ti{display:inline-block}.k14ti a{font-family:SFD-Semibold;font-size:12px;line-height:25px;color:#fff;text-transform:uppercase;text-decoration:none;color:#fff;display:block;padding:0 8px}.kbh-menu-list{margin-left:5px}.kmli-menu-expand-wrapper{background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.2);position:absolute;top:40px;left:0;z-index:9999;visibility:hidden;opacity:0;transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s}.list-other-cat-col{padding:20px 0 10px;border-bottom:1px solid #eaeaea}.occ{width:160px;float:left;margin-right:10px}.occ-name a{font-family:SFD-Semibold;font-size:16px;color:#333;text-decoration:none;display:block;margin-bottom:10px;padding-left:6px;border-left:3px solid #ff6610;height:12px;line-height:12px;background-color:transparent !important}.list-occs .occs{margin-bottom:10px}.list-occs .occs a{font-size:13px;color:#666;text-decoration:none;background-color:transparent !important}.kmew-topics-wrapper{padding:20px 0;border-bottom:1px solid #eaeaea}.kmewtw-label{height:20px;padding-left:26px;font-family:SFD-Semibold;font-size:20px;line-height:20px;color:#333;position:relative}.kmewtw-label:before{display:block;width:14px;height:20px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -384px -124px no-repeat;position:absolute;top:0;left:0;content:''}.kmewt{width:190px;height:40px;float:left;margin-right:20px;margin-top:20px}.kmewt a{display:block;width:190px;height:40px;position:relative;overflow:hidden;text-decoration:none;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.kmewt a img{display:block;width:100%;margin-left:0;margin-top:0;-webkit-filter:blur(6px);-moz-filter:blur(6px);filter:blur(6px)}.kmewt a span{padding:0 12px;height:40px;position:absolute;bottom:0;left:0;right:0;font-family:SFD-Medium;font-size:17px;line-height:40px;color:#fff;background:rgba(0,0,0,.2)}.kmew-other-links{padding:20px 0}.kmewol-group{margin-right:30px;float:left}.kmewolg-label,.kmewolg-label a{font-family:SFD-Semibold;font-size:15px;color:#333;text-decoration:none;background-color:transparent !important}.kmewolgi{display:inline;margin-left:10px}.kmewolgi a{font-size:13px;color:#666;text-decoration:none;background-color:transparent !important}.kmewolg-label,.list-kmewolgi{float:left}.khwth-trending-wrapper{height:30px;position:absolute;top:18px;left:230px;padding-left:30px}.khwth-trending-wrapper:before{display:block;width:19px;height:12px;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -388px -55px no-repeat;position:absolute;top:10px;left:0;content:''}.ksclirn-time{font-family:SFD-Medium;font-size:13px;color:#777}.list-k14-toolbar-items .k14ti.top-toolbar a{padding-left:20px;background-image:url(https://kenh14cdn.com/web_images/toolbar-topic-icon.png);background-position:left 6px center;background-repeat:no-repeat}.ksclivbd-title{height:28px;font-family:SFD-Medium;font-size:15px;line-height:28px;color:#555;margin-right:15px}.ksclivbd-form>li{float:left;margin-right:10px;height:28px}.ksclivbd-form>li:last-child{margin-right:0}.kds-same-category .kscli:last-of-type{padding-bottom:15px}.kds-same-category{padding-bottom:20px}.ksclivbdf-view{display:block;width:70px;height:26px;font-family:SFD-Bold;font-size:15px;line-height:24px;color:#fff;text-align:center;text-transform:uppercase;border:none;outline:none;background:#777;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px;transition:background .3s;-webkit-transition:background .3s;-moz-transition:background .3s;cursor:pointer}.kbwc-body{position:relative}.kmli.expand-icon{cursor:pointer;height:100%}.kmli.expand-icon a span.eiline{display:block;width:4px;height:4px;background:#fff;border-radius:100px;-webkit-border-radius:100px;-moz-border-radius:100px;visibility:visible;opacity:1;transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s;position:absolute;top:18px}.kmli.expand-icon a span.ei-line1{left:0}.kmli.expand-icon a span.ei-line2{left:8px}.kmli.expand-icon a span.ei-line3{right:0}.same-category-stream{width:1040px;background:#fff;padding-top:10px;position:relative}.same-category-stream:before{content:'';background:url("https://kenh14cdn.com/web_images/bg-split.jpg") top left repeat-x;top:0;left:0;width:100%;height:10px;position:absolute}.knc-content{position:relative}.btn-fb-send{background:url("https://kenh14cdn.com/web_images/sprite-k14.20.png") -285px -179px no-repeat;width:47px;height:20px;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.btn-mail{background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -341px -179px no-repeat;width:29px;height:20px;border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.occ.r1,.occ.r2{margin-bottom:20px}.klw-detail-stream,.knswli.dark.video{position:relative}.same-category-stream .kds-title,.kds-hot-daily .kds-title,.kds-new-stream-wrapper .kds-title{margin-top:20px}.same-category-stream .ksclirn-time{float:left}.mgr6{margin-right:6px}.khw-adk14-wrapper{height:auto;padding-top:15px;padding-bottom:15px}.kbwcb-left{z-index:0}.kbwcb-left-wrapper .post_embed{margin-bottom:20px}.knt-list .kli{margin-bottom:8px}.swiper-button-prev{left:-35px;*transition:all .3s;-webkit-transition:all .3s;-moz-transition:all .3s}.swiper-button-next,.swiper-container-rtl .swiper-button-prev{right:0}.clearfix:after{visibility:hidden;display:block;font-size:0;content:" ";clear:both;height:0}.kbws-list{margin:0 auto;width:1040px}.klw-new-tags{margin-bottom:30px !important}.kns-social{padding:12px 0 10px !important}#mingid_comments_content{position:relative}.koli-title a{font-size:17px !important;line-height:22px !important}.kbw-submenu{text-align:left !important}.koli:last-child{margin-right:20px}.kenh14-detail .kbwc-body .w300.mg0{padding-top:20px}.VCSortableInPreviewMode{margin-bottom:30px}.PhotoCMS_Caption,.VideoCMS_Caption{display:inline-block;background:#f2f2f2;padding:10px;text-align:left}.kenh14-wrapper{overflow:hidden}#liDungBoLo .knswli-object-wrapper{border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.knswli.dark .knswli-object-wrapper:before{border-radius:3px;-webkit-border-radius:3px;-moz-border-radius:3px}.mt-3{margin-top:3px}.klw-detail-stream{position:relative}.klw-new-comment .comment{position:relative;margin-right:20px}.clearboth{clear:both}.link-source-wrapper{width:auto;display:block;box-sizing:border-box;float:right;position:relative;padding-top:15px;z-index:99}.is-web{display:block}.kenh14-wrapper.size-m .khw-top-header .w1040,.kenh14-wrapper.size-m .kenh14-toolbar-wrapper .w1040{width:1040px !important}#admzone49{min-height:90px}.knswli.dark .knswli-object-wrapper{background-color:transparent}#liDungBoLo .knswli-object-wrapper,.k14-category.kenh14-tvshow .knswli.video .knswli-object-wrapper,.sport.knswli.video .knswli-object-wrapper,#liEMagazine .knswli-object-wrapper,#liPhotoStory .knswli-object-wrapper{background:#222;z-index:1}.k14-videoUpdate .k14-videoUpdate-wrapper{display:flex;justify-content:space-between}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left{width:320px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-left .content-video .VCSortableInPreviewMode[type="VideoStream"]{padding-top:125%;position:relative;margin-bottom:0}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right{width:360px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info{display:flex;flex-direction:column;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading{display:flex;align-items:center;margin-bottom:10px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-heading .ih-time{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#888}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content{display:flex;flex-direction:column;justify-content:space-between;height:100%}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top{display:flex;flex-direction:column}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-title{font-size:20px;line-height:24px;font-family:SFD-Bold;color:#333;margin-bottom:5px}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des{display:flex}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt{font-size:13px;line-height:150%;font-family:Arial;font-weight:400;color:#595959}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt .ictd-link{font-weight:700;color:#4d4d4d}.k14-videoUpdate .k14-videoUpdate-wrapper .videoUpdate-right .vr-content_info .info-content .ic-bottom{display:flex;flex-direction:column}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-left{width:500px;flex-shrink:0;margin-right:15px}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-left .content-video .VCSortableInPreviewMode[type=VideoStream]{padding-top:56.4%}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-bottom{display:none}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-top .ict-title{font-size:18px}.k14-videoUpdate .k14-videoUpdate-wrapper.horizonVid .videoUpdate-right .vr-content_info .info-content .ic-top .ict-des .ictd-txt{-webkit-line-clamp:5;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}#liNewsMostView.knswli{border-bottom:none;padding-bottom:0}.vccorp-footer-logo{background-image:none;background-position:0;width:100px;height:49px}.af-tts{width:324px}
    </style>
<script>
    var KeyAllowComment = 1;
    var commonCateId = '0';
    var commonNewsId = '215250611055629179';
    var apiBangXepHang = 'https://sport5s.cnnd.vn' + '/sport5-api-data.htm';
    if (!isLightHouse) {
        loadJsAsync('https://adminplayer.sohatv.vn/resource/init-script/playerInitScript.js', function () {});
        (runinit = window.runinit || []).push(function () {
            loadJsAsync('https://kenh14cdn.com/web_js/common-20190108v1.min.js', function () {});
        });
    }
</script><script type="text/javascript" async="" src="https://adminplayer.sohatv.vn/resource/init-script/playerInitScript.js"></script>
    <script>
        if (!isLightHouse) {
            loadJsAsync('https://kenh14cdn.com/web_js/videoInContent-20180315v1.min.js', function () { });
        }
    </script><script type="text/javascript" async="" src="https://kenh14cdn.com/web_js/videoInContent-20180315v1.min.js"></script>
<script>
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            loadJsAsync('https://kenh14cdn.com/web_js/top-menu-20170504v1.min.js', function () {
            });
        });
    }
</script>
                <!-- GOOGLE SEARCH STRUCTURED DATA FOR ARTICLE -->
<script type="application/ld+json">
{
    "@context": "http://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage":{
        "@type":"WebPage",
        "@id":"https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn"
    },
    "headline": "HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia",
    "description": "Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi",
    "image": {
        "@type": "ImageObject",
        "url": "https://kenh14cdn.com/zoom/700_438/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-27-0-430-645-crop-1749609312410554656149.webp",
        "width" : 700,
        "height" : 438
    },
    "datePublished": "2025-06-11T09:36:00+07:00",
            "dateModified": "2025-06-11T09:37:15+07:00",
            "author": {
        "@type": "Person",
        "name": "Hải Đăng"
    },
    "publisher": {
        "@type": "Organization",
        "name": "https://kenh14.vn",
        "logo": {
            "@type": "ImageObject",
           "url": "",
            "width": 70,
            "height": 70
        }
    }
}
</script>
<!-- GOOGLE BREADCRUMB STRUCTURED DATA -->
<script type="application/ld+json">
{
    "@context": "http://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "item": {
                "@id": "https://kenh14.vn",
                "name": "Trang chủ"
            }
        }
              ,{
        "@type": "ListItem",
        "position":2,
            "item": {
                "@id": "https://kenh14.vn/sport.chn",
                "name": "Sport"
            }
        }
    ]
}
</script>
<script type="application/ld+json">
        {
        "@context": "http://schema.org",
        "@type": "Organization",
        "name":"https://kenh14.vn",
        "url": "https://kenh14.vn",
         "logo": "https://kenh14cdn.com/web_images/k14_logo_new.png",
        "email": "mailto: marketing@kenh14.vn",
        "sameAs":[
                    ],
    "contactPoint": [{
        "@type": "ContactPoint",
        "telephone": "02473095555",
        "contactType": "customer service"
        }],
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "",
            "addressRegion": "Hà Nội",
            "addressCountry": "Việt Nam",
            "postalCode":"100000",
            "streetAddress": "Tầng 21, tòa nhà Center Building, Hapulico Complex, số 1 Nguyễn Huy Tưởng, p. Thanh Xuân Trung, quận Thanh Xuân"
            }
        }
</script>
<script type="text/javascript">
        var _ADM_Channel = '%2fsport%2fdetail%2f';
    </script>

        <style>
    .kmli.home {
        padding: 0 10px !important;
    }
    img {
        max-width: 100%;
    }
    img{height:auto}.mt-3{margin-top:3px}.knc-content *{box-sizing:border-box}.VCSortableInPreviewMode{margin:0 auto;text-align:center;width:100%;margin-bottom:30px !important}.VCSortableInPreviewMode{margin-bottom:30px}.knc-content{display:inline-block;width:100%}.knc-content *{box-sizing:border-box}.VCSortableInPreviewMode{margin:0 auto;text-align:center;width:100%;margin-bottom:22px;position:relative;z-index:1}.PhotoCMS_Caption,.VideoCMS_Caption{font-style:italic}.VCSortableInPreviewMode[type=Photo] img{margin-top:0;vertical-align:bottom;max-width:100%}.PhotoCMS_Caption p,.VideoCMS_Caption p{font:400 13.8px/18px "Arial";color:#666}.fl{float:left}.fr{float:right}.mg0{margin:0 auto}.mgt20{margin-top:20px}.animated{-webkit-animation-duration:.5s;-moz-animation-duration:.5s;-o-animation-duration:.5s;animation-duration:.5s;-webkit-animation-fill-mode:both;-moz-animation-fill-mode:both;-o-animation-fill-mode:both;animation-fill-mode:both}.react-relate{height:213px;overflow:hidden;-webkit-transition:height .5s;-moz-transition:height .5s;transition:height .5s;display:none}.react-relate.hiding-react-relate{height:0;display:block}.w700{width:700px}.PhotoCMS_Caption p,.VideoCMS_Caption p{margin-bottom:0 !important}.knt-list .kli a:before{content:'#'}.wfull{width:100%}.kbwcb-top{padding-bottom:20px}.klw-body-bottom{padding-top:0}.kenh14-wrapper{overflow:hidden}.kbw-content .kbwcb-left:before{display:none}.kbwcb-left-wrapper{position:relative}.kbwc-socials{height:24px;padding-right:0;margin-bottom:0}.knc-sapo{border-top:0;padding-top:5px;font-family:SFD-Bold;font-weight:normal;color:#111}.krwli a{color:#383e54}.knc-content p{font-size:17px;line-height:25px;color:#222;font-family:"Times New Roman",Georgia,Serif;margin-bottom:25px;-webkit-font-smoothing:subpixel-antialiased}.PhotoCMS_Caption,.VideoCMS_Caption,.Photo360EMagazineCMS_Caption{display:block;background:#f2f2f2;padding:10px;text-align:left;box-sizing:border-box}.PhotoCMS_Caption p,.VideoCMS_Caption p,.Photo360EMagazineCMS_Caption p{margin-bottom:0 !important}.PhotoCMS_Caption p,.VideoCMS_Caption p,.Photo360EMagazineCMS_Caption p{font:400 13.8px/18px "Arial";color:#666}.kbw-content .knc-relate-wrapper{margin-top:0;border-top:0;border-bottom:1px solid #efefef;margin-bottom:15px;padding:0 0 10px 0}.khw-adk14-wrapper{height:auto}.kenh14-wrapper.size-m .kbwcb-left-wrapper{padding-right:0}.kenh14-wrapper.size-m .kbwcb-left{padding-right:10px;box-sizing:border-box;width:710px}.kenh14-wrapper.size-m .kbwc-title{font-size:32px;line-height:36px;padding-right:0}.kenh14-wrapper.size-m .klw-new-content{padding-left:80px;padding-right:0}.kenh14-wrapper.size-m .knc-sapo{font-size:17px;line-height:22px}.kenh14-wrapper.size-m .knc-content p{font-size:17px;line-height:25px}.kenh14-wrapper.size-m .PhotoCMS_Caption p,.kenh14-wrapper.size-m .VideoCMS_Caption p{font-family:SFD-Medium;color:#666;font-size:14px;line-height:18px}.kenh14-wrapper.size-m .klw-new-content{position:relative}.kbw-content .knc-menu-nav{position:absolute;left:0;top:10px}.kenh14-wrapper.size-m .knc-rate-link .krl{font-size:23px;line-height:29px}.kmnw-content{width:50px;display:block;overflow:hidden}.kc-item{margin-bottom:10px;text-align:center}.kc-home .icon-kch{width:36px;height:36px;border-radius:50%;background-color:#fa6b24;position:relative;display:inline-block}.kc-facebook .icon-kcf{width:36px;height:36px;border-radius:50%;background-color:#3b4f87;position:relative;display:inline-block}.kc-home .icon-kch:before{background:url("https://kenh14cdn.com/web_images/icon-home.png") center center no-repeat;width:15px;height:17px;display:block;position:absolute;left:50%;margin-left:-7px;content:'';top:50%;margin-top:-9px}.kc-facebook .icon-kcf:before{background:url("https://kenh14cdn.com/web_images/icon-facebook-nav.png") center center no-repeat;width:8px;height:16px;display:block;position:absolute;left:50%;margin-left:-4px;content:'';top:50%;margin-top:-8px}.kenh14-detail .kbwc-body .w300.mg0{padding-top:30px}.kenh14-body-wrapper{background:#f0f1f5}.kbw-background{max-width:1200px;background:#fff;border:1px solid #e7e8ea;display:block;margin:0 auto}.kbw-submenu{border-bottom:1px solid #e7e8ea}.khw-top-header .w1040{width:1200px}.kbh-menu-list{display:flex;margin-left:-80px;float:left;height:40px}.kenh14-wrapper.size-m .kbw-background,.kenh14-wrapper.size-m .kenh14-toolbar-wrapper .w1040{width:1120px}.kenh14-wrapper.size-m .khw-top-header .w1040{width:1120px}.kenh14-wrapper.size-m .kbh-menu-list{display:flex;margin-left:-40px;float:left}.kenh14-wrapper .kmli.home{padding:0}.kmli>a{font-size:15px;color:#fff;padding:0 8px;display:block;text-decoration:none;line-height:40px;position:relative;font-family:SFD-Medium}.kmli.home>a{width:12px;padding:0;background:url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -494px 12px no-repeat;text-indent:-99999px;overflow:hidden}.kmli:first-of-type>a{padding-left:0}li.kbwsli.fr{margin-left:20px;margin-right:0}.kbwc-socials{padding-bottom:15px;border-bottom:1px dotted #d9d9d9}.VCSortableInPreviewMode{margin-bottom:30px}.knswa_border:before{border:1px solid rgba(0,0,0,.05);bottom:0;content:'';left:0;position:absolute;right:0;top:0;z-index:3}.kenh14-wrapper.size-m .klw-new-content{padding-right:40px}.VCSortableInPreviewMode{margin-bottom:25px}.kds-title{margin-left:15px;text-transform:uppercase;font-size:24px}.ksclivbd-title{height:28px;font-family:SFD-Medium;font-size:15px;line-height:25px;color:#555;margin-right:15px;text-transform:none}.same-category-stream{width:700px}.kds-title:before{width:5px;height:18px;position:absolute;top:3px;left:-16px;content:'';background:#fb6c27}.ksclivbdf-view{top:-4px;position:relative}.rowccm{display:flex;justify-content:space-between;margin-bottom:20px}.rowccm .tincungmucfocus{width:31.5%;padding-right:0}.show-popup{position:relative}.rowccm .tincungmucfocus:last-child{margin-right:0}.rowccm .tincungmucfocus img{width:100%;display:block;height:auto}.rowccm .tincungmucfocus .info{margin-top:5px}.rowccm .tincungmucfocus .info h4.ksclili-title{font-size:15px;color:#292929;line-height:20px;text-align:left;margin:8px 0;font-family:SFD-Medium;font-weight:normal}.rowccm .tincungmucfocus .info h4.ksclili-title a{text-decoration:none;color:#222;font:normal 15px/20px SFD-Bold}.rowccm .tincungmucfocus .info span.iconb-ccm{background:#9ca7b7;color:#fff !important;font:normal 12px Arial !important;padding:3px 5px;border-radius:5px;position:relative;top:-1px;margin-left:5px;display:inline-block}.tincungmucfocus .ksclirn-time{float:inherit}.kds-new-stream-wrapper{padding-top:10px}.kds-hot-daily{padding-top:5px}.khd-list{display:flex;justify-content:space-between}.knd-wrapperv2 ul li.first{width:66%}.knd-wrapperv2 ul li{width:31.7%}.knd-wrapperv2 ul li.first a.klwfnswn-thumb{display:block;margin-bottom:15px;padding-top:63.03%;position:relative;width:auto;height:0}.knd-wrapperv2 ul li.first .klwfnswn-title a{font:normal 26px/30px SFD-Bold;color:#222}.knd-wrapperv2 .klwfnswn-title a{font:normal 19px/24px SFD-Bold;color:#222}.knd-wrapperv2 ul li p.sapo{font:normal 14px/20px Arial;color:#777;margin-top:19px}.knd-wrapperv2 .klwfnswn-thumb{padding-top:131.36%;margin-bottom:0;width:auto;height:0}.knd-wrapperv2 .klwfnswn{margin-right:0}.knd-wrapperv2 .klwfnswn-thumb img{position:absolute;top:0;left:0;width:100%;height:100%}.knd-wrapperv2 ul li:last-child .klwfnswn-title a{display:block;padding:12px 15px 20px;background-image:linear-gradient(#ebebeb,#fff);font-family:SFD-Bold;font-size:19px;line-height:22px;color:#222;text-decoration:none;transition:color .3s;-webkit-transition:color .3s;-moz-transition:color .3s}.kds-same-category:before{display:none}#splitBox{width:1122px;height:20px;background:#f0f1f5;margin-left:-41px;border-top:1px solid #e7e8ea;border-bottom:1px solid #e7e8ea}.nbdetail{position:relative}.knswa_border{display:block;position:relative}.rowccm:last-child{margin-top:20px}#ulTinNoiBat_v2{overflow:initial}#popupLogin{display:none}a{text-decoration:none}
    .kc-comment{
        display: none !important;
    }
</style>
<script type="text/javascript">
    if (!isLightHouse) {
        loadCss('https://kenh14cdn.com/web_css/kenh14per-04032023v1.min.css');
        loadJsAsync('https://ovp.sohatv.vn/lib/initPlayer/OVPPlayerInitScript.js');
        loadJsAsync('https://adminplayer.sohatv.vn/resource/init-script/playerInitScript.js');
    }
</script><link rel="stylesheet" type="text/css" href="https://kenh14cdn.com/web_css/kenh14per-04032023v1.min.css" media="all"><script type="text/javascript" async="" src="https://ovp.sohatv.vn/lib/initPlayer/OVPPlayerInitScript.js"></script>


    <link rel="stylesheet" href="https://kenh14cdn.com/web_css/20240904/k14.detail-ims2.min.css?v55">



<style>
    .same-category-stream .kds-title > span{
        font-size: 24px !important;
    }
    [data-role=content] .VCSortableInPreviewMode[type=content]{
        text-align: left;
    }
    [data-role=content] th,[data-role=content] td {
        border-color: #999;
        border: 1px solid;
    }
    [data-role=content] .mceItemTable  th,[data-role=content]  .mceItemTable td {
        border: none;
    }
    [data-role=content] em, [data-role=content] i{
        font-style: italic;
    }
</style>
    <style>
    .link-source-wrapper{
        width: 100%!important;
    }
    .link-source-name { text-align: left; width: 100%; padding: 10px 15px; }
    .time-source-detail { float: right; color: #888888 !important; font-size: 12px; font-weight: 400; }
    span.btn-copy-link-source2 svg path { fill: #333333; }
    .link-source-name .btn-copy-link-source2 { margin-left: 12px !important; font-size: 12px; }
    span.btn-copy-link-source-1{margin-left: 10px}
</style>
        <style>
        .btn-messenger-lightbox:hover {
            background-color: #047bea;
        }

        .btn-messenger-lightbox {
            display: inline-flex;
            background: #0084ff;
            border-radius: 2px;
            -webkit-border-radius: 2px;
            -moz-border-radius: 2px;
            margin-right: 10px;
        }

        .btn-associate-lightbox {
            display: inline-block;
            background: #fa5d37;
            border-radius: 2px;
            -webkit-border-radius: 2px;
            -moz-border-radius: 2px;
        }

        .kfa-list-footer-menu .kfa-footer-menu a {
            font-size: 12px;
            font-weight: 700;
            color: #a1a1a1;
            text-decoration: none;
        }

        .knswli-facebook, .knswli-comment, .knswli-view {
            margin: 10px 0;
        }
        .brand-content .k14topic-logo img, .stream.brand-content .k14topic-logo{
            width: auto!important;
        }
        .kmli>a, .k14ti a{
            font-family: "SFD-Medium",Arial;
            font-weight: 400;
        }
        .kmli.home:hover a {
            background: url(https://kenh14cdn.com/web_images/sprite-k14.20.png) -494px 12px no-repeat !important;
        }
        #k14-main-menu-wrapper-sticky-wrapper.is-sticky .kmli.home>a {
            background: url(https://kenh14cdn.com/web_images/sprite-k14.20.png) top left no-repeat !important;
            background-size: 280px !important;
        }
        .itembigstory .knswli-time {
            top: 6px;
        }
        .verticalThumb.itembigstory .knswli-meta{
            display: flex;
            align-items: end;
            position: relative;
            gap: 5px;
        }
        .verticalThumb.itembigstory .knswli-time:before{
            display: none;
        }
        .img-resize {
            display: block;
            position: relative;
            height: max-content;
            padding-top: 0!important;
        }
        .img-resize:before {
            padding-bottom: 62.5%;
            content: "";
            display: block;
        }
        .img-resize img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            bottom: 0;
            margin: auto;
            background-size: cover;
            background-position: center;
            object-fit: cover;
        }
         .verticalThumb .img-resize:before {
            padding-bottom: 133.5%;
            content: "";
            display: block;
        }

    </style>
    <style>
    body {
        min-width: 1040px !important;
    }

    .kenh14-body-wrapper .adm-mainsection .kbw-background .kbw-content .wfull {
        width: 1040px !important;
    }

    .kenh14-body-wrapper .adm-mainsection .kbw-background .detail-container-full .wfull {
        width: auto !important;
    }

    @media(max-width: 1024px) {
        .knd-wrapperv2+div {
            right: -343px !important;
        }

        .kenh14-body-wrapper .adm-mainsection .kbw-background .kbw-content .kbwc-body {
            display: flex !important;
            justify-content: space-between;
            width: 1040px !important;
        }

        .adm-rightsection {
            order: 1;
        }
    }
</style>
    <script>
        var arfAsync = arfAsync || [];
        var admicroAD = admicroAD || {};
        admicroAD.unit = admicroAD.unit || [];
        if (pageSettings.allow3rd) {
            //adBlock Firefox
            loadJsAsync('https://static.amcdn.vn/tka/cdn.js');
            function callbackErArf() {
                window.arferrorload = true;
            }
            loadJsAsync('https://media1.admicro.vn/cms/Arf.min.js',"", callbackEr = callbackErArf);
        }
    </script><script type="text/javascript" async="" src="https://static.amcdn.vn/tka/cdn.js"></script><script type="text/javascript" async="" src="https://media1.admicro.vn/cms/Arf.min.js" onerror="function callbackErArf() {
                window.arferrorload = true;
            }"></script>
    <script>
        var arrAdmZone = [];
        function initArrAdmZone(from) {
            const zoneElements = document.querySelectorAll('zone[id]:not(.pushed),div[id^=admzone]:not(.pushed),div[id^=zone]:not(.pushed)');

            for (const zone of zoneElements) {
                const adsId = zone.getAttribute('id');
                arrAdmZone.push(adsId);
                zone.classList.add('pushed');
            }

            console.log('initArrAdmZone ' + from, arrAdmZone);
        }

        document.addEventListener("DOMContentLoaded", function () {
            initArrAdmZone("DOMContentLoaded");
        });

        (runinit = window.runinit || []).push(function () {
            $(document).ajaxComplete(function () {
                initArrAdmZone('document ajaxComplete');
            });
        });
    </script>
    <script>
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            loadJsAsync('https://static.amcdn.vn/tka/cdn.js');
        });

        (function () {
            var img = new Image();
            var pt = (document.location.protocol == "https:" ? "https:" : "http:");
            img.src = pt + '//lg1.logging.admicro.vn/ftest?url=' + encodeURIComponent(document.URL);
            var img1 = new Image();
            img1.src = pt + '//amcdn.vn/ftest?url=' + encodeURIComponent(document.URL);
        })();
    }
</script>
    <script async="">
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            loadJsAsync('https://media1.admicro.vn/core/adm_tracking.js');
        });
    }
</script>
    <!-- Admicro Tag Manager -->
<script>
    if (!isLightHouse) {
        (function (a, b, d, c, e) {
            a[c] = a[c] || [];
            a[c].push({ "atm.start": (new Date).getTime(), event: "atm.js" });
            a = b.getElementsByTagName(d)[0]; b = b.createElement(d); b.async = !0;
            b.src = "//deqik.com/tag/corejs/" + e + ".js"; a.parentNode.insertBefore(b, a)
        })(window, document, "script", "atmDataLayer", "ATMRDIWTH5LTO");
    }
</script>
<!-- End Admicro Tag Manager -->

<script>
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            $('#k14-main-menu-wrapper .kmli:not(.expand-icon) a').click(function () {
                var $this = $(this);
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Chọn chuyên mục',
                    eventAction: 'click',
                    eventLabel: $this.text()
                });
            });

            $('#k14-main-menu-wrapper .list-other-cat-col a').click(function () {
                var $this = $(this);
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Chọn chuyên mục',
                    eventAction: 'click',
                    eventLabel: $this.text()
                });
            });
        })
    }
</script>
<!-- Nhung trong Kenh14 -->
<script>
    if (!isLightHouse) {
        (function (w, c, d) {
            w['_admwbqAnalyticsObject'] = c;
            w[d] = w[d] || [];
            w[c] = w[c] || function () {
                (w[d] = w[d] || []).push(arguments);
            };
            w[c].t = 1 * new Date();
            var a = document.createElement("script");
            a.type = "text/javascript"; a.async = !0;
            a.src = "//static.trunkpkg.com/core/wbqevent.js";
            var b = document.getElementsByTagName("script")[0];
            b.parentNode.insertBefore(a, b);
        })(window, '_admwbq', '_admwbq_q');
    }
</script>
<script async="" data-ad-client="" src=""></script><script type="text/javascript" async="" src="https://static.mediacdn.vn/common/js/configsiteinfo.v1.min.js"></script><script type="text/javascript" async="" src="https://ms.mediacdn.vn/prod/quiz/sdk/dist/play.js"></script><script type="text/javascript" async="" src="https://kenh14cdn.com/web_js/20250122/kenh14.detail-ims2.min.js?v55"></script><script type="text/javascript" async="" src="//media1.admicro.vn/js_tvc/replayVideo_min.js"></script><script type="text/javascript" async="" src="//static.contineljs.com/js_boxapp/tagsponsorz_40402.js"></script><script type="text/javascript" async="" src="https://kenh14cdn.com/web_js/common-20190108v1.min.js"></script><script type="text/javascript" async="" src="https://kenh14cdn.com/web_js/20240730/kenh14.detail-common-ims2.min.js?v55"></script><style type="text/css">.fancybox-margin{margin-right:15px;}</style><style type="text/css">.gif-status { position: relative; overflow: hidden; } .gif-status .gift-progress { position: absolute; top: 0; left: 0; display: block; width: 0%; background: rgba(255, 255, 255, .2); color: transparent; }</style><script type="text/javascript" async="" src="https://kenh14cdn.com/web_js/top-menu-20170504v1.min.js"></script><style type="text/css">.gif-status { position: relative; overflow: hidden; } .gif-status .gift-progress { position: absolute; top: 0; left: 0; display: block; width: 0%; background: rgba(255, 255, 255, .2); color: transparent; }</style><script type="text/javascript" async="" src="https://static.amcdn.vn/tka/cdn.js"></script><script type="text/javascript" async="" src="https://media1.admicro.vn/core/adm_tracking.js"></script><style>.swal2-popup.swal2-toast{box-sizing:border-box;grid-column:1/4 !important;grid-row:1/4 !important;grid-template-columns:min-content auto min-content;padding:1em;overflow-y:hidden;background:#fff;box-shadow:0 0 1px rgba(0,0,0,.075),0 1px 2px rgba(0,0,0,.075),1px 2px 4px rgba(0,0,0,.075),1px 3px 8px rgba(0,0,0,.075),2px 4px 16px rgba(0,0,0,.075);pointer-events:all}.swal2-popup.swal2-toast>*{grid-column:2}.swal2-popup.swal2-toast .swal2-title{margin:.5em 1em;padding:0;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-loading{justify-content:center}.swal2-popup.swal2-toast .swal2-input{height:2em;margin:.5em;font-size:1em}.swal2-popup.swal2-toast .swal2-validation-message{font-size:1em}.swal2-popup.swal2-toast .swal2-footer{margin:.5em 0 0;padding:.5em 0 0;font-size:.8em}.swal2-popup.swal2-toast .swal2-close{grid-column:3/3;grid-row:1/99;align-self:center;width:.8em;height:.8em;margin:0;font-size:2em}.swal2-popup.swal2-toast .swal2-html-container{margin:.5em 1em;padding:0;overflow:initial;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-html-container:empty{padding:0}.swal2-popup.swal2-toast .swal2-loader{grid-column:1;grid-row:1/99;align-self:center;width:2em;height:2em;margin:.25em}.swal2-popup.swal2-toast .swal2-icon{grid-column:1;grid-row:1/99;align-self:center;width:2em;min-width:2em;height:2em;margin:0 .5em 0 0}.swal2-popup.swal2-toast .swal2-icon .swal2-icon-content{display:flex;align-items:center;font-size:1.8em;font-weight:bold}.swal2-popup.swal2-toast .swal2-icon.swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line]{top:.875em;width:1.375em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=left]{left:.3125em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=right]{right:.3125em}.swal2-popup.swal2-toast .swal2-actions{justify-content:flex-start;height:auto;margin:0;margin-top:.5em;padding:0 .5em}.swal2-popup.swal2-toast .swal2-styled{margin:.25em .5em;padding:.4em .6em;font-size:1em}.swal2-popup.swal2-toast .swal2-success{border-color:#a5dc86}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line]{position:absolute;width:1.6em;height:3em;border-radius:50%}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.8em;left:-0.5em;transform:rotate(-45deg);transform-origin:2em 2em;border-radius:4em 0 0 4em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.25em;left:.9375em;transform-origin:0 1.5em;border-radius:0 4em 4em 0}.swal2-popup.swal2-toast .swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-success .swal2-success-fix{top:0;left:.4375em;width:.4375em;height:2.6875em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line]{height:.3125em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=tip]{top:1.125em;left:.1875em;width:.75em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=long]{top:.9375em;right:.1875em;width:1.375em}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-toast-animate-success-line-tip .75s}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-toast-animate-success-line-long .75s}.swal2-popup.swal2-toast.swal2-show{animation:swal2-toast-show .5s}.swal2-popup.swal2-toast.swal2-hide{animation:swal2-toast-hide .1s forwards}div:where(.swal2-container){display:grid;position:fixed;z-index:1060;inset:0;box-sizing:border-box;grid-template-areas:"top-start     top            top-end" "center-start  center         center-end" "bottom-start  bottom-center  bottom-end";grid-template-rows:minmax(min-content, auto) minmax(min-content, auto) minmax(min-content, auto);height:100%;padding:.625em;overflow-x:hidden;transition:background-color .1s;-webkit-overflow-scrolling:touch}div:where(.swal2-container).swal2-backdrop-show,div:where(.swal2-container).swal2-noanimation{background:rgba(0,0,0,.4)}div:where(.swal2-container).swal2-backdrop-hide{background:rgba(0,0,0,0) !important}div:where(.swal2-container).swal2-top-start,div:where(.swal2-container).swal2-center-start,div:where(.swal2-container).swal2-bottom-start{grid-template-columns:minmax(0, 1fr) auto auto}div:where(.swal2-container).swal2-top,div:where(.swal2-container).swal2-center,div:where(.swal2-container).swal2-bottom{grid-template-columns:auto minmax(0, 1fr) auto}div:where(.swal2-container).swal2-top-end,div:where(.swal2-container).swal2-center-end,div:where(.swal2-container).swal2-bottom-end{grid-template-columns:auto auto minmax(0, 1fr)}div:where(.swal2-container).swal2-top-start>.swal2-popup{align-self:start}div:where(.swal2-container).swal2-top>.swal2-popup{grid-column:2;place-self:start center}div:where(.swal2-container).swal2-top-end>.swal2-popup,div:where(.swal2-container).swal2-top-right>.swal2-popup{grid-column:3;place-self:start end}div:where(.swal2-container).swal2-center-start>.swal2-popup,div:where(.swal2-container).swal2-center-left>.swal2-popup{grid-row:2;align-self:center}div:where(.swal2-container).swal2-center>.swal2-popup{grid-column:2;grid-row:2;place-self:center center}div:where(.swal2-container).swal2-center-end>.swal2-popup,div:where(.swal2-container).swal2-center-right>.swal2-popup{grid-column:3;grid-row:2;place-self:center end}div:where(.swal2-container).swal2-bottom-start>.swal2-popup,div:where(.swal2-container).swal2-bottom-left>.swal2-popup{grid-column:1;grid-row:3;align-self:end}div:where(.swal2-container).swal2-bottom>.swal2-popup{grid-column:2;grid-row:3;place-self:end center}div:where(.swal2-container).swal2-bottom-end>.swal2-popup,div:where(.swal2-container).swal2-bottom-right>.swal2-popup{grid-column:3;grid-row:3;place-self:end end}div:where(.swal2-container).swal2-grow-row>.swal2-popup,div:where(.swal2-container).swal2-grow-fullscreen>.swal2-popup{grid-column:1/4;width:100%}div:where(.swal2-container).swal2-grow-column>.swal2-popup,div:where(.swal2-container).swal2-grow-fullscreen>.swal2-popup{grid-row:1/4;align-self:stretch}div:where(.swal2-container).swal2-no-transition{transition:none !important}div:where(.swal2-container) div:where(.swal2-popup){display:none;position:relative;box-sizing:border-box;grid-template-columns:minmax(0, 100%);width:32em;max-width:100%;padding:0 0 1.25em;border:none;border-radius:5px;background:#fff;color:#545454;font-family:inherit;font-size:1rem}div:where(.swal2-container) div:where(.swal2-popup):focus{outline:none}div:where(.swal2-container) div:where(.swal2-popup).swal2-loading{overflow-y:hidden}div:where(.swal2-container) h2:where(.swal2-title){position:relative;max-width:100%;margin:0;padding:.8em 1em 0;color:inherit;font-size:1.875em;font-weight:600;text-align:center;text-transform:none;word-wrap:break-word}div:where(.swal2-container) div:where(.swal2-actions){display:flex;z-index:1;box-sizing:border-box;flex-wrap:wrap;align-items:center;justify-content:center;width:auto;margin:1.25em auto 0;padding:0}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled[disabled]{opacity:.4}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled:hover{background-image:linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))}div:where(.swal2-container) div:where(.swal2-actions):not(.swal2-loading) .swal2-styled:active{background-image:linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))}div:where(.swal2-container) div:where(.swal2-loader){display:none;align-items:center;justify-content:center;width:2.2em;height:2.2em;margin:0 1.875em;animation:swal2-rotate-loading 1.5s linear 0s infinite normal;border-width:.25em;border-style:solid;border-radius:100%;border-color:#2778c4 rgba(0,0,0,0) #2778c4 rgba(0,0,0,0)}div:where(.swal2-container) button:where(.swal2-styled){margin:.3125em;padding:.625em 1.1em;transition:box-shadow .1s;box-shadow:0 0 0 3px rgba(0,0,0,0);font-weight:500}div:where(.swal2-container) button:where(.swal2-styled):not([disabled]){cursor:pointer}div:where(.swal2-container) button:where(.swal2-styled).swal2-confirm{border:0;border-radius:.25em;background:initial;background-color:#7066e0;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-confirm:focus{box-shadow:0 0 0 3px rgba(112,102,224,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-deny{border:0;border-radius:.25em;background:initial;background-color:#dc3741;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-deny:focus{box-shadow:0 0 0 3px rgba(220,55,65,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-cancel{border:0;border-radius:.25em;background:initial;background-color:#6e7881;color:#fff;font-size:1em}div:where(.swal2-container) button:where(.swal2-styled).swal2-cancel:focus{box-shadow:0 0 0 3px rgba(110,120,129,.5)}div:where(.swal2-container) button:where(.swal2-styled).swal2-default-outline:focus{box-shadow:0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) button:where(.swal2-styled):focus{outline:none}div:where(.swal2-container) button:where(.swal2-styled)::-moz-focus-inner{border:0}div:where(.swal2-container) div:where(.swal2-footer){margin:1em 0 0;padding:1em 1em 0;border-top:1px solid #eee;color:inherit;font-size:1em;text-align:center}div:where(.swal2-container) .swal2-timer-progress-bar-container{position:absolute;right:0;bottom:0;left:0;grid-column:auto !important;overflow:hidden;border-bottom-right-radius:5px;border-bottom-left-radius:5px}div:where(.swal2-container) div:where(.swal2-timer-progress-bar){width:100%;height:.25em;background:rgba(0,0,0,.2)}div:where(.swal2-container) img:where(.swal2-image){max-width:100%;margin:2em auto 1em}div:where(.swal2-container) button:where(.swal2-close){z-index:2;align-items:center;justify-content:center;width:1.2em;height:1.2em;margin-top:0;margin-right:0;margin-bottom:-1.2em;padding:0;overflow:hidden;transition:color .1s,box-shadow .1s;border:none;border-radius:5px;background:rgba(0,0,0,0);color:#ccc;font-family:monospace;font-size:2.5em;cursor:pointer;justify-self:end}div:where(.swal2-container) button:where(.swal2-close):hover{transform:none;background:rgba(0,0,0,0);color:#f27474}div:where(.swal2-container) button:where(.swal2-close):focus{outline:none;box-shadow:inset 0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) button:where(.swal2-close)::-moz-focus-inner{border:0}div:where(.swal2-container) .swal2-html-container{z-index:1;justify-content:center;margin:1em 1.6em .3em;padding:0;overflow:auto;color:inherit;font-size:1.125em;font-weight:normal;line-height:normal;text-align:center;word-wrap:break-word;word-break:break-word}div:where(.swal2-container) input:where(.swal2-input),div:where(.swal2-container) input:where(.swal2-file),div:where(.swal2-container) textarea:where(.swal2-textarea),div:where(.swal2-container) select:where(.swal2-select),div:where(.swal2-container) div:where(.swal2-radio),div:where(.swal2-container) label:where(.swal2-checkbox){margin:1em 2em 3px}div:where(.swal2-container) input:where(.swal2-input),div:where(.swal2-container) input:where(.swal2-file),div:where(.swal2-container) textarea:where(.swal2-textarea){box-sizing:border-box;width:auto;transition:border-color .1s,box-shadow .1s;border:1px solid #d9d9d9;border-radius:.1875em;background:rgba(0,0,0,0);box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(0,0,0,0);color:inherit;font-size:1.125em}div:where(.swal2-container) input:where(.swal2-input).swal2-inputerror,div:where(.swal2-container) input:where(.swal2-file).swal2-inputerror,div:where(.swal2-container) textarea:where(.swal2-textarea).swal2-inputerror{border-color:#f27474 !important;box-shadow:0 0 2px #f27474 !important}div:where(.swal2-container) input:where(.swal2-input):focus,div:where(.swal2-container) input:where(.swal2-file):focus,div:where(.swal2-container) textarea:where(.swal2-textarea):focus{border:1px solid #b4dbed;outline:none;box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(100,150,200,.5)}div:where(.swal2-container) input:where(.swal2-input)::placeholder,div:where(.swal2-container) input:where(.swal2-file)::placeholder,div:where(.swal2-container) textarea:where(.swal2-textarea)::placeholder{color:#ccc}div:where(.swal2-container) .swal2-range{margin:1em 2em 3px;background:#fff}div:where(.swal2-container) .swal2-range input{width:80%}div:where(.swal2-container) .swal2-range output{width:20%;color:inherit;font-weight:600;text-align:center}div:where(.swal2-container) .swal2-range input,div:where(.swal2-container) .swal2-range output{height:2.625em;padding:0;font-size:1.125em;line-height:2.625em}div:where(.swal2-container) .swal2-input{height:2.625em;padding:0 .75em}div:where(.swal2-container) .swal2-file{width:75%;margin-right:auto;margin-left:auto;background:rgba(0,0,0,0);font-size:1.125em}div:where(.swal2-container) .swal2-textarea{height:6.75em;padding:.75em}div:where(.swal2-container) .swal2-select{min-width:50%;max-width:100%;padding:.375em .625em;background:rgba(0,0,0,0);color:inherit;font-size:1.125em}div:where(.swal2-container) .swal2-radio,div:where(.swal2-container) .swal2-checkbox{align-items:center;justify-content:center;background:#fff;color:inherit}div:where(.swal2-container) .swal2-radio label,div:where(.swal2-container) .swal2-checkbox label{margin:0 .6em;font-size:1.125em}div:where(.swal2-container) .swal2-radio input,div:where(.swal2-container) .swal2-checkbox input{flex-shrink:0;margin:0 .4em}div:where(.swal2-container) label:where(.swal2-input-label){display:flex;justify-content:center;margin:1em auto 0}div:where(.swal2-container) div:where(.swal2-validation-message){align-items:center;justify-content:center;margin:1em 0 0;padding:.625em;overflow:hidden;background:#f0f0f0;color:#666;font-size:1em;font-weight:300}div:where(.swal2-container) div:where(.swal2-validation-message)::before{content:"!";display:inline-block;width:1.5em;min-width:1.5em;height:1.5em;margin:0 .625em;border-radius:50%;background-color:#f27474;color:#fff;font-weight:600;line-height:1.5em;text-align:center}div:where(.swal2-container) .swal2-progress-steps{flex-wrap:wrap;align-items:center;max-width:100%;margin:1.25em auto;padding:0;background:rgba(0,0,0,0);font-weight:600}div:where(.swal2-container) .swal2-progress-steps li{display:inline-block;position:relative}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step{z-index:20;flex-shrink:0;width:2em;height:2em;border-radius:2em;background:#2778c4;color:#fff;line-height:2em;text-align:center}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step{background:#2778c4}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step{background:#add8e6;color:#fff}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step-line{background:#add8e6}div:where(.swal2-container) .swal2-progress-steps .swal2-progress-step-line{z-index:10;flex-shrink:0;width:2.5em;height:.4em;margin:0 -1px;background:#2778c4}div:where(.swal2-icon){position:relative;box-sizing:content-box;justify-content:center;width:5em;height:5em;margin:2.5em auto .6em;border:0.25em solid rgba(0,0,0,0);border-radius:50%;border-color:#000;font-family:inherit;line-height:5em;cursor:default;user-select:none}div:where(.swal2-icon) .swal2-icon-content{display:flex;align-items:center;font-size:3.75em}div:where(.swal2-icon).swal2-error{border-color:#f27474;color:#f27474}div:where(.swal2-icon).swal2-error .swal2-x-mark{position:relative;flex-grow:1}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line]{display:block;position:absolute;top:2.3125em;width:2.9375em;height:.3125em;border-radius:.125em;background-color:#f27474}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line][class$=left]{left:1.0625em;transform:rotate(45deg)}div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line][class$=right]{right:1em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-error.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-error.swal2-icon-show .swal2-x-mark{animation:swal2-animate-error-x-mark .5s}div:where(.swal2-icon).swal2-warning{border-color:#facea8;color:#f8bb86}div:where(.swal2-icon).swal2-warning.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-warning.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .5s}div:where(.swal2-icon).swal2-info{border-color:#9de0f6;color:#3fc3ee}div:where(.swal2-icon).swal2-info.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-info.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .8s}div:where(.swal2-icon).swal2-question{border-color:#c9dae1;color:#87adbd}div:where(.swal2-icon).swal2-question.swal2-icon-show{animation:swal2-animate-error-icon .5s}div:where(.swal2-icon).swal2-question.swal2-icon-show .swal2-icon-content{animation:swal2-animate-question-mark .8s}div:where(.swal2-icon).swal2-success{border-color:#a5dc86;color:#a5dc86}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line]{position:absolute;width:3.75em;height:7.5em;border-radius:50%}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.4375em;left:-2.0635em;transform:rotate(-45deg);transform-origin:3.75em 3.75em;border-radius:7.5em 0 0 7.5em}div:where(.swal2-icon).swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.6875em;left:1.875em;transform:rotate(-45deg);transform-origin:0 3.75em;border-radius:0 7.5em 7.5em 0}div:where(.swal2-icon).swal2-success .swal2-success-ring{position:absolute;z-index:2;top:-0.25em;left:-0.25em;box-sizing:content-box;width:100%;height:100%;border:.25em solid rgba(165,220,134,.3);border-radius:50%}div:where(.swal2-icon).swal2-success .swal2-success-fix{position:absolute;z-index:1;top:.5em;left:1.625em;width:.4375em;height:5.625em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-success [class^=swal2-success-line]{display:block;position:absolute;z-index:2;height:.3125em;border-radius:.125em;background-color:#a5dc86}div:where(.swal2-icon).swal2-success [class^=swal2-success-line][class$=tip]{top:2.875em;left:.8125em;width:1.5625em;transform:rotate(45deg)}div:where(.swal2-icon).swal2-success [class^=swal2-success-line][class$=long]{top:2.375em;right:.5em;width:2.9375em;transform:rotate(-45deg)}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-animate-success-line-tip .75s}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-animate-success-line-long .75s}div:where(.swal2-icon).swal2-success.swal2-icon-show .swal2-success-circular-line-right{animation:swal2-rotate-success-circular-line 4.25s ease-in}[class^=swal2]{-webkit-tap-highlight-color:rgba(0,0,0,0)}.swal2-show{animation:swal2-show .3s}.swal2-hide{animation:swal2-hide .15s forwards}.swal2-noanimation{transition:none}.swal2-scrollbar-measure{position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll}.swal2-rtl .swal2-close{margin-right:initial;margin-left:0}.swal2-rtl .swal2-timer-progress-bar{right:0;left:auto}@keyframes swal2-toast-show{0%{transform:translateY(-0.625em) rotateZ(2deg)}33%{transform:translateY(0) rotateZ(-2deg)}66%{transform:translateY(0.3125em) rotateZ(2deg)}100%{transform:translateY(0) rotateZ(0deg)}}@keyframes swal2-toast-hide{100%{transform:rotateZ(1deg);opacity:0}}@keyframes swal2-toast-animate-success-line-tip{0%{top:.5625em;left:.0625em;width:0}54%{top:.125em;left:.125em;width:0}70%{top:.625em;left:-0.25em;width:1.625em}84%{top:1.0625em;left:.75em;width:.5em}100%{top:1.125em;left:.1875em;width:.75em}}@keyframes swal2-toast-animate-success-line-long{0%{top:1.625em;right:1.375em;width:0}65%{top:1.25em;right:.9375em;width:0}84%{top:.9375em;right:0;width:1.125em}100%{top:.9375em;right:.1875em;width:1.375em}}@keyframes swal2-show{0%{transform:scale(0.7)}45%{transform:scale(1.05)}80%{transform:scale(0.95)}100%{transform:scale(1)}}@keyframes swal2-hide{0%{transform:scale(1);opacity:1}100%{transform:scale(0.5);opacity:0}}@keyframes swal2-animate-success-line-tip{0%{top:1.1875em;left:.0625em;width:0}54%{top:1.0625em;left:.125em;width:0}70%{top:2.1875em;left:-0.375em;width:3.125em}84%{top:3em;left:1.3125em;width:1.0625em}100%{top:2.8125em;left:.8125em;width:1.5625em}}@keyframes swal2-animate-success-line-long{0%{top:3.375em;right:2.875em;width:0}65%{top:3.375em;right:2.875em;width:0}84%{top:2.1875em;right:0;width:3.4375em}100%{top:2.375em;right:.5em;width:2.9375em}}@keyframes swal2-rotate-success-circular-line{0%{transform:rotate(-45deg)}5%{transform:rotate(-45deg)}12%{transform:rotate(-405deg)}100%{transform:rotate(-405deg)}}@keyframes swal2-animate-error-x-mark{0%{margin-top:1.625em;transform:scale(0.4);opacity:0}50%{margin-top:1.625em;transform:scale(0.4);opacity:0}80%{margin-top:-0.375em;transform:scale(1.15)}100%{margin-top:0;transform:scale(1);opacity:1}}@keyframes swal2-animate-error-icon{0%{transform:rotateX(100deg);opacity:0}100%{transform:rotateX(0deg);opacity:1}}@keyframes swal2-rotate-loading{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes swal2-animate-question-mark{0%{transform:rotateY(-360deg)}100%{transform:rotateY(0)}}@keyframes swal2-animate-i-mark{0%{transform:rotateZ(45deg);opacity:0}25%{transform:rotateZ(-25deg);opacity:.4}50%{transform:rotateZ(15deg);opacity:.8}75%{transform:rotateZ(-5deg);opacity:1}100%{transform:rotateX(0);opacity:1}}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow:hidden}body.swal2-height-auto{height:auto !important}body.swal2-no-backdrop .swal2-container{background-color:rgba(0,0,0,0) !important;pointer-events:none}body.swal2-no-backdrop .swal2-container .swal2-popup{pointer-events:all}body.swal2-no-backdrop .swal2-container .swal2-modal{box-shadow:0 0 10px rgba(0,0,0,.4)}@media print{body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow-y:scroll !important}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown)>[aria-hidden=true]{display:none}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown) .swal2-container{position:static !important}}body.swal2-toast-shown .swal2-container{box-sizing:border-box;width:360px;max-width:100%;background-color:rgba(0,0,0,0);pointer-events:none}body.swal2-toast-shown .swal2-container.swal2-top{inset:0 auto auto 50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-top-end,body.swal2-toast-shown .swal2-container.swal2-top-right{inset:0 0 auto auto}body.swal2-toast-shown .swal2-container.swal2-top-start,body.swal2-toast-shown .swal2-container.swal2-top-left{inset:0 auto auto 0}body.swal2-toast-shown .swal2-container.swal2-center-start,body.swal2-toast-shown .swal2-container.swal2-center-left{inset:50% auto auto 0;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-center{inset:50% auto auto 50%;transform:translate(-50%, -50%)}body.swal2-toast-shown .swal2-container.swal2-center-end,body.swal2-toast-shown .swal2-container.swal2-center-right{inset:50% 0 auto auto;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-start,body.swal2-toast-shown .swal2-container.swal2-bottom-left{inset:auto auto 0 0}body.swal2-toast-shown .swal2-container.swal2-bottom{inset:auto auto 0 50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-end,body.swal2-toast-shown .swal2-container.swal2-bottom-right{inset:auto 0 0 auto}</style></head>
<body>
<div id="admzone490" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone490') }) : admicroAD.show('admzone490');
        }
    </script>

<script type="text/javascript">
        if (!isLightHouse) {
            (function () { var a = document.createElement("script"); a.async = !0; a.type = "text/javascript"; a.onerror = function () { window.admerrorload = true; }; a.src = ( pageSettings.allow3rd) ? "https://media1.admicro.vn/k14/admcore.js" : "https://media1.admicro.vn/core/admcore.js"; var b = document.getElementsByTagName("script")[0]; b.parentNode.insertBefore(a, b) })();

            (function () {
                function d(b, c, e) { var a = document.createElement("script"); a.type = "text/javascript"; a.async = !0; a.src = b; 2 <= arguments.length && (a.onload = c, a.onreadystatechange = function () { 4 != a.readyState && "complete" != a.readyState || c() }); a.onerror = function () { if ("undefined" != typeof e) try { e() } catch (g) { } }; document.getElementsByTagName("head")[0].appendChild(a) } function f() {
                    if ("undefined" == typeof window.ADMStorageFileCDN) setTimeout(function () { f() }, 500); else if ("undefined" != typeof window.ADMStorageFileCDN.corejs &&
                        "undefined" != typeof window.ADMStorageFileCDN.chkCorejs && 0 == window.ADMStorageFileCDN.chkCorejs) if (window.ADMStorageFileCDN.chkCorejs = !0, "string" == typeof window.ADMStorageFileCDN.corejs) d(window.ADMStorageFileCDN.corejs); else if ("undefined" != typeof window.ADMStorageFileCDN.corejs) for (var b = 0, c = window.ADMStorageFileCDN.corejs.length; b < c; b++)d(window.ADMStorageFileCDN.corejs[b])
                } f()
            })();

            (function (w, d, s, l, i) {
                w[l] = w[l] || []; w[l].push({
                    'gtm.start':
                        new Date().getTime(), event: 'gtm.js'
                }); var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dataLayer', 'GTM-M5B7X8N');

        }
    </script>
    <script type="text/javascript">
                var tagparam = ["hlv-kim-sang-sik","tuyen-viet-nam"];
                if (!isLightHouse) {
            if (typeof tagparam != 'undefined') {
                if (tagparam.indexOf('house-n-home') >= 0) {
                    window['admicroAnalyticsObject'] = 'admicro_analytics';
                    window['admicro_analytics'] = window['admicro_analytics'] || function () {
                        (window['admicro_analytics_q'] = window['admicro_analytics_q'] || []).push(arguments);
                    };
                    window['admicro_analytics'].t = 1 * new Date();
                    var a = document.createElement("script");
                    a.type = "text/javascript";
                    a.async = !0;
                    a.src = "//static.amcdn.vn/core/analytics.js";
                    var b = document.getElementsByTagName("script")[0];
                    b.parentNode.insertBefore(a, b);

                    window.admicro_analytics_q = window.admicro_analytics_q || [];
                    window.admicro_analytics_q.push({
                        event: "pageviews",
                        domain: 'housenhome.com.vn',
                        id: 6961
                    });
                }
            }
        }
    </script>
<div id="admWrapsite">
    <div id="admzone13602" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone13602') }) : admicroAD.show('admzone13602');
        }
    </script>

    <div class="kenh14-wrapper kenh14-detail size-m ">
        <div class="kenh14-toolbar-wrapper">
    <div class="w1040">
        <ul class="list-k14-toolbar-items fl">
            <li class="k14ti top-toolbar">
                <a href="/nhom-chu-de/emagazine.chn" title="Magazine">eMagazine</a>
            </li>
            <li class="k14ti top-toolbar">
                <a href="/nhom-chu-de/genz-area.chn" title="Genz Area">Genz Area</a>
            </li>
            <li class="k14ti top-toolbar">
                <a href="/xanh-chua-check.html" title="XANH chưa - check!!!">XANH chưa - check!!!</a>
            </li>
            <li class="k14ti top-toolbar">
                <a href="https://video.kenh14.vn/showlive.chn" target="_blank" rel="nofollow" title="Kenh14 showlive">ShowLive</a>
            </li>
            
        </ul>
        <div class="toolbar-search-wrapper fr">
            <p id="searchinput" contenteditable="true" onkeypress="return BBEnterPressSearch(event)" onfocus="SearchOnFocusHome(this)" data-placeholder="Tìm kiếm..."></p>
            <a href="javascript:;" title="tìm kiếm" rel="nofollow" class="t-search-submit-btn search">
                <span class="t-search-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M12.000,10.909 C12.000,11.999 10.909,11.999 10.909,11.999 L7.788,8.879 C6.979,9.467 5.986,9.818 4.909,9.818 C2.198,9.818 -0.000,7.620 -0.000,4.909 C-0.000,2.197 2.198,-0.000 4.909,-0.000 C7.620,-0.000 9.818,2.197 9.818,4.909 C9.818,5.986 9.467,6.978 8.879,7.788 L12.000,10.909 ZM4.909,1.091 C2.800,1.091 1.091,2.800 1.091,4.909 C1.091,7.017 2.800,8.727 4.909,8.727 C7.017,8.727 8.727,7.017 8.727,4.909 C8.727,2.800 7.017,1.091 4.909,1.091 Z" fill="#fff"></path>
                    </svg>
                </span>
            </a>
        </div>
    </div>
</div>


    <div class="kenh14-header-wrapper">
        <!-- header -->
        <div class="khw-top-header">
    <div class="w1040">
                    <div class="logo fl">
                <a href="/" title="Tin tức, giải trí, xã hội" class="sprite kwtm-logo">
                </a>
            </div>

                    
        <div class="khwth-trending-wrapper">
            <ul class="list-khwtht clearfix" id="insert-tag-trendding">
            <div data-cd-key="siteid215:objectembedbox:zoneid0typeid1">
                    <li class="khwtht">
                <a href="/g-dragon-bieu-dien-tai-svd-my-dinh.html" title="G-Dragon biểu diễn tại SVĐ Mỹ Đình">G-Dragon biểu diễn tại SVĐ Mỹ Đình</a>
            </li>
                    <li class="khwtht">
                <a href="/dien-vien-ngan-hoa-bi-suy-than-giai-doan-cuoi.html" title="Diễn viên Ngân Hòa bị suy thận giai đoạn cuối">Diễn viên Ngân Hòa bị suy thận giai đoạn cuối</a>
            </li>
            </div>
<!--u: 11/06/2025 14:08:23 --></ul>
        </div>
        
        <!-- End .khwth-trending-wrapper -->

        <div class="header-kinglive-status hidden fr">
            <a href="#" class="kinglive-btn" target="_blank" rel="nofollow">
                <span class="kinglive-video-preview">
                    <span class="kinglive-vp-wrapper" data-width="180px" data-height="100px" data-vid="" data-thumb="">
                    </span>
                </span>
                <span class="kinglive-btn-cta">
                    <span class="kinglive-btn-status clearfix">
                        <span class="broadcast-icon fl">
                            <svg width="13" height="9" viewBox="0 0 13 9">
                                <path d="M12.866,5.747 C12.780,6.162 12.655,6.560 12.493,6.942 C12.331,7.323 12.136,7.689 11.907,8.037 C11.679,8.386 11.423,8.706 11.139,8.998 L10.089,8.348 C10.099,8.339 10.109,8.329 10.120,8.320 C10.130,8.310 10.135,8.301 10.135,8.291 C10.145,8.282 10.155,8.273 10.165,8.263 C10.175,8.254 10.185,8.244 10.196,8.235 C10.632,7.745 10.992,7.175 11.276,6.525 C11.560,5.875 11.702,5.206 11.702,4.518 C11.702,3.802 11.570,3.128 11.306,2.497 C11.043,1.866 10.683,1.300 10.226,0.801 C10.185,0.754 10.165,0.733 10.165,0.737 C10.165,0.742 10.140,0.721 10.089,0.674 L11.185,-0.005 C11.459,0.297 11.710,0.620 11.938,0.963 C12.166,1.307 12.356,1.668 12.508,2.045 C12.661,2.422 12.780,2.813 12.866,3.218 C12.952,3.623 12.995,4.042 12.995,4.475 C12.995,4.909 12.952,5.333 12.866,5.747 ZM10.394,4.518 C10.394,5.074 10.292,5.599 10.089,6.094 C9.886,6.588 9.607,7.034 9.252,7.429 L8.202,6.779 C8.476,6.478 8.694,6.136 8.857,5.755 C9.019,5.373 9.100,4.970 9.100,4.546 C9.100,4.103 9.016,3.689 8.849,3.302 C8.682,2.916 8.451,2.572 8.157,2.271 L9.252,1.606 C9.607,1.993 9.886,2.436 10.089,2.935 C10.292,3.434 10.394,3.962 10.394,4.518 ZM6.500,6.000 C5.672,6.000 5.000,5.328 5.000,4.500 C5.000,3.672 5.672,3.000 6.500,3.000 C7.328,3.000 8.000,3.672 8.000,4.500 C8.000,5.328 7.328,6.000 6.500,6.000 ZM3.897,4.546 C3.897,4.970 3.978,5.373 4.140,5.755 C4.302,6.136 4.520,6.478 4.794,6.779 L3.744,7.429 C3.389,7.034 3.110,6.588 2.907,6.094 C2.705,5.599 2.603,5.074 2.603,4.518 C2.603,3.962 2.705,3.434 2.907,2.935 C3.110,2.436 3.389,1.993 3.744,1.606 L4.840,2.271 C4.546,2.572 4.315,2.916 4.148,3.302 C3.980,3.689 3.897,4.103 3.897,4.546 ZM2.771,0.801 C2.314,1.300 1.954,1.866 1.690,2.497 C1.426,3.128 1.295,3.802 1.295,4.518 C1.295,5.206 1.437,5.875 1.721,6.525 C2.005,7.175 2.365,7.745 2.801,8.235 C2.811,8.244 2.821,8.254 2.831,8.263 C2.841,8.273 2.852,8.282 2.862,8.291 C2.862,8.301 2.867,8.310 2.877,8.320 C2.887,8.329 2.897,8.339 2.907,8.348 L1.858,8.998 C1.574,8.706 1.317,8.386 1.089,8.037 C0.861,7.689 0.666,7.323 0.504,6.942 C0.341,6.560 0.217,6.162 0.131,5.747 C0.044,5.333 0.001,4.909 0.001,4.475 C0.001,4.042 0.044,3.623 0.131,3.218 C0.217,2.813 0.339,2.422 0.496,2.045 C0.653,1.668 0.843,1.307 1.066,0.963 C1.289,0.620 1.538,0.297 1.812,-0.005 L2.907,0.674 C2.857,0.721 2.831,0.742 2.831,0.737 C2.831,0.733 2.811,0.754 2.771,0.801 Z" fill="#fff"></path>
                            </svg>
                        </span>
                        <span class="broadcast-time"></span>
                        <span class="kinglive-cta-icon fr">
                            <svg width="8" height="8" viewBox="0 0 8 8">
                                <path d="M7.115,3.996 L8.000,3.996 L8.000,7.996 L-0.000,7.996 L-0.000,-0.004 L4.000,-0.004 L4.000,0.892 L0.885,0.892 L0.885,7.111 L7.115,7.111 L7.115,3.996 ZM8.000,-0.004 L8.000,3.111 L7.115,3.111 L7.115,1.517 L4.448,4.184 L3.823,3.559 L6.490,0.892 L4.885,0.892 L4.885,-0.004 L8.000,-0.004 Z" fill="#fff"></path>
                            </svg>
                        </span>
                    </span>
                    <span class="kinglive-btn-info clearfix">
                        <b></b>
                    </span>
                </span>
            </a>
        </div>


        <div class="kwtm-toogle fr hidden">
            <ul class="kwtmt-list">
                <li class="ktli-discuss hidden">
                    <a href="/chinh-thuc-trai-nghiem-kenh14-theo-cach-hoan-toan-moi-tu-hom-nay-giao-dien-stream-20160926151850618.chn#k14-detail-comment" class="ktlid-btn">
                        <span>GÓP Ý GIAO DIỆN MỚI</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</div>

        <!-- menu  -->
        <div id="k14-main-menu-wrapper-sticky-wrapper" class="sticky-wrapper">
    <div id="k14-main-menu-wrapper">
        <div class="khw-bottom-header">
            <div class="w1040 clearfix">
                <ul class="kbh-menu-list clearfix fl">
                    <li class="kmli home"><a href="/" title="Trang chủ">TRANG CHỦ</a></li>
                    <li class="kmli "><a href="/star.chn" title="Star">Star</a></li>

                    <li class="kmli "><a href="/cine.chn" title="Ciné">Ciné</a></li>
                    <li class="kmli "><a href="/musik.chn" title="Musik">Musik</a></li>
                    <li class="kmli ">
                        <a href="/beauty-fashion.chn" title="Beauty &amp; Fashion">Beauty &amp; Fashion</a></li>
                    <li class="kmli "><a href="/doi-song.chn" title="Đời sống">Đời sống</a></li>
                    <li class="kmli "><a href="/money-z.chn" title="Money-Z">Money-Z</a></li>
                    <li class="kmli "><a href="/an-quay-di.chn" title="Ăn - Quẩy - Đi">Ăn - Quẩy - Đi</a></li>
                    <li class="kmli "><a href="/xa-hoi.chn" title="Xã hội">Xã hội</a></li>
                    <li class="kmli "><a href="/suc-khoe.chn" title="Sức khỏe">Sức khỏe</a></li>
                    <li class="kmli "><a href="/tek-life.chn" title="Tek-life">Tek-life</a></li>

                    <li class="kmli "><a href="/hoc-duong.chn" title="Học đường">Học đường</a></li>
                    <li class="kmli "><a href="/xem-mua-luon.chn" title="Xem Mua Luôn">Xem Mua Luôn</a></li>
                    <li class="kmli"><a href="http://video.kenh14.vn/" title="Video">Video</a></li>


                    <li class="kmli expand-icon">
                        <a href="javascript:;" title="mở rộng" rel="nofollow">
                            <span class="eiline ei-line1"></span>
                            <span class="eiline ei-line2"></span>
                            <span class="eiline ei-line3"></span>
                        </a>
                        <div class="kmli-menu-expand-wrapper" style="width: 899px;">
                            <div class="w1040">
                                <ul class="list-other-cat-col clearfix">
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/doi-song.chn" title="Đời sống">Đời sống</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/doi-song/nhan-vat.chn" title="Nhân vật">Nhân vật</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/xem-an-choi.chn" title="Xem-Ăn-Chơi">Xem-Ăn-Chơi</a>
                                            </li>

                                            <li class="occs">
                                                <a href="/doi-song/house-n-home.chn" title="House n Home">House n Home</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/xem-mua-luon.chn" title="Xem mua luôn">Xem mua luôn</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/xem-mua-luon/thoi-trang.chn" title="Thời trang">Thời trang</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/xem-mua-luon/dep.chn" title="Đẹp">Đẹp</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/xem-mua-luon/mommy-mua-di.chn" title="Mommy mua di">Mommy mua di</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/sport.chn" title="Sport">Sport</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/sport/bong-da.chn" title="Bóng đá">Bóng đá</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/sport/hau-truong.chn" title="Hậu trường">Hậu trường</a>
                                            </li>

                                            <li class="occs">
                                                <a href="/sport/esports.chn" title="Esports">Esports</a>
                                            </li>

                                        </ul>
                                    </li>
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/musik.chn" title="Musik">Musik</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/musik/au-my.chn" title="Âu-Mỹ">Âu-Mỹ</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/musik/chau-a.chn" title="Châu Á">Châu Á</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/musik/viet-nam.chn" title="Việt Nam">Việt Nam</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/musik/hip-hop-neva-die.chn" title="Hip-hop neva die">Hip-hop neva die</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/cine.chn" title="Ciné">Ciné</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/cine/phim-chieu-rap.chn" title="Phim chiếu rạp">Phim chiếu rạp</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/cine/phim-viet-nam.chn" title="Phim Việt Nam">Phim Việt Nam</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/cine/series-truyen-hinh.chn" title="Series truyền hình">Series truyền hình</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/cine/hoa-ngu-han-quoc.chn" title="Hoa ngữ - Hàn Quốc">Hoa ngữ - Hàn Quốc</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r1" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/tek-life.chn" title="tek-life">Tek-Life</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/tek-life/metaverse.chn" title="metaverse">Metaverse</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/tek-life/how-to.chn" title="how-to">How-To</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/tek-life/wow.chn" title="Wow">Wow</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/tek-life/2-mall.chn" title="2-Mall">2-Mall</a>
                                            </li>
                                        </ul>
                                    </li>


                                    <li class="occ r2" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/star.chn" title="Star">Star</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/star/sao-viet.chn" title="Sao Việt">Sao Việt</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/star/hoi-ban-than-showbiz.chn" title="Hội bạn thân showbiz">Hội bạn thân showbiz</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/star/tv-show.chn" title="TV Show">TV Show</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r2" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/xa-hoi.chn" title="Xã hội">Xã hội</a>
                                        </h4>
                                        <ul class="list-occs">

                                            <li class="occs">
                                                <a href="/xa-hoi/phap-luat.chn" title="Pháp luật">Pháp luật</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/xa-hoi/nong-tren-mang.chn" title="Nóng trên mạng">Nóng trên mạng</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/xa-hoi/song-xanh.chn" title="Sống xanh">Sống xanh</a>
                                            </li>
                                        </ul>
                                    </li>


                                    <li class="occ r2" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/hoc-duong.chn" title="Học đường">Học đường</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/hoc-duong/nhan-vat.chn" title="Nhân vật">Nhân vật</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/hoc-duong/du-hoc.chn" title="Du học">Du học</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/hoc-duong/ban-tin-46.chn" title="Bản tin 46'">Bản tin 46'</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="occ r2" style="height: 0px;">
                                        <h4 class="occ-name">
                                            <a href="/the-gioi-do-day.chn" title="Thế giới đó đây">Thế giới đó đây</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/the-gioi-do-day/chum-anh.chn" title="Chùm ảnh">Chùm ảnh</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/the-gioi-do-day/kham-pha.chn" title="Khám phá">Khám phá</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/the-gioi-do-day/di.chn" title="Dị">Dị</a>
                                            </li>
                                        </ul>
                                    </li>

                                    <li class="occ r2" style="height: 0px;">

                                        <h4 class="occ-name">
                                            <a href="/suc-khoe.chn" title="Sức khỏe">Sức khỏe</a>
                                        </h4>
                                        <ul class="list-occs">
                                            <li class="occs">
                                                <a href="/suc-khoe/tin-tuc.chn" title="Tin tức">Tin tức</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/suc-khoe/dinh-duong.chn" title="Dinh dưỡng">Dinh dưỡng</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/suc-khoe/khoe-dep.chn" title="Khỏe đẹp">Khỏe đẹp</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/suc-khoe/gioi-tinh.chn" title="Giới tính">Giới tính</a>
                                            </li>
                                            <li class="occs">
                                                <a href="/suc-khoe/cac-benh.chn" title="Các bệnh">Các bệnh</a>
                                            </li>
                                        </ul>
                                    </li>


                                </ul>
                                <!-- End .list-other-cat-col -->
                                <div class="kmew-topics-wrapper hidden">
                                    <div class="kmewtw-label">Nhóm chủ đề</div>
                                    <ul class="list-kmewt clearfix">

                                    </ul>
                                </div>
                                <div class="kmew-other-links clearfix">
                                    <div class="kmewol-group clearfix">
                                        <h4 class="kmewolg-label">Tải app</h4>
                                        <ul class="list-kmewolgi">
                                            <li class="kmewolgi">
                                                <a href="https://itunes.apple.com/us/app/kenh-14/id670518264?ls=1&amp;mt=8" target="_blank" rel="nofollow" title="Tải về từ App Store">iOS</a>
                                            </li>
                                            <li class="kmewolgi">
                                                <a href="https://play.google.com/store/apps/details?id=vcc.mobilenewsreader.kenh14" target="_blank" rel="nofollow" title="Tải về từ Google Play">Android</a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div class="kmewol-group clearfix">
                                        <h4 class="kmewolg-label">
                                            <a href="https://www.facebook.com/K14vn" title="Fanpage" target="_blank" rel="nofollow">Fanpage</a>
                                        </h4>
                                    </div>
                                    <div class="kmewol-group clearfix">
                                        <h4 class="kmewolg-label">
                                            <a id="lnkContact" href="/#kenh14-footer-wrapper">Liên hệ</a></h4>
                                        <ul class="list-kmewolgi">
                                            <li class="kmewolgi">
                                                <a rel="nofollow" href="/adv.chn" title="Liên hệ quảng cáo" target="_blank">Quảng cáo</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </li>
                </ul>
                <div class="kbh-wca-gala-toggle fr pre-live kbhwgt-collapsed" style="display: none;">
                    <a href="javascript:;" title="live" class="kbhwgt-btn clearfix">
                        <span class="kbhwgtb-icon"></span>
                        <span class="kbhwgtb-text">live</span>
                        <span class="kbhwgtb-arrow"></span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>


        <!-- top banner -->
        <div class="khw-adk14-wrapper">
    <div class="w1040">
            <div id="admzone49" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone49') }) : admicroAD.show('admzone49');
        }
    </script>

    </div>
</div>
    </div>
        <div class="kenh14-body-wrapper">
            
    <input type="hidden" name="hd2018" id="hd2018" value="1">
    <div class="adm-mainsection">
        <div class="ads-sponsor type-2 adm-hidden">
            <div id="admsectionlogo"></div>
            <div id="admsection1"></div>
        </div>
        <div class="adm-sponsor">

            <div class="ads-sponsor type-2 adm-hidden">
                <div id="admsection2"></div>
                <div id="admsection3"></div>
            </div>
        </div>
        <div class="kbw-background">
            <div class="kbw-submenu">
    <div class="w1040 clearfix">
        <ul class="kbws-list fl">
                                            <li class="kbwsli active">
                            <a href="/sport.chn" title="Sport">Sport</a>
                        </li>
                                                                                    <li class="kbwsli ">
                            <a href="/sport/bong-da.chn" title="Bóng đá">Bóng đá</a>
                        </li>
                                                                    <li class="kbwsli ">
                            <a href="/sport/hau-truong.chn" title="Hậu Trường">Hậu Trường</a>
                        </li>
                                                                    <li class="kbwsli ">
                            <a href="/sport/esports.chn" title="eSports">eSports</a>
                        </li>
                                                                
                                                                        <li class="kbwsli fr">
                                <a href="/the-gioi-do-day/kham-pha.chn" title="Khám phá">Khám phá</a>
                            </li>
                                                    <li class="kbwsli fr">
                                <a href="/the-gioi-do-day/di.chn" title="Dị">Dị</a>
                            </li>
                                            
                









        </ul>
    </div>
</div>
<style>
    .dt_nu_vn { width: 300px; height: 24px; position: relative; top: 5px; }
    .dt_nu_vn a { width: 300px; padding: 0 !important; height: 25px; background: url(https://kenh14cdn.com/web_images/dt-nu-vietnam.png) center center no-repeat; position: absolute; background-size: contain; }
    .dt_nu_vn a:hover, .dt_nu_vn.active a { background-color: transparent !important; border-bottom: none !important; }
    .icooppo { width: 290px; height: 24px; position: relative; top: 5px; }
    .icooppo a { width: 290px; padding: 0 !important; height: 25px; background: url(https://kenh14cdn.com/web_images/oppo-flagship.png) center center no-repeat; position: absolute; background-size: contain; }
    .icooppo a:hover, .icooppo.active a { background-color: transparent !important; border-bottom: none !important; }
    .icobfstudio { width: 100px; height: 23px; position: relative; top: 5px; }
    .icobfstudio a { width: 100px; padding: 0 !important; height: 25px; background: url(https://kenh14cdn.com/203336854389633024/2022/5/25/frame-4-16534642013842071547956.png) center center no-repeat; position: absolute; background-size: contain; }
    .icobfstudio a:hover, .icooppo.active a { background-color: transparent !important; border-bottom: none !important; }
    .kbwsli.fr { display: none }
    .icovskvv { width: 228px; height: 20px; position: relative; top: 5px; }
    .icovskvv a { width: 228px; padding: 0 !important; height: 20px; background: url(https://static.mediacdn.vn/common/images/submn_vosinhkhongvovong.png) center center no-repeat; position: absolute; background-size: contain; }
    .icovskvv a:hover, .icovskvv.active a { background-color: transparent !important; border-bottom: none !important; }
    /*
       .icotetdieuky { width: 165px; height: 24px; position: relative; top: 5px; }
       .icotetdieuky a { width: 165px; padding: 0 !important; height: 24px; background: url(https://static.mediacdn.vn/kenh14/web_images/tet-dieu-ky-cat-icon.png) center center no-repeat; position: absolute; background-size: contain; }
       .icotetdieuky a:hover, .icotetdieuky.active a { background-color: transparent !important; border-bottom: none !important; }*/

    .icotetdunggu { width: 282px; height: 24px; position: relative; top: 5px; }
    .icotetdunggu a { width: 282px; padding: 0 !important; height: 24px; background: url(https://kenh14cdn.com/web_images/tet-dung-gu-choi-chat-chill.png) center center no-repeat !important; position: absolute; background-size: contain !important; }
    .icotetdunggu a:hover, .icotetdunggu.active a { background-color: transparent !important; border-bottom: none !important; }

    .icotettiktok { width: 282px; height: 24px; position: relative; top: 5px; }
    .icotettiktok a { width: 282px; padding: 0 !important; height: 24px; background: url(https://kenh14cdn.com/mob_images/tiktok-menu-logo.png) center center no-repeat !important; position: absolute; background-size: contain !important; }
    .icotettiktok a:hover, .icotettiktok.active a { background-color: transparent !important; border-bottom: none !important; }
</style>

<script>
    (runinit = window.runinit || []).push(function () {
        if ($('.icovskvv a').length == 0)
            $('.kbwsli.fr').css('display', 'block');
    });
</script>
            <style>
    #ads_zone51_slot7 {
        display: none;
    }

    /*anh panorama..*/
    canvas {
        width: 100% !important;
        height: 350px !important;
    }

    .kenh14-wrapper.size-m .knc-content h3 {
        width: 100%;
    }

    .LayoutAlbumCaptionWrapper {
        display: inline-block;
        background: #f2f2f2;
        padding: 10px;
        text-align: left;
        width: 100%;
    }

    .LayoutAlbumCaptionWrapper .LayoutAlbumCaption {
        font-family: SFD-Medium;
        color: #666;
        font-size: 14px !important;
        line-height: 18px !important;
        margin-bottom: 0;
    }

    .kenh14-wrapper.size-l .klw-new-content .VCSortableInPreviewMode[type=Photo].big-image-detail .detail-img-lightbox img {
        width: auto !important;
    }

    .fancybox-type-image a.fancybox-close, .fancybox-type-image a.fancybox-expand, .fancybox-type-image a.fancybox-nav span, .fancybox-type-inline a.fancybox-close, .fancybox-type-inline a.fancybox-expand, .fancybox-type-inline a.fancybox-nav span {
        display: none;
    }

    .fb_iframe_widget.fb-save {
        flex-grow: initial;
    }


    @media  only screen and (max-width: 1280px) {
        .kenh14-wrapper.size-l .kds-same-category {
            margin-left: 0;
        }

        .kenh14-detail.size-l .VCSortableInPreviewMode.big-image-detail.alignJustifyFull[type="Photo"], .kenh14-wrapper.size-l .adm-commentsection .klw-body-bottom {
            width: 700px;
        }
    }

    /*ẩn theo nguồn trên title*/
    .kbwc-meta .kbwcm-source {
        display: none;
    }

    .kbwc-meta .kbwcm-time {
        margin-left: 5px;
    }
    .category-submenu .cs-list{
        overflow-x: auto;
        padding-right: 10px;
        scrollbar-color: #dadce0;
        scrollbar-width: thin;
    }
</style>

<div class="kbw-content  size-m ">
    <div class="w1040 wfull">
        <div class="w1040 kbwc-body clearfix" id="k14-detail-content">

            <div class="w300 fr adm-rightsection ">
                <div id="admsection8"></div>
                <div class="w300 mg0 clearfix abc">
    <div id="admsection8"></div>
    <div id="admzone24309" class="pushed"></div>
    <script async="">
        //if (typeof (zoneid) != 'undefined' && zoneid != 197) {

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone24309') }) };

        //}
    </script>

    <div id="admzone51" class="pushed"></div>
    <script async="">
        //if (typeof (zoneid) != 'undefined' && zoneid != 197) {

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone51') }) };

        //}
    </script>
    <div id="divprfashion"></div>
    <div id="admzone253" class="pushed"></div>
    <script async="">
        //if (typeof (zoneid) != 'undefined' && zoneid != 197) {

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone253') }) };

        //}
    </script>

    <div id="admzone972" class="pushed"></div>
    <script async="">
        //if (typeof (zoneid) != 'undefined' && zoneid != 197) {

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone972') }) };

        //}
    </script>

    <div id="admzone55" class="pushed"></div>
    <script async="">
        //if (typeof (zoneid) != 'undefined' && zoneid != 197) {

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone55') }) };

        //}
    </script>

        <div id="admzone336" class="pushed"></div>
    <script async="">

            if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone336') }) };

    </script>
        <div style="height: 0; overflow: hidden" id="popup_ads_placeholder">
        <div id="popup_ads">
            <div id="admzone1426" class="pushed"></div>
        </div>
    </div>
</div>
            </div>

            <div class="w700 kbwcb-left kbwcb-top fl adm-leftsection">
                <div class="kbwcb-left-wrapper">
                    <div class="clearfix">
                        <div class="klw-body-top">
                            
                            <div class="kbwc-header mb-20">
                                
                                    <div class="disfex">
                                                                                                                    </div>
                                                                                                    <h1 class="kbwc-title">
                                        HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
                                    </h1>
                                
                                <div class="kbwc-meta" sourceid="0">
                                                                            <span class="kbwcm-author">Hải Đăng,</span>
                                        <span class="kbwcm-source">Theo Thanh Niên Việt </span>
                                        <span class="kbwcm-time" title="2025-06-11T09:36:00">
                                09:36 11/06/2025
                            </span>

                                        <div class="af-tts fr"></div>
                                </div>
                                
                            </div>

                                                            <div class="kbwc-socials">
                                    <div class="fb-like" data-href="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-layout="button_count" data-action="like" data-size="small" data-show-faces="false" data-share="false">

                                    </div>
                                    <a onclick="fbClient.shareClick('https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn');" href="javascript:;" class="kbwcs-fb" rel="nofollow">Chia sẻ <span class="kbwcs-number fr item-fb item-fb-loaded" rel="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn"></span></a>
                                    <div class="fb-save" data-uri="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-size="small"></div>

                                    <div class="mailWrap">
                                        <a title="Gửi email" href="mailto:?&amp;subject=['https://kenh14.vn']HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia&amp;body=/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn0D0ASau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi" rel="nofollow">
                                            <div class="btn-mail"></div>
                                        </a>
                                    </div>
                                    <div class="fbSendWrap">
                                        <div class="fb-send" data-href="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-colorscheme="light"></div>
                                    </div>

                                    <style>
    .kbwc-socials {
        margin-top: 45px;
    }
    .google-news {
        flex: 1;
        width: 100%;
        height: 30px;
        margin-bottom: 10px;
    }
    .google-news a {
        width: fit-content;
        float: right;
        display: flex;
        gap: 5px;
        justify-content: center;
        align-items: center;
        background-color: #eee;
        height: 30px;
        padding: 0 10px;
        margin-top: -5px;
        margin-left: 10px;
        border-radius: 20px;
    }
    .google-news span {
        color: #646464;
        font-size: 15px;
        font-family: SFD-Medium;
    }
</style>

<div class="google-news">
    <a href="https://news.google.com/publications/CAAiEOv7WnEdbGLlRlCRLqYYBxQqFAgKIhDr-1pxHWxi5UZQkS6mGAcU?hl=vi&amp;gl=VN&amp;ceid=VN%3Avi" class="youtube_subcribe" rel="nofollow" target="_blank" title="Theo dõi Kenh14.vn trên googlenews">
        <span>Theo dõi Kenh14.vn trên</span>
        <img height="15" width="80" src="https://static.mediacdn.vn/thumb_w/80/nld/Images/ggnewslogo.png" alt="logo">
    </a>
</div>
                                </div>
                                
                        </div>

                        <div class="klw-new-content">
                                                            <div class="knc-menu-nav ">
                                    <div class="kmn-wrapper" id="menuNav">
                                        <div class="kmnw-content">
                                            <div class="kc-item kc-home">
                                                <a href="/" class="icon-kch" title="Trang chủ"></a>
                                            </div>
                                            <div class="kc-item kc-facebook">
                                                <a onclick="fbClient.shareClick('https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn');" href="javascript:;" class="icon-kcf" title="Chia sẻ">
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            
                            <h2 class="knc-sapo">
                                    <span>
                                    </span>
                                Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi
                            </h2>
                            <div id="admzonek9l79lft" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzonek9l79lft') }) : admicroAD.show('admzonek9l79lft');
        }
    </script>


                            

                            <div class="knc-relate-wrapper relationnews" data-marked-zoneid="kenh14_detail_relatesnews">
        <ul class="krw-list">
                                            <li class="krwli">
                    <a href="/thua-malaysia-dam-nhat-lich-su-tuyen-viet-nam-gan-can-hy-vong-du-asian-cup-215250611054548651.chn" title="Thua Malaysia đậm nhất lịch sử, tuyển Việt Nam gần cạn hy vọng dự Asian Cup" data-newsid="215250611054548651" data-popup-url="/thua-malaysia-dam-nhat-lich-su-tuyen-viet-nam-gan-can-hy-vong-du-asian-cup-215250611054548651rf215250611055629179.chn" class="show-popup visit-popup">
                        Thua Malaysia đậm nhất lịch sử, tuyển Việt Nam gần cạn hy vọng dự Asian Cup
                        <i class="icon-show-popup"></i>
                    </a>
                </li>
                                    </ul>
    </div>

                            <div class="react-relate animated hiding-react-relate">
                            </div>

                            <div data-check-position="body_start"></div>
                            
                            
                                                            <div class="detail-content afcbc-body" data-role="content">
                            
                                    <div data-check-position="body_start"> </div> <p>  Tối 10/6, tại sân vận động Bukit Jalil (Kuala Lumpur), đội tuyển Việt Nam đã trải qua một trong những trận thua nặng nề nhất trong những năm gần đây khi để chủ nhà Malaysia ghi tới bốn bàn thắng chỉ trong hiệp hai. Dù nhập cuộc thận trọng và tổ chức phòng ngự tương đối tốt trong hiệp đầu, các học trò của HLV Kim Sang-sik đã hoàn toàn vỡ trận sau giờ nghỉ. </p> <p>  Phát biểu trong buổi họp báo sau trận, HLV người Hàn Quốc bày tỏ: </p> <p>  “Trước tiên, tôi muốn gửi lời xin lỗi chân thành đến tất cả người hâm mộ Việt Nam – những người đã đến sân cổ vũ, cũng như theo dõi qua màn ảnh nhỏ. Các cầu thủ đã cố gắng, nhưng kết quả này là hoàn toàn không thể chấp nhận, và tôi xin nhận trách nhiệm”. </p> <figure class="VCSortableInPreviewMode" type="Photo" style="">  <div><a href="https://kenh14cdn.com/203336854389633024/2025/6/11/910d6d67-486f-4210-9cb0-fcebc3d9451a-17496036572392049276309-1749609301940-1749609302420587571489.jpeg" data-fancybox-group="img-lightbox" title="        Đội tuyển Việt Nam để thua choáng váng 0-4 trước đội tuyển Malaysia, sau 10 năm đội tuyển Việt Nam mới lại thua đậm trước một đội bóng Đông Nam Á như vậy      " class="detail-img-lightbox" data-fancybox="img-lightbox"><img alt="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia- Ảnh 1." data-author="" data-original="https://kenh14cdn.com/203336854389633024/2025/6/11/910d6d67-486f-4210-9cb0-fcebc3d9451a-17496036572392049276309-1749609301940-1749609302420587571489.jpeg" h="1366" id="img_161632658599305216" loading="lazy" photoid="161632658599305216" rel="lightbox" src="https://kenh14cdn.com/203336854389633024/2025/6/11/910d6d67-486f-4210-9cb0-fcebc3d9451a-17496036572392049276309-1749609301940-1749609302420587571489.jpeg" title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia- Ảnh 1." type="photo" w="2048" class="lightbox-content" width="2048" height="1366"></a>     </div>  <figcaption class="PhotoCMS_Caption">   <p class="" data-placeholder="Nhập chú thích ảnh"><i>     Đội tuyển Việt Nam để thua choáng váng 0-4 trước đội tuyển Malaysia, sau 10 năm đội tuyển Việt Nam mới lại thua đậm trước một đội bóng Đông Nam Á như vậy    </i></p>  </figcaption> </figure> <p>  Theo HLV Kim, Việt Nam đã có hiệp một thi đấu đúng với kế hoạch đề ra, giữ cự ly đội hình tốt và hạn chế được các tình huống nguy hiểm. Tuy nhiên, bước ngoặt xảy ra khi hai trung vệ chủ chốt là Nguyễn Thành Chung và Bùi Tiến Dũng lần lượt rời sân vì chấn thương. Việc mất hai chốt chặn quan trọng khiến hàng thủ rơi vào rối loạn, tạo điều kiện để Malaysia liên tiếp ghi bàn ở các phút 49, 59, 67 và 88. </p> <p>  “Ở nửa đầu trận đấu, chúng tôi vẫn có thể triển khai đội hình như kế hoạch, nhưng ở nửa sau trận đấu, với chấn thương của 2 cầu thủ phòng ngự, chúng tôi đã gặp khó khăn trong việc triển khai đội hình và có lẽ đó cũng là một trong những lý do khiến chúng tôi thất bại”, HLV Kim Sang Sik nói. </p> <p>  Nhà cầm quân người Hàn Quốc thừa nhận ĐT Việt Nam gặp khó trước 5 cầu thủ nhập tịch mới toanh của đối thủ. “Mặc dù chúng tôi đã cố gắng phân tích nhiều nhất có thể, nhưng cả 5 cầu thủ nhập tịch của đối thủ hôm nay thể hiện tốt hơn chúng tôi dự đoán. Và đúng là chúng tôi đã vất vả khi phải đối đầu với Malaysia. Nhưng chúng tôi sẽ vận dụng những kinh nghiệm của trận đấu ngày hôm nay để chuẩn bị thật tốt cho lần sau”, HLV Kim chia sẻ. </p> <p>  Thất bại này khiến đội tuyển Việt Nam rơi xuống vị trí thứ hai bảng F với 3 điểm sau 2 trận, trong khi Malaysia vươn lên dẫn đầu với 6 điểm tuyệt đối. Dù cánh cửa vào VCK Asian Cup 2027 vẫn còn, nhưng đội tuyển sẽ phải đối mặt với áp lực lớn trong các trận lượt về, đặc biệt là khi tiếp chính Malaysia tại Mỹ Đình vào tháng 3/2026. </p> <p>  Dù vậy, HLV Kim Sang-sik khẳng định ông và các học trò sẽ không bỏ cuộc. “Về cách chuẩn bị cho trận lượt về ở Hà Nội, đầu tiên tôi nghĩ chúng tôi cần chấp nhận sự thật rằng đội tuyển Malaysia đã mạnh lên nhờ vào những cầu thủ nhập tịch mới. Nhưng bóng đá thì vẫn luôn có chỗ cho những kỳ tích xảy ra. Nếu chúng tôi chuẩn bị tốt cho trận lượt về, tôi nghĩ chúng tôi vẫn có cơ hội để bù đắp được 4 bàn thua hôm nay”, HLV Kim khẳng định. </p> <p>  Sau trận đấu này, đội tuyển Việt Nam sẽ về nước, các cầu thủ trở lại CLB để tiếp tục thi đấu các trận còn lại của V.League 2024/25. Tuyển Việt Nam sẽ hội quân trở lại vào dịp FIFA Days tháng 9. </p> <div class="clearfix" data-check-position="body_end"> </div>
                                
                                
                            </div>
                            <zone id="kvrtrxyn" class="pushed"></zone>
    <script>
        if (pageSettings.allow3rd) arfAsync.push("kvrtrxyn");
    </script>

                            <zone id="kisdwxsr" class="pushed"></zone>
    <script>
        if (pageSettings.allow3rd) arfAsync.push("kisdwxsr");
    </script>


                            <div class="ads_detail">
                                <div id="admzonek1fs8he0" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzonek1fs8he0') }) : admicroAD.show('admzonek1fs8he0');
        }
    </script>

                            </div>


                            <!-- LIVE -->
                            

                            <div class="clearfix">
                                <div class="link-source-wrapper is-web clearfix" id="urlSourceKenh14" style="display: none">
        <a class="link-source-name" title="Theo  Thanh Niên Việt" rel="nofollow" href="javascript:;">
            Theo <span class="link-source-text-name">
                 Thanh Niên Việt
            </span>
            <span class="btn-copy-link-source2">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 2.08333C2.38949 2.08333 2.28351 2.12723 2.20537 2.20537C2.12723 2.28351 2.08333 2.38949 2.08333 2.5V8.33333C2.08333 8.44384 2.12723 8.54982 2.20537 8.62796C2.28351 8.7061 2.38949 8.75 2.5 8.75H7.5C7.61051 8.75 7.71649 8.7061 7.79463 8.62796C7.87277 8.54982 7.91667 8.44384 7.91667 8.33333V2.5C7.91667 2.38949 7.87277 2.28351 7.79463 2.20537C7.71649 2.12723 7.61051 2.08333 7.5 2.08333H6.66667C6.43655 2.08333 6.25 1.89679 6.25 1.66667C6.25 1.43655 6.43655 1.25 6.66667 1.25H7.5C7.83152 1.25 8.14946 1.3817 8.38388 1.61612C8.6183 1.85054 8.75 2.16848 8.75 2.5V8.33333C8.75 8.66485 8.6183 8.9828 8.38388 9.21722C8.14946 9.45164 7.83152 9.58333 7.5 9.58333H2.5C2.16848 9.58333 1.85054 9.45164 1.61612 9.21722C1.3817 8.9828 1.25 8.66485 1.25 8.33333V2.5C1.25 2.16848 1.3817 1.85054 1.61612 1.61612C1.85054 1.3817 2.16848 1.25 2.5 1.25H3.33333C3.56345 1.25 3.75 1.43655 3.75 1.66667C3.75 1.89679 3.56345 2.08333 3.33333 2.08333H2.5Z" fill="#333"></path>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M2.91666 1.25C2.91666 0.789762 3.28976 0.416667 3.75 0.416667H6.25C6.71023 0.416667 7.08333 0.789762 7.08333 1.25V2.08333C7.08333 2.54357 6.71023 2.91667 6.25 2.91667H3.75C3.28976 2.91667 2.91666 2.54357 2.91666 2.08333V1.25ZM6.25 1.25H3.75V2.08333H6.25V1.25Z" fill="#333"></path>
            </svg>
            <i>Copy link</i>
        </span>
        </a>
        <div class="link-source-detail">
            <div class="sourcelinktop">
                <span class="link-source-detail-title">Link bài gốc</span>
                <span class="btn-copy-link-source disable" data-link="https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 2.08333C2.38949 2.08333 2.28351 2.12723 2.20537 2.20537C2.12723 2.28351 2.08333 2.38949 2.08333 2.5V8.33333C2.08333 8.44384 2.12723 8.54982 2.20537 8.62796C2.28351 8.7061 2.38949 8.75 2.5 8.75H7.5C7.61051 8.75 7.71649 8.7061 7.79463 8.62796C7.87277 8.54982 7.91667 8.44384 7.91667 8.33333V2.5C7.91667 2.38949 7.87277 2.28351 7.79463 2.20537C7.71649 2.12723 7.61051 2.08333 7.5 2.08333H6.66667C6.43655 2.08333 6.25 1.89679 6.25 1.66667C6.25 1.43655 6.43655 1.25 6.66667 1.25H7.5C7.83152 1.25 8.14946 1.3817 8.38388 1.61612C8.6183 1.85054 8.75 2.16848 8.75 2.5V8.33333C8.75 8.66485 8.6183 8.9828 8.38388 9.21722C8.14946 9.45164 7.83152 9.58333 7.5 9.58333H2.5C2.16848 9.58333 1.85054 9.45164 1.61612 9.21722C1.3817 8.9828 1.25 8.66485 1.25 8.33333V2.5C1.25 2.16848 1.3817 1.85054 1.61612 1.61612C1.85054 1.3817 2.16848 1.25 2.5 1.25H3.33333C3.56345 1.25 3.75 1.43655 3.75 1.66667C3.75 1.89679 3.56345 2.08333 3.33333 2.08333H2.5Z" fill="white"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M2.91666 1.25C2.91666 0.789762 3.28976 0.416667 3.75 0.416667H6.25C6.71023 0.416667 7.08333 0.789762 7.08333 1.25V2.08333C7.08333 2.54357 6.71023 2.91667 6.25 2.91667H3.75C3.28976 2.91667 2.91666 2.54357 2.91666 2.08333V1.25ZM6.25 1.25H3.75V2.08333H6.25V1.25Z" fill="white"></path>
                </svg>
                <i>Lấy link</i>
            </span>
            </div>
            <a class="link-source-full" title="https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm" rel="nofollow" href="javascript:;">
                 https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm
            </a>
            <div class="arrow-down"></div>
        </div>
    </div>
                            </div>
                            <div data-check-position="body_end"></div>

                                                            <div class="knc-rate-link" data-marked-zoneid="kenh14_detail_relatednewsboxlink">
                                                                            <a href="/hlv-kim-sang-sik-dung-bai-la-tuyen-viet-nam-sup-do-day-that-vong-nguy-co-lon-lo-ve-asian-cup-21525061022085832.chn" title="Hlv Kim Sang-sik dùng bài lạ, tuyển Việt Nam sụp đổ đầy thất vọng, nguy cơ lớn lỡ vé Asian Cup" class="krl">
                                            Hlv Kim Sang-sik dùng bài lạ, tuyển Việt Nam sụp đổ đầy thất vọng, nguy cơ lớn lỡ vé Asian Cup
                                        </a>
                                                                    </div>
                            
                            <script>
                                if (!isLightHouse) {
                                    (runinit = window.runinit || []).push(function () {
                                        var regex = new RegExp(/__uid\:([0-9]+)/);
                                        var cf_uidT = '';
                                        var __admPageloadid = '';
                                        var __create = '';
                                        (function () {
                                            function getCookie(a) {
                                                return 0 < document.cookie.length && (c_start = document.cookie.indexOf(a + "="), -1 != c_start) ? (c_start = c_start + a.length + 1, c_end = document.cookie.indexOf(";", c_start), -1 == c_end && (c_end = document.cookie.length), unescape(document.cookie.substring(c_start, c_end))) : ""
                                            }

                                            try {
                                                regex = new RegExp(/__uid\:([0-9]+)/);
                                                regex2 = new RegExp(/__create\:([0-9]+)/);
                                                cf_uidT = regex.exec(unescape(getCookie('__uif')))[1];
                                                __create = regex2.exec(unescape(getCookie('__uif')))[1];
                                            } catch (e) {
                                            }
                                        })();

                                        (function () {
                                            window.__admPageloadid = window.__admPageloadid || window.__m_admPageloadid;
                                            if (!window.__admPageloadid) {
                                                var a = new Date().getTime();
                                                window.__admPageloadid = a;
                                                window.__m_admPageloadid = a;
                                            }
                                        })();

                                        cf_uidT = cf_uidT || '1509518141984318107';

                                        function getDguid() {
                                            var a = "";
                                            try {
                                                a = localStorage.__uidac
                                            } catch (d) {
                                            }
                                            if (!a) a: {
                                                a = decodeURIComponent(document.cookie).split(";");
                                                for (var c = 0; c < a.length; c++) {
                                                    for (var b = a[c]; " " == b.charAt(0);) b = b.substring(1);
                                                    if (0 == b.indexOf("__uidac=")) {
                                                        a = b.substring(8, b.length);
                                                        break a
                                                    }
                                                }
                                                a = ""
                                            }
                                            return a
                                        };

                                        function getCreateCK() {
                                            try {
                                                return ADM_AdsTracking.get('__create');
                                            } catch (e) {
                                            }
                                            return ''
                                        }

                                        $.ajax({
                                            url: 'https://rec.aiservice.vn/recengine/guiabtest/v1?customerid=kenh14web&boxid=7&uid=-1&deviceid=' + cf_uidT + '&dg=' + getDguid(),
                                            dataType: "text",
                                            headers: {
                                                'ct': __create,
                                                'pglid': __admPageloadid,
                                            },
                                            success: function (res) {
                                                if (res != null && res != "undefined" && res != "") {
                                                    res = JSON.parse(res);
                                                    if (res.code == 200 && res.payload != 0) {
                                                        $('.knc-rate-link').after('<div id="aiservice-related-news-box-link" data-callback-error="cberAIRelatedNewsBoxLink"></div>');
                                                        $('.knc-rate-link').hide();
                                                        loadJsAsync('https://js.aiservice.vn/rec/kenh14-detail-relatednewsboxlink.js', callbackEr = function () {
                                                            new Image().src = 'https://formalhood.com/ev_anlz?dmn=' + encodeURIComponent(document.location.href) + '&bxid=7&iti=kenh14web&elbl=kenh14-detail-relatednewsboxlink.js&eval=404&ecat=monitorRecommend&eact=error&dmi=7&ui=' + cf_uidT + '&dg=' + getDguid() + '&cr=' + getCreateCK();
                                                        });
                                                    }
                                                }
                                            },
                                            error: function (jqXHR, textStatus, errorThrown) {
                                                new Image().src = 'https://formalhood.com/ev_anlz?dmn=' + encodeURIComponent(document.location.href) + '&bxid=7&iti=kenh14web&elbl=APIAbtest&eval=' + jqXHR.status + '&ecat=monitorRecommend&eact=error&dmi=7&ui=' + cf_uidT + '&dg=' + getDguid() + '&cr=' + getCreateCK();
                                            }
                                        });
                                    });
                                }

                                function cberAIRelatedNewsBoxLink() {
                                    $('.knc-rate-link').show();
                                }
                            </script>
                        </div>

                        <div class="post_embed">
                            <div id="admzone38016" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone38016') }) : admicroAD.show('admzone38016');
        }
    </script>

                        </div>

                        <div class="klw-nomargin">
                            <div class="klw-new-socials clearfix">
                                <div class="kns-social clearfix">
                                    <div class="fl fbSendWrap mt-3 mgr6">
                                        <div class="btn-fb-send"></div>
                                        <div class="fb-send hidden" data-href="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-colorscheme="light"></div>
                                    </div>
                                    <div class="fl fbLikeWrap mt-3">
                                        <span class="fl k14-fb-like"></span>
                                        <div class="fb-like" data-href="https://kenh14.vn/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-layout="button_count" data-action="like" data-size="small" data-show-faces="false" data-share="true"></div>
                                    </div>
                                    <div class="fr">
                                        <div id="admViewtotal">
                                            <div id="admzone40817" class="pushed"></div>
                                            <div id="admzone40817" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone40817') }) : admicroAD.show('admzone40817');
        }
    </script>

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="klw-new-tags clearfix">
        <ul class="knt-list">
                            <li class="kli">
                    <a href="/hlv-kim-sang-sik.html" title="HLV Kim Sang-sik">HLV Kim Sang-sik</a>
                </li>
                            <li class="kli">
                    <a href="/tuyen-viet-nam.html" title=" tuyển Việt Nam">tuyển Việt Nam</a>
                </li>
                    </ul>
    </div>
                        </div>
                    </div>

                            <div class="detail-bottom-adk14 klw-nomargin">
    <div id="admzone56" class="pushed"></div>
    <script async="">

            if (Constants.allow3rd) {
                admicroAD.unit.push(function () {
                    admicroAD.show('admzone56')
                })
            }


    </script>
</div>

<div class="detail-bottom-adk14 klw-nomargin">
    <div id="admzone3381" class="pushed"></div>
    <script async="">

            if (Constants.allow3rd) {
                admicroAD.unit.push(function () {
                    admicroAD.show('admzone3381')
                })
            }

    </script>
</div>

<div class="ads-sponsor type-2 adm-hidden">
    <div id="admsection5"></div>
</div>
<div class="ads-sponsor type-6 hidden">
    <div id="admsection65"></div>
</div>

                            <div class="adm-commentsection klw-nomargin">
                                <div class="klw-body-bottom">
                                </div>
                                <div class="clearboth"></div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="adm_sponsor_footer1"></div>
        <div class="w1040">
            <div class="klw-body-bottom kbwcb-left">
                <style>
    .same-category-stream .kds-title > span {
        font-size: 24px !important;
        display: inline-block;
        position: relative;
        top: -4px;
    }
    .ksclivbd-form>li{
        line-height: 11px;
    }
</style>
<div class="klw-detail-stream" id="k14-detail-stream-per1">
    <div class="same-category-stream" style="margin-top: 0px;">
        <div class="kds-same-category clearfix">
            <div class="kds-title clearfix">
                <span class="ccm">TIN CÙNG CHUYÊN MỤC</span>
                <!-------------------------- VIEW BY DATE ----------------------->
                <div class="kscli-view-by-date fr clearfix">
                    <span class="ksclivbd-title fl">Xem theo ngày</span>
                    <ul class="ksclivbd-form clearfix fl">
                        <li>
                            <div class="dk-select " id="dk0-ksclivbdf-date"><div class="dk-selected " tabindex="0" id="dk0-combobox" aria-live="assertive" aria-owns="dk0-listbox" role="combobox" aria-activedescendant="dk0-11">11</div><ul class="dk-select-options" id="dk0-listbox" role="listbox" aria-expanded="false"><li class="dk-option " data-value="0" role="option" aria-selected="false" id="dk0-0">Ngày</li><li class="dk-option " data-value="1" role="option" aria-selected="false" id="dk0-1">1</li><li class="dk-option " data-value="2" role="option" aria-selected="false" id="dk0-2">2</li><li class="dk-option " data-value="3" role="option" aria-selected="false" id="dk0-3">3</li><li class="dk-option " data-value="4" role="option" aria-selected="false" id="dk0-4">4</li><li class="dk-option " data-value="5" role="option" aria-selected="false" id="dk0-5">5</li><li class="dk-option " data-value="6" role="option" aria-selected="false" id="dk0-6">6</li><li class="dk-option " data-value="7" role="option" aria-selected="false" id="dk0-7">7</li><li class="dk-option " data-value="8" role="option" aria-selected="false" id="dk0-8">8</li><li class="dk-option " data-value="9" role="option" aria-selected="false" id="dk0-9">9</li><li class="dk-option " data-value="10" role="option" aria-selected="false" id="dk0-10">10</li><li class="dk-option  dk-option-selected" data-value="11" role="option" aria-selected="true" id="dk0-11">11</li><li class="dk-option " data-value="12" role="option" aria-selected="false" id="dk0-12">12</li><li class="dk-option " data-value="13" role="option" aria-selected="false" id="dk0-13">13</li><li class="dk-option " data-value="14" role="option" aria-selected="false" id="dk0-14">14</li><li class="dk-option " data-value="15" role="option" aria-selected="false" id="dk0-15">15</li><li class="dk-option " data-value="16" role="option" aria-selected="false" id="dk0-16">16</li><li class="dk-option " data-value="17" role="option" aria-selected="false" id="dk0-17">17</li><li class="dk-option " data-value="18" role="option" aria-selected="false" id="dk0-18">18</li><li class="dk-option " data-value="19" role="option" aria-selected="false" id="dk0-19">19</li><li class="dk-option " data-value="20" role="option" aria-selected="false" id="dk0-20">20</li><li class="dk-option " data-value="21" role="option" aria-selected="false" id="dk0-21">21</li><li class="dk-option " data-value="22" role="option" aria-selected="false" id="dk0-22">22</li><li class="dk-option " data-value="23" role="option" aria-selected="false" id="dk0-23">23</li><li class="dk-option " data-value="24" role="option" aria-selected="false" id="dk0-24">24</li><li class="dk-option " data-value="25" role="option" aria-selected="false" id="dk0-25">25</li><li class="dk-option " data-value="26" role="option" aria-selected="false" id="dk0-26">26</li><li class="dk-option " data-value="27" role="option" aria-selected="false" id="dk0-27">27</li><li class="dk-option " data-value="28" role="option" aria-selected="false" id="dk0-28">28</li><li class="dk-option " data-value="29" role="option" aria-selected="false" id="dk0-29">29</li><li class="dk-option " data-value="30" role="option" aria-selected="false" id="dk0-30">30</li><li class="dk-option " data-value="31" role="option" aria-selected="false" id="dk0-31">31</li></ul></div><select id="ksclivbdf-date" aria-label="date" data-dkcacheid="0">
                                <option aria-labelledby="date" value="0">Ngày</option>
                                <option aria-labelledby="date" value="1">1</option>
                                <option aria-labelledby="date" value="2">2</option>
                                <option aria-labelledby="date" value="3">3</option>
                                <option aria-labelledby="date" value="4">4</option>
                                <option aria-labelledby="date" value="5">5</option>
                                <option aria-labelledby="date" value="6">6</option>
                                <option aria-labelledby="date" value="7">7</option>
                                <option aria-labelledby="date" value="8">8</option>
                                <option aria-labelledby="date" value="9">9</option>
                                <option aria-labelledby="date" value="10">10</option>
                                <option aria-labelledby="date" value="11">11</option>
                                <option aria-labelledby="date" value="12">12</option>
                                <option aria-labelledby="date" value="13">13</option>
                                <option aria-labelledby="date" value="14">14</option>
                                <option aria-labelledby="date" value="15">15</option>
                                <option aria-labelledby="date" value="16">16</option>
                                <option aria-labelledby="date" value="17">17</option>
                                <option aria-labelledby="date" value="18">18</option>
                                <option aria-labelledby="date" value="19">19</option>
                                <option aria-labelledby="date" value="20">20</option>
                                <option aria-labelledby="date" value="21">21</option>
                                <option aria-labelledby="date" value="22">22</option>
                                <option aria-labelledby="date" value="23">23</option>
                                <option aria-labelledby="date" value="24">24</option>
                                <option aria-labelledby="date" value="25">25</option>
                                <option aria-labelledby="date" value="26">26</option>
                                <option aria-labelledby="date" value="27">27</option>
                                <option aria-labelledby="date" value="28">28</option>
                                <option aria-labelledby="date" value="29">29</option>
                                <option aria-labelledby="date" value="30">30</option>
                                <option aria-labelledby="date" value="31">31</option>
                            </select>
                        </li>
                        <li>
                            <div class="dk-select " id="dk1-ksclivbdf-month"><div class="dk-selected " tabindex="0" id="dk1-combobox" aria-live="assertive" aria-owns="dk1-listbox" role="combobox" aria-activedescendant="dk1-6">Tháng 6</div><ul class="dk-select-options" id="dk1-listbox" role="listbox" aria-expanded="false"><li class="dk-option " data-value="0" role="option" aria-selected="false" id="dk1-0">Tháng</li><li class="dk-option " data-value="1" role="option" aria-selected="false" id="dk1-1">Tháng 1</li><li class="dk-option " data-value="2" role="option" aria-selected="false" id="dk1-2">Tháng 2</li><li class="dk-option " data-value="3" role="option" aria-selected="false" id="dk1-3">Tháng 3</li><li class="dk-option " data-value="4" role="option" aria-selected="false" id="dk1-4">Tháng 4</li><li class="dk-option " data-value="5" role="option" aria-selected="false" id="dk1-5">Tháng 5</li><li class="dk-option  dk-option-selected" data-value="6" role="option" aria-selected="true" id="dk1-6">Tháng 6</li><li class="dk-option " data-value="7" role="option" aria-selected="false" id="dk1-7">Tháng 7</li><li class="dk-option " data-value="8" role="option" aria-selected="false" id="dk1-8">Tháng 8</li><li class="dk-option " data-value="9" role="option" aria-selected="false" id="dk1-9">Tháng 9</li><li class="dk-option " data-value="10" role="option" aria-selected="false" id="dk1-10">Tháng 10</li><li class="dk-option " data-value="11" role="option" aria-selected="false" id="dk1-11">Tháng 11</li><li class="dk-option " data-value="12" role="option" aria-selected="false" id="dk1-12">Tháng 12</li></ul></div><select id="ksclivbdf-month" aria-label="month" data-dkcacheid="1">
                                <option aria-labelledby="month" value="0">Tháng  </option>
                                <option aria-labelledby="month" value="1">Tháng 1</option>
                                <option aria-labelledby="month" value="2">Tháng 2</option>
                                <option aria-labelledby="month" value="3">Tháng 3</option>
                                <option aria-labelledby="month" value="4">Tháng 4</option>
                                <option aria-labelledby="month" value="5">Tháng 5</option>
                                <option aria-labelledby="month" value="6">Tháng 6</option>
                                <option aria-labelledby="month" value="7">Tháng 7</option>
                                <option aria-labelledby="month" value="8">Tháng 8</option>
                                <option aria-labelledby="month" value="9">Tháng 9</option>
                                <option aria-labelledby="month" value="10">Tháng 10</option>
                                <option aria-labelledby="month" value="11">Tháng 11</option>
                                <option aria-labelledby="month" value="12">Tháng 12</option>
                            </select>
                        </li>
                        <li>
                            <div class="dk-select " id="dk2-ksclivbdf-year"><div class="dk-selected " tabindex="0" id="dk2-combobox" aria-live="assertive" aria-owns="dk2-listbox" role="combobox" aria-activedescendant="dk2-2025">2025</div><ul class="dk-select-options" id="dk2-listbox" role="listbox" aria-expanded="false"><li class="dk-option " data-value="2020" role="option" aria-selected="false" id="dk2-2020">2020</li><li class="dk-option " data-value="2021" role="option" aria-selected="false" id="dk2-2021">2021</li><li class="dk-option " data-value="2022" role="option" aria-selected="false" id="dk2-2022">2022</li><li class="dk-option " data-value="2023" role="option" aria-selected="false" id="dk2-2023">2023</li><li class="dk-option " data-value="2024" role="option" aria-selected="false" id="dk2-2024">2024</li><li class="dk-option  dk-option-selected" data-value="2025" role="option" aria-selected="true" id="dk2-2025">2025</li></ul></div><select id="ksclivbdf-year" aria-label="year" data-dkcacheid="2">
                                                                    <option value="2020">2020</option>
                                                                    <option value="2021">2021</option>
                                                                    <option value="2022">2022</option>
                                                                    <option value="2023">2023</option>
                                                                    <option value="2024">2024</option>
                                                                    <option value="2025" selected="selected">2025</option>
                                                            </select>
                        </li>
                        <li>
                            <button type="button" class="ksclivbdf-view">Xem</button>
                        </li>
                    </ul>
                </div>
                <!-------------------------- VIEW BY DATE ----------------------->
            </div>
        </div>
        <div class="ksc-list">
            <div class="kscli clearfix">
                <div id="k14-detail-stream-per" data-marked-zoneid="k14_detail_tin_cung_muc_per">
                </div>
            </div>
        </div>
    </div>
</div>
<div class="clearfix"></div>
<script type="text/javascript">
    var cf_uidT = '';
    var __admPageloadid = '';
    var __create = '';
    var regex = new RegExp(/__uid\:([0-9]+)/);
    (function () {
        function getCookie(a) {
            return 0 < document.cookie.length && (c_start = document.cookie.indexOf(a + "="), -1 != c_start) ? (c_start = c_start + a.length + 1, c_end = document.cookie.indexOf(";", c_start), -1 == c_end && (c_end = document.cookie.length), unescape(document.cookie.substring(c_start, c_end))) : ""
        }
        try {
            regex = new RegExp(/__uid\:([0-9]+)/);
            regex2 = new RegExp(/__create\:([0-9]+)/);
            cf_uidT = regex.exec(unescape(getCookie('__uif')))[1];
            __create = regex2.exec(unescape(getCookie('__uif')))[1];
        }
        catch (e) { }
    })();

    (function(){
        window.__admPageloadid=window.__admPageloadid || window.__m_admPageloadid;
        if(!window.__admPageloadid){
            var a=new Date().getTime();
            window.__admPageloadid=a;
            window.__m_admPageloadid=a;
        }
    })();

    cf_uidT = cf_uidT || '1509518141984318107';
    if (pageSettings.allow3rd) {

        (runinit = window.runinit || []).push(function () {
            $.ajax({
                url: 'https://rec.aiservice.vn/recengine/guiabtest/v1/ui-ux/4465c75414aee7bb/505?plt=1&device_id=' + cf_uidT + '&dg=' + getDguid(),
                dataType: "text",
                headers: {
                    'ct': __create,
                    'pglid': __admPageloadid,
                },
                success: function (res) {
                    console.log(res,'k14_detail_tin_cung_muc_per');
                    if (res != null && res != "undefined" && res != "") {
                        res = JSON.parse(res);
                        if (res.widget != null) {
                            $('#k14-detail-stream-per').prepend('<div id="kenh14-tincungmuc" data-callback-error="cberCungchuyenmuc"></div>');
                            loadJsAsync('https://js.aiservice.vn/rec/kenh14-tincungmuc.js', callbackEr = function () {
                                new Image().src = 'https://formalhood.com/ev_anlz?dmn=' + encodeURIComponent(document.location.href) + '&bxid=505&iti=kenh14web&elbl=afamily_Cungchuyenmuc_web.js&eval=404&ecat=monitorRecommend&eact=error&dmi=7&ui=' + cf_uidT + '&dg=' + getDguid() + '&cr=' + getCreateCK();
                            });
                            $('#k14-detail-stream').remove();
                        } else {
                            cberCungchuyenmuc();
                        }
                    } else {
                        cberCungchuyenmuc();
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    new Image().src = 'https://formalhood.com/ev_anlz?dmn=' + encodeURIComponent(document.location.href) + '&bxid=505&iti=kenh14web&elbl=APIAbtest&eval=' + jqXHR.status + '&ecat=monitorRecommend&eact=error&dmi=7&ui=' + cf_uidT + '&dg=' + getDguid() + '&cr=' + getCreateCK();
                }
            });
        });
    }
    function getDguid() { var a = ""; try { a = localStorage.__uidac } catch (d) { } if (!a) a: { a = decodeURIComponent(document.cookie).split(";"); for (var c = 0; c < a.length; c++) { for (var b = a[c]; " " == b.charAt(0);)b = b.substring(1); if (0 == b.indexOf("__uidac=")) { a = b.substring(8, b.length); break a } } a = "" } return a };
    function getCreateCK() { try { return ADM_AdsTracking.get('__create'); } catch (e) { } return '' }
    function cberCungchuyenmuc() {
        $('#k14-detail-stream').removeClass('hidden');
        $('#k14-detail-stream-per1').addClass('hidden');
    }
</script>

<div class="klw-detail-stream hidden" id="k14-detail-stream">
    <div class="same-category-stream" style="margin-top: 0px;" data-marked-zoneid="k14_detail_tin_cung_muc">
        <div class="kds-same-category clearfix">
            <div class="kds-title clearfix">
                <span class="ccm">TIN CÙNG CHUYÊN MỤC</span>
                <!-------------------------- VIEW BY DATE ----------------------->
                <div class="kscli-view-by-date fr clearfix">
                    <span class="ksclivbd-title fl">Xem theo ngày</span>
                    <ul class="ksclivbd-form clearfix fl">
                        <li>
                            <select id="ksclivbdf-date" aria-label="date">
                                <option aria-labelledby="date" value="0">Ngày</option>
                                <option aria-labelledby="date" value="1">1</option>
                                <option aria-labelledby="date" value="2">2</option>
                                <option aria-labelledby="date" value="3">3</option>
                                <option aria-labelledby="date" value="4">4</option>
                                <option aria-labelledby="date" value="5">5</option>
                                <option aria-labelledby="date" value="6">6</option>
                                <option aria-labelledby="date" value="7">7</option>
                                <option aria-labelledby="date" value="8">8</option>
                                <option aria-labelledby="date" value="9">9</option>
                                <option aria-labelledby="date" value="10">10</option>
                                <option aria-labelledby="date" value="11">11</option>
                                <option aria-labelledby="date" value="12">12</option>
                                <option aria-labelledby="date" value="13">13</option>
                                <option aria-labelledby="date" value="14">14</option>
                                <option aria-labelledby="date" value="15">15</option>
                                <option aria-labelledby="date" value="16">16</option>
                                <option aria-labelledby="date" value="17">17</option>
                                <option aria-labelledby="date" value="18">18</option>
                                <option aria-labelledby="date" value="19">19</option>
                                <option aria-labelledby="date" value="20">20</option>
                                <option aria-labelledby="date" value="21">21</option>
                                <option aria-labelledby="date" value="22">22</option>
                                <option aria-labelledby="date" value="23">23</option>
                                <option aria-labelledby="date" value="24">24</option>
                                <option aria-labelledby="date" value="25">25</option>
                                <option aria-labelledby="date" value="26">26</option>
                                <option aria-labelledby="date" value="27">27</option>
                                <option aria-labelledby="date" value="28">28</option>
                                <option aria-labelledby="date" value="29">29</option>
                                <option aria-labelledby="date" value="30">30</option>
                                <option aria-labelledby="date" value="31">31</option>
                            </select>
                        </li>
                        <li>
                            <select id="ksclivbdf-month" aria-label="month">
                                <option aria-labelledby="month" value="0">Tháng  </option>
                                <option aria-labelledby="month" value="1">Tháng 1</option>
                                <option aria-labelledby="month" value="2">Tháng 2</option>
                                <option aria-labelledby="month" value="3">Tháng 3</option>
                                <option aria-labelledby="month" value="4">Tháng 4</option>
                                <option aria-labelledby="month" value="5">Tháng 5</option>
                                <option aria-labelledby="month" value="6">Tháng 6</option>
                                <option aria-labelledby="month" value="7">Tháng 7</option>
                                <option aria-labelledby="month" value="8">Tháng 8</option>
                                <option aria-labelledby="month" value="9">Tháng 9</option>
                                <option aria-labelledby="month" value="10">Tháng 10</option>
                                <option aria-labelledby="month" value="11">Tháng 11</option>
                                <option aria-labelledby="month" value="12">Tháng 12</option>
                            </select>
                        </li>
                        <li>
                            <select id="ksclivbdf-year" aria-label="year">
                                                                    <option value="2020">2020</option>
                                                                    <option value="2021">2021</option>
                                                                    <option value="2022">2022</option>
                                                                    <option value="2023">2023</option>
                                                                    <option value="2024">2024</option>
                                                                    <option value="2025" selected="selected">2025</option>
                                                            </select>
                        </li>
                        <li>
                            <button type="button" class="ksclivbdf-view">Xem</button>
                        </li>
                    </ul>
                </div>
                <!-------------------------- VIEW BY DATE ----------------------->
            </div>

            <div class="ksc-list">
                <div class="kscli clearfix">
                    <div class="kscli-list">
                        <div class="kscli-list" data-cd-key="newsinzonedisplayinslide:zone215118;newsinzone:zone215118">
                                                                                                                                        <div class="rowccm" id="ccm_row1">
                                                                            <div class="tincungmucfocus">
                                            <a data-popup-url="/ngoc-trinh-choi-pickleball-cot-nha-vo-cung-thu-cuon-nhat-la-vong-eo-sieu-thuc-215250611072141204.chn" data-box="chm-detai1" title="Ngọc Trinh chơi pickleball &quot;cợt nhả vô cùng&quot;, thứ cuốn nhất là vòng eo siêu thực" href="/ngoc-trinh-choi-pickleball-cot-nha-vo-cung-thu-cuon-nhat-la-vong-eo-sieu-thuc-215250611072141204.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <video autoplay="true" muted="" loop="" playsinline="" class="lozad-video" poster="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/mong-nam-sau-duoc-be-con-di-chuc-tet-1749601191053703826846-0-0-400-640-crop-17496012134221155883965.gif.png" alt="Ngọc Trinh chơi pickleball &quot;cợt nhả vô cùng&quot;, thứ cuốn nhất là vòng eo siêu thực" data-src="https://kenh14cdn.com/203336854389633024/2025/6/11/mong-nam-sau-duoc-be-con-di-chuc-tet-1749601191053703826846-0-0-400-640-crop-17496012134221155883965.gif.mp4" type="video/mp4" style="">
                                                    </video>
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/ngoc-trinh-choi-pickleball-cot-nha-vo-cung-thu-cuon-nhat-la-vong-eo-sieu-thuc-215250611072141204.chn" data-box="chm-detai1" href="/ngoc-trinh-choi-pickleball-cot-nha-vo-cung-thu-cuon-nhat-la-vong-eo-sieu-thuc-215250611072141204.chn" title="Ngọc Trinh chơi pickleball &quot;cợt nhả vô cùng&quot;, thứ cuốn nhất là vòng eo siêu thực" data-id="0" data-linktype="newsdetail">
                                                        Ngọc Trinh chơi pickleball "cợt nhả vô cùng", thứ cuốn nhất là vòng eo siêu thực
                                                    </a>
                                                                                                        <span class="iconb-ccm">Nổi bật</span></h4>
                                                                                                </div>

                                        </div>
                                                                                                                                                                                        <div class="tincungmucfocus">
                                            <a data-popup-url="/cang-roi-thua-tham-0-4-malaysia-doi-tuyen-viet-nam-tut-doc-khong-phanh-tren-bang-xep-hang-fifa-215250611074951946.chn" data-box="chm-detai1" title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA" href="/cang-roi-thua-tham-0-4-malaysia-doi-tuyen-viet-nam-tut-doc-khong-phanh-tren-bang-xep-hang-fifa-215250611074951946.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <img loading="lazy" src="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/506029708245868742875692922658368993721635685n-1749601566524713373910-1749602912075-1749602912215848224631-160-0-1410-2000-crop-1749602933862291490578.jpg" class="" data-original="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/506029708245868742875692922658368993721635685n-1749601566524713373910-1749602912075-1749602912215848224631-160-0-1410-2000-crop-1749602933862291490578.jpg" title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA" width="220" height="140" style="display: block;">
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/cang-roi-thua-tham-0-4-malaysia-doi-tuyen-viet-nam-tut-doc-khong-phanh-tren-bang-xep-hang-fifa-215250611074951946.chn" data-box="chm-detai1" href="/cang-roi-thua-tham-0-4-malaysia-doi-tuyen-viet-nam-tut-doc-khong-phanh-tren-bang-xep-hang-fifa-215250611074951946.chn" title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA" data-id="0" data-linktype="newsdetail">
                                                        Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA
                                                    </a>
                                                                                                        <span class="iconb-ccm">Nổi bật</span></h4>
                                                                                                </div>

                                        </div>
                                                                                                                                                                                        <div class="tincungmucfocus">
                                            <a data-popup-url="/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-box="chm-detai1" title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia" href="/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <img loading="lazy" src="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-27-0-430-645-crop-1749609312410554656149.webp" class="" data-original="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-27-0-430-645-crop-1749609312410554656149.webp" title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia" width="220" height="140" style="display: block;">
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" data-box="chm-detai1" href="/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn" title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia" data-id="0" data-linktype="newsdetail">
                                                        HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
                                                    </a>
                                                                                                            <span class="ksclirn-time" title="-"> - </span>
                                                        <span class="ksclirn-time" title="2025-06-11T09:36:00">5 giờ trước</span>
                                                                                                </h4></div>

                                        </div>
                                                                                                                    </div>
                                                                                                                                                <div class="rowccm" id="ccm_row2">
                                                                            <div class="tincungmucfocus">
                                            <a data-popup-url="/nhin-lai-tran-thua-cua-doi-tuyen-viet-nam-truoc-malaysia-ong-kim-sang-sik-khong-the-tao-nen-phep-mau-215250611092516687.chn" data-box="chm-detai2" title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu" href="/nhin-lai-tran-thua-cua-doi-tuyen-viet-nam-truoc-malaysia-ong-kim-sang-sik-khong-the-tao-nen-phep-mau-215250611092516687.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <img loading="lazy" src="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/avatar1749608532179-17496085324601489419935-0-72-315-576-crop-1749608552506680652715.webp" class="" data-original="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/avatar1749608532179-17496085324601489419935-0-72-315-576-crop-1749608552506680652715.webp" title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu" width="220" height="140" style="display: block;">
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/nhin-lai-tran-thua-cua-doi-tuyen-viet-nam-truoc-malaysia-ong-kim-sang-sik-khong-the-tao-nen-phep-mau-215250611092516687.chn" data-box="chm-detai2" href="/nhin-lai-tran-thua-cua-doi-tuyen-viet-nam-truoc-malaysia-ong-kim-sang-sik-khong-the-tao-nen-phep-mau-215250611092516687.chn" title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu" data-id="0" data-linktype="newsdetail">
                                                        Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu
                                                    </a>
                                                                                                            <span class="ksclirn-time" title="-"> - </span>
                                                        <span class="ksclirn-time" title="2025-06-11T09:25:00">5 giờ trước</span>
                                                                                                </h4></div>

                                        </div>
                                                                                                                                                                                        <div class="tincungmucfocus">
                                            <a data-popup-url="/nang-wag-noi-tieng-phan-khich-khi-don-cac-thanh-vien-bts-xuat-ngu-cam-than-doi-anh-ve-em-lay-chong-luon-roi-215250611075028871.chn" data-box="chm-detai2" title="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!" href="/nang-wag-noi-tieng-phan-khich-khi-don-cac-thanh-vien-bts-xuat-ngu-cam-than-doi-anh-ve-em-lay-chong-luon-roi-215250611075028871.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <video autoplay="true" muted="" loop="" playsinline="" class="lozad-video" poster="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/mong-nam-sau-duoc-be-con-di-chuc-tet-1-17496029519831454549175-0-0-400-640-crop-1749602959406847169308.gif.png" alt="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!" data-src="https://kenh14cdn.com/203336854389633024/2025/6/11/mong-nam-sau-duoc-be-con-di-chuc-tet-1-17496029519831454549175-0-0-400-640-crop-1749602959406847169308.gif.mp4" type="video/mp4" style="">
                                                    </video>
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/nang-wag-noi-tieng-phan-khich-khi-don-cac-thanh-vien-bts-xuat-ngu-cam-than-doi-anh-ve-em-lay-chong-luon-roi-215250611075028871.chn" data-box="chm-detai2" href="/nang-wag-noi-tieng-phan-khich-khi-don-cac-thanh-vien-bts-xuat-ngu-cam-than-doi-anh-ve-em-lay-chong-luon-roi-215250611075028871.chn" title="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!" data-id="0" data-linktype="newsdetail">
                                                        Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!
                                                    </a>
                                                                                                            <span class="ksclirn-time" title="-"> - </span>
                                                        <span class="ksclirn-time" title="2025-06-11T08:39:00">6 giờ trước</span>
                                                                                                </h4></div>

                                        </div>
                                                                                                                                                                                        <div class="tincungmucfocus">
                                            <a data-popup-url="/lo-khoanh-khac-chu-thanh-huyen-ve-que-quang-hai-an-co-nhung-lay-phan-dem-ve-dan-tinh-lien-co-phan-ung-nay-21525061107090414.chn" data-box="chm-detai2" title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này" href="/lo-khoanh-khac-chu-thanh-huyen-ve-que-quang-hai-an-co-nhung-lay-phan-dem-ve-dan-tinh-lien-co-phan-ung-nay-21525061107090414.chn" class="knswa_border show-popup visit-popup">

                                                                                                    <img loading="lazy" src="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/aff-2025-06-11t070737371-1749600471835913772454-0-0-806-1290-crop-1749600477039568841360.png" class="" data-original="https://kenh14cdn.com/zoom/220_140/203336854389633024/2025/6/11/aff-2025-06-11t070737371-1749600471835913772454-0-0-806-1290-crop-1749600477039568841360.png" title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này" width="220" height="140" style="display: block;">
                                                                                            </a>
                                            <div class="info">
                                                <h4 class="ksclili-title">
                                                    <a class="show-popup visit-popup" data-popup-url="/lo-khoanh-khac-chu-thanh-huyen-ve-que-quang-hai-an-co-nhung-lay-phan-dem-ve-dan-tinh-lien-co-phan-ung-nay-21525061107090414.chn" data-box="chm-detai2" href="/lo-khoanh-khac-chu-thanh-huyen-ve-que-quang-hai-an-co-nhung-lay-phan-dem-ve-dan-tinh-lien-co-phan-ung-nay-21525061107090414.chn" title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này" data-id="0" data-linktype="newsdetail">
                                                        Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này
                                                    </a>
                                                                                                            <span class="ksclirn-time" title="-"> - </span>
                                                        <span class="ksclirn-time" title="2025-06-11T08:00:00">6 giờ trước</span>
                                                                                                </h4></div>

                                        </div>
                                                                                    <div id="admzone492749" class="pushed"></div>
                                            <script async="">
                                                if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone492749') })};
                                            </script>
                                                                                                                    </div>
                                                                                                                        </div>
                    </div>
                </div>

            </div>

            <div class="clearboth"></div>
        </div>
    </div>
</div><div data-break-ad="vt1" style="height: 0px" id="adm_sticky_footer1"></div>
    <input id="zoneId" type="hidden" value="sport">
<div id="splitBox" style="min-height: 20px; height: auto">
    <div id="admzone510943" class="pushed"></div>
</div>
<script async="">
    if (Constants.allow3rd) { admicroAD.unit.push(function () { admicroAD.show('admzone510943') }) }
    (runinit = window.runinit || []).push(function () {
        getViewBottomPage("#timelinedetail");
    });
    function getViewBottomPage(divInsert = null) {
        $.ajax({
            type: "GET",
            dataType: "html",
            url: `/ajax-loadmore-bottom-detail/215118.chn`,
            success: function (data) {
              $(divInsert).after(data)
            },
        });
    }
</script>
<div id="timelinedetail"></div>

            </div>
        </div>

    </div>
</div>


<input type="hidden" id="hfIsRedis" value="1">
<input type="hidden" name="adm_meta_thumb" id="adm_meta_thumb" value="https://kenh14cdn.com/zoom/280_175/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-27-0-430-645-crop-1749609312410554656149.webp">
<input type="hidden" name="adm_meta_thumb_500" id="adm_meta_thumb_500" value="https://kenh14cdn.com/zoom/500_314/203336854389633024/2025/6/11/kim-sang-sik-4062-9205jpg-1749595945235-17495959459301752991336-27-0-430-645-crop-1749609312410554656149.webp">
<div class="light-box-bounder">
    <div class="light-box-content">
        <div class="light-box loading">
        </div>
    </div>
    <div class="modal-button-container modal-close-button-container" data-analytics-activitymap-region-id="modal close button">
        <div class="modal-close-button-animator">
            <div class="modal-close-button-transform-container" style="transform: translateY(120px);">
                <button class="modal-button-target" data-modal-trigger-close="" aria-label="Close" style="width: 100px;"></button>
                <div id="modal-close-button" class="button modal-button button-secondary" aria-hidden="true" style="transform: translateX(-31.8047px);">
                    <div class="modal-button-opacity" style="opacity: 1;">
                        <span class="modal-button-start-cap"></span>
                        <span class="modal-button-scaler" style="transform: translateX(-2px) scaleX(60);"></span>
                        <span class="modal-button-end-cap" style="transform: translateX(56px);"></span>
                    </div>
                    <span class="modal-button-copy" style="opacity: 1;">Đóng</span>
                    <div class="modal-icon-container">
                    <span class="resetcircle-icon" style="opacity: 1;">
                        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 40 40" style="enable-background: new 0 0 40 40;" xml:space="preserve">
                            <path fill="white" stroke="none" d="M11.9,28.1c1.1,1.1,2.3,1.9,3.6,2.5c1.4,0.6,3,0.9,4.5,0.9s3.1-0.3,4.5-0.9c1.3-0.6,2.6-1.4,3.6-2.5
			s1.9-2.3,2.5-3.6c0.6-1.4,0.9-3,0.9-4.5s-0.3-3.1-0.9-4.5c-0.6-1.3-1.4-2.6-2.5-3.6s-2.3-1.9-3.6-2.5c-1.4-0.6-3-0.9-4.5-0.9
			s-3.1,0.3-4.5,0.9c-1.3,0.6-2.6,1.4-3.6,2.5s-1.9,2.3-2.5,3.6c-0.6,1.4-0.9,3-0.9,4.5s0.3,3.1,0.9,4.5C9.9,25.8,10.8,27.1,11.9,28.1
			z M10.8,16.1c0.5-1.1,1.2-2.3,2.1-3.2c0.9-0.9,2-1.6,3.2-2.1c1.2-0.5,2.6-0.8,3.9-0.8s2.7,0.3,3.9,0.8c1.2,0.5,2.3,1.2,3.2,2.1
			c1,1,1.6,2,2.1,3.2c0.5,1.2,0.8,2.6,0.8,3.9s-0.3,2.7-0.8,3.9c-0.5,1.2-1.2,2.3-2.1,3.2c-1,1-2,1.6-3.2,2.1C22.7,29.7,21.3,30,20,30
			s-2.7-0.3-3.9-0.8c-1.1-0.5-2.3-1.2-3.2-2.1c-1-1-1.6-2-2.1-3.2C10.3,22.7,10,21.3,10,20C9.9,18.7,10.2,17.3,10.8,16.1z">
                            </path>
                            <path fill="white" stroke="none" d="M16.3,24.7L20,21l3.7,3.7l1.1-1.1L21.1,20l3.7-3.7l-1.1-1.1L20,18.9l-3.7-3.6l-1,1L19,20l-3.7,3.7L16.3,24.7z"></path>
                        </svg>
                    </span>
                        <span class="reset-icon" style="transform: translateX(-50%) translateY(-50%) scale(0.5);">
                        <svg version="1.1" id="Layer_2" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 40 40" style="enable-background: new 0 0 40 40;" xml:space="preserve">
                            <path fill="white" stroke="none" d="M14.6,27l5.4-5.4l5.4,5.4l1.6-1.6L21.6,20l5.4-5.4L25.4,13L20,18.4L14.6,13L13,14.6l5.4,5.4L13,25.4L14.6,27z"></path>
                        </svg>
                    </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="close-wrap" style="display: none;">
        <div class="close">
            <div class="close-1"></div>
            <div class="close-2"></div>
        </div>
    </div>
</div>
        </div>
    </div>


    <div class="configHidden">
        <input type="hidden" name="hdZoneId" id="hdZoneId" value="215118">
                    <input type="hidden" name="hdZoneUrl" id="hdZoneUrl" value="sport">
                     <input type="hidden" name="hdParentUrl" id="hdParentUrl" value="">
                     <input type="hidden" name="hdNewsId" id="hdNewsId" value="215250611055629179">
                     <input type="hidden" name="hideLastModifiedDate" id="hideLastModifiedDate" value="2025-06-11T09:37:15"><input type="hidden" name="hdCommentDomain" id="hdCommentDomain" value="">
                     <input type="hidden" name="hdType" id="hdType" value="0">
                     <input type="hidden" name="hdNewsUrl" id="hdNewsUrl" value="/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn">
                     <input type="hidden" name="hdPublishDate" id="hdPublishDate" value="2025-06-11T09:36:00">
                     <input type="hidden" name="hdBrandContentId" id="hdBrandContentId" value="0">
                     <input type="hidden" name="hdBrandContentUrl" id="hdBrandContentUrl" value="">
                     <input type="hidden" name="hdThreadId" id="hdThreadId" value="0">
                     <input type="hidden" name="hdThreadUrl" id="hdThreadUrl" value="">
                     <input type="hidden" name="txtVideoToken" id="txtVideoToken" value="L3NlY3VyZS92ZXJpZnkveHZxcmNhZGhlYmZpMHY1dm5zM2Ywd3d3a3Y2MDdkMDgvMTAwMTAyL2V5SmhiR2NpT2lKSVV6STFOaUlzSW5SNWNDSTZJa3BYVkNKOS5leUp5WldZaU9pSWlMQ0poY0hCclpYa2lPaUo0ZG5GeVkyRmthR1ZpWm1rd2RqVjJibk16WmpCM2QzZHJkall3TjJRd09DSXNJbkJzWVhsbGNpSTZJakV3TURFd01pSXNJbWxuYm05eVpVVjRjR2x5WVhScGIyNGlPblJ5ZFdVc0ltbGhkQ0k2TVRVeU5ESTRNRGN6T1N3aVpYaHdJam94TlRJME1qZ3dOems1ZlEuRHZpSzNzS2V5N3lUbkFqam9jN2lWb2kyM2hESzdFWEw1QWVvSWhEOWx2UQ==">
                     <input type="hidden" name="hdLocation" id="hdLocation" value="0">
                     <input type="hidden" name="hiddenOriginalId" id="hiddenOriginalId" value="0">
                     <input type="hidden" name="hiddenTitle" id="hiddenTitle" value="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
                     <input type="hidden" name="hidLastModifiedDate" id="hidLastModifiedDate" value="2025/06/11 09:37:15">
                     <input type="hidden" name="hdPollId" id="hdPollId" value="">
                     <input type="hidden" name="tokennewsid" id="tokennewsid" value="">
                     <input type="hidden" name="distributionDate" id="distributionDate" value="2025-06-11T09:36:00">
        <input type="hidden" id="domainGetSoure" value="https://sudo.cnnd.vn">
    </div>
        </div>
        <div style="height: 0px" id="adm_sticky_footer"></div>
        <div id="admzone54" class="pushed"></div>
    <script>
        if (pageSettings.allow3rd) {
            'undefined' == typeof admicroAD.show ? admicroAD.unit.push(function () { admicroAD.show('admzone54') }) : admicroAD.show('admzone54');
        }
    </script>

        <div id="kenh14-footer-wrapper" class="kenh14-footer-wrapper">
    <div class="kfa-footer-menu">
        <div class="w1040">
            <ul class="kfa-list-footer-menu">
                <li class="kfa-footer-menu">
                    <a href="/star.chn" title="Star">Star</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/cine.chn" title="Ciné">Ciné</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/musik.chn" title="Musik">Musik</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/beauty-fashion.chn" title="Beauty &amp; Fashion">Beauty &amp; Fashion</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/sport.chn" title="Sport">Sport</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/doi-song.chn" title="Đời sống">Đời sống</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/xa-hoi.chn" title="Xã hội">Xã hội</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/an-quay-di.chn" title="Ăn - Quẩy - Đi">Ăn - Quẩy - Đi</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/xem-mua-luon.chn" title="Xem Mua Luôn">Xem Mua Luôn</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/the-gioi-do-day.chn" title="Thế giới đó đây">Thế giới đó đây</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/suc-khoe.chn" title="Sức khỏe">Sức khỏe</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/tek-life.chn" title="Tek-Life">Tek-Life</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/hoc-duong.chn" title="Học đường">Học đường</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="/money-z.chn" title="Money-Z">Money-Z</a>
                </li>
                <li class="kfa-footer-menu">
                    <a href="http://video.kenh14.vn/" title="Video">Video</a>
                </li>
            </ul>
            <!-- End .kfa-list-footer-menu -->
        </div>
    </div>
    <div class="w1040">
        <footer class="new-footer">
            <div class="clearfix">
                <div class="top-footer fl clearfix">
                    <a href="http://kenh14.vn/" title="Kênh 14" class="k14-footer-logo k14h-sprite"></a>
                    <div class="user-response clearfix">
                        <span class="group-title">ĐÓNG GÓP NỘI DUNG</span>
                        <div class="clearfix">
                            <a href="/static/faq-lightbox.htm" title="Câu hỏi thường gặp" class="btn-faq-popup fancybox.iframe">câu hỏi thường gặp</a>
                            <a rel="nofollow" target="_blank" href="mailto:bandoc@kenh14.vn" class="faq-mail">bandoc@kenh14.vn</a>
                        </div>
                        <p>Kenh14.vn rất hoan nghênh độc giả gửi thông tin và góp ý cho chúng tôi.</p>
                    </div>
                </div>
                <div class="fb-page fr" style="width: 500px;">
                    <div class="fb-page" data-href="https://www.facebook.com/K14vn" data-width="500" data-small-header="false" data-adapt-container-width="true" data-hide-cover="false" data-show-facepile="false">
                        <blockquote cite="https://www.facebook.com/K14vn" class="fb-xfbml-parse-ignore"><a title="facebook" href="https://www.facebook.com/K14vn"></a></blockquote>
                    </div>
                </div>
            </div>
            <!-- End .top-footer -->

            <div class="footer-bottom clearfix">
                <div class="footer-col">
                    <div class="k14-address">
                        <p class="col-title">trụ sở hà nội</p>

                        <p>
                            Tầng 21, Tòa nhà Center Building, Hapulico Complex, số 1 Nguyễn Huy Tưởng, phường Thanh Xuân Trung, quận Thanh Xuân, Hà Nội.
                            <br>Điện thoại: 024 7309 5555, máy lẻ 62.370
                        </p>
                        <a rel="nofollow" href="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d931.2056353845325!2d105.80772655513327!3d20.999749453353736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ac9788f39f1d%3A0xfe0d7beb1d82d125!2zSGFwdWxpY28gQ29tcGxleCwgVGhhbmggWHXDom4gVHJ1bmcsIFRoYW5oIFh1w6JuLCBIw6AgTuG7mWksIFZpZXRuYW0!5e0!3m2!1sen!2s!4v1434096825076" class="btn-view-map fancybox.iframe" title="Xem bản đồ">xem bản đồ</a>
                    </div>
                    <div class="k14-address">
                        <p class="col-title">trụ sở tp.hồ chí minh</p>
                        <p>
                            Tầng 4, Tòa nhà 123, số 127 Võ Văn Tần, phường 6, quận 3, TP. Hồ Chí Minh.
                            <br>Điện thoại: 028 7307 7979
                        </p>
                        <a rel="nofollow" href="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.463428635451!2d106.689822!3d10.775774!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f3b1ecb0111%3A0x45e6492955b75232!2zMTIzIFbDtSBWxINuIFThuqduLCBwaMaw4budbmcgNiwgUXXhuq1uIDMsIEjhu5MgQ2jDrSBNaW5oLCBWaWV0bmFt!5e0!3m2!1sen!2s!4v1434097259116" class="btn-view-map fancybox.iframe" title="Xem bản đồ">xem bản đồ</a>
                    </div>
                </div>
                <!-- End .footer-col -->

                <div class="footer-col">
                    <div class="associate">
                        <p class="col-title">chịu trách nhiệm quản lý nội dung</p>

                        <p class="pl0">Bà Nguyễn Bích Minh</p>
                    </div>
                    <div class="associate">
                        <p class="col-title">hợp tác truyền thông</p>

                        <p class="phone-footer">024.73095555  (máy lẻ 62.370)</p>
                        <a rel="nofollow" href="mailto:marketing@kenh14.vn" class="associate-mail">marketing@kenh14.vn</a>
                    </div>
                    <div class="associate">
                        <p class="col-title">liên hệ quảng cáo</p>

                        <p class="phone-footer" id="phonenumber_footer">02473007108</p>
                        <a rel="nofollow" href="mailto:giaitrixahoi@admicro.vn" class="associate-mail">giaitrixahoi@admicro.vn</a>
                        <div class="clearfix">
                            <a rel="nofollow" href="https://www.messenger.com/t/K14vn" title="Xem chi tiết" target="_blank" class="btn-messenger-lightbox"><span class="messenger-icon">
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M2.185,12.001 C2.522,11.817 2.845,11.639 3.154,11.468 C3.463,11.298 3.772,11.134 4.081,10.977 C4.147,10.940 4.226,10.914 4.320,10.900 C4.414,10.887 4.503,10.889 4.587,10.907 C5.261,11.046 5.926,11.085 6.582,11.025 C7.237,10.965 7.884,10.801 8.521,10.533 C9.410,10.155 10.136,9.626 10.698,8.948 C11.260,8.269 11.640,7.533 11.836,6.739 C12.033,5.945 12.033,5.132 11.836,4.301 C11.640,3.470 11.223,2.709 10.586,2.016 C10.155,1.545 9.694,1.157 9.202,0.853 C8.710,0.548 8.195,0.324 7.657,0.181 C7.118,0.038 6.561,-0.024 5.985,-0.006 C5.409,0.013 4.812,0.110 4.194,0.285 C3.669,0.433 3.184,0.629 2.740,0.873 C2.295,1.118 1.901,1.411 1.559,1.753 C1.217,2.095 0.927,2.485 0.688,2.923 C0.450,3.362 0.269,3.849 0.148,4.384 C0.026,4.920 -0.021,5.428 0.007,5.908 C0.035,6.388 0.129,6.847 0.288,7.286 C0.447,7.724 0.674,8.142 0.969,8.539 C1.264,8.936 1.613,9.315 2.016,9.675 C2.063,9.712 2.103,9.767 2.135,9.841 C2.168,9.915 2.185,9.979 2.185,10.035 C2.194,10.358 2.196,10.679 2.192,10.997 C2.187,11.316 2.185,11.651 2.185,12.001 L2.185,12.001 ZM5.304,4.107 C5.585,4.357 5.861,4.604 6.132,4.848 C6.404,5.093 6.685,5.345 6.975,5.603 C7.415,5.363 7.865,5.118 8.324,4.869 C8.783,4.620 9.246,4.370 9.715,4.121 C9.724,4.130 9.731,4.137 9.736,4.142 C9.741,4.147 9.748,4.154 9.757,4.163 C9.495,4.440 9.235,4.712 8.977,4.980 C8.720,5.248 8.462,5.518 8.205,5.790 C7.947,6.062 7.689,6.330 7.432,6.593 C7.174,6.856 6.919,7.122 6.666,7.390 C6.395,7.140 6.121,6.891 5.844,6.642 C5.568,6.392 5.285,6.143 4.994,5.894 C4.554,6.134 4.102,6.379 3.639,6.628 C3.175,6.877 2.709,7.131 2.241,7.390 C2.241,7.381 2.231,7.367 2.213,7.348 C2.475,7.071 2.735,6.796 2.992,6.524 C3.250,6.252 3.507,5.979 3.765,5.707 C4.023,5.435 4.280,5.165 4.538,4.897 C4.795,4.629 5.051,4.366 5.304,4.107 L5.304,4.107 L5.304,4.107 Z" fill="#fff"></path>
                        </svg>
                    </span>Chat với tư vấn viên</a>
                            <a rel="nofollow" href="/adv.chn" title="Xem chi tiết" target="_blank" class="btn-associate-lightbox">xem chi tiết</a>
                        </div>
                    </div>
                    <div class="associate">
                        <p class="col-title">

                            <a rel="nofollow" target="_blank" href="/static/chinh-sach-bao-mat.htm">Chính sách bảo mật</a>
                        </p>
                    </div>
                </div>
                <!-- End .footer-col -->

                <div class="footer-col">
                    <a rel="nofollow" href="https://vccorp.vn/" title="Công ty Cổ phần VCCorp" target="_blank" class="vccorp-footer-logo">
                        <img src="https://kenh14cdn.com/web_images/vccorp-s.png" width="100" height="49" loading="lazy" alt="Vccorp">
                    </a>
                    <p class="col-title"><span>© Copyright 2007 - 2025 – </span>Công ty Cổ phần VCCorp</p>

                    <p>Tầng 17, 19, 20, 21 Tòa nhà Center Building - Hapulico Complex, Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội.</p>
                    <p>Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số 2215/GP-TTĐT do Sở Thông tin và Truyền thông Hà Nội cấp ngày 10 tháng 4 năm 2019</p>
                </div>
                <!-- End .footer-col -->

            </div>

        </footer>
    </div>
</div>
<div id="fb-root"></div>
<script>
    if (!isLightHouse) {
        loadJsAsync('https://static.mediacdn.vn/common/js/configsiteinfo.v1.min.js');
        (runinit = window.runinit || []).push(function () {
            var footerFbSdk = {
                isLoaded: false,
                init: function () {
                    var me = this;
                    $(window).scroll(function () {
                        if ($('.k14-home').length > 0 && $('#liSuKien').length > 0) {
                            var pScrollCuon = $(window).scrollTop();
                            var liSuKienTop = $('#liSuKien').offset().top;
                            if (pScrollCuon >= liSuKienTop && !me.isLoaded) {
                                me.LoadFbSdk();
                                me.isLoaded = true;
                            }
                        }
                        else if (!me.isLoaded) {
                            me.LoadFbSdk();
                            me.isLoaded = true;
                        }
                    });
                },
                LoadFbSdk: function () {
                    (function (d, s, id) {
                        var js, fjs = d.getElementsByTagName(s)[0];
                        if (d.getElementById(id)) return;
                        js = d.createElement(s); js.id = id;
                        js.src = "//connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v2.8";
                        fjs.parentNode.insertBefore(js, fjs);
                    }(document, 'script', 'facebook-jssdk'));
                }
            };

            footerFbSdk.init();
        });
    }

</script>
<script>
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            loadJsAsync('https://static.contineljs.com/js_boxapp/tagsponsorz_40402.js');
                            var url='sport';
                        (runinit = window.runinit || []).push(function () {
                $('#k14-main-menu-wrapper .kbh-menu-list .kmli a[href="/' + url + '.chn"]').parents('li').addClass('active');
            });
        });
    }
</script>
    <script type="text/javascript">
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(swReg => {
                        console.log('Service Worker is registered', swReg);
                    })
                    .catch(err => {
                        console.error('Service Worker Error', err);
                    });
            });
        }
    </script>
    

    <script type="text/javascript">
        var _chkPrLink = false;
        var _isAdsHidden = false;
        var isLoadedDetailJs = true;
                var zoneid = 215118;
                var domainGetSoure='';
    </script>

    
    <script>
        try{
            gtag("event", window.location.href, {
                event_category: "Click_ShowPopup",
                event_label: ""
            })
            gtag('event', 'page_view', {
                'send_to': 'GTM-M5B7X8N',
                'page_title': document.title,
                'page_path': top.location.pathname
            });
        }catch(e){}
    </script>
<script type="text/javascript">
    if (!isLightHouse) {
        loadJsAsync('https://ms.mediacdn.vn/prod/quiz/sdk/dist/play.js', function () { });
        
            loadJsAsync('https://kenh14cdn.com/web_js/20250122/kenh14.detail-ims2.min.js?v55', function () {
                loadJsAsync('https://kenh14cdn.com/web_js/20240730/kenh14.detail-common-ims2.min.js?v55', function () {});
            });

        

    }
    (runinit = window.runinit || []).push(function () {
        loadJsAsync('https://event.mediacdn.vn/257766952064241664/2022/3/11/embed-sticker-box-config-16469916772921407492070.js', function () {
        });
        loadJsAsync('https://event.mediacdn.vn/257766952064241664/2021/7/20/embed-special-box-html-config-1626773084303819043504.js', function () {
        });
        loadJsAsync('https://static.mediacdn.vn/common/js/videoplayerV2_1623769512V6.js', function () {
        });

        loadJsAsync('https://event.mediacdn.vn/257767050295742464/2023/10/6/betterchoice-box-config-16965643366712090510173.js', function () {
        });
        if ($(".VCSortableInPreviewMode[type=quizv2]").length > 0) {
            $(function () {
                loadQuizIms_v2();
            });
        }
    });
</script>
<script async="" type="text/javascript">
    var titleForImage = 'HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia';
    var newsId = '215250611055629179';
    var currentNewsId = '215250611055629179';
    //popup related
    var relatedPopupId;
    var refUrl = '/hlv-kim-sang-sik-xin-loi-nguoi-ham-mo-neu-ly-do-khien-tuyen-viet-nam-thua-dam-malaysia-215250611055629179.chn';
    var refTitle = "HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia";
    var popupEnd = "";
    var newsIdPopupEnd = '0';
    //end popup related
    var quizApiNamespace = 'imsk14.channelvn.net';
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            initDongSuKien(); // get tin dòng sự kiện cho hậu phẫu -- detail.js
            camera360andPanorama(); // dạng ảnh 360 và dạng panorama

            poll.init();
            $(function () {
                videoInContent.init('.knc-content');
            });
            //});

            getFbDataByObj('.item-fb-total', 'total', false, true);
            
            var divAvatarVideo = $('.kbwc-video-cover .VCSortableInPreviewMode[type="VideoStream"]');

            if (divAvatarVideo.length > 0) {
                //videoHD.isMute = true;
                //videoHD.isAd = false;
                //videoHD.isHideControlbar = false;
                videoHD.init('.kbwc-video-cover', {
                    type: videoHD.videoType.newsDetail,
                    isAd: false
                });
                divAvatarVideo.append(divAvatarVideo.find('iframe'));
                divAvatarVideo.find('.iframe-wraper').remove();
            }

            $(function () {
                var sourceUrl = "https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm";
                var ogId = 0;
                if (sourceUrl == '') {
                    if (ogId > 0)
                        getOrgUrl($('#hdNewsId').val(), 2, '#urlSourceKenh14', '11/06/2025 09:36:00', ogId, "HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia");
                } else
                    $('#urlSourceKenh14').show();

                $('#urlSourceKenh14 .btn-copy-link-source').on('click', function () {
                    if ($(this).hasClass('disable'))
                        return false;

                    var str = $(this).attr('data-link');
                    if (str != '') {
                        copyStringToClipboard(str);
                        $(this).find('i').text('Link đã copy!');

                        setTimeout(function () {
                            $('.btn-copy-link-source').find('i').text('Lấy link');
                            $('#urlSourceKenh14 .btn-copy-link-source').addClass('disable');
                            $('#urlSourceKenh14 .link-source-full').removeClass('active');
                        }, 3000);
                    }
                });

                $('.btn-copy-link-source2').on('click', function (e) {
                    if (!$('.link-source-wrapper .link-source-detail').hasClass('show'))
                        $('.link-source-wrapper .link-source-detail').addClass('show').show();
                    else {
                        $('.link-source-wrapper .link-source-detail').removeClass('show').hide();
                    }
                });
                $('#urlSourceKenh14 .link-source-full').mouseup(function () {
                    if ($(this).hasClass('active')) {
                        $('#urlSourceKenh14 .btn-copy-link-source').addClass('disable');
                        $(this).removeClass('active');
                    } else {
                        $('#urlSourceKenh14 .btn-copy-link-source').removeClass('disable');
                        $(this).addClass('active');
                    }
                });

                videoInContent.init('.kbwc-video-cover');
            });
        });
    }


        function htmlToElement(html) {
        var template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstChild;
    }
    (runinit = window.runinit || []).push(function () {
        if (Constants.allow3rd) {
            //Chèn mutexAds vào nội dung bài
            if (!$('.kenh14-wrapper').hasClass('size-s')) {
                var mutexAds = '<div id="admzone474524" class="wp100 clearfix"></div>'; //html chèn div ở đây
                var content = $('#k14-detail-content').find('[data-role="content"]'); //class content tương ứng trên site
                if (content.length > 0) {
                    var childNodes = content[0].childNodes;
                    for (i = 0; i < childNodes.length; i++) {
                        var childNode = childNodes[i];

                        var isPhotoOrVideo = false;
                        if (childNode.nodeName.toLowerCase() == 'div') {
                            // kiem tra xem co la anh khong?
                            var type = $(childNode).attr('class') + '';

                            if (type.indexOf('VCSortableInPreviewMode') >= 0) {
                                isPhotoOrVideo = true;
                            }
                        }

                        try {
                            if ((i >= childNodes.length / 2 - 1) && (i < childNodes.length / 2) && !isPhotoOrVideo) {
                                if (i <= childNodes.length - 3) {
                                    childNode.after(htmlToElement(mutexAds));
                                    admicroAD.unit.push(function () {
                                        admicroAD.show('admzone474524')
                                    }); //thay js ở đây
                                }
                                break;
                            }
                        } catch (e) {
                        }
                    }
                }
            }

            //Check height iframe body
            $.each($('.VCSortableInPreviewMode[type="insertembedcode"] iframe[src*="https://www.youtube.com"]'), function (key, val) {
                var $this = $(this);
                $this.height($this.width() * 9 / 16);
            });
            $.each($('.VCSortableInPreviewMode[type="insertembedcode"] iframe[src*="https://player.sohatv.vn"]'), function (key, val) {
                var $this = $(this);
                $this.height($this.width() * 9 / 16);
            });
        }
    });
    </script>
<script async="" type="text/javascript">
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            (function (d, s, id) {
                var js, pjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {
                    window.IMSMediaUnit && window.IMSMediaUnit.Init({});
                    return;
                }
                js = d.createElement(s);
                js.id = id;
                js.src = 'https://ccd.mediacdn.vn/mediaunit/media-plugin.min.js';
                js.addEventListener('load', function () {
                    window.IMSMediaUnit && window.IMSMediaUnit.Init({});
                });
                pjs.parentNode.insertBefore(js, pjs);
            }(document, 'script', 'media-unit-jssdk'));

        });
    }
</script>
<script type="text/javascript">
    if (Constants.allow3rd) {
        loadJsAsync('//media1.admicro.vn/js_tvc/replayVideo_min.js', function () {
        });
        loadJsAsync('//static.contineljs.com/js_boxapp/tagsponsorz_40402.js', function () {
        });
    }
</script>
<script async="" type="text/javascript">
    
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            if ($(".content-video .video_top_detail").length > 0) {
                videoHD.init('.content-video .video_top_detail', {
                    type: videoHD.videoType.newsDetail,
                    isAd: false
                });
            }
            if ($("#wrapperlive").length > 0) {
                var card = $.parseJSON(''); //<%= resultVideoLive %> type==92
                card = card.result.data[0];
                if (card) {
                    let paramInit = {
                        postid: card.id,
                        itemid: card.data[0].id,
                        ownerUserId: card.user.id,
                        ownerFullName: card.user.full_name,
                        ownerAvatar: card.user.avatar,
                        thumb: card.data[0].thumb,
                        file: card.data[0].link,
                        height: card.data[0].height,
                        width: card.data[0].width,
                        isPlayerLive: 1,
                        cardtype: card.card_type,
                        type: card.data[0].type,
                        postCreatedAt: card.card_info.created_at ? card.card_info.created_at : ''
                    };
                    if (card.extension.live_streaming == 0 || card.extension.live_streaming == 1) {
                        paramInit.liveStreaming = card.extension.live_streaming;
                        lotusPlayer.init(paramInit);
                        var videoTag = lotusPlayer.buildVideoTag();
                        $('#wrapperlive').append(videoTag);
                        lotusPlayer.initPlayer($('#wrapperlive'));
                    }
                }
            }

            var sohatvIframe = $('iframe[src*="https://player.sohatv.vn"]');
            if (sohatvIframe.length > 0) {
                $.each(sohatvIframe, function (key, val) {
                    var $this = $(this);
                    $this.height($this.width() * 9 / 16);
                });
            }
        });
    }
</script>
<script type="text/javascript">
    var NewsInZone = '215118';
    window.NewsInZone = '215118';
    var _ADM_bkid = '0'
    if (!isLightHouse) {
        (runinit = window.runinit || []).push(function () {
            fbClient.init();
                        //Gắn embed TTS
            loadJsAsync('https://static.mediacdn.vn/common/js/embedTTSv13min.js', function () {
                embedTTS.init({
                    apiCheckUrlExists: 'https://speech.aiservice.vn/tts/get_file',
                    wrapper: '.af-tts', //chỗ chứa embed trên trang
                    cookieName: 'embedTTS', //Tên cookie để lưu lại lựa chọn tiếng nói của user
                    primaryColor: '#fa6b24', //Màu sắc chủ đạo của kênh
                    newsId: '215250611055629179', //NewsId cần lấy
                    distributionDate: '2025/06/11', //Thời gian xuất bản của tin, theo format yyyy/MM/dd
                    nameSpace: 'kenh14', //Namespace của kênh
                    domainStorage: 'https://tts.mediacdn.vn', //Domain storage, k cần đổi
                    srcAudioFormat: '{0}/{1}/{2}-{3}-{4}.{5}', //'https://tts.mediacdn.vn/2021/05/18/afmily-nam-20210521115520186.wav
                    ext: 'm4a', //ext của file, có thể là 'mp3', 'wav', 'raw', 'ogg', 'm4a'
                    defaultVoice: 'nu' //giọng mặc định, ‘nam’ hoặc ‘nu’
                });
            });
            
            //init audiopodcast
            if ($('.VCSortableInPreviewMode[type="podcast"]').length > 0) {
                $('.VCSortableInPreviewMode[type="podcast"]').each(function () {
                    var $this = $(this);
                    var paramsPodCast = {
                        title: $this.attr('data-title'),
                        description: $this.attr('data-description'),
                        thumbBox: $this.attr('data-thumbbox'),
                        thumbBackground: $this.attr('data-thumbbackground'),
                        file: $this.attr('data-file'),
                        titleAudio: $this.attr('data-titleaudio')
                    };
                    console.log(paramsPodCast)
                    initAudioPodcastEmbed($this.attr('id'), paramsPodCast);
                });
            }


        });
    }
    function loadQuizIms_v2() {
        if (typeof pageSettings.DomainUtils == "undefined")
            pageSettings.DomainUtils = "https://utils3.cnnd.vn";
        var ns=pageSettings.commentSiteName
        var getTokenFunction = function (callback) {
            $.ajax({
                type: 'POST',
                url: pageSettings.DomainApiVote + '/quiztk.chn?ns='+ns,
                dataType: "json",timeout: 5000,
                success: function (res) {
                    if (typeof (res) == 'string') res = JSON.parse(res);
                    var data = res.message;
                    if (typeof (data) == 'string') data = JSON.parse(data);
                    callback(data.token);
                }
            });
        };
        if ($(".quizplatform-embed").length > 0) {
            QuizPlatform.initPlay({
                getTokenFunction: getTokenFunction
            });
        }



    }
</script>
    <script>
    (runinit = window.runinit || []).push(function() {
        if ($(".link-source-wrapper").length > 0) {
            var distributionDateSource = "06\/11\/2025 08:09";
            if (distributionDateSource && distributionDateSource.trim() !== "") {
                $(".link-source-name").append(`<span class="time-source-detail">${distributionDateSource} (GMT +7)</span>`)
            }
        }
    });
</script>
<script type="text/javascript">
    (runinit = window.runinit || []).push(function () {
        $(document).ready(function () {
            $("#btn-close").click(function () {
                $(".liveIndicator-noti").css("display", "none");
            });
        });
    });
</script>


    <script>
        if (!isLightHouse) {
            (runinit = window.runinit || []).push(function () {
                loadJsAsync('https://adi.admicro.vn/adt/tvc/files/js/adm-box-mutex-stream/adm_box_mutex_stream_min.js', function () {
                    if (typeof (newsId) == 'undefined') {
                        admDrawList(500208);
                    }
                });
            });
        }
    </script>
<div>
    <input type="hidden" name="dbcheck" id="dbcheck" value="DetailCloud3_Kenh14kenh14v2_php_web">
</div>




  </body></html>'''

    print("\n--- Optimized Function Output ---")
    cleaned_optimized = clean_html_optimized(sample_html)
    print(cleaned_optimized)
    
    # Writing the output to a file for verification
    try:
        with open("final_output1.txt", "w", encoding="utf-8") as f:
            f.write(cleaned_optimized)
        print("\nSuccessfully wrote output to final_output1.txt")
    except IOError as e:
        print(f"\nError writing to file: {e}")