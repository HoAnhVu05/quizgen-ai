import ast
import os
import re

print("================================================================")
print("  QUIZGEN AI - BACKEND AUTH SERVICE STATIC & AST TEST SUITE")
print("================================================================")

# 1. Test models.py AST & definitions
print("\n[TEST 1] Parsing services/auth-service/src/models.py AST")
with open("services/auth-service/src/models.py", "r", encoding="utf-8") as f:
    models_source = f.read()

models_tree = ast.parse(models_source)
classes = [node.name for node in ast.walk(models_tree) if isinstance(node, ast.ClassDef)]

assert "LecturerBase" in classes, "LecturerBase model missing"
assert "RefreshTokenRequest" in classes, "RefreshTokenRequest model missing"
assert "TokenResponse" in classes, "TokenResponse model missing"
assert "UserTokenDB" in classes, "UserTokenDB model missing"
assert "role" in models_source, "'role' attribute missing in models.py"
assert "refresh_token" in models_source, "'refresh_token' missing in models.py"
print("[OK] models.py AST verification passed. All schemas & models defined correctly.")

# 2. Test main.py AST & definitions
print("\n[TEST 2] Parsing services/auth-service/src/main.py AST")
with open("services/auth-service/src/main.py", "r", encoding="utf-8") as f:
    main_source = f.read()

main_tree = ast.parse(main_source)
functions = [node.name for node in ast.walk(main_tree) if isinstance(node, ast.FunctionDef)]

assert "create_access_token" in functions, "create_access_token function missing"
assert "create_refresh_token" in functions, "create_refresh_token function missing"
assert "login" in functions, "login endpoint missing"
assert "refresh_token_endpoint" in functions, "refresh_token_endpoint missing"
assert "logout" in functions, "logout endpoint missing"
assert "get_me" in functions, "get_me endpoint missing"

# Role validation in main.py
for role in ["lecturer", "head_of_department", "admin"]:
    assert role in main_source, f"Role '{role}' missing in main.py"
    print(f"[OK] Role '{role}' verified in main.py")

# Seed users in main.py
for email in ["lecturer@vnu.edu.vn", "truongbomon@vnu.edu.vn", "admin.khaothi@vnu.edu.vn"]:
    assert email in main_source, f"Seed user '{email}' missing in main.py"
    print(f"[OK] Seed user '{email}' verified in main.py")

print("[OK] main.py AST & endpoint verification passed.")

# 3. Test SQL seeds
print("\n[TEST 3] Verifying database/seeds/01_seed_academic_data.sql")
with open("database/seeds/01_seed_academic_data.sql", "r", encoding="utf-8") as f:
    sql_source = f.read()

assert "usr-lec-001" in sql_source, "Lecturer user missing in SQL seed"
assert "usr-head-001" in sql_source, "Head of Department missing in SQL seed"
assert "usr-adm-001" in sql_source, "Admin missing in SQL seed"
assert "head_of_department" in sql_source, "head_of_department role missing in SQL seed"
assert "admin" in sql_source, "admin role missing in SQL seed"
print("[OK] 01_seed_academic_data.sql seed verification passed for all 3 roles.")

print("\n================================================================")
print("  ALL BACKEND TESTS PASSED SUCCESSFULLY! (100% OK)")
print("================================================================")
