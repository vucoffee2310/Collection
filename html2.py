import re
import json

def parse_html_for_cleaning(html_string):
    """
    Parses HTML to identify tag content and attributes with their full string
    representation for precise removal. (Optimized Version)
    """
    # Regex patterns remain the same
    token_regex = r'(<[^>]+>)|([^<]+)'
    tag_content_regex = r'<\s*([a-zA-Z0-9]+)\s*([^>]*?)>'
    attr_regex = r'([a-zA-Z0-9_-]+)\s*=\s*"[^"]*"'

    # --- OPTIMIZATION 1: Efficient Line Number Calculation ---
    # Pre-calculate all newline positions
    line_starts = [m.start() for m in re.finditer(r'\n', html_string)]
    line_idx = 0
    
    parsed_data = []
    
    for match in re.finditer(token_regex, html_string):
        # Efficiently update the current line number as we parse sequentially
        while line_idx < len(line_starts) and match.start() > line_starts[line_idx]:
            line_idx += 1
        current_line_num = line_idx + 1

        tag_part, text_part = match.groups()

        if tag_part:
            tag_content_match = re.search(tag_content_regex, tag_part)
            if tag_content_match:
                attribute_string_area = tag_content_match.group(2)
                attributes_found = list(re.finditer(attr_regex, attribute_string_area))
                
                if attributes_found:
                    attr_obj = {'line_address': current_line_num, 'type': 'attr', 'attributes': []}
                    for attr_match in attributes_found:
                        full_attr_string = attr_match.group(0)
                        value_match = re.search(r'"([^"]*)"', full_attr_string)
                        value = value_match.group(1) if value_match else ""
                        clean_value = value.replace('&quot;', '"').replace('&amp;', '&')
                        attr_obj['attributes'].append({
                            'full_string': full_attr_string,
                            'value': clean_value
                        })
                    parsed_data.append(attr_obj)
        
        elif text_part:
            content = text_part.strip()
            if content:
                parsed_data.append({
                    'line_address': current_line_num,
                    'type': 'tag',
                    'content': content
                })

    return parsed_data

