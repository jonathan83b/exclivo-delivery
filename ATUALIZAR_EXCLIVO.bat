@echo off
title Atualizar Exclivo Delivery

echo ========================================
echo       ATUALIZANDO EXCLIVO DELIVERY
echo ========================================
echo.

cd /d "%~dp0"

echo Pasta atual:
echo %CD%
echo.

if not exist ".git" (
    echo ERRO: Este arquivo nao esta dentro do repositorio Git.
    echo.
    pause
    exit /b
)

echo [1/3] Adicionando arquivos...
git add .

echo.
echo [2/3] Criando commit...
git commit -m "Atualizacao do site"

echo.
echo [3/3] Enviando para GitHub...
git push

echo.
echo ========================================
echo       SITE ATUALIZADO NO GITHUB
echo ========================================
echo.

pause