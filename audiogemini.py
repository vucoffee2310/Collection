import requests
import json
import base64

URL = "https://gemini.google.com/_/BardChatUi/data/batchexecute"
RPC_ID = "XqA3Ic"
PARAMS = {"rpcids": RPC_ID}
HEADERS = {"content-type": "application/x-www-form-urlencoded;charset=UTF-8"}

def get_and_save_gemini_audio(text, language_code='vi-VN', output_filename="output.mp3"):
    content = [[[RPC_ID, json.dumps([None, text, language_code, None, 2])]]]
    payload = f"f.req={json.dumps(content)}"

    try:
        response = requests.post(URL, data=payload, headers=HEADERS, params=PARAMS)
        response.raise_for_status()

        raw_data = response.content.splitlines()[2]
        data_string = raw_data.decode('utf-8')
        load_data = json.loads(data_string)[0][2]
        resp_json = json.loads(load_data)
        audio_b64 = resp_json[0]
        # print(audio_b64)
        audio_bytes = base64.b64decode(audio_b64)
        audio_hex = audio_bytes.hex()
        # print("Hexadecimal Audio:", audio_hex)

        with open(output_filename, "wb") as f:
            f.write(audio_bytes)

    except (requests.exceptions.RequestException, json.JSONDecodeError, IndexError, TypeError) as e:
        print(f"Error: {e}")

input = '''
Trong hành lang của một bệnh viện, thư ký nắm lấy di động của mình, tay cầm một bản báo cáo. ABCDE. “Vân Thi Thi, 18 tuổi, học sinh, cha kinh doanh phá sản, đã được điều tra và kiểm chứng. ABCDE. Các chỉ tiêu của cơ thể đều đạt mức khoẻ mạnh, cam kết sinh con xong sẽ không đòi quyền nuôi dưỡng hay đụng đến kiện tụng.” Chẳng qua là, cơ thể cô bé này không phù hợp với điều kiện thụ tinh nhân tạo, nên chỉ có thể dùng hình thức khác. ABCDE. Vân Thi Thi vẫn ngồi trên ghế dài không nhúc nhích, cô nhìn ra ngoài cửa sổ, sắc mặt bình tĩnh đến quỷ dị, sâu trong đôi mắt cô là một nỗi buồn bao trùm. ABCDE. Cô biết mình vẫn còn trẻ, nhìn ngũ quan bên ngoài, trông cô còn trẻ hơn cả tuổi thật của mình, nhưng trên gương mặt non nớt đó, lại thấm một nỗi buồn tang thương không gì tả được. ABCDE. Cô là người khó khăn lắm mới được chọn trong ngàn người đăng ký, dựa vào gương mặt xinh đẹp này của cô, người thuê cô làm việc này trả cho cô thù lao vô cùng hậu, năm trăm vạn, với cô đó là một con số vô cùng vô cùng lớn. ABCDE. Ba ngày trước, cô lén cha cô ký hợp đồng mang thai hộ này, ký xong thì cô bị mang đến cái nơi này, mỗi ngày đều bị nhốt trong căn phòng này, cô còn không được phép nói chuyện với người ngoài, ra ngoài lại càng không, hiện tại cô chẳng khác gì một người bệnh bị cách ly. ABCDE. Cô biết, vì cô bắt buộc phải mang thai, nên cơ thể cô phải đảm bảo khoẻ mạnh, như vậy mới phục vụ được người đàn ông đó. ABCDE. Một ngày ba bữa đề là món ngon, món bổ. ABCDE. Chân giò hun khói, nước yến, bánh mì, thịt bò, đều là những món xa xỉ vô cùng. ABCDE. Cô biết họ làm thế là để đảm bảo không phạm sai lầm, cứ nhắc đến đồ ăn, dù không muốn cô cũng phải cô mà nuốt cho hết. ABCDE. Vân Thi Thi không dám làm trái điều gì, cô chỉ ngoan ngoãn phục tùng để có thể nhận lấy thứ mà cô cần. ABCDE. Cho đến ngày hôm nay, thư ký của người thuê cô đã lo lắng vào ngôi nhà tư nhân này nhận báo cáo kiểm tra sức khoẻ của cô. ABCDE. Người thuê cô rất thần bí, thậm chí cô chưa bao giờ thấy qua người này, cô chỉ biết sơ thông qua vài dòng trên hợp đồng, không ngờ người này lại bỏ hẳn ra 500 vạn trả thù lao. ABCDE. Đúng, chính là 500 vạn. ABCDE. Với số tiền này cô có thể giúp ba cô vượt qua khó khăn lần này. ABCDE. Về chuyện lần này, cô không dám nói với cha cô, khi đi cô chỉ để lại một tờ giấy, ‘đi không cáo biệt’, cô cũng không nói dài dòng gì, nói chung là thời gian cô mang thai có lẽ một thời gian dài sẽ không về nhà, như vậy cũng tốt, không phải chịu mấy câu hỏi chất vấn của ba cô. ABCDE. Dựa theo yêu cầu hợp đồng, cho đến khi cô thụ thai thì mới ngưng việc này lại, phải tuỳ vào thời gian mà quan sát tình hình. ABCDE. Mà với điều kiện này, sáng hôm trước, một trăm vạn đã được gửi vào tài khoản của ba cô, nghe thư ký đó nói, nếu nàng sinh con trai, thì số tiền thù lao sẽ được trả nhiều hơn. ABCDE. Mang thai hộ… Nói đến thật tức cười, vì muốn giúp ba cô, cô đã nghĩ hết mọi biện pháp, nhưng lại không nghĩ dùng cơ thể chính mình để đổi lấy tiền thù lao! Nhưng kể ra thì số tiền này cũng được xem là quá hậu đãi rồi, vì thế mới khiến cô bị lung lay. ABCDE. Khốn khổ biết bao nhiêu, cuối cùng lại phải đi đến quyết định của ngày hôm nay. ABCDE. Lâm Hải, một biệt thự xa hoa, một căn phòng đẹp hoa lệ. ABCDE. Sau khi cô thu thập đồ đạc, một chiếc xe có rèm che sang trọng đến đưa cô đi, đứng trước căn biệt thự có phong cảnh tuyệt đẹp này, không cần nói cũng biết, đất ở chỗ này đắt đến mức nào. ABCDE. Thư ký nói với cô, đêm nay, người đó sẽ đến. ABCDE. Vân Thi Thi hít sâu một hơi, cô đưa mắt ngắm nhìn cảnh vật xung quanh, sắc mặt cô nặng nề, cô chậm rãi kéo hành lý đi vào trong căn biệt thự sang trọng. ABCDE. Về đêm, trong căn phòng ngủ xa hoa, bức màn dày rũ xuống từng lớn, che đi ánh sáng ở bên ngoài chiếu vào. ABCDE. Trong căn phòng yên tĩnh, cô đã được tắm rửa sạch sẽ, cô im lặng nằm trên chiếc giường Kingsize, mắt cô bị bịt lại bởi miếng vải màu đen, thị lực bị khống chế, không thể nhìn xung quanh, chính vì thế thính giác của cô nhạy lên rất nhiều, tiếng gió và sóng biển bên ngoài kia, cô có thể nghe thấy rất rõ. ABCDE. Không còn tiếng xe cộ ồn ào nơi thành thị, chỉ có yên tĩnh bao trùm nơi đây, nghĩ đến làm da đầu cô run lên.
'''
get_and_save_gemini_audio(input) # Example usage