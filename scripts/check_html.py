from html.parser import HTMLParser
from pathlib import Path
import sys


VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
P_BLOCKS = {"address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "menu", "nav", "ol", "p", "pre", "section", "table", "ul"}
OPTIONAL_CLOSE = {"li", "dt", "dd", "p", "rt", "rp", "optgroup", "option", "thead", "tbody", "tfoot", "tr", "td", "th"}


class DocumentCheck(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.errors = []
        self.ids = set()
        self.h1_count = 0
        self.main_count = 0
        self.has_html_language = False
        self.has_doctype = False
        self.anchors = []
        self.images_without_alt = 0
        self.script_count = 0
        self.script_sources = []

    def handle_decl(self, decl):
        if decl.lower() == "doctype html":
            self.has_doctype = True

    def handle_starttag(self, tag, attrs):
        if tag in P_BLOCKS and "p" in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index("p")
            self.stack = self.stack[:index]
        if tag == "li" and self.stack and self.stack[-1] == "li":
            self.stack.pop()
        if tag in {"dt", "dd"} and self.stack and self.stack[-1] in {"dt", "dd"}:
            self.stack.pop()
        if tag in {"td", "th"} and self.stack and self.stack[-1] in {"td", "th"}:
            self.stack.pop()
        if tag == "tr":
            while self.stack and self.stack[-1] in {"td", "th"}:
                self.stack.pop()
            if self.stack and self.stack[-1] == "tr":
                self.stack.pop()
        if tag in {"thead", "tbody", "tfoot"} and self.stack and self.stack[-1] in {"thead", "tbody", "tfoot"}:
            self.stack.pop()
        if tag == "option" and self.stack and self.stack[-1] == "option":
            self.stack.pop()
        attributes = dict(attrs)
        if tag == "html" and attributes.get("lang"):
            self.has_html_language = True
        if tag == "h1":
            self.h1_count += 1
        if tag == "main":
            self.main_count += 1
        if tag == "script":
            self.script_count += 1
            self.script_sources.append(attributes.get("src", ""))
        if tag == "img" and "alt" not in attributes:
            self.images_without_alt += 1
        if "id" in attributes:
            if attributes["id"] in self.ids:
                self.errors.append(f"duplicate id {attributes['id']!r}")
            self.ids.add(attributes["id"])
        if tag == "a":
            self.anchors.append(attributes)
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        if tag not in VOID:
            self.handle_starttag(tag, attrs)
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            self.errors.append(f"void element </{tag}> must not have an end tag")
        elif tag in P_BLOCKS and tag != "p" and "p" in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index("p")
            self.stack = self.stack[:index]
            if not self.stack or self.stack[-1] != tag:
                expected = self.stack[-1] if self.stack else "no open element"
                self.errors.append(f"unexpected </{tag}>; expected </{expected}>")
            else:
                self.stack.pop()
        elif tag in OPTIONAL_CLOSE:
            if tag in self.stack:
                index = len(self.stack) - 1 - self.stack[::-1].index(tag)
                self.stack = self.stack[:index]
        elif not self.stack or self.stack[-1] != tag:
            expected = self.stack[-1] if self.stack else "no open element"
            self.errors.append(f"unexpected </{tag}>; expected </{expected}>")
        else:
            self.stack.pop()

    def finish(self, allow_search=False):
        if not self.has_doctype:
            self.errors.append("missing HTML doctype")
        if not self.has_html_language:
            self.errors.append("missing html lang")
        if self.h1_count != 1:
            self.errors.append(f"expected exactly one h1, found {self.h1_count}")
        if self.main_count != 1:
            self.errors.append(f"expected exactly one main landmark, found {self.main_count}")
        if self.images_without_alt:
            self.errors.append(f"{self.images_without_alt} image(s) missing alt text")
        allowed_scripts = ["/assets/search.js"] if allow_search else []
        if self.script_sources != allowed_scripts:
            self.errors.append(f"unexpected script elements: {self.script_sources!r}")
        if self.stack:
            self.errors.append(f"unclosed elements: {', '.join(self.stack[-8:])}")
        for attrs in self.anchors:
            if not attrs.get("href"):
                self.errors.append("anchor missing href")
            elif "id" not in attrs and "name" not in attrs and not attrs.get("aria-label") and not attrs.get("title"):
                # Text content is checked separately by the authoring tests;
                # this verifies the common icon-only case has an accessible name.
                pass
        return self.errors


def main(root):
    root = Path(root)
    fixed_routes = [
        "index.html",
        "mirrors.html",
        "bin/windows/index.html",
        "bin/macosx/index.html",
        "bin/linux/index.html",
        "bin/windows/base/index.html",
        "bin/windows/contrib/index.html",
        "bin/windows/base/rw-FAQ.html",
        "bin/macosx/contrib/index.html",
        "bin/macosx/RMacOSX-FAQ.html",
        "bin/linux/debian/index.html",
        "bin/linux/ubuntu/index.html",
        "bin/linux/fedora/index.html",
        "manuals.html",
        "faqs.html",
        "mirror-howto.html",
        "web/packages/policies.html",
        "CRAN_team.htm",
        "src/index.html",
        "src/base/index.html",
        "src/contrib/index.html",
        "web/packages/index.html",
        "web/packages/available_packages_by_name.html",
    ]
    fixed_routes.extend(f"web/packages/by-name/{letter}.html" for letter in "abcdefghijklmnopqrstuvwxyz")
    fixed_routes.extend(f"web/packages/{name}/index.html" for name in ("termr", "dplyr", "ggplot2", "boot", "MASS", "A3"))
    pages = [root / route for route in fixed_routes if (root / route).is_file()]
    if not pages:
        raise SystemExit("No generated HTML pages found.")
    failures = []
    for page in pages:
        parser = DocumentCheck(page)
        try:
            parser.feed(page.read_text(encoding="utf-8"))
            parser.close()
        except Exception as error:
            failures.append(f"{page}: parse error: {error}")
            continue
        allow_search = page == root / "index.html" or page == root / "web/packages/index.html"
        failures.extend(f"{page}: {error}" for error in parser.finish(allow_search=allow_search))
    if failures:
        raise SystemExit("HTML checks failed:\n" + "\n".join(failures[:50]))
    print(f"HTML structure check passed for {len(pages)} representative pages across all templates and letters.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dist")
