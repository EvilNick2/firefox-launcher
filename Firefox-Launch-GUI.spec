# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['launch.py'],
    pathex=[],
    binaries=[],
    datas=[
    ('.env\\Lib\\site-packages\\sv_ttk\\py.typed', 'sv_ttk'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\sv.tcl', 'sv_ttk'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\__init__.py', 'sv_ttk'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\dark.tcl', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\light.tcl', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\spritesheet_dark.png', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\spritesheet_light.png', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\sprites_dark.tcl', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\theme\\sprites_light.tcl', 'sv_ttk/theme'), 
    ('.env\\Lib\\site-packages\\sv_ttk\\__pycache__\\__init__.cpython-310.pyc', 'sv_ttk')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Firefox-Launch-GUI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['app.ico'],
)
