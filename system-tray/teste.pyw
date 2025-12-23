# Teste simples do system tray
import pystray
from PIL import Image, ImageDraw

def create_icon():
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill='red', outline='darkred', width=3)
    return img

def on_quit(icon, item):
    icon.stop()

icon = pystray.Icon(
    'teste',
    create_icon(),
    'Teste - Clique direito para sair',
    menu=pystray.Menu(
        pystray.MenuItem('Sair', on_quit)
    )
)

icon.run()

