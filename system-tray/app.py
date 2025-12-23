import pystray
import subprocess
import webbrowser
import os
import sys
from PIL import Image, ImageDraw
from threading import Thread
import time
import ctypes

class SistemaMLTray:
    def __init__(self):
        self.process = None
        self.port = 3000
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.mode = None
        
        # Criar icones em memoria
        self.icon_green = self.create_icon('green')
        self.icon_red = self.create_icon('red')
        
        # Criar menu
        menu = pystray.Menu(
            pystray.MenuItem('Iniciar Dev', self.start_dev),
            pystray.MenuItem('Iniciar Prod', self.start_prod),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Parar', self.stop_server),
            pystray.MenuItem('Abrir Browser', self.open_browser),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Sair', self.quit_app)
        )
        
        # Criar system tray
        self.tray = pystray.Icon('sistema-ml', self.icon_red, 'Sistema ML', menu)
    
    def create_icon(self, color):
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        if color == 'green':
            draw.ellipse([4, 4, 60, 60], fill='#00cc00', outline='#008800', width=2)
        else:
            draw.ellipse([4, 4, 60, 60], fill='#cc0000', outline='#880000', width=2)
        return img
    
    def msg(self, title, text, tipo=0):
        """Mostra mensagem - tipo: 0=OK, 4=YesNo"""
        return ctypes.windll.user32.MessageBoxW(0, text, title, tipo)
    
    def is_running(self):
        """Verifica se servidor esta rodando"""
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', self.port))
        sock.close()
        return result == 0
    
    def kill_port(self):
        """Mata processo na porta"""
        os.system(f'for /f "tokens=5" %a in (\'netstat -aon ^| find ":{self.port}" ^| find "LISTENING"\') do taskkill /F /PID %a >nul 2>&1')
    
    def start_dev(self, icon=None, item=None):
        Thread(target=lambda: self._start('dev'), daemon=True).start()
    
    def start_prod(self, icon=None, item=None):
        Thread(target=lambda: self._start('start'), daemon=True).start()
    
    def _start(self, mode):
        if self.is_running():
            if self.msg("Aviso", "Servidor ja rodando.\nParar e reiniciar?", 4) == 6:
                self.kill_port()
                time.sleep(2)
            else:
                return
        
        self.mode = mode
        
        try:
            cmd = f'npm run {mode}'
            
            # Rodar em background total
            self.process = subprocess.Popen(
                cmd,
                cwd=self.project_root,
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=0x08000000  # CREATE_NO_WINDOW
            )
            
            # Esperar iniciar
            for _ in range(20):
                time.sleep(1)
                if self.is_running():
                    self.tray.icon = self.icon_green
                    self.tray.title = f'Sistema ML - {mode}'
                    self.msg("OK", f"Servidor iniciado!\nhttp://localhost:{self.port}")
                    return
            
            self.msg("Aviso", "Servidor demorando... verifique manualmente.")
            
        except Exception as e:
            self.msg("Erro", str(e))
    
    def stop_server(self, icon=None, item=None):
        self.kill_port()
        if self.process:
            try:
                self.process.kill()
            except:
                pass
            self.process = None
        time.sleep(1)
        self.tray.icon = self.icon_red
        self.tray.title = 'Sistema ML - Parado'
        self.mode = None
    
    def open_browser(self, icon=None, item=None):
        webbrowser.open(f'http://localhost:{self.port}')
    
    def quit_app(self, icon=None, item=None):
        if self.is_running():
            if self.msg("Sair", "Parar servidor e sair?", 4) == 6:
                self.stop_server()
        self.tray.stop()
    
    def run(self):
        self.tray.run()

if __name__ == '__main__':
    app = SistemaMLTray()
    app.run()
