import BlockSDK from "../../shared/blocksdk";

// Guard: only run inside the SFMC iframe
if (window.self === window.top) {
  document.body.innerText =
    "This block is for use in Salesforce Marketing Cloud Content Builder only.";
} else {
  const sdk = new BlockSDK(
    ["exacttarget.com", "marketingcloudapps.com", "blocktester.herokuapp.com"],
    false,
  );

  const urlInput = document.getElementById("btn-url") as HTMLInputElement;
  const titleInput = document.getElementById("btn-title") as HTMLInputElement;
  const previewBtn = document.getElementById("preview-btn") as HTMLElement;
  const colorRadios = document.querySelectorAll<HTMLInputElement>(
    'input[name="color"]',
  );
  const canvas = document.getElementById("measure-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  interface BlockState {
    url: string;
    title: string;
    color: string;
  }

  const state: BlockState = { url: "", title: "", color: "#e9860d" };

  const SIDE_PADDING = 12;
  const MIN_WIDTH = 120;
  // Outlook/Word GDI font metrics run wider than browser canvas; scale up to prevent text clipping
  const OUTLOOK_SCALE = 1.15;

  function measureTextWidth(text: string): number {
    ctx.font = "bold 16px Verdana, sans-serif";
    return Math.ceil(ctx.measureText(text || "Button").width);
  }

  function calcButtonWidth(text: string): number {
    const measured = measureTextWidth(text) + SIDE_PADDING * 2;
    return Math.max(Math.ceil(measured * OUTLOOK_SCALE), MIN_WIDTH);
  }

  function buildHTML(url: string, title: string, color: string): string {
    const width = calcButtonWidth(title);
    return [
      '<div style="margin:20px 0px;">',
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center">',
      '<table border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td>',
      "<!--[if mso]>",
      '  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"',
      `    href="${url}"`,
      `    style="height:45px;v-text-anchor:middle;width:${width}px;" arcsize="20%" stroke="f" fillcolor="${color}">`,
      "  <w:anchorlock/>",
      "  <center>",
      "<![endif]-->",
      `<a href="${url}"`,
      `   style="background-color:${color};border-radius:8px;color:#ffffff;display:inline-block;`,
      "          font-family:Verdana,sans-serif;font-size:16px;font-weight:bold;",
      "          line-height:45px;text-align:center;text-decoration:none;",
      `          width:${width}px;-webkit-text-size-adjust:none;">`,
      title,
      "</a>",
      "<!--[if mso]>",
      "  </center>",
      "  </v:roundrect>",
      "<![endif]-->",
      "</td></tr></table></td></tr></table></div>",
    ].join("\n");
  }

  function updateBlock(): void {
    const html = buildHTML(state.url, state.title, state.color);
    sdk.setContent(html);
    sdk.setData({ url: state.url, title: state.title, color: state.color });
    previewBtn.textContent = state.title || "Buttontekst";
    previewBtn.style.backgroundColor = state.color;
  }

  sdk.getData((data: unknown) => {
    const d = data as { url?: string; title?: string; color?: string } | null;
    if (d?.url) {
      state.url = d.url;
      state.title = d.title ?? "";
      state.color = d.color ?? "#e9860d";

      urlInput.value = state.url;
      titleInput.value = state.title;

      colorRadios.forEach((r) => {
        if (r.value === state.color) r.checked = true;
      });
    } else {
      (document.getElementById("c-orange") as HTMLInputElement).checked = true;
    }
    updateBlock();
  });

  urlInput.addEventListener("input", function () {
    state.url = this.value.trim();
    updateBlock();
  });

  titleInput.addEventListener("input", function () {
    state.title = this.value;
    updateBlock();
  });

  colorRadios.forEach((r) => {
    r.addEventListener("change", function () {
      state.color = this.value;
      updateBlock();
    });
  });
}