def clean_html_duplicates(html_content):
    """
    Cleans an HTML string by removing only the duplicate attributes from tags,
    not the entire tag line. Comparisons are case-insensitive. (Optimized Version)
    """
    parsed_data = parse_html_for_cleaning(html_content)
    removals = {} # {line_number: set(full_attribute_strings_to_remove)}

    def add_removal(line_num, attr_full_string):
        removals.setdefault(line_num, set()).add(attr_full_string)

    # --- OPTIMIZATION 2: Pre-process data into lookup maps ---
    # This avoids all major nested-loop comparisons.
    
    # 1. Create a map of all attribute values for fast lookups.
    # value_map: {'normalized_value': [list of attributes with that value]}
    value_map = {}
    # 2. Create a flat list of all text content for Rule 1.
    all_text_content = set()

    for i, item in enumerate(parsed_data):
        item['id'] = i # Assign a unique ID for easy reference
        if item['type'] == 'attr':
            for attr in item['attributes']:
                norm_value = attr['value'].strip().lower()
                if not norm_value: continue
                
                attr_info = {
                    'parent_item_id': i,
                    'line_address': item['line_address'],
                    'full_string': attr['full_string'],
                }
                value_map.setdefault(norm_value, []).append(attr_info)
        elif item['type'] == 'tag':
            all_text_content.add(item['content'].strip().lower())

    # 3. Pre-calculate the "succeeding tag" line for every item in one pass.
    last_seen_tag_line = -1
    for item in reversed(parsed_data):
        item['succeeding_tag_line'] = last_seen_tag_line
        if item['type'] == 'tag':
            last_seen_tag_line = item['line_address']

    # --- Rule 1: Compare Tag Content to Attribute Content (Optimized) ---
    print("--- Applying Rule 1: Tag vs. Attribute (case-insensitive) ---")
    for text_content in all_text_content:
        if text_content in value_map:
            # Instant lookup, no nested loop needed
            for attr_to_remove in value_map[text_content]:
                print(f"Match (Tag vs Attr): Text content '{text_content}' duplicates Attribute on line {attr_to_remove['line_address']}. Marking '{attr_to_remove['full_string']}' for removal.")
                add_removal(attr_to_remove['line_address'], attr_to_remove['full_string'])

    # --- Rule 2: Compare Attribute Content to other Attribute Content (Optimized) ---
    print("\n--- Applying Rule 2: Attribute vs. Attribute (case-insensitive) ---")
    for norm_value, duplicate_group in value_map.items():
        if len(duplicate_group) <= 1:
            continue

        # Filter out attributes already marked for removal by Rule 1
        active_duplicates = [
            attr for attr in duplicate_group 
            if attr['line_address'] not in removals or attr['full_string'] not in removals[attr['line_address']]
        ]
        
        if len(active_duplicates) <= 1:
            continue
        
        # Find the attribute to KEEP based on the distance logic
        attr_to_keep = None
        # First, check for items with a succeeding tag
        with_succeeding_tag = [d for d in active_duplicates if parsed_data[d['parent_item_id']]['succeeding_tag_line'] != -1]
        
        if with_succeeding_tag:
            # Keep the one with the minimum distance to its succeeding tag
            attr_to_keep = min(with_succeeding_tag, key=lambda d: parsed_data[d['parent_item_id']]['succeeding_tag_line'] - d['line_address'])
        else:
            # If no items have a succeeding tag, keep the one that appears latest in the file
            attr_to_keep = max(active_duplicates, key=lambda d: d['line_address'])

        # Mark all others in the group for removal
        for attr_to_remove in active_duplicates:
            if attr_to_remove is not attr_to_keep:
                print(f"Match (Attr vs Attr): Duplicate value '{norm_value}'. Removing '{attr_to_remove['full_string']}' from line {attr_to_remove['line_address']} to keep closer one.")
                add_removal(attr_to_remove['line_address'], attr_to_remove['full_string'])

    # --- Reconstruct the HTML (no changes needed here) ---
    print(f"\nFinal Removals Plan: {json.dumps({k: list(v) for k, v in removals.items()}, indent=2)}")
    
    html_lines = html_content.splitlines()
    final_lines = []
    for i, line in enumerate(html_lines):
        current_line_num = i + 1
        modified_line = line
        if current_line_num in removals:
            print(f"Modifying line {current_line_num}: {line.strip()}")
            for attr_string_to_remove in removals[current_line_num]:
                pattern = r'\s*' + re.escape(attr_string_to_remove)
                modified_line = re.sub(pattern, '', modified_line, count=1)
            print(f"  -> Result: {modified_line.strip()}")
        final_lines.append(modified_line)

    return "\n".join(final_lines)

