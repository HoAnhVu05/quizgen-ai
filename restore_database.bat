@echo off
setlocal

echo ====================================================================
echo   QUIZGEN AI - CSDL RESTORE SCRIPT (PSQL RESTORE) [SCRUM-84]
echo   Tu dong phuc hoi CSDL PostgreSQL tu file backup moi nhat
echo ====================================================================
echo.

set DB_USER=quizgen
set DB_PASSWORD=quizgen_secure_pass_2026
set DB_NAME=quizgen_db
set DB_HOST=localhost
set DB_PORT=5432
set CONTAINER_NAME=quizgen-postgres
set BACKUP_DIR=%~dp0backups

rem --- Buoc 1: Xac dinh file sao luu can phuc hoi ---
set RESTORE_FILE=%~1

if "%RESTORE_FILE%"=="" (
    echo [*] Khong truyen tham so file, dang tim file backup moi nhat trong '%BACKUP_DIR%'...
    if exist "%BACKUP_DIR%" (
        for /f "delims=" %%F in ('powershell -NoProfile -Command "Get-ChildItem -Path '%BACKUP_DIR%' -Filter '*.sql' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName" 2^>nul') do (
            set RESTORE_FILE=%%F
        )
    )
)

if "%RESTORE_FILE%"=="" (
    echo [!] LOI: Khong tim thay bat ky file .sql nao trong thu muc '%BACKUP_DIR%'!
    echo [INFO] Vui long chay 'backup_database.bat' de tao ban sao luu truoc.
    goto FAILED
)

if not exist "%RESTORE_FILE%" (
    echo [!] LOI: File duoc chi dinh khong ton tai: "%RESTORE_FILE%"
    goto FAILED
)

echo [*] File phuc hoi duoc chon: "%RESTORE_FILE%"
for %%A in ("%RESTORE_FILE%") do echo [*] Dung luong file       : %%~zA bytes
echo.

set SUCCESS=0

rem --- Buoc 2: Phuc hoi vao Docker Container quizgen-postgres ---
echo [*] [1/3] Kiem tra Docker container '%CONTAINER_NAME%'...
docker ps --format "{{.Names}}" 2>nul | findstr /i "%CONTAINER_NAME%" >nul
if %errorlevel% equ 0 (
    echo [+] Phat hien Docker Container '%CONTAINER_NAME%' dang hoat dong!
    echo [*] Dang nạp du lieu qua psql vao Docker container...
    type "%RESTORE_FILE%" | docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% >nul 2>nul
    if %errorlevel% equ 0 (
        set SUCCESS=1
        echo [PASS] Da phuc hoi CSDL thanh cong vao Docker Container '%CONTAINER_NAME%'!
        goto FINISH
    ) else (
        echo [WARN] Lenh nạp psql vao Docker container gap loi, thu cac phuong an tiep theo...
    )
) else (
    echo [INFO] Docker container khong chay hoac Docker Desktop chua bat.
)

rem --- Buoc 3: Phuc hoi qua psql cuc bo ---
echo.
echo [*] [2/3] Kiem tra cong cu psql cai dat cuc bo...
where psql >nul 2>nul
if %errorlevel% equ 0 (
    echo [+] Tim thay psql trong PATH he thong!
    echo [*] Dang nap du lieu vao %DB_HOST%:%DB_PORT%/%DB_NAME%...
    set PGPASSWORD=%DB_PASSWORD%
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%RESTORE_FILE%" >nul 2>nul
    if %errorlevel% equ 0 (
        set SUCCESS=2
        echo [PASS] Da phuc hoi CSDL thanh cong qua psql cuc bo!
        goto FINISH
    )
) else (
    echo [INFO] Khong tim thay lenh psql tren PATH he thong.
)

rem --- Buoc 4: Phuc hoi qua Python Recovery Engine ---
echo.
echo [*] [3/3] Kich hoat phuong an phuc hoi qua Python Runner...
if exist "%~dp0scripts\backup_restore_db.py" (
    python "%~dp0scripts\backup_restore_db.py" --action restore --path "%RESTORE_FILE%"
    if not errorlevel 1 (
        echo [PASS] Python recovery engine da phuc hoi du lieu thanh cong!
        set SUCCESS=3
        goto FINISH
    )
)

:FAILED
echo.
echo ====================================================================
echo   [!] KET QUA: KHONG THE PHUC HOI CSDL TU DONG
echo ====================================================================
echo  - Huong dan thu cong:
echo    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% ^< "%RESTORE_FILE%"
echo.
exit /b 1

:FINISH
echo.
echo ====================================================================
echo   [+] KET QUA: PHUC HOI CSDL THANH CONG VA SAN SANG SU DUNG!
echo ====================================================================
echo  - Nguon du lieu   : %RESTORE_FILE%
echo  - Thoi gian       : %date% %time%
echo  - Trang thai demo : Hoan tat san sang 100%%
echo.
exit /b 0
