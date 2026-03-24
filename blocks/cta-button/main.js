var BlockSDK = require('../../shared/blocksdk.js');

// Guard: only run inside the SFMC iframe
if (window.self === window.top) {
  document.body.innerText = 'This block is for use in Salesforce Marketing Cloud Content Builder only.';
} else {
  var sdk = new BlockSDK(
    ['exacttarget.com', 'marketingcloudapps.com', 'blocktester.herokuapp.com'],
    false
  );

  var urlInput    = document.getElementById('btn-url');
  var titleInput  = document.getElementById('btn-title');
  var previewBtn  = document.getElementById('preview-btn');
  var colorRadios = document.querySelectorAll('input[name="color"]');
  var canvas      = document.getElementById('measure-canvas');
  var ctx         = canvas.getContext('2d');

  var state = { url: '', title: '', color: '#e9860d' };

  var SIDE_PADDING = 20;
  var MIN_WIDTH    = 120;

  function measureTextWidth(text) {
    ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
    return Math.ceil(ctx.measureText(text || 'Button').width);
  }

  function calcButtonWidth(text) {
    return Math.max(measureTextWidth(text) + (SIDE_PADDING * 2), MIN_WIDTH);
  }

  function buildHTML(url, title, color) {
    var width = calcButtonWidth(title);
    return [
      '<div style="margin:20px 0px;">',
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center">',
      '<table border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td>',
      '<!--[if mso]>',
      '  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"',
      '    href="' + url + '"',
      '    style="height:45px;v-text-anchor:middle;width:' + width + 'px;" arcsize="20%" stroke="f" fillcolor="' + color + '">',
      '  <w:anchorlock/>',
      '  <center>',
      '<![endif]-->',
      '<a href="' + url + '"',
      '   style="background-color:' + color + ';border-radius:8px;color:#ffffff;display:inline-block;',
      '          font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;',
      '          line-height:45px;text-align:center;text-decoration:none;',
      '          width:' + width + 'px;-webkit-text-size-adjust:none;">',
      title,
      '</a>',
      '<!--[if mso]>',
      '  </center>',
      '  </v:roundrect>',
      '<![endif]-->',
      '</td></tr></table></td></tr></table></div>'
    ].join('\n');
  }

  function updateBlock() {
    var html = buildHTML(state.url, state.title, state.color);
    sdk.setContent(html);
    sdk.setData({ url: state.url, title: state.title, color: state.color });
    previewBtn.textContent           = state.title || 'Buttontekst';
    previewBtn.style.backgroundColor = state.color;
  }

  sdk.getData(function (data) {
    if (data && data.url) {
      state.url   = data.url;
      state.title = data.title;
      state.color = data.color || '#e9860d';

      urlInput.value   = state.url;
      titleInput.value = state.title;

      colorRadios.forEach(function (r) {
        if (r.value === state.color) r.checked = true;
      });
    } else {
      document.getElementById('c-orange').checked = true;
    }
    updateBlock();
  });

  urlInput.addEventListener('input', function () {
    state.url = this.value.trim();
    updateBlock();
  });

  titleInput.addEventListener('input', function () {
    state.title = this.value;
    updateBlock();
  });

  colorRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      state.color = this.value;
      updateBlock();
    });
  });
}
