# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
import io
import docx
import httpx

API_GATEWAY = "http://127.0.0.1:8000"

def test_login(client: httpx.Client, email: str, password: str):
    url = f"{API_GATEWAY}/api/v1/auth/login"
    res = client.post(url, data={"username": email, "password": password})
    try:
        body = res.json()
    except Exception:
        body = {"detail": res.text}
    return res.status_code, body

def main():
    print("=== STARTING INTEGRATION TESTS (HTTPX ENGINE) ===")

    with httpx.Client(base_url=API_GATEWAY, timeout=60.0) as client:
        # 1. Test wrong password
        status, body = test_login(client, 'lecturer@vnu.edu.vn', 'WrongPass123!')
        print(f"1. Login wrong password -> status: {status}, detail: '{body.get('detail')}'")
        assert status == 401, f"Expected 401, got {status}"
        assert body.get('detail') in ['Mật khẩu không chính xác.', 'Email hoặc mật khẩu không chính xác.']

        # 2. Test correct password
        status, body = test_login(client, 'lecturer@vnu.edu.vn', 'academic123')
        print(f"2. Login correct password -> status: {status}, full_name: '{body.get('user', {}).get('full_name')}'")
        assert status == 200, f"Expected 200, got {status}"
        assert 'access_token' in body and 'refresh_token' in body

        # 3. Test register new account
        test_email = f"teacher.demo.{int(time.time())}@vnu.edu.vn"
        reg_url = "/api/v1/auth/register"
        reg_payload = {
            'email': test_email,
            'password': 'StrongPassword@2026',
            'full_name': 'ThS. Nguyễn Văn Demo',
            'academic_title': 'ThS.',
            'department': 'Khoa Kinh tế',
            'university': 'Đại học Quốc gia',
            'role': 'lecturer'
        }
        res_reg = client.post(reg_url, json=reg_payload)
        reg_body = res_reg.json()
        print(f"3. Register new account -> status: {res_reg.status_code}, registered email: '{reg_body.get('email')}'")
        assert res_reg.status_code in [200, 201]

        # 4. Test login registered account with wrong pass
        status, body = test_login(client, test_email, 'WrongPassword123!')
        print(f"4. Login registered account with wrong password -> status: {status}, detail: '{body.get('detail')}'")
        assert status == 401, f"Expected 401, got {status}"
        assert body.get('detail') in ['Mật khẩu không chính xác.', 'Email hoặc mật khẩu không chính xác.']

        # 5. Test login registered account with right pass
        status, body = test_login(client, test_email, 'StrongPassword@2026')
        print(f"5. Login registered account with right password -> status: {status}, full_name: '{body.get('user', {}).get('full_name')}'")
        assert status == 200, f"Expected 200, got {status}"

        # 6. Test Export Word .docx
        exp_url = "/api/v1/exams/export"
        exp_payload_docx = {
            'format': 'docx',
            'examTitle': 'ĐỀ THI KẾT THÚC HỌC PHẦN',
            'subjectName': 'Kinh tế vi mô',
            'examCodeCount': 4,
            'questions': [{
                'id': 'q1',
                'question': 'Khi chính phủ đánh thuế vào hàng hóa có cầu co giãn nhiều hơn cung, ai chịu thuế nhiều hơn?',
                'options': [
                    {'id': 'A', 'text': 'Người tiêu dùng chịu nhiều hơn'},
                    {'id': 'B', 'text': 'Người sản xuất chịu nhiều hơn'},
                    {'id': 'C', 'text': 'Cả hai chịu bằng nhau'},
                    {'id': 'D', 'text': 'Chính phủ chịu toàn bộ'}
                ],
                'correctAnswerId': 'B',
                'explanation': 'Bên nào co giãn ít hơn sẽ chịu phần thuế lớn hơn.'
            }]
        }
        res_docx = client.post(exp_url, json=exp_payload_docx)
        print(f"6. Export DOCX -> status: {res_docx.status_code}, size: {len(res_docx.content)} bytes, Content-Type: {res_docx.headers.get('Content-Type')}")
        assert res_docx.status_code == 200
        assert len(res_docx.content) > 10000, "DOCX file too small, probably invalid!"
        doc = docx.Document(io.BytesIO(res_docx.content))
        print(f"   DOCX parsed successfully! {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables.")

        # 7. Test Export PDF
        exp_payload_pdf = {
            'format': 'pdf',
            'examTitle': 'ĐỀ THI KẾT THÚC HỌC PHẦN',
            'subjectName': 'Kinh tế vi mô',
            'questions': [{
                'id': 'q1',
                'question': 'Thị trường độc quyền hoàn toàn có đặc điểm nào sau đây?',
                'options': [
                    {'id': 'A', 'text': 'Nhiều người bán và nhiều người mua'},
                    {'id': 'B', 'text': 'Chỉ có duy nhất một người bán'},
                    {'id': 'C', 'text': 'Sản phẩm có nhiều hàng hóa thay thế hoàn hảo'},
                    {'id': 'D', 'text': 'Doanh nghiệp là người chấp nhận giá'}
                ],
                'correctAnswerId': 'B',
                'explanation': 'Thị trường độc quyền chỉ có một người bán duy nhất.'
            }]
        }
        res_pdf = client.post(exp_url, json=exp_payload_pdf)
        print(f"7. Export PDF -> status: {res_pdf.status_code}, size: {len(res_pdf.content)} bytes, Content-Type: {res_pdf.headers.get('Content-Type')}")
        assert res_pdf.status_code == 200
        assert res_pdf.content.startswith(b'%PDF-'), "PDF file does not start with %PDF- header!"
        print(f"   PDF parsed successfully! Valid %PDF- header confirmed.")

        # 8. Test Export ZIP Bundle
        exp_payload_zip = {
            'format': 'zip',
            'examTitle': 'ĐỀ THI KẾT THÚC HỌC PHẦN',
            'subjectName': 'Kinh tế vi mô',
            'examCodeCount': 4,
            'questions': [{
                'id': 'q1',
                'question': 'Thị trường độc quyền hoàn toàn có đặc điểm nào sau đây?',
                'options': [
                    {'id': 'A', 'text': 'Nhiều người bán và nhiều người mua'},
                    {'id': 'B', 'text': 'Chỉ có duy nhất một người bán'},
                    {'id': 'C', 'text': 'Sản phẩm có nhiều hàng hóa thay thế hoàn hảo'},
                    {'id': 'D', 'text': 'Doanh nghiệp là người chấp nhận giá'}
                ],
                'correctAnswerId': 'B',
                'explanation': 'Thị trường độc quyền chỉ có một người bán duy nhất.'
            }]
        }
        res_zip = client.post(exp_url, json=exp_payload_zip)
        print(f"8. Export ZIP Bundle -> status: {res_zip.status_code}, size: {len(res_zip.content)} bytes, Content-Type: {res_zip.headers.get('Content-Type')}")
        assert res_zip.status_code == 200
        assert res_zip.content.startswith(b'PK'), "ZIP file does not start with PK header!"
        print(f"   ZIP Bundle parsed successfully! Valid PK header confirmed.")

    print("\n==========================================")
    print(">>> ALL TESTS PASSED WITH 100% SUCCESS <<<")
    print("==========================================")

if __name__ == '__main__':
    main()
