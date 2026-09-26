@echo off
title Exclivo Delivery - Atualizar Site

cd /d "%~dp0"

echo ========================================
echo       EXCLIVO DELIVERY
echo       ATUALIZAR SITE
echo ========================================
echo.

if not exist ".git" (
    echo ERRO: Repositorio Git nao encontrado.
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando alteracoes...
git status

echo.
echo [2/4] Adicionando arquivos...
git add .

git diff --cached --quiet

if %errorlevel%==0 (
    echo.
    echo Nenhuma alteracao local encontrada.
    goto SINCRONIZAR
)

echo.
echo Criando commit local...
git commit -m "Atualizacao do site"

if errorlevel 1 (
    echo.
    echo ERRO ao criar o commit.
    echo.
    pause
    exit /b 1
)

:SINCRONIZAR

echo.
echo [3/4] Sincronizando com o GitHub...
git pull --rebase origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERRO DURANTE A SINCRONIZACAO
    echo ========================================
    echo.
    echo Pode existir um conflito entre arquivos.
    echo.
    echo NAO feche esta janela se aparecer conflito.
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Enviando para o GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ERRO ao enviar para o GitHub.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo       ATUALIZACAO CONCLUIDA!
echo ========================================
echo.
echo GitHub atualizado com sucesso.
echo.

pause