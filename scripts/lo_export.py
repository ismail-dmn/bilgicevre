import os
import shutil
import subprocess
import sys
import tempfile
import time
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.connection import NoConnectException


def prop(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def main():
    input_path, output_dir = sys.argv[1], sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)
    profile = tempfile.mkdtemp(prefix="bilgicevre-lo-")
    port = "2002"
    process = subprocess.Popen([
        "soffice", "--headless",
        f"--accept=socket,host=127.0.0.1,port={port};urp;StarOffice.ServiceManager",
        f"-env:UserInstallation=file://{profile}",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        local_ctx = uno.getComponentContext()
        resolver = local_ctx.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local_ctx)
        ctx = None
        for _ in range(40):
            try:
                ctx = resolver.resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
                break
            except NoConnectException:
                time.sleep(0.25)
        if ctx is None:
            raise RuntimeError("LibreOffice UNO bağlantısı kurulamadı")
        desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
        in_url = uno.systemPathToFileUrl(os.path.abspath(input_path))
        output_path = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + ".pdf")
        out_url = uno.systemPathToFileUrl(os.path.abspath(output_path))
        doc = desktop.loadComponentFromURL(in_url, "_blank", 0, (prop("Hidden", True), prop("ReadOnly", False),))
        try:
            sheet = doc.Sheets.getByIndex(0)
            style = doc.StyleFamilies.getByName("PageStyles").getByName(sheet.PageStyle)
            style.ScaleToPagesX = 1
            style.ScaleToPagesY = 3
            style.IsLandscape = True
            style.Width = 29700
            style.Height = 21000
            style.LeftMargin = 700
            style.RightMargin = 700
            style.TopMargin = 700
            style.BottomMargin = 700
            doc.storeToURL(out_url, (prop("FilterName", "calc_pdf_Export"), prop("Overwrite", True)))
        finally:
            doc.close(True)
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
