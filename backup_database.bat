@echo off
setlocal

echo ====================================================================
echo   QUIZGEN AI - CSDL BACKUP SCRIPT (PG_DUMP) [SCRUM-62]
echo   Tu dong sao luu CSDL PostgreSQL 5 Schemas truoc buoi demo
echo ====================================================================
echo.

set DB_USER=quizgen
set DB_PASSWORD=quizgen_secure_pass_2026
set DB_NAME=quizgen_db
set DB_HOST=localhost
set DB_PORT=5432
set CONTAINER_NAME=quizgen-postgres
set BACKUP_DIR=%~dp0backups

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo [*] Da tao thu muc backups: "%BACKUP_DIR%"
)

for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do set TIMESTAMP=%%a
if "%TIMESTAMP%"=="" set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set TIMESTAMP=%TIMESTAMP:/=_%
set TIMESTAMP=%TIMESTAMP::=_%

set BACKUP_FILE=%BACKUP_DIR%\quizgen_backup_%TIMESTAMP%.sql
echo [*] Thoi diem sao luu : %TIMESTAMP%
echo [*] File sao luu      : %BACKUP_FILE%
echo.

set SUCCESS=0

rem --- Buoc 1: Kiem tra Docker Container quizgen-postgres ---
echo [*] [1/2] Kiem tra Docker container '%CONTAINER_NAME%'...
docker ps --format "{{.Names}}" 2>nul | findstr /i "%CONTAINER_NAME%" >nul
if %errorlevel% equ 0 (
    echo [+] Phat hien Docker Container '%CONTAINER_NAME%' dang hoat dong!
    echo [*] Dang sao luu bang pg_dump tu Docker...
    docker exec -t %CONTAINER_NAME% pg_dump -U %DB_USER% -d %DB_NAME% --clean --if-exists --no-owner --no-acl > "%BACKUP_FILE%" 2>nul
    if exist "%BACKUP_FILE%" (
        for %%A in ("%BACKUP_FILE%") do (
            if %%~zA gtr 100 (
                set SUCCESS=1
                echo [PASS] Da xuat CSDL thanh cong tu Docker Container!
                goto FINISH
            )
        )
    )
) else (
    echo [INFO] Docker container khong chay hoac Docker Desktop chua bat.
)

rem --- Buoc 2: Kiem tra pg_dump cuc bo ---
echo.
echo [*] [2/2] Kiem tra pg_dump cai dat cuc bo...
where pg_dump >nul 2>nul
if %errorlevel% equ 0 (
    echo [+] Tim thay pg_dump trong PATH he thong!
    echo [*] Dang ket noi toi %DB_HOST%:%DB_PORT%/%DB_NAME%...
    set PGPASSWORD=%DB_PASSWORD%
    pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --clean --if-exists --no-owner --no-acl -f "%BACKUP_FILE%" 2>nul
    if exist "%BACKUP_FILE%" (
        for %%A in ("%BACKUP_FILE%") do (
            if %%~zA gtr 100 (
                set SUCCESS=1
                echo [PASS] Da xuat CSDL thanh cong qua pg_dump cuc bo!
                goto FINISH
            )
        )
    )
) else (
    echo [INFO] Khong tim thay lenh pg_dump tren PATH he thong.
)

rem --- Buoc 3: Fallback qua Python Backup Engine ---
echo.
echo [*] Kich hoat phuong an sao luu an toan qua Python Runner...
if exist "%~dp0scripts\backup_restore_db.py" (
    python "%~dp0scripts\backup_restore_db.py" --action backup --tag demo_preflight
    if not errorlevel 1 (
        echo [PASS] Da tao snapshot du lieu an toan cho buoi demo!
        set SUCCESS=2
        goto FINISH
    )
)

:FINISH
echo.
echo ====================================================================
if %SUCCESS% geq 1 (
    echo   [+] KET QUA: SAO LUU CSDL THANH CONG VA AN TOAN!
    echo ====================================================================
    if %SUCCESS% equ 1 (
        echo  - File sao luu : %BACKUP_FILE%
        for %%A in ("%BACKUP_FILE%") do echo  - Dung luong   : %%~zA bytes
    ) else (
        echo  - Du lieu da duoc luu snapshot an toan vao thu muc backups/
    )
    echo  - Trang thai   : SAN SANG CHO BUOI DEMO HOI DONG KHAO THI
    echo.
    echo  [Huong dan phuc hoi CSDL khi can]:
    echo  - Docker: docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% ^< "%BACKUP_FILE%"
    echo  - Local : psql -h %DB_HOST% -U %DB_USER% -d %DB_NAME% ^< "%BACKUP_FILE%"
) else (
    echo   [!] KET QUA: CHUA THE THUC HIEN SAO LUU
    echo ====================================================================
    echo  Vui long bat Docker: docker-compose up -d postgres
)
echo ====================================================================
echo.

if "%1"=="" pause
exit /b 0
