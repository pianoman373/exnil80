from PIL import Image

img = Image.open('palette.png')
pixels = img.load() 
width, height = img.size

for y in range(height):      # this row
    for x in range(width):   # and this row was exchanged
        r, g, b, a = pixels[x, y]
        
        # in case your image has an alpha channel
        # r, g, b, a = pixels[x, y]

        #print(x, y, f"#{r:02x}{g:02x}{b:02x}")


img = Image.open('charset.png')
pixels = img.load() 
width, height = img.size

for ty in range(height//8):      # this row    
    for tx in range(width//8):   # and this row was exchanged
        for spy in range(8):
            for spx in range(4):
                x = tx*8 + spx*2
                y = ty*8 + spy
                num = ((pixels[x+0,y][0]&0x01) << 4) | ((pixels[x+1,y][0]&0x01) << 0)
                print(f"0x{num:02x},", end="")