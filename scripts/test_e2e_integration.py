# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request, urllib.error, urllib.parse, json, io, os
import docx

def test_login(email, password):
    url = 'http://localhost:8000/api/v1/auth/login'
    data = urllib.parse.urlencode({'username': email, 'password': password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def main():
    print("=== STARTING INTEGRATION TESTS ===")

    # 1. Test wrong password
    status, body = test_login('lecturer@vnu.edu.vn', 'WrongPass123!')
    print(f"1. Login wrong password -> status: {status}, detail: '{body.get('detail')}'")
    assert status == 401, f"Expected 401, got {status}"
    assert body.get('detail') in ['Mật khẩu không chính xác.', 'Email hoặc mật khẩu không chính xác.']

    # 2. Test correct password
    status, body = test_login('lecturer@vnu.edu.vn', 'academic123')
    print(f"2. Login correct password -> status: {status}, full_name: '{body.get('user', {}).get('full_name')}'")
    assert status == 200, f"Expected 200, got {status}"
    assert 'access_token' in body and 'refresh_token' in body

    # 3. Test register new account
    import time
    test_email = f"teacher.demo.{int(time.time())}@vnu.edu.vn"
    reg_url = 'http://localhost:8000/api/v1/auth/register'
    reg_payload = json.dumps({
        'email': test_email,
        'password': 'StrongPassword@2026',
        'full_name': 'ThS. Nguyễn Văn Demo',
        'academic_title': 'ThS.',
        'department': 'Khoa Kinh tế',
        'university': 'Đại học Quốc gia',
        'role': 'lecturer'
    }).encode('utf-8')
    reg_req = urllib.request.Request(reg_url, data=reg_payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(reg_req) as resp:
        reg_body = json.loads(resp.read().decode('utf-8'))
        print(f"3. Register new account -> status: {resp.status}, registered email: '{reg_body.get('email')}'")
        assert resp.status in [200, 201]

    # 4. Test login registered account with wrong pass
    status, body = test_login(test_email, 'WrongPassword123!')
    print(f"4. Login registered account with wrong password -> status: {status}, detail: '{body.get('detail')}'")
    assert status == 401, f"Expected 401, got {status}"
    assert body.get('detail') in ['Mật khẩu không chính xác.', 'Email hoặc mật khẩu không chính xác.']

    # 5. Test login registered account with right pass
    status, body = test_login(test_email, 'StrongPassword@2026')
    print(f"5. Login registered account with right password -> status: {status}, full_name: '{body.get('user', {}).get('full_name')}'")
    assert status == 200, f"Expected 200, got {status}"

    # 6. Test Export Word .docx
    exp_url = 'http://localhost:8000/api/v1/exams/export'
    exp_payload = json.dumps({
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
    }).encode('utf-8')
    exp_req = urllib.request.Request(exp_url, data=exp_payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(exp_req) as resp:
        data = resp.read()
        content_type = resp.headers.get('Content-Type')
        print(f"6. Export DOCX -> status: {resp.status}, size: {len(data)} bytes, Content-Type: {content_type}")
        assert len(data) > 10000, "DOCX file too small, probably invalid!"
        # Verify valid docx via python-docx parser
        doc = docx.Document(io.BytesIO(data))
        print(f"   DOCX parsed successfully! {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables.")

    # 7. Test Export PDF
    exp_payload_pdf = json.dumps({
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
    }).encode('utf-8')
    exp_req_pdf = urllib.request.Request(exp_url, data=exp_payload_pdf, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(exp_req_pdf) as resp:
        data = resp.read()
        content_type = resp.headers.get('Content-Type')
        print(f"7. Export PDF -> status: {resp.status}, size: {len(data)} bytes, Content-Type: {content_type}")
        assert data.startswith(b'%PDF-'), "PDF file does not start with %PDF- header!"
        print(f"   PDF parsed successfully! Valid %PDF- header confirmed.")

    # 8. Test Export ZIP Bundle
    exp_payload_zip = json.dumps({
        'format': 'zip',
        'examTitle': 'ĐỀ THI KẾT THÚC HỌC PHẦN',
        'subjectName': 'Kinh tế vi mô',
        'examCodeCount': 4,
        'questions': []
    }).encode('utf-8')
    exp_req_zip = urllib.request.Request(exp_url, data=exp_payload_zip, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(exp_req_zip) as resp:
        data = resp.read()
        content_type = resp.headers.get('Content-Type')
        print(f"8. Export ZIP Bundle -> status: {resp.status}, size: {len(data)} bytes, Content-Type: {content_type}")
        assert data.startswith(b'PK'), "ZIP file does not start with PK header!"
        print(f"   ZIP Bundle parsed successfully! Valid PK header confirmed.")

    print("\n==========================================")
    print(">>> ALL TESTS PASSED WITH 100% SUCCESS <<<")
    print("==========================================")

if __name__ == '__main__':
    main()