# --- Example Usage ---
if __name__ == "__main__":
    html_snippet = """<html>
<head>
<meta content="text/html; charset=utf-8">
<title>
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</title>
<meta content="Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi">
<meta content="HLV Kim Sang-sik, tuyển Việt Nam">
<meta content="HLV Kim Sang-sik, tuyển Việt Nam">
<meta content="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
<meta content="Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi">
<meta content="article">
<meta>
<meta>
<meta content="image/jpg">
<meta>
<meta>
<meta>
<meta>
<link>
<link>
<link>
<meta>
<meta>
<meta>
<meta>
<meta content="Hải Đăng">
<meta content="width=device-width, initial-scale=1, maximum-scale=5, minimal-ui">
<meta>
<meta content="vi">
<meta content="Global">
<meta content="General">
<meta content="Document">
<meta content="1 days">
<meta>
<meta content="GENERAL">
<link>
<meta>
<meta content="VCCorp.vn">
<meta>
<meta content="Copyright (c) by Công ty cổ phần Vccorp">
<meta content="on">
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
</head>
<body>
<div>
</div>
<div>
<div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a title="Magazine">
eMagazine
</a>
</li>
<li>
<a title="Genz Area">
Genz Area
</a>
</li>
<li>
<a title="XANH chưa - check!!!">
XANH chưa - check!!!
</a>
</li>
<li>
<a title="Kenh14 showlive">
ShowLive
</a>
</li>
</ul>
<div>
<p>
</p>
<a title="tìm kiếm">
<span>
</span>
</a>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<a title="Tin tức, giải trí, xã hội">
</a>
</div>
<div>
<ul>
<div>
<li>
<a title="G-Dragon biểu diễn tại SVĐ Mỹ Đình">
G-Dragon biểu diễn tại SVĐ Mỹ Đình
</a>
</li>
<li>
<a title="Diễn viên Ngân Hòa bị suy thận giai đoạn cuối">
Diễn viên Ngân Hòa bị suy thận giai đoạn cuối
</a>
</li>
</div>
</ul>
</div>
<div>
<a>
<span>
<span>
</span>
</span>
<span>
<span>
<span>
</span>
<span>
</span>
<span>
</span>
</span>
<span>
<b>
</b>
</span>
</span>
</a>
</div>
<div>
<ul>
<li>
<a>
<span>
GÓP Ý GIAO DIỆN MỚI
</span>
</a>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<ul>
<li>
<a title="Trang chủ">
TRANG CHỦ
</a>
</li>
<li>
<a title="Star">
Star
</a>
</li>
<li>
<a title="Ciné">
Ciné
</a>
</li>
<li>
<a title="Musik">
Musik
</a>
</li>
<li>
<a title="Beauty &amp;amp; Fashion">
Beauty &amp;amp; Fashion
</a>
</li>
<li>
<a title="Đời sống">
Đời sống
</a>
</li>
<li>
<a title="Money-Z">
Money-Z
</a>
</li>
<li>
<a title="Ăn - Quẩy - Đi">
Ăn - Quẩy - Đi
</a>
</li>
<li>
<a title="Xã hội">
Xã hội
</a>
</li>
<li>
<a title="Sức khỏe">
Sức khỏe
</a>
</li>
<li>
<a title="Tek-life">
Tek-life
</a>
</li>
<li>
<a title="Học đường">
Học đường
</a>
</li>
<li>
<a title="Xem Mua Luôn">
Xem Mua Luôn
</a>
</li>
<li>
<a title="Video">
Video
</a>
</li>
<li>
<a title="mở rộng">
<span>
</span>
<span>
</span>
<span>
</span>
</a>
<div>
<div>
<ul>
<li>
<h4>
<a title="Đời sống">
Đời sống
</a>
</h4>
<ul>
<li>
<a title="Nhân vật">
Nhân vật
</a>
</li>
<li>
<a title="Xem-Ăn-Chơi">
Xem-Ăn-Chơi
</a>
</li>
<li>
<a title="House n Home">
House n Home
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Xem mua luôn">
Xem mua luôn
</a>
</h4>
<ul>
<li>
<a title="Thời trang">
Thời trang
</a>
</li>
<li>
<a title="Đẹp">
Đẹp
</a>
</li>
<li>
<a title="Mommy mua di">
Mommy mua di
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Sport">
Sport
</a>
</h4>
<ul>
<li>
<a title="Bóng đá">
Bóng đá
</a>
</li>
<li>
<a title="Hậu trường">
Hậu trường
</a>
</li>
<li>
<a title="Esports">
Esports
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Musik">
Musik
</a>
</h4>
<ul>
<li>
<a title="Âu-Mỹ">
Âu-Mỹ
</a>
</li>
<li>
<a title="Châu Á">
Châu Á
</a>
</li>
<li>
<a title="Việt Nam">
Việt Nam
</a>
</li>
<li>
<a title="Hip-hop neva die">
Hip-hop neva die
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Ciné">
Ciné
</a>
</h4>
<ul>
<li>
<a title="Phim chiếu rạp">
Phim chiếu rạp
</a>
</li>
<li>
<a title="Phim Việt Nam">
Phim Việt Nam
</a>
</li>
<li>
<a title="Series truyền hình">
Series truyền hình
</a>
</li>
<li>
<a title="Hoa ngữ - Hàn Quốc">
Hoa ngữ - Hàn Quốc
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="tek-life">
Tek-Life
</a>
</h4>
<ul>
<li>
<a title="metaverse">
Metaverse
</a>
</li>
<li>
<a title="how-to">
How-To
</a>
</li>
<li>
<a title="Wow">
Wow
</a>
</li>
<li>
<a title="2-Mall">
2-Mall
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Star">
Star
</a>
</h4>
<ul>
<li>
<a title="Sao Việt">
Sao Việt
</a>
</li>
<li>
<a title="Hội bạn thân showbiz">
Hội bạn thân showbiz
</a>
</li>
<li>
<a title="TV Show">
TV Show
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Xã hội">
Xã hội
</a>
</h4>
<ul>
<li>
<a title="Pháp luật">
Pháp luật
</a>
</li>
<li>
<a title="Nóng trên mạng">
Nóng trên mạng
</a>
</li>
<li>
<a title="Sống xanh">
Sống xanh
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Học đường">
Học đường
</a>
</h4>
<ul>
<li>
<a title="Nhân vật">
Nhân vật
</a>
</li>
<li>
<a title="Du học">
Du học
</a>
</li>
<li>
<a title="Bản tin 46'">
Bản tin 46'
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Thế giới đó đây">
Thế giới đó đây
</a>
</h4>
<ul>
<li>
<a title="Chùm ảnh">
Chùm ảnh
</a>
</li>
<li>
<a title="Khám phá">
Khám phá
</a>
</li>
<li>
<a title="Dị">
Dị
</a>
</li>
</ul>
</li>
<li>
<h4>
<a title="Sức khỏe">
Sức khỏe
</a>
</h4>
<ul>
<li>
<a title="Tin tức">
Tin tức
</a>
</li>
<li>
<a title="Dinh dưỡng">
Dinh dưỡng
</a>
</li>
<li>
<a title="Khỏe đẹp">
Khỏe đẹp
</a>
</li>
<li>
<a title="Giới tính">
Giới tính
</a>
</li>
<li>
<a title="Các bệnh">
Các bệnh
</a>
</li>
</ul>
</li>
</ul>
<div>
<div>
Nhóm chủ đề
</div>
<ul>
</ul>
</div>
<div>
<div>
<h4>
Tải app
</h4>
<ul>
<li>
<a title="Tải về từ App Store">
iOS
</a>
</li>
<li>
<a title="Tải về từ Google Play">
Android
</a>
</li>
</ul>
</div>
<div>
<h4>
<a title="Fanpage">
Fanpage
</a>
</h4>
</div>
<div>
<h4>
<a>
Liên hệ
</a>
</h4>
<ul>
<li>
<a title="Liên hệ quảng cáo">
Quảng cáo
</a>
</li>
</ul>
</div>
</div>
</div>
</div>
</li>
</ul>
<div>
<a title="live">
<span>
</span>
<span>
live
</span>
<span>
</span>
</a>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
<div>
<input>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a title="Sport">
Sport
</a>
</li>
<li>
<a title="Bóng đá">
Bóng đá
</a>
</li>
<li>
<a title="Hậu Trường">
Hậu Trường
</a>
</li>
<li>
<a title="eSports">
eSports
</a>
</li>
<li>
<a title="Khám phá">
Khám phá
</a>
</li>
<li>
<a title="Dị">
Dị
</a>
</li>
</ul>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
</div>
<div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
</div>
<h1>
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</h1>
<div>
<span>
Hải Đăng,
</span>
<span>
Theo Thanh Niên Việt
</span>
<span>
09:36 11/06/2025
</span>
<div>
</div>
</div>
</div>
<div>
<div>
</div>
<a>
Chia sẻ
<span>
</span>
</a>
<div>
</div>
<div>
<a title="Gửi email">
<div>
</div>
</a>
</div>
<div>
<div>
</div>
</div>
<div>
<a title="Theo dõi Kenh14.vn trên googlenews">
<span>
Theo dõi Kenh14.vn trên
</span>
<img alt="logo">
</a>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<a title="Trang chủ">
</a>
</div>
<div>
<a title="Chia sẻ">
</a>
</div>
</div>
</div>
</div>
<h2>
<span>
</span>
Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi
</h2>
<div>
</div>
<div>
<ul>
<li>
<a title="Thua Malaysia đậm nhất lịch sử, tuyển Việt Nam gần cạn hy vọng dự Asian Cup">
Thua Malaysia đậm nhất lịch sử, tuyển Việt Nam gần cạn hy vọng dự Asian Cup
<i>
</i>
</a>
</li>
</ul>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
</div>
<p>
Tối 10/6, tại sân vận động Bukit Jalil (Kuala Lumpur), đội tuyển Việt Nam đã trải qua một trong những trận thua nặng nề nhất trong những năm gần đây khi để chủ nhà Malaysia ghi tới bốn bàn thắng chỉ trong hiệp hai. Dù nhập cuộc thận trọng và tổ chức phòng ngự tương đối tốt trong hiệp đầu, các học trò của HLV Kim Sang-sik đã hoàn toàn vỡ trận sau giờ nghỉ.
</p>
<p>
Phát biểu trong buổi họp báo sau trận, HLV người Hàn Quốc bày tỏ:
</p>
<p>
“Trước tiên, tôi muốn gửi lời xin lỗi chân thành đến tất cả người hâm mộ Việt Nam – những người đã đến sân cổ vũ, cũng như theo dõi qua màn ảnh nhỏ. Các cầu thủ đã cố gắng, nhưng kết quả này là hoàn toàn không thể chấp nhận, và tôi xin nhận trách nhiệm”.
</p>
<figure>
<div>
<a title="        Đội tuyển Việt Nam để thua choáng váng 0-4 trước đội tuyển Malaysia, sau 10 năm đội tuyển Việt Nam mới lại thua đậm trước một đội bóng Đông Nam Á như vậy      ">
<img alt="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia- Ảnh 1." title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia- Ảnh 1.">
</a>
</div>
<figcaption>
<p>
<i>
Đội tuyển Việt Nam để thua choáng váng 0-4 trước đội tuyển Malaysia, sau 10 năm đội tuyển Việt Nam mới lại thua đậm trước một đội bóng Đông Nam Á như vậy
</i>
</p>
</figcaption>
</figure>
<p>
Theo HLV Kim, Việt Nam đã có hiệp một thi đấu đúng với kế hoạch đề ra, giữ cự ly đội hình tốt và hạn chế được các tình huống nguy hiểm. Tuy nhiên, bước ngoặt xảy ra khi hai trung vệ chủ chốt là Nguyễn Thành Chung và Bùi Tiến Dũng lần lượt rời sân vì chấn thương. Việc mất hai chốt chặn quan trọng khiến hàng thủ rơi vào rối loạn, tạo điều kiện để Malaysia liên tiếp ghi bàn ở các phút 49, 59, 67 và 88.
</p>
<p>
“Ở nửa đầu trận đấu, chúng tôi vẫn có thể triển khai đội hình như kế hoạch, nhưng ở nửa sau trận đấu, với chấn thương của 2 cầu thủ phòng ngự, chúng tôi đã gặp khó khăn trong việc triển khai đội hình và có lẽ đó cũng là một trong những lý do khiến chúng tôi thất bại”, HLV Kim Sang Sik nói.
</p>
<p>
Nhà cầm quân người Hàn Quốc thừa nhận ĐT Việt Nam gặp khó trước 5 cầu thủ nhập tịch mới toanh của đối thủ. “Mặc dù chúng tôi đã cố gắng phân tích nhiều nhất có thể, nhưng cả 5 cầu thủ nhập tịch của đối thủ hôm nay thể hiện tốt hơn chúng tôi dự đoán. Và đúng là chúng tôi đã vất vả khi phải đối đầu với Malaysia. Nhưng chúng tôi sẽ vận dụng những kinh nghiệm của trận đấu ngày hôm nay để chuẩn bị thật tốt cho lần sau”, HLV Kim chia sẻ.
</p>
<p>
Thất bại này khiến đội tuyển Việt Nam rơi xuống vị trí thứ hai bảng F với 3 điểm sau 2 trận, trong khi Malaysia vươn lên dẫn đầu với 6 điểm tuyệt đối. Dù cánh cửa vào VCK Asian Cup 2027 vẫn còn, nhưng đội tuyển sẽ phải đối mặt với áp lực lớn trong các trận lượt về, đặc biệt là khi tiếp chính Malaysia tại Mỹ Đình vào tháng 3/2026.
</p>
<p>
Dù vậy, HLV Kim Sang-sik khẳng định ông và các học trò sẽ không bỏ cuộc. “Về cách chuẩn bị cho trận lượt về ở Hà Nội, đầu tiên tôi nghĩ chúng tôi cần chấp nhận sự thật rằng đội tuyển Malaysia đã mạnh lên nhờ vào những cầu thủ nhập tịch mới. Nhưng bóng đá thì vẫn luôn có chỗ cho những kỳ tích xảy ra. Nếu chúng tôi chuẩn bị tốt cho trận lượt về, tôi nghĩ chúng tôi vẫn có cơ hội để bù đắp được 4 bàn thua hôm nay”, HLV Kim khẳng định.
</p>
<p>
Sau trận đấu này, đội tuyển Việt Nam sẽ về nước, các cầu thủ trở lại CLB để tiếp tục thi đấu các trận còn lại của V.League 2024/25. Tuyển Việt Nam sẽ hội quân trở lại vào dịp FIFA Days tháng 9.
</p>
<div>
</div>
</div>
<zone>
</zone>
<zone>
</zone>
<div>
<div>
</div>
</div>
<div>
<div>
<a title="Theo  Thanh Niên Việt">
Theo
<span>
Thanh Niên Việt
</span>
<span>
<i>
Copy link
</i>
</span>
</a>
<div>
<div>
<span>
Link bài gốc
</span>
<span>
<i>
Lấy link
</i>
</span>
</div>
<a>
https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm
</a>
<div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<a title="Hlv Kim Sang-sik dùng bài lạ, tuyển Việt Nam sụp đổ đầy thất vọng, nguy cơ lớn lỡ vé Asian Cup">
Hlv Kim Sang-sik dùng bài lạ, tuyển Việt Nam sụp đổ đầy thất vọng, nguy cơ lớn lỡ vé Asian Cup
</a>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
<div>
<span>
</span>
<div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
<ul>
<li>
<a title="HLV Kim Sang-sik">
HLV Kim Sang-sik
</a>
</li>
<li>
<a title=" tuyển Việt Nam">
tuyển Việt Nam
</a>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
<span>
TIN CÙNG CHUYÊN MỤC
</span>
<div>
<span>
Xem theo ngày
</span>
<ul>
<li>
<div>
<div>
11
</div>
<ul>
<li>
Ngày
</li>
<li>
1
</li>
<li>
2
</li>
<li>
3
</li>
<li>
4
</li>
<li>
5
</li>
<li>
6
</li>
<li>
7
</li>
<li>
8
</li>
<li>
9
</li>
<li>
10
</li>
<li>
11
</li>
<li>
12
</li>
<li>
13
</li>
<li>
14
</li>
<li>
15
</li>
<li>
16
</li>
<li>
17
</li>
<li>
18
</li>
<li>
19
</li>
<li>
20
</li>
<li>
21
</li>
<li>
22
</li>
<li>
23
</li>
<li>
24
</li>
<li>
25
</li>
<li>
26
</li>
<li>
27
</li>
<li>
28
</li>
<li>
29
</li>
<li>
30
</li>
<li>
31
</li>
</ul>
</div>
<select>
<option>
Ngày
</option>
<option>
1
</option>
<option>
2
</option>
<option>
3
</option>
<option>
4
</option>
<option>
5
</option>
<option>
6
</option>
<option>
7
</option>
<option>
8
</option>
<option>
9
</option>
<option>
10
</option>
<option>
11
</option>
<option>
12
</option>
<option>
13
</option>
<option>
14
</option>
<option>
15
</option>
<option>
16
</option>
<option>
17
</option>
<option>
18
</option>
<option>
19
</option>
<option>
20
</option>
<option>
21
</option>
<option>
22
</option>
<option>
23
</option>
<option>
24
</option>
<option>
25
</option>
<option>
26
</option>
<option>
27
</option>
<option>
28
</option>
<option>
29
</option>
<option>
30
</option>
<option>
31
</option>
</select>
</li>
<li>
<div>
<div>
Tháng 6
</div>
<ul>
<li>
Tháng
</li>
<li>
Tháng 1
</li>
<li>
Tháng 2
</li>
<li>
Tháng 3
</li>
<li>
Tháng 4
</li>
<li>
Tháng 5
</li>
<li>
Tháng 6
</li>
<li>
Tháng 7
</li>
<li>
Tháng 8
</li>
<li>
Tháng 9
</li>
<li>
Tháng 10
</li>
<li>
Tháng 11
</li>
<li>
Tháng 12
</li>
</ul>
</div>
<select>
<option>
Tháng
</option>
<option>
Tháng 1
</option>
<option>
Tháng 2
</option>
<option>
Tháng 3
</option>
<option>
Tháng 4
</option>
<option>
Tháng 5
</option>
<option>
Tháng 6
</option>
<option>
Tháng 7
</option>
<option>
Tháng 8
</option>
<option>
Tháng 9
</option>
<option>
Tháng 10
</option>
<option>
Tháng 11
</option>
<option>
Tháng 12
</option>
</select>
</li>
<li>
<div>
<div>
2025
</div>
<ul>
<li>
2020
</li>
<li>
2021
</li>
<li>
2022
</li>
<li>
2023
</li>
<li>
2024
</li>
<li>
2025
</li>
</ul>
</div>
<select>
<option>
2020
</option>
<option>
2021
</option>
<option>
2022
</option>
<option>
2023
</option>
<option>
2024
</option>
<option>
2025
</option>
</select>
</li>
<li>
<button>
Xem
</button>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<div>
<div>
<div>
<span>
TIN CÙNG CHUYÊN MỤC
</span>
<div>
<span>
Xem theo ngày
</span>
<ul>
<li>
<select>
<option>
Ngày
</option>
<option>
1
</option>
<option>
2
</option>
<option>
3
</option>
<option>
4
</option>
<option>
5
</option>
<option>
6
</option>
<option>
7
</option>
<option>
8
</option>
<option>
9
</option>
<option>
10
</option>
<option>
11
</option>
<option>
12
</option>
<option>
13
</option>
<option>
14
</option>
<option>
15
</option>
<option>
16
</option>
<option>
17
</option>
<option>
18
</option>
<option>
19
</option>
<option>
20
</option>
<option>
21
</option>
<option>
22
</option>
<option>
23
</option>
<option>
24
</option>
<option>
25
</option>
<option>
26
</option>
<option>
27
</option>
<option>
28
</option>
<option>
29
</option>
<option>
30
</option>
<option>
31
</option>
</select>
</li>
<li>
<select>
<option>
Tháng
</option>
<option>
Tháng 1
</option>
<option>
Tháng 2
</option>
<option>
Tháng 3
</option>
<option>
Tháng 4
</option>
<option>
Tháng 5
</option>
<option>
Tháng 6
</option>
<option>
Tháng 7
</option>
<option>
Tháng 8
</option>
<option>
Tháng 9
</option>
<option>
Tháng 10
</option>
<option>
Tháng 11
</option>
<option>
Tháng 12
</option>
</select>
</li>
<li>
<select>
<option>
2020
</option>
<option>
2021
</option>
<option>
2022
</option>
<option>
2023
</option>
<option>
2024
</option>
<option>
2025
</option>
</select>
</li>
<li>
<button>
Xem
</button>
</li>
</ul>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
<a title="Ngọc Trinh chơi pickleball &amp;quot;cợt nhả vô cùng&amp;quot;, thứ cuốn nhất là vòng eo siêu thực">
<video alt="Ngọc Trinh chơi pickleball &amp;quot;cợt nhả vô cùng&amp;quot;, thứ cuốn nhất là vòng eo siêu thực">
</video>
</a>
<div>
<h4>
<a title="Ngọc Trinh chơi pickleball &amp;quot;cợt nhả vô cùng&amp;quot;, thứ cuốn nhất là vòng eo siêu thực">
Ngọc Trinh chơi pickleball &quot;cợt nhả vô cùng&quot;, thứ cuốn nhất là vòng eo siêu thực
</a>
<span>
Nổi bật
</span>
</h4>
</div>
</div>
<div>
<a title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA">
<img title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA">
</a>
<div>
<h4>
<a title="Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA">
Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA
</a>
<span>
Nổi bật
</span>
</h4>
</div>
</div>
<div>
<a title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
<img title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
</a>
<div>
<h4>
<a title="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia">
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</a>
<span>
-
</span>
<span>
5 giờ trước
</span>
</h4>
</div>
</div>
</div>
<div>
<div>
<a title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu">
<img title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu">
</a>
<div>
<h4>
<a title="Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu">
Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu
</a>
<span>
-
</span>
<span>
5 giờ trước
</span>
</h4>
</div>
</div>
<div>
<a title="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!">
<video alt="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!">
</video>
</a>
<div>
<h4>
<a title="Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!">
Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!
</a>
<span>
-
</span>
<span>
6 giờ trước
</span>
</h4>
</div>
</div>
<div>
<a title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này">
<img title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này">
</a>
<div>
<h4>
<a title="Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này">
Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này
</a>
<span>
-
</span>
<span>
6 giờ trước
</span>
</h4>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
<div>
</div>
<input>
<div>
<div>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
<input>
<input>
<input>
<div>
<div>
<div>
</div>
</div>
<div>
<div>
<div>
<button>
</button>
<div>
<div>
<span>
</span>
<span>
</span>
<span>
</span>
</div>
<span>
Đóng
</span>
<div>
<span>
</span>
<span>
</span>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
</div>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a title="Star">
Star
</a>
</li>
<li>
<a title="Ciné">
Ciné
</a>
</li>
<li>
<a title="Musik">
Musik
</a>
</li>
<li>
<a title="Beauty &amp;amp; Fashion">
Beauty &amp;amp; Fashion
</a>
</li>
<li>
<a title="Sport">
Sport
</a>
</li>
<li>
<a title="Đời sống">
Đời sống
</a>
</li>
<li>
<a title="Xã hội">
Xã hội
</a>
</li>
<li>
<a title="Ăn - Quẩy - Đi">
Ăn - Quẩy - Đi
</a>
</li>
<li>
<a title="Xem Mua Luôn">
Xem Mua Luôn
</a>
</li>
<li>
<a title="Thế giới đó đây">
Thế giới đó đây
</a>
</li>
<li>
<a title="Sức khỏe">
Sức khỏe
</a>
</li>
<li>
<a title="Tek-Life">
Tek-Life
</a>
</li>
<li>
<a title="Học đường">
Học đường
</a>
</li>
<li>
<a title="Money-Z">
Money-Z
</a>
</li>
<li>
<a title="Video">
Video
</a>
</li>
</ul>
</div>
</div>
<div>
<footer>
<div>
<div>
<a title="Kênh 14">
</a>
<div>
<span>
ĐÓNG GÓP NỘI DUNG
</span>
<div>
<a title="Câu hỏi thường gặp">
câu hỏi thường gặp
</a>
<a>
bandoc@kenh14.vn
</a>
</div>
<p>
Kenh14.vn rất hoan nghênh độc giả gửi thông tin và góp ý cho chúng tôi.
</p>
</div>
</div>
<div>
<div>
<blockquote>
<a title="facebook">
</a>
</blockquote>
</div>
</div>
</div>
<div>
<div>
<div>
<p>
trụ sở hà nội
</p>
<p>
Tầng 21, Tòa nhà Center Building, Hapulico Complex, số 1 Nguyễn Huy Tưởng, phường Thanh Xuân Trung, quận Thanh Xuân, Hà Nội.
<br>
Điện thoại: 024 7309 5555, máy lẻ 62.370
</p>
<a title="Xem bản đồ">
xem bản đồ
</a>
</div>
<div>
<p>
trụ sở tp.hồ chí minh
</p>
<p>
Tầng 4, Tòa nhà 123, số 127 Võ Văn Tần, phường 6, quận 3, TP. Hồ Chí Minh.
<br>
Điện thoại: 028 7307 7979
</p>
<a title="Xem bản đồ">
xem bản đồ
</a>
</div>
</div>
<div>
<div>
<p>
chịu trách nhiệm quản lý nội dung
</p>
<p>
Bà Nguyễn Bích Minh
</p>
</div>
<div>
<p>
hợp tác truyền thông
</p>
<p>
024.73095555  (máy lẻ 62.370)
</p>
<a>
marketing@kenh14.vn
</a>
</div>
<div>
<p>
liên hệ quảng cáo
</p>
<p>
02473007108
</p>
<a>
giaitrixahoi@admicro.vn
</a>
<div>
<a title="Xem chi tiết">
<span>
</span>
Chat với tư vấn viên
</a>
<a title="Xem chi tiết">
xem chi tiết
</a>
</div>
</div>
<div>
<p>
<a>
Chính sách bảo mật
</a>
</p>
</div>
</div>
<div>
<a title="Công ty Cổ phần VCCorp">
<img alt="Vccorp">
</a>
<p>
<span>
© Copyright 2007 - 2025 –
</span>
Công ty Cổ phần VCCorp
</p>
<p>
Tầng 17, 19, 20, 21 Tòa nhà Center Building - Hapulico Complex, Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội.
</p>
<p>
Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số 2215/GP-TTĐT do Sở Thông tin và Truyền thông Hà Nội cấp ngày 10 tháng 4 năm 2019
</p>
</div>
</div>
</footer>
</div>
</div>
<div>
</div>
<div>
<input>
</div>
</body>
</html>""" # Paste your HTML here
    
    cleaned_html = clean_html_duplicates(html_snippet)
    print("\n" + "="*50 + "\n")
    print("--- Final Cleaned HTML ---")
    print(cleaned_html)
    with open("final_output.txt", "w", encoding="utf-8") as f:
        f.write(cleaned_html)