import segno


def generate_qr_code(link:str , border : int)->None:

    qr = segno.make_qr(link)

    qr.terminal(border = border)




