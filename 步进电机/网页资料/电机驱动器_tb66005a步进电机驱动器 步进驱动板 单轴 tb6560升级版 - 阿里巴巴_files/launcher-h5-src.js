(function($) {
  // 依赖jQuery1
  if (!$) {
    return;
  }
  let apushClient;
  let serverConfig;// jsserver企业在线配置，包含user
  // 面板相关dom变量
  let widget,
      widgetSidebar,
      widgetMini,
      widgetPrompt;
  let timerId;// socket计时器id
  let onlineTimer; // online检测计时器id
  let time = 300000;  // 5分钟后断开socket
  let onlineTime = 120000;// 2分钟后断开在线检测轮询
  let isPre = location.search.indexOf('isPre') > -1 ? location.search.split('isPre=')[1] : '';
    /**
     * 打点.
     */
    function tracelog(sFlag) {
        if (window.dmtrack && dmtrack.tracelog) {
            dmtrack.tracelog(sFlag);
        }
    }
      // 点击【立即洽谈】，【客户分组】，打点实现 TODO
    function contactAndTracelog(event) {
      event.preventDefault();
      let $this = event.target;
      let dadianString = $this.getAttribute('data-dadian') || $this.parentNode.getAttribute('data-dadian');
      let href = $this.getAttribute('href') || $this.parentNode.getAttribute('href');
      let params = {
        event: 'realname_association',
        vid: serverConfig.vid,
        siteId: serverConfig.siteId,
      };
      if (isPre !== '') {
        params.isPre = isPre;
      }
      $.ajax({
        url: '//pm.1688.com/itrade/visitorEvent',
        dataType: 'jsonp',
        data: params,
        success(msg) {
          return false;
        },
        fall() {
          console.log('fall');
        },
        error() {
          console.log('error');
        }
      });
        tracelog(dadianString);
        window.open(href);
    }
  // 创建apush client，链接入口
  function createClient() {
    if (!serverConfig) {
      return;
    }
    let userId = serverConfig.siteId + '_' + serverConfig.vid;
    let appId = '1688_seller_online'; // ''
    if (Apush && apushClient == null) {

        // 实际使用时请在你自己的app后台中调用apush-authorize-util包中提供的java类ApushAuthorize的getToken方法实现获取token的url
        let getTokenUrl = 'https://js.pm.1688.com/jsserver/getToken?appId=' + appId + '&userId=' + userId;


        let terminalId = null;// 不填则系统生成一个随机字符窜作为terminalId
        let terminalType = null;// 不填则系统默认为pc
        try {
          apushClient = Apush.createClient(appId, getTokenUrl, msgCallback, terminalId, terminalType, connectCallback, reconnectCallback, disconnectCallback);
        } catch (e) {

        }

    }
  }
  // 收到消息触发的方法
  function msgCallback(msg) {
      // 用户可以在发送消息时设置自定义的msgType，在收到消息时判断msgType，"reqUnReadMsgCount"、"testMsg"、"tokenExpired"为apush预定义的msgType，请不要使用。
      if (msg.msgType === 'qyzx') {
          if (widgetPrompt) {
            widgetPrompt.trigger('msgShow', {
              title: decodeURIComponent(serverConfig.epConfig.adminLoginId) + ':',
              content: msg.arg,
            });
          }
      }

  }
  // 连接成功时触发的方法，客户端可以在此方法中请求下发未读消息数或者请求下发消息
  function connectCallback(msg) {
  // msg.arg变量中存放了userId相同的在线客户端数
    sendQuestInfo();
    // 链接超过time的值socket断开
    timerId = setTimeout(function() {
        clearTimeout(timerId);
        closeClient();
    }, time);
  }
  function reconnectCallback() {

  }
  // 连接断开时触发的方法,一般你不需要在这里做任何事情,apush会自动重连
  function disconnectCallback(msg) {

  }
  // 断开client
  function closeClient() {
      if (apushClient != null) {
          apushClient.close();
          apushClient = null;
      }
  }
  // 访客相关
  function sendQuestInfo() {
    if (!serverConfig) {
      return;
    }
    let opt = {
      // isPre: 'true',
      ap: 'Y', // 企业在线改版的标志位，需要设置为Y 必须
      event: 'first_enter',    // 事件类型, 第一次进入为 first_enter,非第一次进入为 enter
      vid: serverConfig.vid,               // 访客随机id,需确保唯一性,建议以AP开通，如 APasdsad
      cna: serverConfig.cna,             // acookie 必须
      accesslogId: '3',
      sellerId: serverConfig.epConfig.adminLoginId,           // 卖家旺旺id，应该是loginId
      receiptWwId: serverConfig.receiptWwId,        // 接待人旺旺Id
      loginId: serverConfig.lastCnalibabaId,            // 买家loginId，需要注意前缀问题
      memberId: serverConfig.memberId,           // 买家memberId，需要注意前缀问题，有cnalichn、cntaobao
      memberIdDes: serverConfig.memberIdDes,
      slid: serverConfig.slid,               // 中文站Id密文
      title: encodeURI(document.title),              // 当前访问页面title
      pageUrl: serverConfig.sellerInfoURL,          // 当前访问页面的url
      visitorIp: serverConfig.ipAddress,         // 访客来源IP地址,访客所在公域的ip地址
      visitorPhone: serverConfig.phone,      // 访客电话
      visitorMobile: serverConfig.mobile,     // 访客手机
      visitorSex: serverConfig.sex,        // 访客性别
      siteId: serverConfig.siteId,           // siteId 必须
      receiptName: serverConfig.receiptName,
      fromUrl: encodeURI(document.referrer),           // 访客的来源，即HTTP的Refer头信息
      fromSite: '1',         // 访客的来源网站
    };
    if (isPre !== '') {
      opt.isPre = isPre;
    }
    $.ajax({
      url: '//pm.1688.com/itrade/visitorEvent',
      dataType: 'jsonp',
      data: opt,
      success(msg) {
      },
      fall() {
        // 发送失败断开socket
          closeClient();
      },
    });
  }
  // 渲染面板
  function renderMsg() {
    let needConfig = {
      welcomeWords: decodeURIComponent(serverConfig.epConfig.welcomeWords) || '欢迎咨询',
      flagSubAccount: serverConfig.epConfig.flagSubAccount || 'Y',
      isWhite: serverConfig.isWhite || 'Y',
      color: serverConfig.epConfig.color || 'black',
      subAccounts: serverConfig.epConfig.subAccounts || [],
      contacts: serverConfig.epConfig.contacts || [],
      fieldCert: serverConfig.fieldCert,
      adminLoginId: serverConfig.epConfig.adminLoginId,
      sellerInfoURL: decodeURIComponent(serverConfig.sellerInfoURL),
    };
    let webim2_id = 'oWebMsg_Slider_qyzx';

    // 添加“实地认证”图标
    let sidebar_sdrz = 'qyzx3_hidden';
    let minibar_sdrz = 'qyzx3_hidden';
    let fca_img = '';
    if (needConfig.fieldCert) {
        sidebar_sdrz = minibar_sdrz = '';
        if (needConfig.fieldCert === 'fcaTrade') {
            fca_img = '658/764/2467856_1903982649.png';// 深度验商
        } else {
            fca_img = '485/184/2481584_1903982649.png';// 深度验厂
        }
    }
    let el = document.createElement('div');
    let html = '<div class="qyzx3 qyzx3_' + needConfig.color + '" id="' + webim2_id + '">' +
      // prompt box 立即回复
      '<div class="qyzx3_prompt qyzx3_hidden">' +
        '<div class="qyzx3_prompt_count">' +
          '<span class="qyzx3_prompt_count_label">来自卖家的消息:</span>' +
        '</div>' +
        '<div class="qyzx3_prompt_msg">' +
          '<p class="qyzx3_prompt_msg_from">&nbsp;</p>' +
          '<p class="qyzx3_prompt_msg_text">&nbsp;</p>' +
        '</div>' +
        '<a class="qyzx3_prompt_button qyzx3_prompt_button_ljhf " data-dadian="lijihuifu" target="_blank" href="//amos.alicdn.com/getcid.aw?v=3&uid=' + needConfig.adminLoginId + '&site=cnalichn&groupid=0&s=1&charset=utf-8" style="display:block;"></a>' +
        '<div class="qyzx3_prompt_close"></div>' +
      '</div>' +
      // sidebar
      '<div class="qyzx3_sidebar">' +
        '<div class="qyzx3_sidebar_title">' +
          '<span class="qyzx3_sidebar_title_text">企业在线</span>' +
          '<span class="qyzx3_sidebar_title_arrow"></span>' +
           '<a href=' + needConfig.sellerInfoURL + ' target="_blank" class="qyzx3_sidebar_title_sdrz_' + needConfig.fieldCert  + '" " ' + sidebar_sdrz + '" title="深度认证">' +
           '<img src="https://cbu01.alicdn.com/cms/upload/2015/' + fca_img + '" width="20px;" height="20px;">' +
           ' </a>' +
        '</div>' +
        '<div class="qyzx3_welcomewords">' +
          '<div class="qyzx3_welcomewords_text">' +
            '<div class="qyzx3_welcomewords_text_box">' + needConfig.welcomeWords + '</div>' +
            '<div class="qyzx3_welcomewords_text_scroll qyzx3_hidden"></div>' +
            '<div class="qyzx3_welcomewords_text_ellipsis qyzx3_hidden">...</div>' +
          '</div>' +
        '</div>' +
        '<div class="qyzx3_buttons">' +
          '<a target="_blank" data-dadian="lijiqiatan" href="//amos.alicdn.com/getcid.aw?v=3&uid=' + needConfig.adminLoginId + '&site=cnalichn&groupid=0&s=1&charset=utf-8" class="qyzx3_buttons_ljqt qyzx3_buttons_ljqt_wangwang"></a>' +
        '</div>' +
        '<div class="qyzx3_h_line"></div>' +
        '<div class="qyzx3_list">' + renderContacts(needConfig.contacts) + '</div>' +
        '<div class="qyzx3_list_subaccount">' + (needConfig.flagSubAccount === 'Y' ? renderAccount(needConfig.subAccounts) : '') + '</div>' +
        '<div class="qyzx3_h_space"></div>' +
        '<div class="qyzx3_h_line"></div>' +
      '</div>' +
      // minibar
      '<div class="qyzx3_minibar qyzx3_hidden">' +
        '<div class="qyzx3_minibar_box">' +
          '<div class="qyzx3_minibar_box_arrow"></div>' +
          '<div class="qyzx3_minibar_box_text">点此洽谈</div>' +
        '</div>' +
        '<div class="qyzx3_minibar_sdrz ">' +
          '<div class="qyzx3_minibar_sdrz_ico" title="深度认证">' +
          '<img src="https://cbu01.alicdn.com/cms/upload/2015/' + fca_img + '" width="20px;" height="20px;">' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
      el.innerHTML = html;
      document.body.appendChild(el.firstChild);
      appEventBind();
  }

  function renderContacts(arr) {
    let html = '';
    for (let i = 0, len = arr.length; i < len; i++) {
        html += '<div class="qyzx3_subAccount" >';
            html += '<a class="qyzx3_subAccount_link qyzx3_buttons_ljqt_wangwang" data-dadian="subAccount' + i + '" href="//amos.alicdn.com/getcid.aw?v=3&uid=' + arr[i].loginId + '&site=cnalichn&groupid=0&s=1&charset=utf-8&fromid=' + serverConfig.lastCnalibabaId + '" target = "_blank">';
                html += '<img src="//amos.alicdn.com/online.aw?v=3&uid=' + arr[i].loginId + '&site=cnalichn&s=11&charset=utf-8" alt="点击这里给我发消息" style="vertical-align:bottom;" >';
                html += '<span class="qyzx3_item_text">' + (decodeURIComponent(arr[i].name) + ' ' + decodeURIComponent(arr[i].jobTitle)).substr(0, 18) + '</span>';
            html += '</a>';
        html += '</div>';
    }
    return html;
  }

  // 渲染旺旺列表
  function renderAccount(arr) {
      let html = '';
          for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i].isShow === 'Y') {
                html += '<div class="qyzx3_subAccount" >';
                    html += '<a class="qyzx3_subAccount_link qyzx3_buttons_ljqt_wangwang" data-dadian="subAccount' + i + '" href="//amos.alicdn.com/getcid.aw?v=3&uid=' + arr[i].loginId + '&site=cnalichn&groupid=' + arr[i].groupId + '&s=1&charset=utf-8&fromid=' + serverConfig.lastCnalibabaId + '" target = "_blank">';
                        html += '<img src="//amos.alicdn.com/grponline.aw?v=3&uid=' + arr[i].loginId + '&site=cnalichn&gids=' + arr[i].groupId + '&s=1&charset=utf-8" alt="点击这里给我发消息" style="vertical-align:bottom;" >';
                        html += '<span class="qyzx3_item_text">' + decodeURIComponent(arr[i].groupName) + '</span>';
                    html += '</a>';
                html += '</div>';
            }
          }
      return html;
  }
  // 绑定面板相关操作事件
  function appEventBind() {
     widget = $('#oWebMsg_Slider_qyzx');
     widgetMini = $('.qyzx3_minibar', widget);
     widgetSidebar = $('.qyzx3_sidebar', widget);
     widgetPrompt = $('.qyzx3_prompt', widget);

     let msgTitle = $('.qyzx3_prompt_msg_from', widgetPrompt);
     let msgCont = $('.qyzx3_prompt_msg_text', widgetPrompt);

    widget.on('click', '.qyzx3_sidebar_title_arrow', function() {
        panelShow(widgetMini);
        panelHiden(widgetSidebar);
        panelHiden(widgetPrompt);
    });
    widget.on('click', '.qyzx3_minibar', function() {
        panelShow(widgetSidebar);
        panelHiden(widgetMini);

    });
    widget.on('click', '.qyzx3_prompt_close', function() {
        panelHiden(widgetPrompt);
    });

    // 立即洽谈，旺旺列表添加实名建立
    widgetSidebar.on('click', '.qyzx3_buttons_ljqt_wangwang', function(event) {
      contactAndTracelog(event);
    });


    // 立即回复添加实名建立
    widgetPrompt.on('click', '.qyzx3_prompt_button_ljhf', function(event) {
       contactAndTracelog(event);
    });

    widgetPrompt.on('msgShow', function(event, data) {
        panelShow(widgetPrompt);
        if (data) {
          msgTitle.text(data.title);
          msgCont.text(data.content);
        }
    });
  }
  function panelShow(obj) {
      obj.removeClass('qyzx3_hidden');
  }
  function panelHiden(obj) {
      obj.addClass('qyzx3_hidden');
  }

  /**
   * 获取url参数，并封装成Map.
   *
   * @param  {String} url
   * @return {Object} map
   */
  function getUrlParameterMap(url) {
      let map = {};

      if (!/\?(\S+)/.test(url)) return map;

      let ps = RegExp.$1.split('&'),
          re = /^([^=]+)(?:=(.*))?$/;

      for (let i = ps.length - 1; i >= 0; i--) {
          if (re.test(ps[i])) {
              map[ RegExp.$1 ] = RegExp.$2;
          }
      }
      return map;
  }
  // 获取企业在线配置信息
  function getContext(cb) {
    let oScript = $('#oPMWebIM');

    let ctx = {
      url_jsserver: '//js.pm.1688.com/jsserver/JSServlet',
    };
    if (oScript) {
        let oPM = getUrlParameterMap(oScript.prop('src'));

        ctx.sellerMemberId     = oPM.sid;
        ctx.fromSite           = oPM.site;
        ctx.sellerRealMemberId = oPM.sMid;
        ctx.isExpandsQYZX      = oPM.expandqyzx || 'y';
    }

    let url = ctx.url_jsserver + '?sellerMemberId=' + ctx.sellerMemberId;

    $.getScript(url, function(data) {
      serverConfig = window.__itbu_cd_name__;
      cb && cb();
    });
  }
  // 添加css
  function addStyleSheet(url) {
      let head   = document.getElementsByTagName('head')[0],
          script = head.getElementsByTagName('script')[0],
          link   = document.createElement('link');

      link.rel  = 'stylesheet';
      link.href = url;

      head.insertBefore(link, script || null);
  }

  // 心跳监控 TODO
  function watchHeartBeat() {
      let params = {
        event: 'heartbeat',
        vid: serverConfig.vid,
        siteId: serverConfig.siteId,
      };
      if (isPre !== '') {
        params.isPre = isPre;
      }
      $.ajax({
          url: '//pm.1688.com/itrade/visitorEvent',
          dataType: 'jsonp',
          data: params,
          success(msg) {
            console.log('success');
          },
          fall() {
            console.log('error');
          },
        });
  }
  // init

  function init() {

    addStyleSheet('//g.alicdn.com/assets-group/pm/pm/css/itbu/pm/jsserver/qyzx.css');
    $.getScript('https://g.alicdn.com/tb/apush/1.0.16/??socketio.js,apush.js', function() {

        let host = 'hzapush.aliexpress.com';
        Apush.serverDomain = host;
        Apush.port = 80;
       //---------
        getContext(function() {
            createClient();
            // 心跳监控，页面只要存在就每隔1分钟发送一次页面请求
            watchHeartBeat();
            onlineTimer = setInterval(watchHeartBeat, onlineTime);
            setTimeout(function() {
              clearInterval(onlineTimer);
            }, 600000);
            renderMsg();
        });
    });

  }

// 启动入口
  try {
      init();
  } catch (e) {
      if (window.console) {
        console.log(e);
      }
  }
})(jQuery);
