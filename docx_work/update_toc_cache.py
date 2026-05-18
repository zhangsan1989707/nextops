from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree


DOCX = Path("/Users/leohang/Documents/My-Vault/00-inbox/成都市蓉政通运维保障方案V1-职责分工调整.docx")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W_NS = NS["w"]


def qn(tag):
    prefix, name = tag.split(":")
    return f"{{{NS[prefix]}}}{name}"


replacements = {
    "3.1 运维组织管理10": "3.1 主要职责分工10",
    "3.1.1 远程/现场运维责任人10": "3.1.1 蓉政通二期分工10",
    "3.1.2 项目运维经理11": "3.1.2 项目管理（联合）10",
    "3.1.3 二线运维专家11": "3.1.3 项目运营（数城）10",
    "3.1.4 三线研发12": "3.1.4 项目运维（中天）11",
}
remove_text = {
    "3.1.5 管理团队12",
    "3.1.6 服务流程管理13",
}

with TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    with ZipFile(DOCX) as zin:
        zin.extractall(tmp_path)

    document_path = tmp_path / "word" / "document.xml"
    root = etree.fromstring(document_path.read_bytes())
    for p in list(root.xpath("//w:p", namespaces=NS)):
        texts = p.xpath(".//w:t", namespaces=NS)
        joined = "".join(t.text or "" for t in texts)
        if joined in replacements and texts:
            texts[0].text = replacements[joined]
            for t in texts[1:]:
                t.text = ""
        elif joined in remove_text:
            parent = p.getparent()
            parent.remove(p)
    document_path.write_bytes(
        etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
    )

    settings_path = tmp_path / "word" / "settings.xml"
    settings_root = etree.fromstring(settings_path.read_bytes())
    update = settings_root.find(qn("w:updateFields"))
    if update is None:
        update = etree.Element(qn("w:updateFields"))
        settings_root.append(update)
    update.set(qn("w:val"), "true")
    settings_path.write_bytes(
        etree.tostring(settings_root, xml_declaration=True, encoding="UTF-8", standalone=True)
    )

    with ZipFile(DOCX, "w", ZIP_DEFLATED) as zout:
        for path in tmp_path.rglob("*"):
            if path.is_file():
                zout.write(path, path.relative_to(tmp_path).as_posix())

print(DOCX)
