import segno


def generate_qr_code(link , border : int = 1)->None:

    qr = segno.make_qr(link)

    qr.terminal(border = border)




