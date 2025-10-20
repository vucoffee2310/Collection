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
]
}