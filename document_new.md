**THUYẾT MINH**

**ĐỀ TÀI KHOA HỌC VÀ CÔNG NGHỆ CẤP HỌC VIỆN QUÂN Y**[[1]](#footnote-1)

# I. THÔNG TIN CHUNG VỀ ĐỀ TÀI

# 1. Tên đề tài

**Nghiên cứu, thiết kế và xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và Đổi mới sáng tạo tại Học viện Quân y**

**15. Tổng quan tình hình nghiên cứu, luận giải về mục tiêu và những nội dung nghiên cứu của đề tài**

**15.1 Đánh giá tổng quan tình hình nghiên cứu thuộc lĩnh vực của đề tài**

Trong bối cảnh chuyển đổi số giáo dục đại học và đổi mới quản trị khoa học công nghệ, việc xây dựng hệ thống quản lý đề tài nghiên cứu khoa học cấp trường là một hướng nghiên cứu và ứng dụng có cơ sở lý luận cũng như thực tiễn rõ ràng. Đề tài này nằm ở giao điểm của nhiều lĩnh vực: hệ thống thông tin quản lý, quản trị quy trình nghiệp vụ, quản trị thông tin nghiên cứu, quản lý dự án và dashboard hỗ trợ điều hành. Vì vậy, tổng quan nghiên cứu cần xem xét đồng thời các xu hướng phát triển của hệ thống quản trị thông tin nghiên cứu, các giải pháp quản lý quy trình trong môi trường đại học, các hệ thống hỗ trợ theo dõi dự án và các mô hình dashboard phục vụ ra quyết định.

Trên thế giới, một hướng nghiên cứu nền tảng là các Current Research Information Systems (CRIS) hay Research Information Management Systems (RIMS). Đây là các hệ thống được thiết kế để quản lý tập trung thông tin về nhà khoa học, tổ chức nghiên cứu, dự án, kinh phí, công bố khoa học, sản phẩm nghiên cứu và các mối liên hệ giữa chúng. Theo euroCRIS, chuẩn CERIF hiện được xem là mô hình thông tin toàn diện trong lĩnh vực này, có khả năng mô tả các thực thể nghiên cứu và quan hệ giữa chúng, đồng thời hỗ trợ trao đổi dữ liệu giữa các hệ thống nghiên cứu khác nhau [1]. Tài liệu hướng dẫn mới nhất của OpenAIRE cho CRIS Managers, phiên bản v1.2.0, tiếp tục khẳng định xu hướng chuẩn hóa metadata, tăng cường khả năng tương tác và chia sẻ dữ liệu nghiên cứu trên quy mô tổ chức và liên tổ chức [2]. Điều này cho thấy quản lý đề tài nghiên cứu ngày nay không chỉ dừng ở việc lưu hồ sơ, mà phải được đặt trong tư duy quản trị dữ liệu có cấu trúc, có liên thông và có khả năng mở rộng.

Các nghiên cứu ứng dụng CRIS trong trường đại học cũng cung cấp nhiều kinh nghiệm thực tiễn quan trọng. McDonnell và Kerridge khi nghiên cứu hệ thống KRIMSON tại University of Kent đã chỉ ra rằng giá trị nổi bật của một hệ thống quản trị nghiên cứu không nằm ở việc số hóa thông tin đơn lẻ, mà ở khả năng tích hợp với các hệ thống xác thực, nhân sự, tài chính, kho lưu trữ học thuật và hồ sơ sinh viên [3]. Nghiên cứu này cho thấy khi dữ liệu nghiên cứu được đặt trong một hạ tầng quản trị thống nhất, hiệu quả quản lý và truy xuất thông tin được nâng lên đáng kể. Tương tự, Walther và Wagner tại Đại học FAU Erlangen-Nürnberg cho thấy CRIS hiện đại đang mở rộng sang hỗ trợ quản lý dữ liệu nghiên cứu theo hướng FAIR, tạo ra hiệu ứng cộng hưởng giữa quản lý đề tài, dữ liệu nghiên cứu và sản phẩm khoa học [4]. Công bố năm 2024 của Schöpfel và De Castro cũng nhấn mạnh rằng các thách thức lớn nhất hiện nay của CRIS là hài hòa metadata và khả năng tương tác hệ thống, bởi CRIS thường phải liên kết với kho lưu trữ, cơ sở dữ liệu, hệ thống nhân sự và hệ thống quản lý dự án [5]. Những kết quả này rất phù hợp với định hướng của đề tài đang đề xuất, vì một hệ thống quản lý đề tài cấp trường muốn vận hành hiệu quả cũng phải giải quyết đồng thời bài toán dữ liệu, quy trình và liên thông.

Một dòng nghiên cứu liên quan chặt chẽ khác là quản trị quy trình nghiệp vụ trong môi trường giáo dục đại học. Nghiên cứu của Zhang và cộng sự về hệ thống hành chính đại học theo hướng process-driven cho thấy khi các công việc được mô hình hóa thành quy trình rõ ràng, chia thành tác vụ cụ thể gắn với vai trò thực hiện, người dùng dễ hiểu hơn họ phải làm gì, ở bước nào và trách nhiệm thuộc về ai [6]. Cách tiếp cận này đặc biệt phù hợp với quản lý đề tài nghiên cứu khoa học, vốn bao gồm nhiều khâu nối tiếp như tiếp nhận hồ sơ, kiểm tra điều kiện, đánh giá, phê duyệt, theo dõi tiến độ, báo cáo và nghiệm thu. Reijers, Vanderfeesten và van der Aalst trong một nghiên cứu dọc về workflow management systems cũng chỉ ra rằng các hệ thống quản lý quy trình có thể cải thiện rõ hiệu quả vận hành, nhưng thành công phụ thuộc mạnh vào mức độ phù hợp giữa mô hình quy trình và thực tiễn tổ chức [7]. Nói cách khác, một hệ thống quản lý đề tài hiệu quả không chỉ cần công nghệ, mà cần phản ánh đúng quy trình nghiệp vụ thực tế của đơn vị triển khai.

Từ góc độ quản lý dự án, nhiều nghiên cứu đã khẳng định vai trò của Project Management Information Systems (PMIS) trong nâng cao hiệu quả kiểm soát tiến độ, nguồn lực và quyết định quản lý. Một nghiên cứu tổng quan mô hình tham chiếu cho PMIS cho thấy các hệ thống hiện đại không còn chỉ hỗ trợ lập kế hoạch mà đã trở thành hệ thống hỗ trợ toàn bộ vòng đời dự án, bao gồm phối hợp, theo dõi, kiểm soát và báo cáo [8]. Nghiên cứu thực nghiệm của Raymond và Bergeron cũng chỉ ra rằng PMIS có tác động tích cực tới chất lượng quản lý dự án, hỗ trợ tốt hơn cho lập kế hoạch, giám sát, kiểm soát và ra quyết định đúng thời điểm [9]. Trong môi trường đa dự án, PMIS còn có giá trị ở chỗ cải thiện chất lượng thông tin phục vụ quyết định của người quản lý [10]. Các kết quả này có ý nghĩa trực tiếp đối với bài toán quản lý đề tài nghiên cứu khoa học cấp trường, bởi mỗi đề tài về bản chất cũng là một dự án khoa học có mốc tiến độ, nhân lực, nhiệm vụ, sản phẩm đầu ra và yêu cầu kiểm soát.

Bên cạnh đó, nghiên cứu gần đây còn nhấn mạnh vai trò của dashboard trong hỗ trợ điều hành và ra quyết định. Tổng quan hệ thống của Paulsen và Lindsay công bố năm 2024 cho thấy dashboard trong giáo dục đại học đang dần chuyển từ logic “trình bày dữ liệu” sang logic “hỗ trợ hành động”, tức là không chỉ hiển thị số liệu mà còn định hướng người dùng nhận diện vấn đề và đưa ra quyết định [11]. Tổng quan năm 2025 về các AI-powered dashboards cũng chỉ ra xu hướng tích hợp dữ liệu đa nguồn, tăng mức độ thông minh của dashboard và cải thiện năng lực phát hiện vấn đề vận hành [12]. Nghiên cứu mới nhất của Rozhenkova và cộng sự, công bố ngày 14/03/2026, tiếp tục nhấn mạnh rằng vẫn còn khoảng cách giữa dữ liệu và hành động quản trị; điều đó có nghĩa là dashboard chỉ thực sự có giá trị khi các chỉ số được lựa chọn sát nhu cầu người dùng và gắn với hành động cụ thể [13]. Đối với đề tài này, điều đó gợi ý rằng dashboard không nên thiên về hình thức trực quan đơn thuần, mà cần tập trung vào các thông tin điều hành cốt lõi như hồ sơ chờ xử lý, đề tài chậm tiến độ, báo cáo sắp đến hạn, công việc quá hạn và đầu việc cần phê duyệt.

Ở cấp độ rộng hơn về quản trị đại học, tổng quan phạm vi của Alvarez-Sández và cộng sự năm 2023 cho thấy nghiên cứu về hiệu quả quy trình hành chính trong cơ sở giáo dục đại học ngày càng gia tăng, trong đó các chỉ báo cải thiện thường gắn với giảm thời gian xử lý, tối ưu nguồn lực, chuẩn hóa quy trình và nâng cao mức độ hài lòng của người dùng [14]. Nhận định này củng cố cho quan điểm rằng việc xây dựng hệ thống quản lý đề tài khoa học không chỉ phục vụ lưu trữ hồ sơ, mà còn là một giải pháp nâng cao hiệu quả quản trị đại học.

Tại Việt Nam, chuyển đổi số trong giáo dục đại học và trong quản trị công đã có định hướng chính sách rõ ràng. Quyết định số 749/QĐ-TTg ngày 03/06/2020 của Thủ tướng Chính phủ về Chương trình Chuyển đổi số quốc gia và Quyết định số 131/QĐ-TTg ngày 25/01/2022 về tăng cường ứng dụng công nghệ thông tin và chuyển đổi số trong giáo dục và đào tạo đã tạo nền tảng pháp lý cho việc số hóa các quy trình quản lý trong cơ sở giáo dục đại học [15], [16]. Với các cơ sở đào tạo, nghiên cứu có quy mô lớn, yêu cầu minh bạch, truy vết và điều hành dữ liệu ngày càng cao, việc số hóa quản lý đề tài nghiên cứu khoa học là một bước đi phù hợp với chủ trương chung.

Các nghiên cứu trong nước tuy chưa nhiều công trình đi đúng vào mô hình “quản lý vòng đời đề tài cấp trường” nhưng đã cung cấp một số cơ sở lý luận và thực tiễn quan trọng. Bài viết của Hoàng Thị Mai và Trần Thị Thu Phương về hệ thống thông tin quản lý trong trường đại học khẳng định UMIS/MIS có vai trò thiết yếu trong hỗ trợ quản lý, điều hành và ra quyết định trong môi trường giáo dục đại học [17]. Ở góc độ quản lý dữ liệu khoa học, nghiên cứu của Ninh Thị Kim Thoa và Nguyễn Thị Hương năm 2024 cho thấy dữ liệu nghiên cứu của giảng viên còn đa dạng nhưng phân tán, tồn tại nhiều hạn chế về lưu trữ, bảo mật, quản lý và chia sẻ; từ đó đặt ra nhu cầu xây dựng cơ sở hạ tầng và dịch vụ quản lý dữ liệu nghiên cứu có tính hệ thống [18]. Một số nghiên cứu ứng dụng khác trong nước cũng bắt đầu tiếp cận xây dựng cơ sở dữ liệu quản lý khoa học phục vụ chuyển đổi số tại trường đại học [19]. Những kết quả này cho thấy nhu cầu quản trị khoa học bằng hệ thống số ở Việt Nam là có thật, nhưng vẫn còn thiếu những mô hình tích hợp bám sát nghiệp vụ quản lý đề tài từ đầu đến cuối.

Từ việc rà soát các tài liệu trong và ngoài nước, có thể thấy ba xu hướng nghiên cứu nổi bật hiện nay. Thứ nhất là xu hướng chuẩn hóa và tích hợp thông tin nghiên cứu thông qua CRIS/RIMS. Thứ hai là xu hướng quản lý theo quy trình nghiệp vụ nhằm chuẩn hóa thao tác, trách nhiệm và trạng thái xử lý. Thứ ba là xu hướng dùng dashboard và phân tích dữ liệu để hỗ trợ điều hành thay vì chỉ thống kê thụ động. Tuy nhiên, phần lớn các nghiên cứu quốc tế hướng đến quy mô tổ chức lớn, hạ tầng dữ liệu chuẩn hóa cao và mức độ tích hợp sâu; trong khi điều kiện triển khai của một hệ thống quản lý đề tài cấp trường tại Việt Nam cần một mô hình gọn hơn, thực dụng hơn và bám sát nhu cầu tác nghiệp nội bộ. Đây là một suy luận từ tập tài liệu đã khảo sát.

Khoảng trống nghiên cứu của đề tài có thể nhìn thấy ở một số điểm. Một là, chưa nhiều công trình trong nước công bố một mô hình hệ thống tích hợp riêng cho quản lý đề tài nghiên cứu khoa học cấp trường, bao phủ đầy đủ các khâu: tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi thực hiện, giao việc và dashboard điều hành. Hai là, nhiều giải pháp hiện có mới dừng ở quản lý hồ sơ hoặc quản lý dữ liệu khoa học của giảng viên, chưa kết nối chặt chẽ phần quản lý quy trình với phần điều hành công việc. Ba là, bài toán chuyển dữ liệu nghiệp vụ thành thông tin điều hành có khả năng hành động cho lãnh đạo và chuyên viên quản lý khoa học vẫn chưa được khai thác đầy đủ. Đây cũng là khoảng trống thực tiễn mà đề tài có thể giải quyết.

Theo quan điểm của tác giả, tính cấp thiết của đề tài là rất rõ. Trong điều kiện hiện nay, công tác quản lý đề tài nghiên cứu khoa học tại nhiều cơ sở đào tạo vẫn còn dựa nhiều vào hồ sơ giấy, tệp rời, bảng tính Excel và trao đổi thủ công. Hệ quả là khó kiểm soát chính xác hồ sơ nào đang ở trạng thái nào, ai đang xử lý, đề tài nào chậm tiến độ, báo cáo nào sắp đến hạn, công việc nào tồn đọng. Việc tổng hợp báo cáo cho lãnh đạo thường tốn thời gian, phụ thuộc nhiều vào cán bộ đầu mối và khó bảo đảm tính tức thời. Trong bối cảnh yêu cầu chuyển đổi số, minh bạch, hiệu quả và trách nhiệm giải trình ngày càng cao, việc xây dựng một hệ thống quản lý đề tài nghiên cứu khoa học cấp trường theo hướng tích hợp 4 module: quản lý đề tài, theo dõi đề tài, quản lý giao việc và dashboard điều hành là cần thiết, có ý nghĩa thực tiễn cao và phù hợp xu thế phát triển hiện nay

Tóm lại, các công trình đã công bố cho thấy lĩnh vực quản trị thông tin nghiên cứu và quản lý quy trình trong giáo dục đại học đã có nền tảng lý luận khá vững. Tuy nhiên, đối với bài toán quản lý đề tài cấp trường trong điều kiện thực tiễn của cơ sở giáo dục đại học Việt Nam, đặc biệt là yêu cầu gắn quản lý hồ sơ với theo dõi tiến độ, giao việc và dashboard điều hành, vẫn còn khoảng trống cần tiếp tục nghiên cứu và triển khai. Đề tài được đề xuất vì vậy vừa kế thừa được các thành tựu nghiên cứu hiện có, vừa có khả năng tạo ra một giải pháp ứng dụng phù hợp với nhu cầu quản lý thực tế.

Từ tổng quan trên, có thể thấy đề tài “**Nghiên cứu, thiết kế và xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và Đổi mới sáng tạo tại Học viện Quân y** ” có cơ sở lý luận và thực tiễn rõ ràng. Về mặt khoa học, đề tài kế thừa ba dòng nghiên cứu chính: hệ thống quản trị thông tin nghiên cứu, hệ thống workflow theo quy trình, và dashboard hỗ trợ điều hành. Về mặt thực tiễn, đề tài đáp ứng trực tiếp yêu cầu chuyển đổi số trong cơ sở giáo dục đại học và giải quyết một khoảng trống triển khai ở cấp trường. Theo quan điểm của nhóm nghiên cứu, tính bức xúc của đề tài nằm ở chỗ công tác quản lý đề tài hiện nay tại nhiều đơn vị vẫn phân tán trên Excel, email, hồ sơ giấy và các nhóm trao đổi rời rạc; điều này dẫn đến khó kiểm soát trạng thái hồ sơ, khó truy vết lịch sử xử lý, dễ chậm hạn báo cáo, khó tổng hợp số liệu cho lãnh đạo và thiếu cơ chế nhắc việc tự động. Trong bối cảnh yêu cầu minh bạch, hiệu quả và trách nhiệm giải trình ngày càng cao, việc xây dựng một hệ thống tích hợp 4 module gồm OMS, theo dõi đề tài, quản lý giao việc và dashboard điều hành là cần thiết, khả thi và có giá trị ứng dụng cao.

**15.2. Luận giải về những nội dung cần nghiên cứu của đề tài**

Việc xác định mục tiêu của đề tài xuất phát từ yêu cầu thực tiễn trong công tác quản lý đề tài nghiên cứu khoa học cấp trường hiện nay còn nhiều bất cập. Quá trình tiếp nhận hồ sơ, tổ chức đánh giá, phê duyệt, theo dõi tiến độ, nhắc việc và tổng hợp báo cáo ở nhiều đơn vị vẫn chủ yếu được thực hiện bằng hồ sơ giấy, bảng tính Excel, email và các hình thức trao đổi thủ công. Cách làm này dẫn đến một số hạn chế như khó kiểm soát trạng thái xử lý của từng đề tài, khó theo dõi lịch sử thay đổi, dễ bỏ sót công việc, chậm nhắc hạn báo cáo, mất nhiều thời gian tổng hợp số liệu và chưa đáp ứng tốt nhu cầu điều hành của lãnh đạo.

Trong khi đó, yêu cầu chuyển đổi số trong giáo dục đại học và yêu cầu nâng cao hiệu quả quản lý khoa học công nghệ đặt ra đòi hỏi phải có một hệ thống thống nhất, có khả năng quản lý dữ liệu tập trung, chuẩn hóa quy trình nghiệp vụ và hỗ trợ ra quyết định kịp thời. Vì vậy, mục tiêu tổng quát của đề tài là nghiên cứu, thiết kế và xây dựng một hệ thống quản lý đề tài nghiên cứu khoa học cấp trường nhằm số hóa và quản lý xuyên suốt toàn bộ vòng đời đề tài, từ tiếp nhận hồ sơ, đánh giá, phê duyệt đến theo dõi thực hiện, giao việc và tổng hợp dashboard điều hành.

Mục tiêu này được đặt ra là hợp lý vì nó giải quyết trực tiếp những điểm nghẽn lớn nhất trong thực tiễn quản lý hiện nay. Nếu chỉ tin học hóa từng khâu đơn lẻ, ví dụ chỉ quản lý hồ sơ nộp đề tài hoặc chỉ theo dõi tiến độ thực hiện, thì vẫn chưa tạo ra được sự liên thông và chưa hỗ trợ hiệu quả cho công tác quản trị tổng thể. Do đó, đề tài cần hướng tới một hệ thống có tính tích hợp, trong đó các dữ liệu và trạng thái được kết nối với nhau theo một quy trình thống nhất.

Từ mục tiêu tổng quát trên, đề tài cần hướng đến các mục tiêu cụ thể sau: chuẩn hóa quy trình nghiệp vụ quản lý đề tài cấp trường; xây dựng công cụ quản lý hồ sơ đề tài và đánh giá phê duyệt minh bạch; xây dựng cơ chế theo dõi tiến độ, báo cáo và nghiệm thu; hỗ trợ giao việc, nhắc việc và thống kê mức độ hoàn thành; cung cấp dashboard giúp lãnh đạo và chuyên viên nắm bắt nhanh tình hình xử lý. Các mục tiêu cụ thể này vừa bám sát nhu cầu quản lý thực tế, vừa phù hợp với phạm vi và khả năng triển khai của một đề tài cấp cơ sở.

Như vậy, mục tiêu của đề tài không chỉ nhằm xây dựng một phần mềm phục vụ lưu trữ thông tin, mà hướng đến tạo ra một công cụ quản lý và điều hành có khả năng nâng cao tính minh bạch, giảm tải thao tác thủ công, hỗ trợ giám sát tiến độ và nâng cao hiệu quả quản trị hoạt động nghiên cứu khoa học cấp trường.

**16. Liệt kê danh mục các công trình nghiên cứu, tài liệu có liên quan đến đề tài đã trích dẫn khi đánh giá tổng quan**

[1] euroCRIS, “Main features of CERIF”.

[2] OpenAIRE, “OpenAIRE Guidelines for CRIS Managers”, phiên bản v1.2.0.

[3] McDonnell, R., Kerridge, S. (2017), “Research Information Management System (KRIMSON) at Kent”, Procedia Computer Science, 106, 160-167.

[4] Walther, M., Wagner, M. (2022), “FAIR research data integration in CRIS at FAU Erlangen-Nürnberg”, Proceedings of CRIS2022.

[5] Schöpfel, J., De Castro, P. (2024), “Current research information systems (CRIS): Challenges and Opportunities”.

[6] Zhang, Y., Liang, R., Shi, Z., Ma, H. (2012), “The Design and Implementation of a Process-Driven Higher Educational Administrative System”, IERI Procedia, 2, 176-182.

[7] Reijers, H.A., Vanderfeesten, I., van der Aalst, W.M.P. (2016), “The effectiveness of workflow management systems: A longitudinal study”, International Journal of Information Management, 36(1), 126-141.

[8] Ahlemann, F. (2009), “Towards a conceptual reference model for project management information systems”, International Journal of Project Management, 27(1), 19-30.

[9] Raymond, L., Bergeron, F. (2008), “Project management information systems: An empirical study of their impact on project managers and project success”, International Journal of Project Management, 26(2), 213-220.

[10] Ali, A.S., Money, W.H. (2012), “The effects of Project Management Information Systems on decision making in a multi project environment”, International Journal of Project Management, 30(2), 162-175.

[11] Paulsen, L., Lindsay, E. (2024), “Learning analytics dashboards are increasingly becoming about learning and not just analytics - A systematic review”, Education and Information Technologies, 29, 14279-14308.

[12] Cabral, L., Pinto, R., Gonçalves, G. (2025), “AI-powered learning analytics dashboards: a systematic review of applications, techniques, and research gaps”, Discover Education.

[13] Rozhenkova, V. et al. (2026), “From data to action: perspectives on faculty use of student data dashboards for improving instruction”, Journal of Computing in Higher Education, công bố ngày 14/03/2026.

[14] Alvarez-Sández, D., Velázquez-Victorica, K., Mungaray-Moctezuma, A., López-Guerrero, A. (2023), “Administrative Processes Efficiency Measurement in Higher Education Institutions: A Scoping Review”, Education Sciences, 13(9), 855.

[15] Thủ tướng Chính phủ (2020), Quyết định số 749/QĐ-TTg ngày 03/06/2020 phê duyệt “Chương trình Chuyển đổi số quốc gia đến năm 2025, định hướng đến năm 2030”.

[16] Thủ tướng Chính phủ (2022), Quyết định số 131/QĐ-TTg ngày 25/01/2022 phê duyệt Đề án “Tăng cường ứng dụng công nghệ thông tin và chuyển đổi số trong giáo dục và đào tạo giai đoạn 2022-2025, định hướng đến năm 2030”.

[17] Hoàng Thị Mai, Trần Thị Thu Phương, “Khái quát về hệ thống thông tin quản lý”, Tạp chí Khoa học - Trường Đại học Thủ đô Hà Nội.

[18] Ninh Thị Kim Thoa, Nguyễn Thị Hương (2024), “Thực tiễn quản lý dữ liệu nghiên cứu của giảng viên tại Trường Đại học Khoa học Xã hội và Nhân văn, Đại học Quốc gia Thành phố Hồ Chí Minh”, Tạp chí Thông tin và Tư liệu.

[19] Trần Hương Trà (2024), “Xây dựng cơ sở dữ liệu quản lý khoa học phục vụ chuyển đổi số tại trường Đại học Kiến trúc Hà Nội”.

**17. Nội dung nghiên cứu khoa học và triển khai thực nghiệm của đề tài và phương án thực hiện**

**17.1. Nội dung nghiên cứu**

**Xây dựng và hoàn thiện thuyết minh đề tài**

**Nội dung 1:** **Khảo sát thực trạng, phân tích yêu cầu và thiêt kế hệ thống.**

Công việc 1.1: Khảo sát thực trạng công tác quản lý đề tài nghiên cứu khoa học cấp trường tại đơn vị triển khai. Khảo sát, tham khảo các mô hình hệ thống quản lý đề tài, hệ thống quản trị quy trình và dashboard điều hành đã có.

Công việc 1.2: Thu thập, tổng hợp các biểu mẫu, quy trình, quy định và tài liệu liên quan đến các khâu: tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi tiến độ, báo cáo, nghiệm thu và giao việc (Phân tích các khó khăn, bất cập trong phương thức quản lý hiện nay như: dữ liệu phân tán, khó tra cứu, khó theo dõi trạng thái xử lý, chậm nhắc hạn, khó tổng hợp báo cáo cho lãnh đạo).

Công việc 1.3: Thiết kế mô hình nghiệp vụ, mô hình dữ liệu, phân quyền người dùng, trạng thái xử lý và luồng liên thông giữa các module.

Xác định các yêu cầu chức năng, phi chức năng của hệ thống. Thiết kế cơ sở dữ liệu, các models và kiến trúc hệ thống phù hợp với triển khai web-based trong môi trường nội bộ

Sản phẩm tạo ra: Hoàn thiện thuyết minh đề tài và khung phần mềm quản lý theo mục tiêu đề ra.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

**Nội dung 2: Xây dựng và hoàn thiện các module chức năng của hệ thống.**

**Công việc 2.1: Phát triển module Quản lý đề tài (OMS).**

* Quản lý đợt tiếp nhận hồ sơ.
* Tạo, nộp, kiểm tra và bổ sung hồ sơ đề tài.
* Phân công reviewer/hội đồng.
* Chấm điểm, tổng hợp đánh giá và trình phê duyệt.

**Công việc 2.2: Phát triển module Theo dõi đề tài.**

* Khởi tạo hồ sơ theo dõi từ đề tài đã được duyệt.
* Quản lý kế hoạch, văn bản, mốc tiến độ, báo cáo định kỳ.
* Theo dõi điều chỉnh, gia hạn, kinh phí, sản phẩm nghiên cứu.

**Công việc 2.3: Phát triển module theo dõi hội thảo, sinh viên nghiên cứu khoa học.**

* Khởi tạo hội thảo đã được duyệt.
* Quản lý kế hoạch, văn bản, .
* Theo dõi điều chỉnh, kinh phí, sản phẩm nghiên cứu.

**Công việc 2.4: Phát triển module Quản lý giao việc.**

* Tạo việc, giao việc, cập nhật tiến độ, nhắc việc.
* Theo dõi việc theo cá nhân, đề tài, đơn vị và hạn xử lý.
* Thống kê việc đúng hạn, quá hạn và khối lượng công việc.

**Công việc 2.5: Phát triển module Dashboard điều hành.**

* Tổng hợp số lượng hồ sơ, đề tài, công việc theo trạng thái.
* Hiển thị việc chờ xử lý, việc quá hạn, đề tài chậm tiến độ.
* Cung cấp các báo cáo trực quan phục vụ lãnh đạo và chuyên viên quản lý khoa học.
* Hoàn thiện giao diện phù hợp trên máy tính và có thể sử dụng tốt trên thiết bị di động.
* Tích hợp các chức năng dùng chung như quản lý tài khoản, phân quyền, thông báo, tìm kiếm, quản lý tệp đính kèm, xuất báo cáo.

Sản phẩm tạo ra: Phần mềm quản lý đảm bảo những yêu cầu ban đầu đề ra.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

**Nội dung 3: Triển khai thực nghiệm, kiểm thử và đánh giá hệ thống.**

**Công việc 3.1: Xây dựng dữ liệu mẫu và kịch bản nghiệp vụ thử nghiệm cho các tình huống chính.**

* Nộp hồ sơ đề tài.
* Kiểm tra và yêu cầu bổ sung.
* Phân công đánh giá, chấm điểm, phê duyệt.
* Theo dõi tiến độ, nộp báo cáo định kỳ.
* Giao việc, nhắc việc, cảnh báo quá hạn.
* Nghiệm thu và cập nhật kết quả cuối cùng.

**Công việc 3.2: Triển khai thực nghiệm hệ thống tại một số đầu mối chuyên môn hoặc đơn vị quản lý khoa học của nhà trường.**

**Công việc 3.3: Kiểm thử các chức năng chính, kiểm thử phân quyền người dùng, kiểm thử tính đúng đắn của luồng xử lý và dữ liệu.**

**Công việc 3.4: Đánh giá hệ thống theo các tiêu chí.**

* Mức độ đáp ứng yêu cầu nghiệp vụ.
* Tính ổn định và chính xác của dữ liệu.
* Khả năng tra cứu, tổng hợp báo cáo.
* Tính thuận tiện khi sử dụng hệ thống đối với cán bộ quản lý, chủ nhiệm đề tài, reviewer và lãnh đạo.

**Công việc 3.5: Thu thập ý kiến người dùng thử nghiệm, chỉnh sửa và hoàn thiện hệ thống.**

**Công việc 3.6: Hoàn thiện tài liệu hướng dẫn sử dụng, báo cáo tổng kết và các sản phẩm của đề tài.**

Sản phẩm tạo ra: Phần mềm quản lý.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

**17.2. Cách tiếp cận vấn đề nghiên cứu, thiết kế nghiên cứu, đối tượng và phương pháp nghiên cứu, kỹ thuật sẽ sử dụng** *(gắn với từng nội dung nghiên cứu của đề tài)*

**Cách tiếp cận vấn đề nghiên cứu**

Đề tài được tiếp cận theo hướng nghiên cứu ứng dụng, lấy bài toán quản lý thực tiễn làm trung tâm, kết hợp giữa phân tích nghiệp vụ quản lý khoa học và thiết kế hệ thống thông tin. Cách tiếp cận này nhằm bảo đảm sản phẩm của đề tài không chỉ có ý nghĩa về mặt nghiên cứu mà còn có khả năng triển khai, vận hành và sử dụng thực tế trong môi trường học viện nhà trường.

Cụ thể, đề tài được tiếp cận theo các hướng sau:

* Tiếp cận hệ thống: Xem công tác quản lý đề tài nghiên cứu khoa học cấp trường là một hệ thống nghiệp vụ tổng thể, bao gồm nhiều khâu liên thông như tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi thực hiện, giao việc, báo cáo và nghiệm thu. Trên cơ sở đó xây dựng giải pháp đồng bộ, tránh xử lý rời rạc từng khâu riêng lẻ.
* Tiếp cận từ thực tiễn quản lý: Xuất phát từ các khó khăn đang tồn tại trong thực tế như dữ liệu phân tán, xử lý thủ công, khó theo dõi tiến độ, chậm nhắc hạn, khó tổng hợp báo cáo cho lãnh đạo. Việc phân tích thực trạng là cơ sở để xác định đúng yêu cầu và phạm vi hệ thống.
* Tiếp cận theo quy trình nghiệp vụ: Chuẩn hóa các bước xử lý của từng nhóm người dùng, làm rõ vai trò, trách nhiệm, trạng thái nghiệp vụ và luồng chuyển tiếp giữa các bước. Đây là nền tảng để thiết kế hệ thống đúng với yêu cầu quản trị.
* Tiếp cận lấy người dùng làm trung tâm: Giao diện, chức năng và báo cáo được thiết kế phù hợp với từng nhóm người dùng như chuyên viên quản lý khoa học, lãnh đạo, chủ nhiệm đề tài, thành viên đề tài và reviewer.
* Tiếp cận theo hướng mở và có khả năng mở rộng: Hệ thống được xây dựng cho nhu cầu hiện tại nhưng vẫn tính đến khả năng mở rộng sau này như tích hợp chữ ký số, SSO, cổng ngoài hoặc báo cáo nâng cao.

**Thiết kế nghiên cứu**

Đề tài được thiết kế theo mô hình nghiên cứu ứng dụng kết hợp giữa nghiên cứu mô tả, nghiên cứu phân tích và nghiên cứu thiết kế phát triển hệ thống.

Quy trình thiết kế nghiên cứu gồm các giai đoạn chính:

1. Khảo sát và thu thập thông tin thực trạng: thu thập tài liệu, biểu mẫu, quy trình hiện hành; khảo sát cách thức quản lý đề tài tại đơn vị; ghi nhận các bất cập và nhu cầu thực tế.
2. Phân tích yêu cầu và mô hình hóa nghiệp vụ: phân tích các chức năng cần thiết, các vai trò sử dụng, các trạng thái xử lý, dữ liệu cần quản lý và các mối liên hệ giữa các module.
3. Thiết kế hệ thống: thiết kế kiến trúc tổng thể, cơ sở dữ liệu, phân hệ chức năng, giao diện người dùng, cơ chế phân quyền và luồng xử lý.
4. Xây dựng thử nghiệm hệ thống phát triển phiên bản thử nghiệm với các module cốt lõi gồm quản lý đề tài, theo dõi đề tài, quản lý giao việc và dashboard điều hành.
5. Triển khai thực nghiệm và đánh giá kiểm thử hệ thống theo các kịch bản nghiệp vụ điển hình, lấy ý kiến người dùng, đánh giá mức độ đáp ứng yêu cầu và hiệu chỉnh hoàn thiện.

Thiết kế nghiên cứu như trên phù hợp với đặc thù của đề tài công nghệ thông tin ứng dụng, vì kết quả cuối cùng không chỉ là báo cáo nghiên cứu mà còn là một hệ thống phần mềm có khả năng sử dụng trong thực tế.

**Đối tượng nghiên cứu**

Đối tượng nghiên cứu của đề tài gồm:

* Quy trình quản lý đề tài nghiên cứu khoa học cấp trường tại nhà trường.
* Các nhóm người dùng tham gia vào quá trình quản lý và thực hiện đề tài.
* Các nghiệp vụ chính liên quan đến tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi tiến độ, báo cáo, nghiệm thu và giao việc.
* Các yêu cầu chức năng và phi chức năng của hệ thống quản lý đề tài.
* Các mô hình, giải pháp và công nghệ có thể áp dụng để xây dựng hệ thống.

Đối tượng khảo sát trực tiếp gồm:

* Cán bộ quản lý khoa học.
* Lãnh đạo có thẩm quyền phê duyệt hoặc theo dõi đề tài.
* Chủ nhiệm đề tài và thành viên đề tài.
* Reviewer hoặc thành viên hội đồng đánh giá, nghiệm thu.

1. Thuyết minh được trình bày và in trên khổ A4 [↑](#footnote-ref-1)