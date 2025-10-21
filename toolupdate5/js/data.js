export const jsonData = {
  "page_1": [
    {
      "[y1, x1, y2, x2]": [84, 211, 155, 772],
      "code": "example_order = {\"order_id\": \"A12345\"}\nconvo = [HumanMessage(content=\"Vui lòng hủy đơn hàng A12345 của tôi.\")]\nresult = graph.invoke({\"order\": example_order, \"messages\": convo})\nfor msg in result[\"messages\"]:\n    print(f\"{msg.type}: {msg.content}\")"
    },
    {
      "[y1, x1, y2, x2]": [168, 142, 314, 842],
      "text": "Tuyệt vời—bây giờ bạn đã có một tác tử “hủy đơn hàng” hoạt động. Trước khi mở rộng tác tử của mình, chúng ta hãy suy ngẫm về lý do tại sao chúng ta lại bắt đầu với một lát cắt đơn giản như vậy. Việc xác định phạm vi luôn là một hành động cân bằng. Nếu bạn thu hẹp nhiệm vụ quá mức—ví dụ, chỉ hủy đơn hàng—bạn sẽ bỏ lỡ các yêu cầu khác có khối lượng lớn như hoàn tiền hoặc thay đổi địa chỉ, làm hạn chế tác động trong thực tế. Nhưng nếu bạn mở rộng quá xa—“tự động hóa mọi yêu cầu hỗ trợ”—bạn sẽ chìm trong các trường hợp đặc biệt như tranh chấp thanh toán, đề xuất sản phẩm và khắc phục sự cố kỹ thuật. Và nếu bạn giữ nó mơ hồ—“cải thiện sự hài lòng của khách hàng”—bạn sẽ không bao giờ biết khi nào mình đã thành công."
    },
    {
      "[y1, x1, y2, x2]": [327, 142, 473, 842],
      "text": "Thay vào đó, bằng cách tập trung vào một quy trình công việc rõ ràng, có giới hạn—hủy đơn hàng—chúng ta đảm bảo có đầu vào cụ thể (tin nhắn của khách hàng + hồ sơ đơn hàng), đầu ra có cấu trúc (lệnh gọi công cụ + xác nhận) và một vòng lặp phản hồi chặt chẽ. Ví dụ, hãy tưởng tượng một email có nội dung: “Vui lòng hủy đơn hàng #B73973 của tôi vì tôi đã tìm thấy một lựa chọn rẻ hơn ở nơi khác.” Một nhân viên hỗ trợ sẽ tra cứu đơn hàng, xác minh nó chưa được giao, nhấp vào “Hủy” và trả lời bằng một xác nhận. Việc chuyển điều này thành mã có nghĩa là gọi hàm cancel_order(order_id=\"B73973\") và gửi lại một tin nhắn xác nhận đơn giản cho khách hàng."
    },
    {
      "[y1, x1, y2, x2]": [486, 142, 571, 842],
      "text": "Bây giờ chúng ta đã có một tác tử “hủy đơn hàng” hoạt động, câu hỏi tiếp theo là: nó có thực sự hoạt động không? Trong môi trường sản xuất, chúng ta không chỉ muốn tác tử của mình chạy—chúng ta muốn biết nó hoạt động tốt đến mức nào, nó làm đúng những gì và thất bại ở đâu. Đối với tác tử hủy đơn hàng của chúng ta, chúng ta quan tâm đến các câu hỏi như:"
    },
    {
      "[y1, x1, y2, x2]": [587, 166, 646, 792],
      "list": [
        "Nó có gọi đúng công cụ (cancel_order) không?",
        "Nó có truyền đúng tham số (đúng ID đơn hàng) không?",
        "Nó có gửi một tin nhắn xác nhận rõ ràng, chính xác cho khách hàng không?"
      ]
    },
    {
      "[y1, x1, y2, x2]": [665, 142, 695, 842],
      "text": "Trong kho mã nguồn mở của chúng tôi, bạn sẽ tìm thấy một kịch bản đánh giá đầy đủ để tự động hóa quy trình này:"
    },
    {
      "[y1, x1, y2, x2]": [712, 166, 755, 360],
      "list": [
        "Bộ dữ liệu đánh giá",
        "Kịch bản đánh giá hàng loạt"
      ]
    },
    {
      "[y1, x1, y2, x2]": [773, 142, 804, 842],
      "text": "Đây là một phiên bản tối giản, được đơn giản hóa của logic này về cách bạn có thể kiểm tra trực tiếp tác tử của mình:"
    },
    {
      "[y1, x1, y2, x2]": [824, 169, 888, 688],
      "code": "# Kiểm tra đánh giá tối thiểu\nexample_order = {\"order_id\": \"B73973\"}\nconvo = [HumanMessage(content='''Vui lòng hủy đơn hàng #B73973.\n    Tôi đã tìm thấy một lựa chọn rẻ hơn ở nơi khác.''')]"
    },
    {
      "[y1, x1, y2, x2]": [923, 671, 936, 842],
      "text": "Hệ thống Tác tử Đầu tiên của Chúng ta | 19"
    }
  ],
  "page_2": [
    {
      "[y1, x1, y2, x2]": [84, 175, 203, 799],
      "code": "result = graph.invoke({\"order\": example_order, \"messages\": convo})\nassert any(\"cancel_order\" in str(m.content) for m in result[\"messages\"],\n           \"Công cụ hủy đơn hàng chưa được gọi\")\nassert any(\"cancelled\" in m.content.lower() for m in result[\"messages\"],\n           \"Thiếu tin nhắn xác nhận\")\n\nprint(\"✓ Tác tử đã vượt qua đánh giá tối thiểu.\")"
    },
    {
      "[y1, x1, y2, x2]": [217, 142, 292, 842],
      "text": "Đoạn mã này đảm bảo rằng công cụ đã được gọi và xác nhận đã được gửi đi. Dĩ nhiên, việc đánh giá thực tế còn sâu hơn: bạn có thể đo lường độ chính xác của công cụ, độ chính xác của tham số và tỷ lệ thành công tổng thể của nhiệm vụ qua hàng trăm ví dụ để phát hiện các trường hợp đặc biệt trước khi triển khai. Chúng ta sẽ đi sâu vào các chiến lược và khung đánh giá trong Chương 9, nhưng hiện tại, hãy nhớ rằng: một tác tử chưa được kiểm tra là một tác tử không đáng tin cậy."
    },
    {
      "[y1, x1, y2, x2]": [305, 142, 380, 842],
      "text": "Bởi vì cả hai bước đều được tự động hóa bằng cách sử dụng decorator @tool, việc viết các bài kiểm tra dựa trên các ticket thực tế trở nên đơn giản—và bạn ngay lập tức có được các chỉ số có thể đo lường được như khả năng gọi lại công cụ, độ chính xác của tham số và chất lượng xác nhận. Bây giờ chúng ta đã xây dựng và đánh giá một tác tử tối thiểu, hãy khám phá các quyết định thiết kế cốt lõi sẽ định hình khả năng và tác động của nó."
    },
    {
      "[y1, x1, y2, x2]": [426, 142, 451, 649],
      "text": "Các Thành phần Cốt lõi của Hệ thống Tác tử"
    },
    {
      "[y1, x1, y2, x2]": [467, 142, 628, 842],
      "text": "Thiết kế một hệ thống dựa trên tác tử hiệu quả đòi hỏi sự hiểu biết sâu sắc về các thành phần cốt lõi cho phép các tác tử thực hiện thành công nhiệm vụ của chúng. Mỗi thành phần đóng một vai trò quan trọng trong việc định hình khả năng, hiệu quả và khả năng thích ứng của tác tử. Từ việc chọn đúng mô hình đến trang bị cho tác tử các công cụ, bộ nhớ và khả năng lập kế hoạch, những yếu tố này phải hoạt động cùng nhau để đảm bảo rằng tác tử có thể hoạt động trong các môi trường phức tạp và năng động. Phần này đi sâu vào các thành phần chính—mô hình nền tảng, công cụ và bộ nhớ—và khám phá cách chúng tương tác để tạo thành một hệ thống tác tử gắn kết. Hình 2-1 cho thấy các thành phần cốt lõi của một hệ thống tác tử."
    },
    {
      "[y1, x1, y2, x2]": [648, 241, 829, 842],
      "image": null
    },
    {
      "[y1, x1, y2, x2]": [842, 142, 854, 532],
      "text": "Hình 2-1. Các thành phần cốt lõi của một hệ thống tác tử."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "20 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_3": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 342],
      "text": "Lựa chọn Mô hình"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 239, 842],
      "text": "Trọng tâm của mọi hệ thống dựa trên tác tử là mô hình điều khiển khả năng ra quyết định, tương tác và học hỏi của tác tử. Việc lựa chọn mô hình phù hợp là nền tảng: nó quyết định cách tác tử diễn giải đầu vào, tạo ra đầu ra và thích ứng với môi trường của nó. Quyết định này ảnh hưởng đến hiệu suất, khả năng mở rộng, độ trễ và chi phí của hệ thống. Việc chọn một mô hình thích hợp phụ thuộc vào độ phức tạp của các nhiệm vụ của tác tử, bản chất của dữ liệu đầu vào, các ràng buộc về cơ sở hạ tầng và sự đánh đổi giữa tính tổng quát, tốc độ và độ chính xác."
    },
    {
      "[y1, x1, y2, x2]": [252, 142, 398, 842],
      "text": "Nói một cách rộng hơn, việc lựa chọn mô hình bắt đầu bằng việc đánh giá độ phức tạp của nhiệm vụ. Các mô hình nền tảng lớn—chẳng hạn như GPT-5 hoặc Claude Opus 4.1—rất phù hợp cho các tác tử hoạt động trong môi trường mở, nơi sự hiểu biết tinh tế, khả năng suy luận linh hoạt và tạo ra nội dung sáng tạo là cần thiết. Những mô hình này cung cấp khả năng tổng quát hóa ấn tượng và xuất sắc trong các nhiệm vụ liên quan đến sự mơ hồ, sắc thái ngữ cảnh hoặc nhiều bước. Tuy nhiên, thế mạnh của chúng đi kèm với một cái giá: chúng đòi hỏi tài nguyên tính toán đáng kể, thường yêu cầu cơ sở hạ tầng đám mây và gây ra độ trễ cao hơn. Chúng phù hợp nhất cho các ứng dụng như trợ lý cá nhân, tác tử nghiên cứu hoặc các hệ thống doanh nghiệp phải xử lý một loạt các truy vấn không thể đoán trước."
    },
    {
      "[y1, x1, y2, x2]": [411, 142, 542, 842],
      "text": "Ngược lại, các mô hình nhỏ hơn—chẳng hạn như các biến thể ModernBERT được chưng cất hoặc Phi-4—thường phù hợp hơn cho các tác tử thực hiện các tác vụ lặp đi lặp lại, được xác định rõ ràng. Những mô hình này chạy hiệu quả trên phần cứng cục bộ, phản hồi nhanh chóng và ít tốn kém hơn để triển khai và bảo trì. Chúng hoạt động tốt trong các môi trường có cấu trúc như hỗ trợ khách hàng, truy xuất thông tin hoặc gán nhãn dữ liệu, nơi cần độ chính xác nhưng sự sáng tạo và linh hoạt ít quan trọng hơn. Khi khả năng phản hồi thời gian thực hoặc các ràng buộc về tài nguyên là quan trọng, các mô hình nhỏ hơn có thể vượt trội so với các đối tác lớn hơn của chúng chỉ đơn giản bằng cách thực tế hơn."
    },
    {
      "[y1, x1, y2, x2]": [555, 142, 715, 842],
      "text": "Một khía cạnh ngày càng quan trọng trong việc lựa chọn mô hình là phương thức (modality). Các tác tử ngày nay thường cần xử lý không chỉ văn bản mà còn cả hình ảnh, âm thanh hoặc dữ liệu có cấu trúc. Các mô hình đa phương thức, chẳng hạn như GPT-5 và Claude 4.1, cho phép các tác tử diễn giải và kết hợp các loại dữ liệu đa dạng—văn bản, hình ảnh, lời nói và hơn thế nữa. Điều này mở rộng tiện ích của tác tử trong các lĩnh vực như chăm sóc sức khỏe, robot và hỗ trợ khách hàng, nơi các quyết định dựa trên việc tích hợp nhiều dạng đầu vào. Ngược lại, các mô hình chỉ xử lý văn bản vẫn lý tưởng cho các trường hợp sử dụng hoàn toàn dựa trên ngôn ngữ, mang lại độ phức tạp thấp hơn và suy luận nhanh hơn trong các tình huống mà các phương thức bổ sung cung cấp ít giá trị gia tăng."
    },
    {
      "[y1, x1, y2, x2]": [728, 142, 859, 842],
      "text": "Một yếu tố quan trọng khác cần cân nhắc là tính mở và khả năng tùy chỉnh. Các mô hình mã nguồn mở, chẳng hạn như Llama và DeepSeek, cung cấp cho các nhà phát triển sự minh bạch hoàn toàn và khả năng tinh chỉnh hoặc sửa đổi mô hình khi cần thiết. Sự linh hoạt này đặc biệt quan trọng đối với các ứng dụng nhạy cảm về quyền riêng tư, được quản lý chặt chẽ hoặc dành riêng cho một lĩnh vực cụ thể. Các mô hình mã nguồn mở có thể được lưu trữ trên cơ sở hạ tầng riêng, được điều chỉnh cho các trường hợp sử dụng độc đáo và được triển khai mà không mất chi phí cấp phép—mặc dù chúng đòi hỏi nhiều công sức kỹ thuật hơn."
    },
    {
      "[y1, x1, y2, x2]": [923, 706, 936, 842],
      "text": "Lựa chọn Mô hình | 21"
    }
  ],
  "page_4": [
    {
      "[y1, x1, y2, x2]": [84, 142, 158, 842],
      "text": "chi phí vận hành. Ngược lại, các mô hình độc quyền như GPT-5, Claude và Cohere cung cấp các khả năng mạnh mẽ thông qua API và đi kèm với cơ sở hạ tầng được quản lý, giám sát và tối ưu hóa hiệu suất. Những mô hình này lý tưởng cho các nhóm muốn phát triển và triển khai nhanh chóng, mặc dù khả năng tùy chỉnh thường bị hạn chế và chi phí có thể tăng nhanh theo mức sử dụng."
    },
    {
      "[y1, x1, y2, x2]": [171, 142, 291, 842],
      "text": "Sự lựa chọn giữa việc sử dụng một mô hình đa dụng đã được huấn luyện trước hoặc một mô hình được huấn luyện tùy chỉnh phụ thuộc vào tính đặc thù và mức độ quan trọng của lĩnh vực hoạt động của tác tử. Các mô hình được huấn luyện trước—được huấn luyện trên các kho dữ liệu quy mô internet rộng lớn—hoạt động tốt cho các nhiệm vụ ngôn ngữ chung, tạo mẫu nhanh và các kịch bản mà độ chính xác theo lĩnh vực không quá quan trọng. Những mô hình này thường có thể được tinh chỉnh nhẹ hoặc điều chỉnh thông qua các kỹ thuật gợi ý (prompting) để đạt được hiệu suất cao với nỗ lực tối thiểu. Tuy nhiên, trong các lĩnh vực chuyên biệt—chẳng hạn như y học, luật pháp hoặc hỗ trợ kỹ thuật—các mô hình được huấn luyện tùy chỉnh có thể mang lại những lợi thế đáng kể. Bằng cách huấn luyện trên các bộ dữ liệu được tuyển chọn, dành riêng cho lĩnh vực, các nhà phát triển có thể trang bị cho các tác tử kiến thức chuyên môn sâu hơn và sự hiểu biết ngữ cảnh, dẫn đến các kết quả đầu ra chính xác và đáng tin cậy hơn."
    },
    {
      "[y1, x1, y2, x2]": [304, 142, 379, 842],
      "text": "Những cân nhắc về chi phí và độ trễ thường là yếu tố quyết định trong các lần triển khai thực tế. Các mô hình lớn mang lại hiệu suất cao nhưng tốn kém để vận hành và có thể gây ra sự chậm trễ trong phản hồi. Trong trường hợp điều đó là không thể chấp nhận, các mô hình nhỏ hơn hoặc các phiên bản nén của các mô hình lớn hơn cung cấp sự cân bằng tốt hơn. Nhiều nhà phát triển áp dụng các chiến lược kết hợp, trong đó một mô hình mạnh mẽ xử lý các truy vấn phức tạp nhất và một mô hình nhẹ xử lý các nhiệm vụ thông thường. Trong một số hệ thống, định tuyến mô hình động đảm bảo rằng mỗi yêu cầu được đánh giá và chuyển đến mô hình phù hợp nhất dựa trên độ phức tạp hoặc mức độ khẩn cấp—cho phép các hệ thống tối ưu hóa cả chi phí và chất lượng."
    },
    {
      "[y1, x1, y2, x2]": [392, 142, 538, 842],
      "text": "Trung tâm Nghiên cứu về các Mô hình Nền tảng tại Đại học Stanford đã công bố Đánh giá Toàn diện các Mô hình Ngôn ngữ, cung cấp các phép đo hiệu suất nghiêm ngặt của bên thứ ba trên một loạt các mô hình. Trong Bảng 2-1, một số mô hình ngôn ngữ được chọn lọc được hiển thị cùng với hiệu suất của chúng trên bộ tiêu chuẩn Massive Multitask Language Understanding (MMLU), một bài đánh giá chung thường được sử dụng về khả năng của các mô hình này. Các phép đo này không hoàn hảo, nhưng chúng cung cấp cho chúng ta một thước đo chung để so sánh hiệu suất. Nhìn chung, chúng ta thấy rằng các mô hình lớn hơn hoạt động tốt hơn, nhưng không nhất quán (một số mô hình hoạt động tốt hơn so với kích thước của chúng). Cần có tài nguyên tính toán lớn hơn đáng kể để đạt được hiệu suất cao."
    },
    {
      "[y1, x1, y2, x2]": [759, 142, 772, 696],
      "text": "Bảng 2-1. Các mô hình trọng số mở được chọn lọc theo hiệu suất và kích thước"
    },
    {
      "[y1, x1, y2, x2]": [785, 142, 882, 858],
      "table": [
        [
          "Mô hình",
          "Nhà phát triển",
          "MMLU",
          "Tham số\n(tỷ)",
          "VRAM (mô hình độ chính xác\nđầy đủ tính bằng GB)",
          "Phần cứng mẫu\nyêu cầu"
        ],
        [
          "Llama 3.1 Instruct\nTurbo",
          "Meta",
          "56.1",
          "8",
          "20",
          "RTX 3090"
        ],
        [
          "Gemma 2",
          "Google",
          "72.1",
          "9",
          "22.5",
          "RTX 3090"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "22 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_5": [
    {
      "[y1, x1, y2, x2]": [84, 142, 222, 858],
      "table": [
        [
          "Mô hình",
          "Nhà phát triển",
          "MMLU",
          "Tham số\n(tỷ)",
          "VRAM (mô hình độ chính xác\nđầy đủ tính bằng GB)",
          "Phần cứng mẫu\nyêu cầu"
        ],
        [
          "NeMo",
          "Mistral",
          "65.3",
          "12",
          "24",
          "RTX 3090"
        ],
        [
          "Phi-3",
          "Microsoft",
          "77.5",
          "14.7",
          "29.4",
          "A100"
        ],
        [
          "Qwen1.5",
          "Alibaba",
          "74.4",
          "32",
          "60.11",
          "A100"
        ],
        [
          "Llama 3",
          "Meta",
          "79.3",
          "70",
          "160",
          "4xA100"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [238, 142, 470, 842],
      "text": "Ngược lại, điều này có nghĩa là hiệu suất vừa phải có thể đạt được với một phần nhỏ chi phí. Như bạn sẽ thấy trong Bảng 2-1, các mô hình có tới khoảng 14 tỷ tham số có thể chạy trên một bộ xử lý đồ họa (GPU) cấp tiêu dùng duy nhất, chẳng hạn như NVIDIA RTX 3090 với 24 GB VRAM. Tuy nhiên, trên ngưỡng này, bạn có thể sẽ muốn có một GPU cấp máy chủ như NVIDIA A100, có các phiên bản 40 GB và 80 GB. Các mô hình được gọi là “trọng số mở” khi kiến trúc và trọng số (hoặc tham số) của mô hình đã được công bố miễn phí cho công chúng, vì vậy bất kỳ ai có phần cứng cần thiết đều có thể tải và sử dụng mô hình để suy luận mà không phải trả phí truy cập. Chúng tôi sẽ không đi vào chi tiết về việc lựa chọn phần cứng, nhưng những mô hình trọng số mở được chọn lọc này cho thấy một loạt các mức hiệu suất ở các kích thước khác nhau. Những mô hình trọng số mở, nhỏ này tiếp tục cải thiện với tốc độ nhanh chóng, mang lại ngày càng nhiều trí thông minh vào các yếu tố hình thức nhỏ hơn. Mặc dù chúng có thể không hoạt động tốt cho các vấn đề khó nhất của bạn, chúng có thể xử lý các nhiệm vụ dễ dàng hơn, thường xuyên hơn với một phần nhỏ chi phí. Đối với ví dụ tác tử hỗ trợ thương mại điện tử của chúng tôi, một mô hình nhỏ nhanh là đủ—nhưng nếu chúng tôi mở rộng sang các đề xuất sản phẩm hoặc leo thang dựa trên cảm xúc, một mô hình lớn hơn có thể mở ra các khả năng mới."
    },
    {
      "[y1, x1, y2, x2]": [483, 142, 613, 842],
      "text": "Bây giờ, hãy xem xét một số mô hình hàng đầu có kích thước lớn. Lưu ý rằng hai trong số các mô hình này, DeepSeek-v3 và Llama 3.1 Instruct Turbo 405B, đã được phát hành dưới dạng mô hình trọng số mở nhưng những mô hình khác thì không. Điều đó nói lên rằng, những mô hình lớn này thường yêu cầu ít nhất 12 GPU để có hiệu suất hợp lý, nhưng chúng có thể yêu cầu nhiều hơn nữa. Những mô hình lớn này gần như luôn được sử dụng trên các máy chủ trong các trung tâm dữ liệu lớn. Thông thường, các nhà huấn luyện mô hình tính phí truy cập vào các mô hình này dựa trên số lượng token đầu vào và đầu ra. Ưu điểm của việc này là nhà phát triển không cần phải lo lắng về máy chủ và việc sử dụng GPU mà có thể bắt đầu xây dựng ngay lập tức. Bảng 2-2 cho thấy chi phí và hiệu suất của mô hình trên cùng một bộ tiêu chuẩn MMLU."
    },
    {
      "[y1, x1, y2, x2]": [727, 142, 739, 663],
      "text": "Bảng 2-2. Các mô hình lớn được chọn lọc theo hiệu suất và chi phí"
    },
    {
      "[y1, x1, y2, x2]": [755, 142, 900, 825],
      "table": [
        [
          "Mô hình",
          "Nhà phát triển",
          "MMLU",
          "Giá tương đối trên một triệu token đầu vào",
          "Giá tương đối trên một triệu token đầu ra"
        ],
        [
          "DeepSeek-v3",
          "DeepSeek",
          "87.2",
          "2.75",
          "3.65"
        ],
        [
          "Claude 4 Opus Extended Thinking",
          "Anthropic",
          "86.5",
          "75",
          "125"
        ],
        [
          "Gemini 2.5 Pro",
          "Google",
          "86.2",
          "12.5",
          "25"
        ],
        [
          "Llama 3.1 Instruct Turbo 405B",
          "Meta",
          "84.5",
          "1",
          "1"
        ],
        [
          "04-mini",
          "OpenAl",
          "83.2",
          "5.5",
          "7.33"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [923, 706, 936, 842],
      "text": "Lựa chọn Mô hình | 23"
    }
  ],
  "page_6": [
    {
      "[y1, x1, y2, x2]": [84, 142, 171, 858],
      "table": [
        [
          "Mô hình",
          "Nhà phát triển",
          "MMLU",
          "Giá tương đối trên một triệu token đầu vào",
          "Giá tương đối trên một triệu token đầu ra"
        ],
        [
          "Grok 3",
          "ΧΑΙ",
          "79.9",
          "15",
          "25"
        ],
        [
          "Nova Pro",
          "Amazon",
          "82.0",
          "4",
          "5.33"
        ],
        [
          "Mistral Large 2",
          "Mistral",
          "80.0",
          "10",
          "10"
        ]
      ]
    },
    {
      "[y1, x1, y2, x2]": [198, 142, 298, 842],
      "text": "Trong Bảng 2-2, giá được hiển thị dưới dạng bội số của giá trên một triệu token của Llama 3.1, là mô hình rẻ nhất tại thời điểm xuất bản. Tại thời điểm xuất bản, Meta đang tính phí 0,20 đô la cho mỗi triệu token đầu vào và 0,60 đô la cho mỗi triệu token đầu ra. Bạn cũng có thể nhận thấy rằng hiệu suất không tương quan trực tiếp với giá cả. Cũng cần biết rằng hiệu suất trên các bộ tiêu chuẩn cung cấp hướng dẫn hữu ích, nhưng kết quả của bạn có thể khác nhau về mức độ phù hợp của các bộ tiêu chuẩn này với nhiệm vụ cụ thể của bạn. Khi có thể, hãy so sánh mô hình cho nhiệm vụ của bạn và tìm mô hình cung cấp cho bạn giá trị tốt nhất trên mỗi đơn vị hiệu suất."
    },
    {
      "[y1, x1, y2, x2]": [311, 142, 411, 842],
      "text": "Cuối cùng, việc lựa chọn mô hình không phải là một quyết định một lần mà là một lựa chọn thiết kế chiến lược phải được xem xét lại khi khả năng của tác tử, nhu cầu của người dùng và cơ sở hạ tầng phát triển. Các nhà phát triển phải cân nhắc sự đánh đổi giữa tính tổng quát và chuyên môn hóa, hiệu suất và chi phí, sự đơn giản và khả năng mở rộng. Bằng cách xem xét cẩn thận độ phức tạp của nhiệm vụ, các phương thức đầu vào, các ràng buộc vận hành và nhu cầu tùy chỉnh, các nhóm có thể chọn các mô hình cho phép tác tử của họ hoạt động hiệu quả, mở rộng một cách đáng tin cậy và thực hiện với độ chính xác trong thế giới thực."
    },
    {
      "[y1, x1, y2, x2]": [510, 142, 534, 219],
      "text": "Công cụ"
    },
    {
      "[y1, x1, y2, x2]": [551, 142, 626, 842],
      "text": "Trong các hệ thống dựa trên tác tử, công cụ là những khả năng cơ bản cho phép các tác tử thực hiện các hành động cụ thể hoặc giải quyết vấn đề. Các công cụ đại diện cho các khối xây dựng chức năng của một tác tử, cung cấp khả năng thực hiện các nhiệm vụ và tương tác với cả người dùng và các hệ thống khác. Hiệu quả của một tác tử phụ thuộc vào phạm vi và sự tinh vi của các công cụ của nó."
    },
    {
      "[y1, x1, y2, x2]": [655, 142, 679, 622],
      "text": "Thiết kế Năng lực cho các Tác vụ Cụ thể"
    },
    {
      "[y1, x1, y2, x2]": [696, 142, 756, 842],
      "text": "Các công cụ thường được điều chỉnh cho các nhiệm vụ mà tác tử được thiết kế để giải quyết. Khi thiết kế công cụ, các nhà phát triển phải xem xét cách tác tử sẽ hoạt động dưới các điều kiện và bối cảnh khác nhau. Một bộ công cụ được thiết kế tốt đảm bảo rằng tác tử có thể xử lý nhiều nhiệm vụ khác nhau với độ chính xác và hiệu quả. Các công cụ có thể được chia thành ba loại chính:"
    },
    {
      "[y1, x1, y2, x2]": [802, 142, 814, 237],
      "text": "Công cụ cục bộ"
    },
    {
      "[y1, x1, y2, x2]": [827, 142, 887, 842],
      "text": "Đây là những hành động mà tác tử thực hiện dựa trên logic nội bộ và các phép tính mà không có sự phụ thuộc bên ngoài. Các công cụ cục bộ thường dựa trên quy tắc hoặc liên quan đến việc thực thi các hàm được xác định trước. Ví dụ bao gồm các phép tính toán học, truy xuất dữ liệu từ cơ sở dữ liệu cục bộ, hoặc ra quyết định đơn giản dựa trên"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "24 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_7": [
    {
      "[y1, x1, y2, x2]": [84, 142, 114, 842],
      "text": "các quy tắc được xác định trước (ví dụ: quyết định phê duyệt hay từ chối một yêu cầu dựa trên các tiêu chí đã đặt ra)."
    },
    {
      "[y1, x1, y2, x2]": [127, 142, 139, 272],
      "text": "Công cụ dựa trên API"
    },
    {
      "[y1, x1, y2, x2]": [152, 142, 242, 842],
      "text": "Các công cụ dựa trên API cho phép các tác tử tương tác với các dịch vụ hoặc nguồn dữ liệu bên ngoài. Những công cụ này cho phép các tác tử mở rộng khả năng của chúng ra ngoài môi trường cục bộ bằng cách tìm nạp dữ liệu thời gian thực hoặc tận dụng các hệ thống của bên thứ ba. Ví dụ, một trợ lý ảo có thể sử dụng API để lấy dữ liệu thời tiết, giá cổ phiếu hoặc các cập nhật trên mạng xã hội, cho phép nó cung cấp các phản hồi phù hợp và có ngữ cảnh hơn cho các truy vấn của người dùng."
    },
    {
      "[y1, x1, y2, x2]": [272, 142, 284, 431],
      "text": "Giao thức Ngữ cảnh Mô hình (MCP)"
    },
    {
      "[y1, x1, y2, x2]": [297, 142, 443, 842],
      "text": "Các công cụ dựa trên MCP cho phép các tác tử cung cấp ngữ cảnh có cấu trúc, thời gian thực cho các mô hình ngôn ngữ bằng cách sử dụng Giao thức Ngữ cảnh Mô hình, một lược đồ được tiêu chuẩn hóa để truyền kiến thức bên ngoài, bộ nhớ và trạng thái vào lời nhắc của mô hình. Không giống như các lệnh gọi API truyền thống yêu cầu thực thi một vòng lặp hoàn chỉnh, MCP cho phép các tác tử đưa vào ngữ cảnh phong phú, năng động—chẳng hạn như hồ sơ người dùng, lịch sử trò chuyện, trạng thái thế giới hoặc siêu dữ liệu cụ thể của nhiệm vụ—trực tiếp vào quá trình suy luận của mô hình mà không cần gọi các công cụ riêng biệt. Chúng đặc biệt hiệu quả trong việc giảm việc sử dụng công cụ dư thừa, bảo toàn trạng thái hội thoại và đưa nhận thức tình huống thời gian thực vào hành vi của mô hình."
    },
    {
      "[y1, x1, y2, x2]": [456, 142, 531, 842],
      "text": "Trong khi các công cụ cục bộ cho phép các tác tử thực hiện các nhiệm vụ một cách độc lập bằng cách sử dụng logic nội bộ và các hàm dựa trên quy tắc, chẳng hạn như tính toán hoặc truy xuất dữ liệu từ cơ sở dữ liệu cục bộ, thì các công cụ dựa trên API cho phép các tác tử kết nối với các dịch vụ bên ngoài. Điều này cho phép truy cập dữ liệu thời gian thực hoặc các hệ thống của bên thứ ba để cung cấp các phản hồi có liên quan đến ngữ cảnh và chức năng mở rộng."
    },
    {
      "[y1, x1, y2, x2]": [584, 142, 608, 484],
      "text": "Tích hợp và Tính Mô-đun của Công cụ"
    },
    {
      "[y1, x1, y2, x2]": [625, 142, 739, 842],
      "text": "Thiết kế mô-đun là rất quan trọng cho việc phát triển công cụ. Mỗi công cụ nên được thiết kế như một mô-đun độc lập có thể dễ dàng tích hợp hoặc thay thế khi cần thiết. Cách tiếp cận này cho phép các nhà phát triển cập nhật hoặc mở rộng chức năng của tác tử mà không cần phải đại tu toàn bộ hệ thống. Một chatbot dịch vụ khách hàng có thể bắt đầu với một bộ công cụ cơ bản để xử lý các truy vấn đơn giản và sau đó có thể thêm các công cụ phức tạp hơn (ví dụ: giải quyết tranh chấp hoặc khắc phục sự cố nâng cao) mà không làm gián đoạn các hoạt động cốt lõi của tác tử."
    },
    {
      "[y1, x1, y2, x2]": [772, 142, 796, 258],
      "text": "Bộ nhớ"
    },
    {
      "[y1, x1, y2, x2]": [812, 142, 872, 842],
      "text": "Bộ nhớ là một thành phần thiết yếu cho phép các tác tử lưu trữ và truy xuất thông tin, cho phép chúng duy trì ngữ cảnh, học hỏi từ các tương tác trong quá khứ và cải thiện việc ra quyết định theo thời gian. Quản lý bộ nhớ hiệu quả đảm bảo rằng các tác tử có thể"
    },
    {
      "[y1, x1, y2, x2]": [923, 755, 936, 842],
      "text": "Bộ nhớ | 25"
    }
  ],
  "page_8": [
    {
      "[y1, x1, y2, x2]": [84, 142, 126, 842],
      "text": "hoạt động hiệu quả trong các môi trường năng động và thích ứng với các tình huống mới dựa trên dữ liệu lịch sử. Chúng ta sẽ thảo luận chi tiết hơn về bộ nhớ trong Chương 6."
    },
    {
      "[y1, x1, y2, x2]": [140, 142, 164, 396],
      "text": "Bộ nhớ Ngắn hạn"
    },
    {
      "[y1, x1, y2, x2]": [180, 142, 255, 842],
      "text": "Bộ nhớ ngắn hạn đề cập đến khả năng của một tác tử lưu trữ và quản lý thông tin liên quan đến nhiệm vụ hoặc cuộc trò chuyện hiện tại. Loại bộ nhớ này thường được sử dụng để duy trì ngữ cảnh trong một tương tác, cho phép tác tử đưa ra các quyết định mạch lạc trong thời gian thực. Một tác tử dịch vụ khách hàng ghi nhớ các truy vấn trước đó của người dùng trong một phiên có thể cung cấp các phản hồi chính xác và nhận biết ngữ cảnh hơn, nâng cao trải nghiệm người dùng."
    },
    {
      "[y1, x1, y2, x2]": [268, 142, 343, 842],
      "text": "Bộ nhớ ngắn hạn thường được triển khai bằng cách sử dụng các cửa sổ ngữ cảnh trượt, cho phép tác tử duy trì một cửa sổ thông tin gần đây trong khi loại bỏ dữ liệu đã lỗi thời. Điều này đặc biệt hữu ích trong các ứng dụng như chatbot hoặc trợ lý ảo, nơi tác tử phải ghi nhớ các tương tác gần đây nhưng có thể quên đi các chi tiết cũ, không liên quan."
    },
    {
      "[y1, x1, y2, x2]": [406, 142, 430, 390],
      "text": "Bộ nhớ Dài hạn"
    },
    {
      "[y1, x1, y2, x2]": [447, 142, 507, 842],
      "text": "Mặt khác, bộ nhớ dài hạn cho phép các tác tử lưu trữ kiến thức và kinh nghiệm trong một khoảng thời gian dài, cho phép chúng dựa vào thông tin trong quá khứ để thông báo cho các hành động trong tương lai. Điều này đặc biệt quan trọng đối với các tác tử cần cải thiện theo thời gian hoặc cung cấp trải nghiệm được cá nhân hóa dựa trên sở thích của người dùng."
    },
    {
      "[y1, x1, y2, x2]": [520, 142, 608, 842],
      "text": "Bộ nhớ dài hạn thường được triển khai bằng cách sử dụng cơ sở dữ liệu, biểu đồ tri thức hoặc các mô hình được tinh chỉnh. Các cấu trúc này cho phép các tác tử lưu trữ dữ liệu có cấu trúc (ví dụ: sở thích của người dùng, các chỉ số hiệu suất lịch sử) và truy xuất nó khi cần thiết. Một tác tử giám sát sức khỏe có thể lưu giữ dữ liệu dài hạn về các dấu hiệu sinh tồn của bệnh nhân, cho phép nó phát hiện các xu hướng hoặc cung cấp thông tin lịch sử cho các nhà cung cấp dịch vụ chăm sóc sức khỏe."
    },
    {
      "[y1, x1, y2, x2]": [638, 142, 662, 532],
      "text": "Quản lý và Truy xuất Bộ nhớ"
    },
    {
      "[y1, x1, y2, x2]": [678, 142, 753, 842],
      "text": "Quản lý bộ nhớ hiệu quả bao gồm việc tổ chức và lập chỉ mục dữ liệu được lưu trữ để có thể dễ dàng truy xuất khi cần thiết. Các tác tử dựa vào bộ nhớ phải có khả năng phân biệt giữa dữ liệu liên quan và không liên quan và truy xuất thông tin nhanh chóng để đảm bảo hiệu suất liền mạch. Trong một số trường hợp, các tác tử cũng có thể cần quên đi một số thông tin nhất định để tránh làm lộn xộn bộ nhớ của chúng với các chi tiết đã lỗi thời hoặc không cần thiết."
    },
    {
      "[y1, x1, y2, x2]": [766, 142, 826, 842],
      "text": "Một tác tử đề xuất thương mại điện tử phải lưu trữ sở thích của người dùng và lịch sử mua hàng trong quá khứ để cung cấp các đề xuất được cá nhân hóa. Tuy nhiên, nó cũng phải ưu tiên dữ liệu gần đây để đảm bảo rằng các đề xuất vẫn phù hợp và chính xác khi sở thích của người dùng thay đổi theo thời gian."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "26 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_9": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 321],
      "text": "Điều phối"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 239, 842],
      "text": "Điều phối là thứ biến các khả năng riêng lẻ thành các giải pháp toàn diện: đó là logic cấu thành, lên lịch và giám sát một loạt các kỹ năng để mỗi hành động nối tiếp nhau và hướng tới một mục tiêu rõ ràng. Về cốt lõi, điều phối đánh giá các chuỗi khả thi của các lệnh gọi công cụ hoặc kỹ năng, dự báo kết quả có khả năng xảy ra của chúng và chọn con đường có khả năng thành công nhất trong các nhiệm vụ nhiều bước—cho dù đó là lập kế hoạch một tuyến đường giao hàng tối ưu cân bằng giữa giao thông, cửa sổ thời gian và sự sẵn có của phương tiện, hay là lắp ráp một quy trình xử lý dữ liệu phức tạp."
    },
    {
      "[y1, x1, y2, x2]": [252, 142, 352, 842],
      "text": "Bởi vì các điều kiện trong thế giới thực có thể thay đổi trong tích tắc—thông tin mới đến, các ưu tiên thay đổi, hoặc tài nguyên không còn khả dụng—một bộ điều phối phải liên tục giám sát cả tiến độ và môi trường, tạm dừng hoặc định tuyến lại các quy trình công việc khi cần thiết để đi đúng hướng. Trong nhiều kịch bản, các tác tử xây dựng kế hoạch một cách tăng dần: chúng thực hiện một vài bước, sau đó đánh giá lại và cập nhật quy trình công việc còn lại dựa trên các kết quả mới. Ví dụ, một trợ lý đàm thoại có thể xác nhận kết quả của mỗi nhiệm vụ phụ trước khi lên kế hoạch cho nhiệm vụ tiếp theo, tự động điều chỉnh chuỗi của mình để đảm bảo khả năng phản hồi và sự mạnh mẽ."
    },
    {
      "[y1, x1, y2, x2]": [365, 142, 425, 842],
      "text": "Nếu không có một lớp điều phối vững chắc, ngay cả những kỹ năng mạnh mẽ nhất cũng có nguy cơ hoạt động trái ngược nhau hoặc hoàn toàn bị đình trệ. Chúng ta sẽ đi sâu vào các mẫu, kiến trúc và các phương pháp tốt nhất để xây dựng các công cụ điều phối linh hoạt, có khả năng phục hồi trong Chương 5."
    },
    {
      "[y1, x1, y2, x2]": [471, 142, 495, 360],
      "text": "Các Đánh đổi trong Thiết kế"
    },
    {
      "[y1, x1, y2, x2]": [512, 142, 587, 842],
      "text": "Thiết kế các hệ thống dựa trên tác tử bao gồm việc cân bằng nhiều sự đánh đổi để tối ưu hóa hiệu suất, khả năng mở rộng, độ tin cậy và chi phí. Những sự đánh đổi này đòi hỏi các nhà phát triển phải đưa ra các quyết định chiến lược có thể ảnh hưởng đáng kể đến cách tác tử hoạt động trong môi trường thực tế. Phần này khám phá các sự đánh đổi quan trọng liên quan đến việc tạo ra các hệ thống tác tử hiệu quả và cung cấp hướng dẫn về cách tiếp cận những thách thức này."
    },
    {
      "[y1, x1, y2, x2]": [616, 142, 640, 582],
      "text": "Hiệu suất: Đánh đổi giữa Tốc độ và Độ chính xác"
    },
    {
      "[y1, x1, y2, x2]": [657, 142, 732, 842],
      "text": "Một sự đánh đổi quan trọng trong thiết kế tác tử là cân bằng giữa tốc độ và độ chính xác. Hiệu suất cao thường cho phép một tác tử xử lý thông tin nhanh chóng, đưa ra quyết định và thực hiện các nhiệm vụ, nhưng điều này có thể phải trả giá bằng độ chính xác. Ngược lại, việc tập trung vào độ chính xác có thể làm chậm tác tử, đặc biệt khi cần các mô hình phức tạp hoặc các kỹ thuật đòi hỏi nhiều tính toán."
    },
    {
      "[y1, x1, y2, x2]": [745, 142, 820, 842],
      "text": "Trong các môi trường thời gian thực, chẳng hạn như xe tự hành hoặc hệ thống giao dịch, việc ra quyết định nhanh chóng là rất cần thiết, với mili giây đôi khi tạo ra sự khác biệt quan trọng; ở đây, việc ưu tiên tốc độ hơn độ chính xác có thể là cần thiết để đảm bảo các phản hồi kịp thời. Tuy nhiên, các nhiệm vụ như phân tích pháp lý hoặc chẩn đoán y tế đòi hỏi độ chính xác cao, khiến việc hy sinh một chút tốc độ để đảm bảo kết quả đáng tin cậy là chấp nhận được."
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Các Đánh đổi trong Thiết kế | 27"
    }
  ],
  "page_10": [
    {
      "[y1, x1, y2, x2]": [84, 142, 144, 842],
      "text": "Một cách tiếp cận kết hợp cũng có thể hiệu quả, trong đó một tác tử ban đầu cung cấp một phản hồi nhanh, gần đúng và sau đó tinh chỉnh nó bằng một phản hồi chính xác hơn. Cách tiếp cận này phổ biến trong các hệ thống đề xuất hoặc chẩn đoán, nơi một gợi ý ban đầu nhanh chóng được xác thực và cải thiện với thêm thời gian và dữ liệu."
    },
    {
      "[y1, x1, y2, x2]": [173, 142, 197, 725],
      "text": "Khả năng mở rộng: Kỹ thuật Mở rộng cho Hệ thống Tác tử"
    },
    {
      "[y1, x1, y2, x2]": [214, 142, 328, 842],
      "text": "Khả năng mở rộng là một thách thức quan trọng đối với các hệ thống dựa trên tác tử hiện đại, đặc biệt là những hệ thống phụ thuộc nhiều vào các mô hình học sâu và xử lý thời gian thực. Khi các hệ thống tác tử phát triển về độ phức tạp, khối lượng dữ liệu và tính đồng thời của nhiệm vụ, việc quản lý tài nguyên tính toán, đặc biệt là GPU, trở nên quan trọng. GPU là xương sống để tăng tốc việc huấn luyện và suy luận của các mô hình AI lớn, nhưng việc mở rộng hiệu quả đòi hỏi kỹ thuật cẩn thận để tránh tắc nghẽn, sử dụng kém hiệu quả và chi phí vận hành tăng cao. Phần này phác thảo các chiến lược để mở rộng hiệu quả các hệ thống tác tử bằng cách tối ưu hóa tài nguyên và kiến trúc GPU."
    },
    {
      "[y1, x1, y2, x2]": [341, 142, 472, 842],
      "text": "Tài nguyên GPU thường là yếu tố đắt đỏ và hạn chế nhất trong việc mở rộng các hệ thống tác tử, khiến việc sử dụng chúng một cách hiệu quả trở thành ưu tiên hàng đầu. Quản lý tài nguyên đúng cách cho phép các tác tử xử lý khối lượng công việc ngày càng tăng trong khi giảm thiểu độ trễ và chi phí liên quan đến tính toán hiệu năng cao. Một chiến lược quan trọng cho khả năng mở rộng là phân bổ GPU động, bao gồm việc gán tài nguyên GPU dựa trên nhu cầu thời gian thực. Thay vì phân bổ tĩnh GPU cho các tác tử hoặc nhiệm vụ, phân bổ động đảm bảo rằng GPU chỉ được sử dụng khi cần thiết, giảm thời gian nhàn rỗi và tối ưu hóa việc sử dụng."
    },
    {
      "[y1, x1, y2, x2]": [485, 142, 545, 842],
      "text": "Cung cấp GPU linh hoạt (elastic provisioning) tăng cường hiệu quả hơn nữa, sử dụng các dịch vụ đám mây hoặc các cụm GPU tại chỗ tự động mở rộng tài nguyên dựa trên khối lượng công việc hiện tại. Hàng đợi ưu tiên và lập lịch tác vụ thông minh thêm một lớp hiệu quả khác, cho phép các tác vụ có mức độ ưu tiên cao truy cập GPU ngay lập tức trong khi xếp hàng các tác vụ ít quan trọng hơn trong thời gian cao điểm."
    },
    {
      "[y1, x1, y2, x2]": [558, 142, 633, 842],
      "text": "Trong các hệ thống tác tử quy mô lớn, độ trễ có thể trở thành một vấn đề đáng kể, đặc biệt khi các tác tử cần tương tác trong môi trường thời gian thực hoặc gần thời gian thực. Tối ưu hóa để giảm thiểu độ trễ là điều cần thiết để đảm bảo rằng các tác tử vẫn phản hồi nhanh và có khả năng đáp ứng các yêu cầu về hiệu suất. Lập lịch các tác vụ GPU một cách hiệu quả trên các hệ thống phân tán có thể giảm độ trễ và đảm bảo rằng các tác tử hoạt động trơn tru dưới tải nặng."
    },
    {
      "[y1, x1, y2, x2]": [646, 142, 706, 842],
      "text": "Một chiến lược hiệu quả là thực thi tác vụ bất đồng bộ, cho phép các tác vụ GPU được xử lý song song mà không cần chờ các tác vụ trước đó hoàn thành, tối đa hóa việc sử dụng tài nguyên GPU và giảm thời gian nhàn rỗi giữa các tác vụ."
    },
    {
      "[y1, x1, y2, x2]": [719, 142, 779, 842],
      "text": "Một chiến lược khác là cân bằng tải động trên các GPU, ngăn chặn bất kỳ GPU nào trở thành điểm nghẽn bằng cách phân phối các tác vụ đến các tài nguyên chưa được sử dụng hết. Đối với các hệ thống tác tử phụ thuộc vào các tác vụ sử dụng nhiều GPU, chẳng hạn như chạy các suy luận phức tạp"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "28 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_11": [
    {
      "[y1, x1, y2, x2]": [84, 142, 144, 842],
      "text": "các thuật toán, việc mở rộng hiệu quả đòi hỏi nhiều hơn là chỉ thêm GPU; nó đòi hỏi sự tối ưu hóa cẩn thận để đảm bảo rằng các tài nguyên được sử dụng đầy đủ, cho phép hệ thống đáp ứng các nhu cầu ngày càng tăng một cách hiệu quả."
    },
    {
      "[y1, x1, y2, x2]": [157, 142, 202, 842],
      "text": "Để mở rộng các hệ thống sử dụng nhiều GPU một cách hiệu quả, cần nhiều hơn là chỉ thêm GPU—nó bao gồm việc đảm bảo rằng các tài nguyên GPU được sử dụng đầy đủ và hệ thống có thể mở rộng một cách hiệu quả khi nhu cầu tăng lên."
    },
    {
      "[y1, x1, y2, x2]": [215, 142, 260, 842],
      "text": "Mở rộng theo chiều ngang bao gồm việc mở rộng hệ thống bằng cách thêm nhiều nút GPU hơn để xử lý khối lượng công việc ngày càng tăng. Trong một thiết lập cụm, các GPU có thể làm việc cùng nhau để quản lý các tác vụ có khối lượng lớn như suy luận thời gian thực hoặc huấn luyện mô hình."
    },
    {
      "[y1, x1, y2, x2]": [273, 142, 363, 842],
      "text": "Đối với các hệ thống tác tử có khối lượng công việc thay đổi, việc sử dụng phương pháp đám mây lai (hybrid cloud) có thể cải thiện khả năng mở rộng bằng cách kết hợp tài nguyên GPU tại chỗ với GPU trên đám mây. Trong thời gian nhu cầu cao điểm, hệ thống có thể sử dụng mở rộng đột biến (burst scaling), trong đó các tác vụ được chuyển sang các GPU đám mây tạm thời, tăng cường năng lực tính toán mà không cần đầu tư vĩnh viễn vào cơ sở hạ tầng vật lý. Khi nhu cầu giảm xuống, các tài nguyên này có thể được giải phóng, đảm bảo hiệu quả về chi phí."
    },
    {
      "[y1, x1, y2, x2]": [376, 142, 421, 842],
      "text": "Sử dụng các phiên bản GPU trên đám mây trong giờ thấp điểm, khi nhu cầu thấp hơn và giá cả ưu đãi hơn, có thể giảm đáng kể chi phí vận hành trong khi vẫn duy trì sự linh hoạt để mở rộng khi cần thiết."
    },
    {
      "[y1, x1, y2, x2]": [434, 142, 538, 842],
      "text": "Mở rộng các hệ thống tác tử một cách hiệu quả—đặc biệt là những hệ thống phụ thuộc vào tài nguyên GPU—đòi hỏi sự cân bằng cẩn thận giữa việc tối đa hóa hiệu quả GPU, giảm thiểu độ trễ và đảm bảo rằng hệ thống có thể xử lý các khối lượng công việc động. Bằng cách áp dụng các chiến lược như phân bổ GPU động, song song hóa đa GPU, suy luận phân tán và cơ sở hạ tầng đám mây lai, các hệ thống tác tử có thể mở rộng để đáp ứng nhu cầu ngày càng tăng trong khi vẫn duy trì hiệu suất cao và hiệu quả về chi phí. Các công cụ quản lý tài nguyên GPU đóng một vai trò quan trọng trong quá trình này, cung cấp sự giám sát cần thiết để đảm bảo khả năng mở rộng liền mạch khi các hệ thống tác tử phát triển về độ phức tạp và phạm vi."
    },
    {
      "[y1, x1, y2, x2]": [611, 142, 635, 786],
      "text": "Độ tin cậy: Đảm bảo Hành vi Tác tử Mạnh mẽ và Nhất quán"
    },
    {
      "[y1, x1, y2, x2]": [652, 142, 727, 842],
      "text": "Độ tin cậy đề cập đến khả năng của tác tử thực hiện các nhiệm vụ của mình một cách nhất quán và chính xác theo thời gian. Một tác tử đáng tin cậy phải xử lý các điều kiện mong đợi và không mong đợi mà không bị lỗi, đảm bảo mức độ tin cậy cao từ người dùng và các bên liên quan. Tuy nhiên, việc cải thiện độ tin cậy thường liên quan đến sự đánh đổi về độ phức tạp của hệ thống, chi phí và thời gian phát triển."
    },
    {
      "[y1, x1, y2, x2]": [757, 142, 769, 273],
      "text": "Khả năng chịu lỗi"
    },
    {
      "[y1, x1, y2, x2]": [782, 142, 842, 842],
      "text": "Một khía cạnh quan trọng của độ tin cậy là đảm bảo rằng các tác tử có thể xử lý các lỗi hoặc các sự kiện không mong đợi mà không bị sập hoặc hoạt động một cách khó lường. Điều này có thể bao gồm việc xây dựng khả năng chịu lỗi, trong đó tác tử có thể phát hiện các lỗi (ví dụ: gián đoạn mạng, lỗi phần cứng) và phục hồi một cách suôn sẻ. Các hệ thống chịu lỗi thường sử dụng tính dự phòng—"
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Các Đánh đổi trong Thiết kế | 29"
    }
  ],
  "page_12": [
    {
      "[y1, x1, y2, x2]": [84, 142, 114, 842],
      "text": "nhân đôi các thành phần hoặc quy trình quan trọng để đảm bảo rằng các lỗi ở một phần của hệ thống không ảnh hưởng đến hiệu suất tổng thể."
    },
    {
      "[y1, x1, y2, x2]": [139, 142, 151, 381],
      "text": "Tính nhất quán và mạnh mẽ"
    },
    {
      "[y1, x1, y2, x2]": [164, 142, 254, 842],
      "text": "Để các tác tử đáng tin cậy, chúng phải hoạt động một cách nhất quán trong các kịch bản, đầu vào và môi trường khác nhau. Điều này đặc biệt quan trọng trong các hệ thống quan trọng về an toàn, chẳng hạn như xe tự hành hoặc các tác tử chăm sóc sức khỏe, nơi một sai lầm có thể gây ra hậu quả nghiêm trọng. Các nhà phát triển phải đảm bảo rằng tác tử hoạt động tốt không chỉ trong điều kiện lý tưởng mà còn trong các trường hợp biên, kiểm tra tải và các ràng buộc trong thế giới thực. Để đạt được độ tin cậy cần:"
    },
    {
      "[y1, x1, y2, x2]": [284, 142, 296, 293],
      "text": "Kiểm thử sâu rộng"
    },
    {
      "[y1, x1, y2, x2]": [309, 179, 369, 842],
      "text": "Các tác tử nên trải qua quá trình kiểm thử nghiêm ngặt, bao gồm kiểm thử đơn vị, kiểm thử tích hợp và mô phỏng các kịch bản trong thế giới thực. Các bài kiểm tra nên bao gồm các trường hợp biên, các đầu vào không mong đợi và các điều kiện đối nghịch để đảm bảo rằng tác tử có thể xử lý các môi trường đa dạng."
    },
    {
      "[y1, x1, y2, x2]": [399, 142, 411, 404],
      "text": "Vòng lặp giám sát và phản hồi"
    },
    {
      "[y1, x1, y2, x2]": [424, 179, 484, 842],
      "text": "Các tác tử đáng tin cậy yêu cầu sự giám sát liên tục trong môi trường sản xuất để phát hiện các bất thường và điều chỉnh hành vi của chúng để đối phó với các điều kiện thay đổi. Các vòng lặp phản hồi cho phép các tác tử học hỏi từ môi trường của chúng và cải thiện hiệu suất theo thời gian, tăng cường sự mạnh mẽ của chúng."
    },
    {
      "[y1, x1, y2, x2]": [514, 142, 538, 597],
      "text": "Chi phí: Cân bằng giữa Hiệu suất và Kinh phí"
    },
    {
      "[y1, x1, y2, x2]": [555, 142, 615, 842],
      "text": "Chi phí là một sự đánh đổi thường bị bỏ qua nhưng lại rất quan trọng trong thiết kế các hệ thống dựa trên tác tử. Các chi phí liên quan đến việc phát triển, triển khai và bảo trì một tác tử phải được cân nhắc so với lợi ích dự kiến và lợi tức đầu tư (ROI). Các cân nhắc về chi phí ảnh hưởng đến các quyết định liên quan đến độ phức tạp của mô hình, cơ sở hạ tầng và khả năng mở rộng."
    },
    {
      "[y1, x1, y2, x2]": [645, 142, 657, 313],
      "text": "Chi phí phát triển"
    },
    {
      "[y1, x1, y2, x2]": [670, 142, 745, 842],
      "text": "Phát triển các tác tử phức tạp có thể tốn kém, đặc biệt khi sử dụng các mô hình học máy (ML) tiên tiến đòi hỏi các bộ dữ liệu lớn, chuyên môn đặc biệt và tài nguyên tính toán đáng kể để huấn luyện. Ngoài ra, nhu cầu thiết kế lặp, kiểm thử và tối ưu hóa làm tăng chi phí phát triển."
    },
    {
      "[y1, x1, y2, x2]": [758, 142, 833, 842],
      "text": "Các tác tử phức tạp thường đòi hỏi một đội ngũ có tài năng chuyên biệt, bao gồm các nhà khoa học dữ liệu, kỹ sư ML và các chuyên gia trong lĩnh vực, để tạo ra các hệ thống hiệu suất cao. Ngoài ra, việc xây dựng một hệ thống tác tử đáng tin cậy và có khả năng mở rộng đòi hỏi cơ sở hạ tầng kiểm thử sâu rộng, thường bao gồm các môi trường mô phỏng và đầu tư vào các công cụ và khung kiểm thử để đảm bảo chức năng mạnh mẽ."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "30 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_13": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 301],
      "text": "Chi phí vận hành"
    },
    {
      "[y1, x1, y2, x2]": [109, 142, 199, 842],
      "text": "Sau khi triển khai, chi phí vận hành của việc chạy các tác tử có thể trở nên đáng kể, đặc biệt đối với các hệ thống đòi hỏi sức mạnh tính toán cao, chẳng hạn như những hệ thống liên quan đến việc ra quyết định thời gian thực hoặc xử lý dữ liệu liên tục. Các yếu tố chính góp phần vào các chi phí này bao gồm nhu cầu về sức mạnh tính toán đáng kể, vì các tác tử chạy các mô hình học sâu hoặc các thuật toán phức tạp thường dựa vào phần cứng đắt tiền như GPU hoặc các dịch vụ đám mây."
    },
    {
      "[y1, x1, y2, x2]": [212, 142, 287, 842],
      "text": "Ngoài ra, các tác tử xử lý lượng lớn dữ liệu hoặc duy trì bộ nhớ rộng lớn sẽ phát sinh chi phí cao hơn cho việc lưu trữ dữ liệu và băng thông. Việc bảo trì và cập nhật thường xuyên, bao gồm sửa lỗi và cải tiến hệ thống, tiếp tục làm tăng chi phí vận hành vì cần có tài nguyên để đảm bảo độ tin cậy và hiệu suất của hệ thống theo thời gian."
    },
    {
      "[y1, x1, y2, x2]": [317, 142, 329, 292],
      "text": "Chi phí so với giá trị"
    },
    {
      "[y1, x1, y2, x2]": [342, 142, 427, 842],
      "text": "Cuối cùng, chi phí của một hệ thống dựa trên tác tử phải được biện minh bằng giá trị mà nó mang lại. Trong một số trường hợp, có thể hợp lý khi ưu tiên các tác tử rẻ hơn, đơn giản hơn cho các nhiệm vụ ít quan trọng hơn, trong khi đầu tư mạnh vào các tác tử phức tạp hơn cho các ứng dụng quan trọng. Các quyết định về chi phí phải được đưa ra trong bối cảnh các mục tiêu tổng thể và vòng đời dự kiến của hệ thống. Một số chiến lược tối ưu hóa bao gồm:"
    },
    {
      "[y1, x1, y2, x2]": [457, 142, 469, 252],
      "text": "Mô hình tinh gọn"
    },
    {
      "[y1, x1, y2, x2]": [482, 179, 542, 842],
      "text": "Sử dụng các mô hình đơn giản hơn, hiệu quả hơn khi thích hợp có thể giúp giảm cả chi phí phát triển và vận hành. Ví dụ, nếu một hệ thống dựa trên quy tắc có thể đạt được kết quả tương tự như một mô hình học sâu cho một nhiệm vụ nhất định, cách tiếp cận đơn giản hơn thường sẽ hiệu quả hơn về mặt chi phí."
    },
    {
      "[y1, x1, y2, x2]": [572, 142, 584, 344],
      "text": "Tài nguyên dựa trên đám mây"
    },
    {
      "[y1, x1, y2, x2]": [597, 179, 642, 842],
      "text": "Tận dụng tài nguyên điện toán đám mây có thể giảm chi phí cơ sở hạ tầng ban đầu, thiết lập một mô hình trả tiền theo mức sử dụng (pay-as-you-go) có khả năng mở rộng tốt hơn."
    },
    {
      "[y1, x1, y2, x2]": [655, 142, 667, 407],
      "text": "Mô hình và công cụ mã nguồn mở"
    },
    {
      "[y1, x1, y2, x2]": [680, 179, 725, 842],
      "text": "Sử dụng các thư viện và khung ML mã nguồn mở có thể giúp giảm thiểu chi phí phát triển phần mềm trong khi vẫn mang lại các tác tử chất lượng cao."
    },
    {
      "[y1, x1, y2, x2]": [738, 142, 838, 842],
      "text": "Thiết kế các hệ thống tác tử bao gồm việc cân bằng một số sự đánh đổi quan trọng. Ưu tiên hiệu suất có thể đòi hỏi hy sinh một số độ chính xác, trong khi mở rộng sang kiến trúc đa tác tử gây ra những thách thức trong việc điều phối và tính nhất quán. Đảm bảo độ tin cậy đòi hỏi kiểm thử và giám sát nghiêm ngặt nhưng có thể làm tăng thời gian và độ phức tạp của quá trình phát triển. Cuối cùng, các cân nhắc về chi phí phải được tính đến từ cả góc độ phát triển và vận hành, đảm bảo rằng hệ thống mang lại giá trị trong giới hạn ngân sách. Trong phần tiếp theo, chúng ta sẽ xem xét một số mẫu thiết kế phổ biến nhất được sử dụng khi xây dựng các hệ thống tác tử hiệu quả."
    },
    {
      "[y1, x1, y2, x2]": [923, 686, 936, 842],
      "text": "Các Đánh đổi trong Thiết kế | 31"
    }
  ],
  "page_14": [
    {
      "[y1, x1, y2, x2]": [84, 142, 108, 483],
      "text": "Các Mẫu Thiết kế Kiến trúc"
    },
    {
      "[y1, x1, y2, x2]": [125, 142, 225, 842],
      "text": "Thiết kế kiến trúc của các hệ thống dựa trên tác tử quyết định cách các tác tử được cấu trúc, cách chúng tương tác với môi trường của chúng và cách chúng thực hiện các nhiệm vụ. Việc lựa chọn kiến trúc ảnh hưởng đến khả năng mở rộng, khả năng bảo trì và tính linh hoạt của hệ thống. Phần này khám phá ba mẫu thiết kế phổ biến cho các hệ thống dựa trên tác tử—kiến trúc đơn tác tử và đa tác tử—và thảo luận về các ưu điểm, thách thức và các trường hợp sử dụng phù hợp của chúng. Chúng ta sẽ thảo luận chi tiết hơn về điều này trong Chương 8."
    },
    {
      "[y1, x1, y2, x2]": [254, 142, 278, 489],
      "text": "Kiến trúc Đơn tác tử"
    },
    {
      "[y1, x1, y2, x2]": [295, 142, 355, 842],
      "text": "Kiến trúc đơn tác tử là một trong những thiết kế đơn giản và trực tiếp nhất, trong đó một tác tử duy nhất chịu trách nhiệm quản lý và thực hiện tất cả các nhiệm vụ trong một hệ thống. Tác tử này tương tác trực tiếp với môi trường của nó và tự xử lý việc ra quyết định, lập kế hoạch và thực thi mà không cần dựa vào các tác tử khác."
    },
    {
      "[y1, x1, y2, x2]": [368, 142, 482, 842],
      "text": "Lý tưởng cho các nhiệm vụ được xác định rõ ràng và có phạm vi hẹp, kiến trúc này phù hợp nhất cho các khối lượng công việc có thể được quản lý bởi một thực thể duy nhất. Sự đơn giản của các hệ thống đơn tác tử giúp chúng dễ dàng thiết kế, phát triển và triển khai, vì chúng tránh được những phức tạp liên quan đến việc điều phối, giao tiếp và đồng bộ hóa giữa nhiều thành phần. Với các trường hợp sử dụng rõ ràng, kiến trúc đơn tác tử vượt trội trong các nhiệm vụ có phạm vi hẹp không đòi hỏi sự hợp tác hoặc nỗ lực phân tán, chẳng hạn như các chatbot đơn giản xử lý các truy vấn cơ bản của khách hàng (như Câu hỏi thường gặp và theo dõi đơn hàng) và tự động hóa các nhiệm vụ cụ thể để nhập dữ liệu hoặc quản lý tệp."
    },
    {
      "[y1, x1, y2, x2]": [495, 142, 555, 842],
      "text": "Các thiết lập đơn tác tử hoạt động tốt trong các môi trường mà lĩnh vực vấn đề được xác định rõ ràng, các nhiệm vụ đơn giản và không có nhu cầu đáng kể về việc mở rộng quy mô. Điều này làm cho chúng phù hợp với các chatbot dịch vụ khách hàng, trợ lý đa năng và các tác tử tạo mã. Chúng ta sẽ thảo luận nhiều hơn về kiến trúc đơn tác tử và đa tác tử trong Chương 8."
    },
    {
      "[y1, x1, y2, x2]": [631, 142, 680, 842],
      "text": "Kiến trúc Đa tác tử: Hợp tác, Song song,\nvà Điều phối"
    },
    {
      "[y1, x1, y2, x2]": [697, 142, 787, 842],
      "text": "Trong kiến trúc đa tác tử, nhiều tác tử làm việc cùng nhau để đạt được một mục tiêu chung. Các tác tử này có thể hoạt động độc lập, song song hoặc thông qua các nỗ lực phối hợp, tùy thuộc vào bản chất của các nhiệm vụ. Các hệ thống đa tác tử thường được sử dụng trong các môi trường phức tạp, nơi các khía cạnh khác nhau của một nhiệm vụ cần được quản lý bởi các tác tử chuyên biệt hoặc nơi xử lý song song có thể cải thiện hiệu quả và khả năng mở rộng, và chúng mang lại nhiều lợi thế:"
    },
    {
      "[y1, x1, y2, x2]": [816, 142, 828, 453],
      "text": "Hợp tác và chuyên môn hóa"
    },
    {
      "[y1, x1, y2, x2]": [841, 179, 887, 842],
      "text": "Mỗi tác tử trong một hệ thống đa tác tử có thể được thiết kế để chuyên môn hóa vào các nhiệm vụ hoặc lĩnh vực cụ thể. Ví dụ, một tác tử có thể tập trung vào việc thu thập dữ liệu trong khi một tác tử khác"
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "32 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_15": [
    {
      "[y1, x1, y2, x2]": [84, 179, 129, 842],
      "text": "xử lý dữ liệu, và một tác tử thứ ba quản lý các tương tác của người dùng. Sự phân công lao động này cho phép hệ thống xử lý các nhiệm vụ phức tạp hiệu quả hơn so với một tác tử duy nhất."
    },
    {
      "[y1, x1, y2, x2]": [159, 142, 171, 241],
      "text": "Tính song song"
    },
    {
      "[y1, x1, y2, x2]": [184, 179, 244, 842],
      "text": "Kiến trúc đa tác tử có thể tận dụng tính song song để thực hiện nhiều nhiệm vụ cùng một lúc. Ví dụ, các tác tử trong một hệ thống logistics có thể đồng thời lên kế hoạch cho các tuyến đường giao hàng khác nhau, giảm thời gian xử lý tổng thể và cải thiện hiệu quả."
    },
    {
      "[y1, x1, y2, x2]": [257, 142, 269, 345],
      "text": "Cải thiện khả năng mở rộng"
    },
    {
      "[y1, x1, y2, x2]": [282, 179, 327, 842],
      "text": "Khi hệ thống phát triển, có thể giới thiệu thêm các tác tử để xử lý nhiều nhiệm vụ hơn hoặc để phân phối khối lượng công việc. Điều này làm cho các hệ thống đa tác tử có khả năng mở rộng cao và có thể quản lý các môi trường lớn hơn và phức tạp hơn."
    },
    {
      "[y1, x1, y2, x2]": [340, 142, 352, 381],
      "text": "Tính dự phòng và khả năng phục hồi"
    },
    {
      "[y1, x1, y2, x2]": [365, 179, 439, 842],
      "text": "Bởi vì nhiều tác tử hoạt động độc lập, sự cố ở một tác tử không nhất thiết làm ảnh hưởng đến toàn bộ hệ thống. Các tác tử khác có thể tiếp tục hoạt động hoặc thậm chí đảm nhận trách nhiệm của tác tử bị lỗi, cải thiện độ tin cậy tổng thể của hệ thống."
    },
    {
      "[y1, x1, y2, x2]": [452, 142, 492, 842],
      "text": "Mặc dù có những lợi thế này, các hệ thống đa tác tử cũng đi kèm với những thách thức đáng kể, bao gồm:"
    },
    {
      "[y1, x1, y2, x2]": [522, 142, 534, 461],
      "text": "Điều phối và giao tiếp"
    },
    {
      "[y1, x1, y2, x2]": [547, 179, 619, 842],
      "text": "Quản lý giao tiếp giữa các tác tử có thể phức tạp. Các tác tử phải trao đổi thông tin hiệu quả và điều phối các hành động của chúng để tránh trùng lặp nỗ lực, các hành động xung đột hoặc tranh chấp tài nguyên. Nếu không có sự điều phối hợp lý, các hệ thống đa tác tử có thể trở nên mất tổ chức và không hiệu quả."
    },
    {
      "[y1, x1, y2, x2]": [632, 142, 644, 357],
      "text": "Tăng độ phức tạp"
    },
    {
      "[y1, x1, y2, x2]": [657, 179, 729, 842],
      "text": "Mặc dù các hệ thống đa tác tử rất mạnh mẽ, chúng cũng khó thiết kế, phát triển và bảo trì hơn. Nhu cầu về các giao thức giao tiếp, chiến lược điều phối và cơ chế đồng bộ hóa làm tăng thêm các lớp phức tạp cho kiến trúc hệ thống."
    },
    {
      "[y1, x1, y2, x2]": [742, 142, 754, 292],
      "text": "Hiệu quả thấp hơn"
    },
    {
      "[y1, x1, y2, x2]": [767, 179, 884, 842],
      "text": "Mặc dù không phải lúc nào cũng vậy, các hệ thống đa tác tử thường gặp phải tình trạng hiệu quả giảm do tiêu thụ token cao hơn khi hoàn thành nhiệm vụ. Bởi vì các tác tử phải thường xuyên giao tiếp, chia sẻ ngữ cảnh và điều phối các hành động, chúng tiêu thụ nhiều sức mạnh xử lý và tài nguyên hơn so với các hệ thống đơn tác tử. Việc sử dụng token tăng lên này không chỉ dẫn đến chi phí tính toán cao hơn mà còn có thể làm chậm quá trình hoàn thành nhiệm vụ nếu giao tiếp và điều phối không được tối ưu hóa. Do đó, mặc dù các hệ thống đa tác tử cung cấp các giải pháp mạnh mẽ cho các nhiệm vụ phức tạp, những thách thức về hiệu quả của chúng có nghĩa là việc quản lý tài nguyên cẩn thận là rất quan trọng."
    },
    {
      "[y1, x1, y2, x2]": [923, 634, 936, 842],
      "text": "Các Mẫu Thiết kế Kiến trúc | 33"
    }
  ],
  "page_16": [
    {
      "[y1, x1, y2, x2]": [84, 142, 158, 842],
      "text": "Kiến trúc đa tác tử rất phù hợp cho các môi trường mà các nhiệm vụ phức tạp, phân tán hoặc đòi hỏi sự chuyên môn hóa giữa các thành phần khác nhau. Trong các hệ thống này, nhiều tác tử đóng góp vào việc giải quyết các vấn đề phức tạp, phân tán, chẳng hạn như trong các hệ thống giao dịch tài chính, điều tra an ninh mạng hoặc các nền tảng nghiên cứu AI hợp tác."
    },
    {
      "[y1, x1, y2, x2]": [171, 142, 246, 842],
      "text": "Các hệ thống đơn tác tử cung cấp sự đơn giản và lý tưởng cho các nhiệm vụ được xác định rõ ràng. Các hệ thống đa tác tử cung cấp sự hợp tác, tính song song và khả năng mở rộng, làm cho chúng phù hợp với các môi trường phức tạp. Việc chọn kiến trúc phù hợp phụ thuộc vào độ phức tạp của nhiệm vụ, nhu cầu về khả năng mở rộng và vòng đời dự kiến của hệ thống. Trong phần tiếp theo, chúng ta sẽ thảo luận về một số nguyên tắc mà chúng ta có thể tuân theo để đạt được kết quả tốt nhất từ các hệ thống tác tử mà chúng ta xây dựng."
    },
    {
      "[y1, x1, y2, x2]": [292, 142, 316, 329],
      "text": "Các Phương pháp Tốt nhất"
    },
    {
      "[y1, x1, y2, x2]": [333, 142, 433, 842],
      "text": "Thiết kế các hệ thống dựa trên tác tử đòi hỏi nhiều hơn là chỉ xây dựng các tác tử với các mô hình, kỹ năng và kiến trúc phù hợp. Để đảm bảo rằng các hệ thống này hoạt động tối ưu trong điều kiện thế giới thực và tiếp tục phát triển khi môi trường thay đổi, điều cần thiết là phải tuân theo các phương pháp tốt nhất trong suốt vòng đời phát triển. Phần này nhấn mạnh ba phương pháp tốt nhất quan trọng—thiết kế lặp, chiến lược đánh giá và thử nghiệm trong thế giới thực—góp phần tạo ra các hệ thống tác tử có thể thích ứng, hiệu quả và đáng tin cậy."
    },
    {
      "[y1, x1, y2, x2]": [462, 142, 486, 335],
      "text": "Thiết kế Lặp"
    },
    {
      "[y1, x1, y2, x2]": [503, 142, 593, 842],
      "text": "Thiết kế lặp là một phương pháp cơ bản trong phát triển tác tử, nhấn mạnh tầm quan trọng của việc xây dựng các hệ thống theo từng bước trong khi liên tục kết hợp phản hồi. Thay vì nhắm đến một giải pháp hoàn hảo trong lần xây dựng đầu tiên, thiết kế lặp tập trung vào việc tạo ra các nguyên mẫu nhỏ, chức năng mà bạn có thể đánh giá, cải thiện và tinh chỉnh qua nhiều chu kỳ. Quá trình này cho phép xác định nhanh chóng các sai sót, điều chỉnh hướng đi nhanh chóng và cải tiến hệ thống liên tục, và nó có nhiều lợi ích:"
    },
    {
      "[y1, x1, y2, x2]": [623, 142, 635, 381],
      "text": "Phát hiện sớm các vấn đề"
    },
    {
      "[y1, x1, y2, x2]": [648, 179, 708, 842],
      "text": "Bằng cách phát hành các nguyên mẫu sớm, các nhà phát triển có thể xác định các sai sót trong thiết kế hoặc các điểm nghẽn về hiệu suất trước khi chúng trở nên ăn sâu vào hệ thống. Điều này cho phép khắc phục nhanh chóng các vấn đề, giảm chi phí phát triển dài hạn và tránh các lần tái cấu trúc lớn."
    },
    {
      "[y1, x1, y2, x2]": [738, 142, 750, 318],
      "text": "Thiết kế lấy người dùng làm trung tâm"
    },
    {
      "[y1, x1, y2, x2]": [763, 179, 838, 842],
      "text": "Thiết kế lặp khuyến khích phản hồi thường xuyên từ các bên liên quan, người dùng cuối và các nhà phát triển khác. Phản hồi này đảm bảo rằng hệ thống tác tử luôn phù hợp với nhu cầu và mong đợi của người dùng. Khi các tác tử được thử nghiệm trong các kịch bản thực tế, các cải tiến lặp có thể tinh chỉnh hành vi và phản ứng của chúng để phù hợp hơn với người dùng mà chúng phục vụ."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 426],
      "text": "34 Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_17": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 237],
      "text": "Khả năng mở rộng"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 184, 842],
      "text": "Bắt đầu với một sản phẩm khả thi tối thiểu (MVP) hoặc một tác tử cơ bản cho phép hệ thống phát triển và tiến hóa theo từng bước có thể quản lý được. Khi hệ thống trưởng thành, các tính năng và khả năng mới có thể được giới thiệu dần dần, đảm bảo rằng mỗi sự bổ sung đều được kiểm tra kỹ lưỡng trước khi triển khai đầy đủ."
    },
    {
      "[y1, x1, y2, x2]": [197, 142, 210, 608],
      "text": "Để áp dụng thiết kế lặp một cách hiệu quả, các nhóm phát triển nên:"
    },
    {
      "[y1, x1, y2, x2]": [240, 142, 252, 401],
      "text": "Phát triển nguyên mẫu nhanh chóng"
    },
    {
      "[y1, x1, y2, x2]": [265, 179, 295, 842],
      "text": "Tập trung vào việc xây dựng chức năng cốt lõi trước. Đừng nhắm đến sự hoàn hảo ở giai đoạn này—hãy xây dựng một cái gì đó hoạt động và mang lại giá trị, ngay cả khi nó chỉ là cơ bản."
    },
    {
      "[y1, x1, y2, x2]": [308, 142, 320, 396],
      "text": "Kiểm thử và thu thập phản hồi"
    },
    {
      "[y1, x1, y2, x2]": [333, 179, 393, 842],
      "text": "Sau mỗi vòng lặp, thu thập phản hồi từ người dùng, nhà phát triển và các bên liên quan khác. Sử dụng phản hồi này để hướng dẫn các cải tiến và quyết định các ưu tiên của vòng lặp tiếp theo."
    },
    {
      "[y1, x1, y2, x2]": [406, 142, 418, 309],
      "text": "Tinh chỉnh và lặp lại"
    },
    {
      "[y1, x1, y2, x2]": [431, 179, 491, 842],
      "text": "Dựa trên phản hồi và dữ liệu hiệu suất, thực hiện các thay đổi cần thiết và tinh chỉnh hệ thống trong vòng lặp tiếp theo. Tiếp tục chu kỳ này cho đến khi hệ thống tác tử đáp ứng các mục tiêu về hiệu suất, khả năng sử dụng và khả năng mở rộng."
    },
    {
      "[y1, x1, y2, x2]": [504, 142, 546, 842],
      "text": "Thiết kế lặp hiệu quả bao gồm việc phát triển nhanh chóng các nguyên mẫu chức năng, thu thập phản hồi sau mỗi vòng lặp và liên tục tinh chỉnh hệ thống dựa trên những hiểu biết thu được để đáp ứng các mục tiêu về hiệu suất và khả năng sử dụng."
    },
    {
      "[y1, x1, y2, x2]": [576, 142, 600, 381],
      "text": "Chiến lược Đánh giá"
    },
    {
      "[y1, x1, y2, x2]": [617, 142, 741, 842],
      "text": "Đánh giá hiệu suất và độ tin cậy của các hệ thống dựa trên tác tử là một phần quan trọng của quá trình phát triển. Một đánh giá mạnh mẽ đảm bảo rằng các tác tử có khả năng xử lý các kịch bản thực tế, hoạt động trong các điều kiện khác nhau và đáp ứng các kỳ vọng về hiệu suất. Nó bao gồm một cách tiếp cận có hệ thống để kiểm tra và xác nhận các tác tử trên các khía cạnh khác nhau, bao gồm độ chính xác, hiệu quả, sự mạnh mẽ và khả năng mở rộng. Phần này khám phá các chiến lược chính để tạo ra một khung đánh giá toàn diện cho các hệ thống tác tử. Chúng ta sẽ đề cập sâu hơn về đo lường và xác nhận trong Chương 9."
    },
    {
      "[y1, x1, y2, x2]": [754, 142, 814, 842],
      "text": "Một quy trình đánh giá mạnh mẽ bao gồm việc phát triển một khung kiểm thử toàn diện bao gồm tất cả các khía cạnh chức năng của tác tử. Khung này đảm bảo rằng tác tử được kiểm tra kỹ lưỡng trong nhiều kịch bản khác nhau, cả mong đợi và không mong đợi."
    },
    {
      "[y1, x1, y2, x2]": [827, 142, 887, 842],
      "text": "Kiểm thử chức năng tập trung vào việc xác minh rằng tác tử thực hiện đúng các nhiệm vụ cốt lõi của mình. Mỗi kỹ năng hoặc mô-đun của tác tử nên được kiểm tra riêng lẻ để đảm bảo rằng nó hoạt động như mong đợi trên các đầu vào và kịch bản khác nhau. Các lĩnh vực tập trung chính bao gồm:"
    },
    {
      "[y1, x1, y2, x2]": [923, 722, 936, 842],
      "text": "Các Phương pháp Tốt nhất | 35"
    }
  ],
  "page_18": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 255],
      "text": "Tính đúng đắn"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 139, 842],
      "text": "Đảm bảo rằng tác tử luôn cung cấp các kết quả chính xác và mong đợi dựa trên thiết kế của nó"
    },
    {
      "[y1, x1, y2, x2]": [152, 142, 164, 311],
      "text": "Kiểm thử biên"
    },
    {
      "[y1, x1, y2, x2]": [177, 179, 222, 842],
      "text": "Đánh giá cách tác tử xử lý các trường hợp biên và các đầu vào cực đoan, chẳng hạn như các bộ dữ liệu rất lớn, các truy vấn bất thường hoặc các hướng dẫn mơ hồ"
    },
    {
      "[y1, x1, y2, x2]": [235, 142, 247, 363],
      "text": "Các chỉ số đặc thù của tác vụ"
    },
    {
      "[y1, x1, y2, x2]": [260, 179, 320, 842],
      "text": "Đối với các tác tử xử lý các nhiệm vụ chuyên biệt (ví dụ: phân tích pháp lý, chẩn đoán y tế), đảm bảo hệ thống đáp ứng các yêu cầu về độ chính xác và tuân thủ của lĩnh vực đó"
    },
    {
      "[y1, x1, y2, x2]": [333, 142, 378, 842],
      "text": "Đối với các hệ thống tác tử, đặc biệt là những hệ thống được hỗ trợ bởi các mô hình ML, điều cần thiết là phải đánh giá khả năng tổng quát hóa của tác tử ra ngoài các kịch bản cụ thể mà nó đã được huấn luyện. Điều này đảm bảo tác tử có thể xử lý các tình huống mới, chưa từng thấy trong khi vẫn duy trì độ chính xác và độ tin cậy."
    },
    {
      "[y1, x1, y2, x2]": [391, 142, 451, 842],
      "text": "Các tác tử thường gặp phải các nhiệm vụ nằm ngoài lĩnh vực huấn luyện ban đầu của chúng. Một đánh giá mạnh mẽ nên kiểm tra khả năng của tác tử thích ứng với các nhiệm vụ mới này mà không cần phải huấn luyện lại nhiều. Điều này đặc biệt quan trọng đối với các tác tử đa năng hoặc những tác tử được thiết kế để hoạt động trong các môi trường năng động."
    },
    {
      "[y1, x1, y2, x2]": [464, 142, 509, 842],
      "text": "Trải nghiệm người dùng là một yếu tố quan trọng trong việc xác định sự thành công của các hệ thống tác tử. Điều quan trọng là phải đánh giá không chỉ hiệu suất kỹ thuật của tác tử mà còn cả mức độ đáp ứng kỳ vọng của người dùng trong các ứng dụng thực tế."
    },
    {
      "[y1, x1, y2, x2]": [522, 142, 582, 842],
      "text": "Thu thập phản hồi từ người dùng thực tế cung cấp những hiểu biết quan trọng về mức độ hoạt động của tác tử trong thực tế. Phản hồi này giúp tinh chỉnh hành vi của tác tử, cải thiện hiệu quả và sự hài lòng của người dùng, và có thể bao gồm những điều sau:"
    },
    {
      "[y1, x1, y2, x2]": [612, 142, 624, 375],
      "text": "Điểm hài lòng của người dùng"
    },
    {
      "[y1, x1, y2, x2]": [637, 179, 682, 842],
      "text": "Sử dụng các chỉ số như điểm quảng bá ròng (NPS) hoặc sự hài lòng của khách hàng (CSAT) để đánh giá cảm nhận của người dùng về các tương tác của họ với tác tử."
    },
    {
      "[y1, x1, y2, x2]": [695, 142, 707, 344],
      "text": "Tỷ lệ hoàn thành tác vụ"
    },
    {
      "[y1, x1, y2, x2]": [720, 179, 765, 842],
      "text": "Đo lường tần suất người dùng hoàn thành thành công các nhiệm vụ với sự trợ giúp của tác tử. Tỷ lệ hoàn thành thấp có thể cho thấy sự nhầm lẫn hoặc sự kém hiệu quả trong thiết kế của tác tử."
    },
    {
      "[y1, x1, y2, x2]": [778, 142, 790, 287],
      "text": "Tín hiệu tường minh"
    },
    {
      "[y1, x1, y2, x2]": [803, 179, 878, 842],
      "text": "Tạo cơ hội để người dùng cung cấp phản hồi của họ, dưới các hình thức như nút thích và không thích, xếp hạng sao, và khả năng chấp nhận, từ chối hoặc sửa đổi các kết quả được tạo ra, tùy thuộc vào ngữ cảnh. Những tín hiệu này có thể cung cấp một nguồn thông tin phong phú."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 427],
      "text": "36 | Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ],
  "page_19": [
    {
      "[y1, x1, y2, x2]": [84, 142, 96, 280],
      "text": "Tín hiệu ngầm"
    },
    {
      "[y1, x1, y2, x2]": [109, 179, 169, 842],
      "text": "Phân tích các tương tác giữa người dùng và tác tử để xác định các điểm thất bại phổ biến, chẳng hạn như hiểu sai, chậm trễ, cảm xúc hoặc các phản hồi không phù hợp. Nhật ký tương tác có thể được khai thác để tìm hiểu về các lĩnh vực mà tác tử cần cải thiện."
    },
    {
      "[y1, x1, y2, x2]": [182, 142, 282, 842],
      "text": "Trong một số trường hợp, cần phải có sự tham gia của các chuyên gia con người trong quá trình đánh giá để đánh giá độ chính xác trong việc ra quyết định của tác tử. Xác thực có sự tham gia của con người (human-in-the-loop) kết hợp đánh giá tự động với sự phán đoán của con người, đảm bảo rằng hiệu suất của tác tử phù hợp với các tiêu chuẩn thực tế. Khi có thể, các chuyên gia con người nên xem xét một mẫu kết quả đầu ra của tác tử để xác minh tính đúng đắn, sự tuân thủ đạo đức và sự phù hợp với các phương pháp tốt nhất, và những đánh giá này sau đó có thể được sử dụng để hiệu chỉnh và cải thiện các đánh giá tự động."
    },
    {
      "[y1, x1, y2, x2]": [295, 142, 385, 842],
      "text": "Chúng ta nên đánh giá các tác tử trong các môi trường mô phỏng gần giống với các ứng dụng thực tế của chúng. Điều này giúp đảm bảo rằng hệ thống có thể hoạt động đáng tin cậy bên ngoài các điều kiện phát triển được kiểm soát. Đánh giá tác tử trên toàn bộ phạm vi môi trường hoạt động của nó, từ việc nhập và xử lý dữ liệu đến thực hiện nhiệm vụ và tạo ra kết quả. Kiểm thử từ đầu đến cuối đảm bảo rằng tác tử hoạt động như mong đợi trên nhiều hệ thống, nguồn dữ liệu và nền tảng."
    },
    {
      "[y1, x1, y2, x2]": [415, 142, 439, 360],
      "text": "Thử nghiệm trong Môi trường Thực tế"
    },
    {
      "[y1, x1, y2, x2]": [456, 142, 560, 842],
      "text": "Mặc dù việc xây dựng các tác tử trong một môi trường phát triển được kiểm soát là rất quan trọng cho việc thử nghiệm ban đầu, nhưng việc xác thực các tác tử trong môi trường thực tế cũng quan trọng không kém để đảm bảo chúng hoạt động như mong đợi khi tương tác với người dùng hoặc môi trường thực. Thử nghiệm trong môi trường thực tế bao gồm việc triển khai các tác tử trong môi trường sản xuất thực tế và quan sát hành vi của chúng dưới các điều kiện thực tế. Giai đoạn thử nghiệm này cho phép các nhà phát triển phát hiện ra các vấn đề có thể không xuất hiện trong các giai đoạn phát triển trước đó và đánh giá sự mạnh mẽ, độ tin cậy và tác động của tác tử đối với người dùng."
    },
    {
      "[y1, x1, y2, x2]": [573, 142, 648, 842],
      "text": "Thử nghiệm trong môi trường thực tế là điều cần thiết để đảm bảo các tác tử có thể quản lý được sự khó lường và phức tạp của môi trường thực. Không giống như thử nghiệm có kiểm soát, phương pháp này tiết lộ các trường hợp biên, các đầu vào không mong đợi từ người dùng và hiệu suất dưới tải cao, giúp các nhà phát triển tinh chỉnh tác tử để hoạt động mạnh mẽ, đáng tin cậy:"
    },
    {
      "[y1, x1, y2, x2]": [678, 142, 690, 477],
      "text": "Tiếp xúc với sự phức tạp của thế giới thực"
    },
    {
      "[y1, x1, y2, x2]": [703, 179, 778, 842],
      "text": "Trong các môi trường được kiểm soát, các tác tử hoạt động với các đầu vào và phản hồi có thể dự đoán được. Tuy nhiên, môi trường thực tế lại năng động và không thể đoán trước, với người dùng đa dạng, các trường hợp biên và những thách thức không lường trước được. Thử nghiệm trong những môi trường này đảm bảo rằng tác tử có thể xử lý sự phức tạp và biến đổi của các kịch bản thực tế."
    },
    {
      "[y1, x1, y2, x2]": [791, 142, 803, 364],
      "text": "Phát hiện các trường hợp biên"
    },
    {
      "[y1, x1, y2, x2]": [816, 179, 876, 842],
      "text": "Các tương tác trong thế giới thực thường bộc lộ các trường hợp biên có thể chưa được tính đến trong giai đoạn thiết kế hoặc thử nghiệm. Ví dụ, một chatbot được thử nghiệm với các kịch bản có sẵn"
    },
    {
      "[y1, x1, y2, x2]": [923, 722, 936, 842],
      "text": "Các Phương pháp Tốt nhất | 37"
    }
  ],
  "page_20": [
    {
      "[y1, x1, y2, x2]": [84, 179, 144, 842],
      "text": "các truy vấn có thể hoạt động tốt trong quá trình phát triển, nhưng khi tiếp xúc với người dùng thực, nó có thể gặp khó khăn với các đầu vào không mong đợi, các câu hỏi mơ hồ hoặc các biến thể ngôn ngữ tự nhiên."
    },
    {
      "[y1, x1, y2, x2]": [157, 142, 169, 484],
      "text": "Đánh giá hiệu suất dưới tải"
    },
    {
      "[y1, x1, y2, x2]": [182, 179, 257, 842],
      "text": "Thử nghiệm trong môi trường thực tế cũng cho phép các nhà phát triển quan sát cách tác tử hoạt động dưới khối lượng công việc cao hoặc nhu cầu người dùng tăng lên. Điều này đặc biệt quan trọng đối với các tác tử hoạt động trong các môi trường có lưu lượng truy cập biến động, chẳng hạn như bot dịch vụ khách hàng hoặc công cụ đề xuất thương mại điện tử."
    },
    {
      "[y1, x1, y2, x2]": [270, 142, 330, 842],
      "text": "Thử nghiệm trong môi trường thực tế đảm bảo sự sẵn sàng của một tác tử để triển khai bằng cách xác thực hiệu suất của nó dưới các điều kiện thực tế. Quá trình này bao gồm việc triển khai theo giai đoạn, giám sát liên tục các chỉ số chính, thu thập phản hồi của người dùng và tinh chỉnh tác tử một cách lặp đi lặp lại để tối ưu hóa khả năng và tính khả dụng của nó:"
    },
    {
      "[y1, x1, y2, x2]": [360, 142, 372, 310],
      "text": "Triển khai theo giai đoạn"
    },
    {
      "[y1, x1, y2, x2]": [385, 179, 445, 842],
      "text": "Triển khai tác tử theo từng giai đoạn, bắt đầu với thử nghiệm quy mô nhỏ trong một môi trường hạn chế trước khi mở rộng ra triển khai toàn bộ. Cách tiếp cận theo giai đoạn này giúp xác định và giải quyết các vấn đề một cách từ từ, mà không làm quá tải hệ thống hoặc người dùng."
    },
    {
      "[y1, x1, y2, x2]": [458, 142, 470, 369],
      "text": "Giám sát hành vi của tác tử"
    },
    {
      "[y1, x1, y2, x2]": [483, 179, 558, 842],
      "text": "Sử dụng các công cụ giám sát để theo dõi hành vi, phản hồi và các chỉ số hiệu suất của tác tử trong quá trình thử nghiệm thực tế. Việc giám sát nên tập trung vào các chỉ số hiệu suất chính (KPI) như thời gian phản hồi, độ chính xác, sự hài lòng của người dùng và sự ổn định của hệ thống."
    },
    {
      "[y1, x1, y2, x2]": [571, 142, 583, 349],
      "text": "Thu thập phản hồi của người dùng"
    },
    {
      "[y1, x1, y2, x2]": [596, 179, 656, 842],
      "text": "Thu hút người dùng trong quá trình thử nghiệm thực tế để thu thập phản hồi về trải nghiệm của họ khi tương tác với tác tử. Phản hồi của người dùng là vô giá trong việc xác định các lỗ hổng, cải thiện tính khả dụng và đảm bảo rằng tác tử đáp ứng nhu cầu thực tế."
    },
    {
      "[y1, x1, y2, x2]": [669, 142, 681, 381],
      "text": "Lặp lại dựa trên những hiểu biết thu được"
    },
    {
      "[y1, x1, y2, x2]": [694, 179, 754, 842],
      "text": "Thử nghiệm trong môi trường thực tế cung cấp những hiểu biết quý giá cần được đưa trở lại vào chu trình phát triển. Sử dụng những hiểu biết này để tinh chỉnh tác tử, cải thiện khả năng của nó và tối ưu hóa hiệu suất cho các lần lặp lại trong tương lai."
    },
    {
      "[y1, x1, y2, x2]": [767, 142, 857, 842],
      "text": "Việc tuân theo các phương pháp tốt nhất như thiết kế lặp, phát triển linh hoạt và thử nghiệm trong môi trường thực tế là rất quan trọng để xây dựng các hệ thống dựa trên tác tử có khả năng thích ứng, mở rộng và phục hồi. Những phương pháp này đảm bảo rằng các tác tử được thiết kế với sự linh hoạt, được kiểm tra kỹ lưỡng trong các điều kiện thực tế và liên tục được cải thiện để đáp ứng nhu cầu ngày càng phát triển của người dùng và các thách thức môi trường. Bằng cách kết hợp các phương pháp này vào vòng đời phát triển, các nhà phát triển có thể tạo ra các hệ thống tác tử đáng tin cậy, hiệu quả và hiệu quả hơn, có khả năng phát triển mạnh trong các môi trường năng động."
    },
    {
      "[y1, x1, y2, x2]": [923, 142, 936, 426],
      "text": "38 Chương 2: Thiết kế Hệ thống Tác tử"
    }
  ]
}