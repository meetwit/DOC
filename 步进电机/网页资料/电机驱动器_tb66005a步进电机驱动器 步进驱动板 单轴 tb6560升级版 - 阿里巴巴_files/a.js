(function() {
    window['vbarNeedLoad'] = true;

    var script = document.createElement('script');

    script.src = location.protocol + '//astyle.alicdn.com/pkg/@alife/vbar-core/1.9.x/bundle.js?marketId=1688market&scene=offerdetail&_dc' + new Date().getTime();

    script.charset = 'utf-8';

    document.getElementsByTagName('head')[0].appendChild(script);

}());/**
 * @fileoverview 工具条
 *
 */

/*jshint multistr:true*/

(function () {

    if(window['vbarNeedLoad']){
        return;
    }

    function vbarFactory(exports, require, observer, AOP, $, templateEngine, localstorage, dateUtil, Scroller) {

        exports.version = '3.0';

        polyfill();

        var slice = [].slice;
        var aop = new AOP();
        var initialized = false;
        var evt = observer.create();


        var event = {
            bindings: {
                'click .vbar-hide': 'hideVbar',
                'click .vbar-show': 'showVbar',
                'click .vbar-menu': 'onClickMenu',
                'click .vbar-promotion': 'onClickPromotion',
                'click .vbar-tool': 'onClickTool',
                'click .vbar-bubble-close': 'onCloseBubble',
                'click .vbar-panel-close': 'onClosePanel'
            },

            init: function (container, config) {

                this.container = container;
                this.config = config;
                this.bindEvents(container);

                $(window).on('resize', function () {
                    view.updateVbar();
                });

                var self = this;
                $('body').on('click', function (e) {
                    var target = e.target;
                    if (self.container.has(target).length === 0) {
                        view.hidePanels();
                    }
                });
            },

            hideVbar: function () {
                view.hideVbar();
                tracelog('fold', this.config.name);
            },

            showVbar: function () {
                view.showVbar();
                tracelog('unfold', this.config.name);
            },

            _onClickItem: function (event, type) {
                var element = $(event.currentTarget);
                var itemName = element.attr('data-name');
                var open = element.hasClass('selected');

                var item = findByAttr(this.config[type + 's'], 'name', itemName);
                if (!item) { return; }
                if (item.panel) {

                    var panelName = item.panel.name;

                    if (open) {
                        view.close('panel', panelName);
                        tracelog(panelName + '_fold', this.config.name);
                    } else {
                        view.open('panel', panelName);
                        tracelog(panelName + '_unfold', this.config.name);
                    }
                }

                if (item.link) {

                    var linkName = item.link.name;
                    view.open('link', linkName);
                    tracelog(linkName + '_unfold', this.config.name);
                }
            },

            onClickMenu: function (e) {
                this._onClickItem(e, 'menu');
            },
            onClickPromotion: function (e) {
                this._onClickItem(e, 'promotion');
            },
            onClickTool: function (e) {
                this._onClickItem(e, 'tool');

            },
            onClosePanel: function (e) {
                var button = $(e.currentTarget);
                var panelName = button.closest('.vbar-panel').attr('data-name');
                view.close('panel', panelName);
                tracelog(panelName + '_fold', this.config.name);
            },

            onCloseBubble: function (e) {
                var button = $(e.currentTarget);
                var bubbleName = button.closest('.vbar-bubble').attr('data-name');
                view.close('bubble', bubbleName);
                tracelog(bubbleName + '_fold', this.config.name);
            },

            bindEvents: function (container) {

                var self = this;
                $.each(this.bindings, function (key, value) {
                    if (!key) { return; }
                    var indexOfFirstSpace = key.indexOf(' ');
                    var eventName, target;
                    if (indexOfFirstSpace < 0) {
                        eventName = key;
                        target = container;
                        container.on(eventName, $.proxy(self, value));
                    } else {
                        eventName = key.substring(0, indexOfFirstSpace);
                        target = key.substring(indexOfFirstSpace);
                        container.on(eventName, target, $.proxy(self, value));
                    }
                });
            }
        };

        var view = {
            // init vbar view.
            init: function (config) {
                var self = this;
                this.config = config;
                this.validEvents = {
                    render: {
                        promotion: true, menu: true, tool: true,
                        panel: true, bubble: true, link: true
                    },
                    open: {panel: true, bubble: true, link: true},
                    close: {panel: true, bubble: true, link: true}
                };
                // init template.
                this.templates = {
                    'promotion': templateEngine.compile(this.template.promotion),
                    'menu': templateEngine.compile(this.template.menu),
                    'tool': templateEngine.compile(this.template.tool),
                    'panel': templateEngine.compile(this.template.panel),
                    'bubble': templateEngine.compile(this.template.bubble)
                };
                // init vbar items
                if (!this.config) {
                    return false;
                }
                this.layout = this.initLayout(this.config);
                $.each(['promotion', 'menu', 'tool'], function (index, type) {
                    if (self.config[type + 's']) {
                        $.each(self.config[type + 's'], function (index, data) {
                            self.render(type, data.name);
                            // render bubble.
                            if (data.bubble && data.bubble.name && data.bubble.show) {
                                self.render('bubble', data.bubble.name);
                            }
                        });
                    }
                });

                this.layout.hide();
                this.loadStyle(function () {
                    self.layout.show();
                    self.updateVbar();
                });
                if (this._getVbarLocalStatus()) {
                    tracelog('display', this.config.name);
                }
                return this.layout;
            },
            // init vbar layout.
            initLayout: function (config) {
                var layoutTpl = templateEngine.compile(this.template.layout);
                var layout = $(layoutTpl(config));

                layout.appendTo($('body'));

                return layout;
            },
            // load the main style sheet.
            loadStyle: function (callback) {
                require.use('//assets.1688.com/app/vbar/1.0.0/view.css', function () {
                    callback && callback();
                });
            },
            // update the vbar status and style.
            updateVbar: function () {
                var self = this,
                    open = this._getVbarLocalStatus();

                // show or hide vbar.
                if (open && this.config && this.config.autoHide) {
                    $.each(this.config.autoHide, function (index, data) {
                        if (data.min <= $(window).width() && $(window).width() <= data.max) {
                            open = false;
                            return false;
                        }
                    });
                }

                this.updateVbarStyle(open);
                animation.showVbar(this.layout, open);
            },
            updateVbarStyle: function (show) {
                if (show) {
                    this.updateMainStyle();
                    this.updatePanelStyle();
                } else {
                    var targetItems = $('div.vbar-main li', this.layout);
                    targetItems.removeClass('selected');
                }
            },
            updateMainStyle: function () {
                var vbarMain = $('div.vbar-main', this.layout),
                    promotions = $('div.vbar-promotions', vbarMain),
                    menus = $('div.vbar-menus', vbarMain),
                    tools = $('div.vbar-tools', vbarMain),
                    promotionsWrapper = $('ul.vbar-promotions-wrapper', promotions),
                    toolsWrapper = $('ul.vbar-tools-wrapper', tools),
                    promotionsConfig = this.config['promotions'],
                    menusConfig = this.config['menus'],
                    toolsConfig = this.config['tools'],
                    promotionsWrapperHeight = 0,
                    menusWrapperHeight = 0,
                    toolsWrapperHeight = 0
                    hideWrapperHeight = 60; // 固定高度

                // 计算promotions高度
                if (promotionsConfig && promotionsConfig.length > 0) {
                    $.each(promotionsConfig, function (index, config) {
                        var now = new Date(),
                            start = (config.indate && config.indate.start) ? dateUtil.parseDate(config.indate.start, 'yyyy-MM-dd hh:mm:ss') : null,
                            end = (config.indate && config.indate.end) ? dateUtil.parseDate(config.indate.end, 'yyyy-MM-dd hh:mm:ss') : null;
                        if ((start && (start.getTime() > now.getTime())) || (end && (end.getTime() < now.getTime()))) {
                            return;
                        }
                        if (config.size && config.size.height) {
                            promotionsWrapperHeight += config.size.height;
                        }
                    });
                }
                // 计算menus高度 = "我"高度 +  一个menu的高度(70) * (menu数量 - 1)
                menusWrapperHeight = 80;
                if (menusConfig && menusConfig.length > 0) {
                    menusWrapperHeight += 63 * (menusConfig.length - 1);
                }
                // 计算tools高度 = 一个tool的高度(38) * tool数量
                if (toolsConfig && toolsConfig.length > 0) {
                    toolsWrapperHeight = 36 * toolsConfig.length;
                }

                var promotionsHeight, toolsHeight,
                    sumHeight = $(window).height() - menusWrapperHeight - hideWrapperHeight;

                if (sumHeight <= 0) {
                    promotionsHeight = toolsHeight = 0;
                } else if (promotionsWrapperHeight <= 0 && toolsWrapperHeight > 0) {
                    promotionsHeight = Math.floor((sumHeight - toolsWrapperHeight) / 2);
                    toolsHeight = toolsWrapperHeight + promotionsHeight;
                } else if (toolsWrapperHeight <= 0 && promotionsWrapperHeight > 0) {
                    toolsHeight = Math.floor((sumHeight - promotionsWrapperHeight) / 2);
                    promotionsHeight = promotionsWrapperHeight + toolsHeight;
                } else {
                    sumHeight -= (promotionsWrapperHeight + toolsWrapperHeight);
                    promotionsHeight = promotionsWrapperHeight + Math.floor(sumHeight / 2);
                    toolsHeight = toolsWrapperHeight + sumHeight - Math.floor(sumHeight / 2);
                }

                promotionsWrapper.css({top: promotionsHeight - promotionsWrapperHeight});
                toolsWrapper.css({top: toolsHeight - toolsWrapperHeight});
                promotions.css({height: promotionsHeight});
                tools.css({height: toolsHeight});
            },
            updatePanelStyle: function () {
                var panel = $('li.vbar-panel', this.layout),
                    panelHead = $('div.panel-hd', panel),
                    panelContainer = $('div.panel-container', panel);

                if (panelContainer && panelContainer.length > 0) {
                    panelContainer.css({height: $(window).height() - panelHead.height()});
                }
            },
            // render vbar promotion/menu/tool/link/panel/bubble item, like render('menu', 'right').
            render: function (type, name) {
                if (!this.checkEvent('render', type, name)) {
                    return false;
                }
                var config = this.getItemConfig(type, name);

                if (type === 'link') { // link needless render.
                    var linkConfig = config && config['link'];

                    if (!linkConfig || !linkConfig.href) {
                        return;
                    } else if (typeof linkConfig.href === 'function') {
                        return linkConfig.href(exports);
                    } else {
                        return window.open(linkConfig.href, linkConfig.target);
                    }
                } else if (type === 'promotion') { // promotion's render depend on indate.
                    var now = new Date(),
                        start = (config.indate && config.indate.start) ? dateUtil.parseDate(config.indate.start, 'yyyy-MM-dd hh:mm:ss') : null,
                        end = (config.indate && config.indate.end) ? dateUtil.parseDate(config.indate.end, 'yyyy-MM-dd hh:mm:ss') : null;
                    if ((start && (start.getTime() > now.getTime())) || (end && (end.getTime() < now.getTime()))) {
                        return false;
                    }
                }

                // check item is exist.
                var node = $('[data-type=' + type + '][data-name=' + name + ']', this.layout);
                if (node && node.length > 0) {
                    return node;
                }

                var template = this.templates[type];
                if (config !== null && template) {
                    node = $(template(config));

                    if (node && node.length > 0) {
                        // add to layout.
                        var itemsWrapper = $('ul.vbar-' + type + 's-wrapper', this.layout);
                        if (itemsWrapper && itemsWrapper.length > 0) {
                            node.appendTo(itemsWrapper);

                            if (type === 'panel') {
                                // set panel wrapper height.
                                var panel = node,
                                    panelHead = $('div.panel-hd', panel),
                                    panelContainer = $('div.panel-container', panel);

                                if (panelContainer && panelContainer.length > 0) {
                                    panelContainer.css({height: $(window).height() - panelHead.height()});
                                }
                                var scroller = new Scroller(panelContainer);
                            }
                        }

                        // render remote content for panel or bubble.
                        if (config[type] && config[type].remote) {
                            var wrapper = $('.vbar-' + type + '-wrapper', node);
                            this.renderRemote(config[type].remote, wrapper);
                        }
                    }

                }

                return node;
            },
            // render remote content with config.
            renderRemote: function (config, wrapper) {
                if (!(config && wrapper && wrapper.length > 0)) {
                    return;
                }
                var self = this,
                    cssDefer = $.Deferred(),
                    htmDefer = $.Deferred();
                // get css.
                if (config.css && config.css.length > 0) {
                    require.use(config.css, function () {
                        cssDefer.resolve();
                    });
                }
                // get htm.
                if (config.htm && config.htm.length > 0) {
                    $.ajax({
                        dataType: 'jsonp',
                        url: config.htm,
                        data: config.data,
                        timeout: 5000,
                        success: function (result) {
                            if (result.isSuccess) {
                                var html = config.type === 'app' ? result.result[0].html : result.data;

                                var node = $(html);
                                if (node.length > 0) {
                                    wrapper.html(node);
                                }
                                htmDefer.resolve();
                            }
                        }, // ~success
                        error: function () {
                            htmDefer.resolve();
                        } // ~error
                    });
                }
                // get js.
                $.when(cssDefer, htmDefer).done(function () {
                    if (config.js && config.js.length > 0) {
                        require.use(config.js, function () {
                            config.callback && config.callback(exports, wrapper.children());
                        });
                    }
                });
            },
            // open vbar link/panel/bubble item, like open('panel', 'right').
            open: function (type, name) {
                if (!this.checkEvent('open', type, name)) {
                    return false;
                }

                var self = this;
                // render item.
                this.render(type, name);
                // show item.
                if (type === 'panel') {
                    var config = this.getItemConfig(type, name),
                        targetItems = $('div.vbar-main li', this.layout),
                        targetItem = targetItems.filter('[data-name=' + config.name + ']');
                    targetItems.removeClass('selected');
                    targetItem.addClass('selected');
                    $.when(animation.showMain(this.layout, true)).done(function () {
                        animation.showPanel(self.layout, true, name);
                    });
                } else if (type === 'bubble') {
                    $('div.vbar-bubbles li.vbar-bubble[data=' + name + ']', this.layout).data('show', true);
                    $.when(animation.showMain(this.layout, true)).done(function () {
                        animation.showBubble(self.layout, true, name);
                    });
                }

                return true;
            },
            // close vbar link/panel/bubble item, like close('bubble', 'right').
            close: function (type, name) {
                if (!this.checkEvent('close', type, name)) {
                    return false;
                }

                // hide item.
                if (type === 'panel') {
                    var targetItems = $('div.vbar-main li', this.layout);
                    targetItems.removeClass('selected');
                    animation.showPanel(this.layout, false, name);
                } else if (type === 'bubble') {
                    $('div.vbar-bubbles li.vbar-bubble[data=' + name + ']', this.layout).data('show', false);
                    animation.showBubble(this.layout, name, false);
                }

                return true;
            },
            hidePanels: function () {
                var targetItems = $('div.vbar-main li', this.layout);
                targetItems.removeClass('selected');
                animation.showPanel(this.layout, false);
            },
            hidebubbles: function () {
                animation.showBubbles(this.layout, false);
            },
            checkEvent: function (event, type, name) {
                // check param.
                if (!event || !type || !name) {
                    return false;
                }
                // check event of the type.
                if (!(this.validEvents[event] && this.validEvents[event][type])) {
                    return false;
                }
                // check the name of the type.
                var config = this.getItemConfig(type, name);
                if (config === null) {
                    return false;
                }

                return true;
            },
            // update vbar item icon.
            updateIcon: function (type, name, iconUrl, errUrl) {
                var self = this,
                    node = $('[data-type=' + type + '][data-name=' + name + ']', this.layout),
                    image = new Image();

                image.onload = function () {
                    var divIcon = node.find('div.icon'),
                        imgIcon = node.find('img.icon');
                    if (divIcon.length > 0) {
                        divIcon.css({'background-image': 'url(' + iconUrl + ')'});
                    } else if (imgIcon.length > 0) {
                        imgIcon.attr('src', iconUrl);
                    }

                    self.updateVbarStyle();
                };
                image.onerror = function () {
                    var divIcon = node.find('div.icon'),
                        imgIcon = node.find('img.icon');
                    if (divIcon.length > 0) {
                        divIcon.css({'background-image': 'url(' + errUrl + ')'});
                    } else if (imgIcon.length > 0) {
                        imgIcon.attr('src', errUrl);
                    }

                    self.updateVbarStyle();
                };
                image.src = iconUrl;
            },
            // show vbar if vbar hide.
            showVbar: function () {
                this._setVbarLocalStatus(true);
                this.updateVbarStyle(true);
                animation.showVbar(this.layout, true);
            },
            hideVbar: function () {
                this._setVbarLocalStatus(false);
                this.updateVbarStyle(false);
                animation.showVbar(this.layout, false);
            },
            _getVbarLocalStatus: function() {
                try {
                    var status = true; // TODO localstorage.getItem('site-vbar-open') !== 'false';
                    return status;
                }catch(e) {
                    // do nothing
                }
                return true;
            },
            _setVbarLocalStatus: function(status) {
                try{
                	localstorage.setItem('site-vbar-open', status);
            	}catch(e){
            		//do nothing
            	}
            },
            /* return the config of which the item belongs to.
             * the config of the panel(bubble, link) is promotion, menu or tool,
             * which it belongs to.
             */
            getItemConfig: function (type, name) {
                if (!this.config || !type || !name) {
                    return null;
                }
                var self = this,
                    config = null;
                $.each(['promotion', 'menu', 'tool'], function (index, value) {
                    $.each(self.config[value + 's'], function (index, data) {
                        if ((value === type && data.name === name) ||
                            (data[type] && data[type].name === name)) {
                            config = $.extend(data, {type: value});
                            return false;
                        }
                    });
                    if (config !== null) {
                        return false;
                    }
                });
                return config;
            },
            /**
             * return the dom of vbar.
             * @param type string ie: "promotion" | "menu" | "tool", return the root DOM of vbar if null.
             * @param name string the name of the type, return the all DOM of the type if null.
             */
            getItem: function (type, name) {
                var vbarDom = $('div.vbar', 'body'),
                    result = vbarDom;

                if (type && type.length > 0) {
                    result = $('[data-type="' + type + '"]', result);
                    if (name && name.length > 0) {
                        result = $('[data-name=' + name + ']', result);
                    }
                }

                return result;
            },

            template: {
                layout: '<div class="vbar {{name}} {{if modSpm }}mod-spm{{/if}}" {{if modSpm }}data-spm="{{modSpm}}"{{/if}}>\
                        <div class="vbar-main" style="display:none">\
                            <div class="vbar-promotions" data-type="promotions">\
                                <ul class="vbar-promotions-wrapper"></ul>\
                            </div>\
                            <div class="vbar-menus" data-type="menus">\
                                <ul class="vbar-menus-wrapper"></ul>\
                            </div>\
                            <div class="vbar-tools" data-type="tools">\
                                <ul class="vbar-tools-wrapper"></ul>\
                            </div>\
                            <div class="vbar-hide"></div>\
                        </div>\
                        <div class="vbar-sub" style="display:none">\
                            <div class="vbar-tools" data-type="tools">\
                                <ul class="vbar-tools-wrapper"></ul>\
                            </div>\
                            <div class="vbar-show"></div>\
                        </div>\
                        <div class="vbar-panels" data-type="panels">\
                            <div class="vbar-panels-bg"></div>\
                            <ul class="vbar-panels-wrapper"></ul>\
                        </div>\
                        <div class="vbar-bubbles" data-type="bubbles">\
                            <ul class="vbar-bubbles-wrapper"></ul>\
                        </div>\
                    </div>',
                promotion: '<li class="vbar-promotion {{name}}" title="{{title}}" data-name="{{name}}" data-type="promotion" style="{{if size}}width:{{size.width}}px; height:{{size.height}}px{{/if}}">\
                           <div class="icon promotion-icon" style="background:url({{icon}}) left bottom no-repeat; {{if size}}width:{{size.width}}px; {{if stretchTop}}height:10000px {{else}}height:{{size.height}}px{{/if}}; margin-left:{{36-size.width}}px{{/if}}">\
                           </div>\
                       </li>',
                menu: '<li class="vbar-menu {{name}}" title="{{title}}" data-name="{{name}}" data-type="menu">\
                      {{if iconType === "image"}}\
                      <img class="icon menu-icon" src="{{icon}}"/>\
                      {{else}}\
                      <div class="icon menu-icon" style="background-image:url({{icon}});"></div>\
                      {{/if}}\
                      <div class="menu-title">{{title}}</div>\
                  </li>',
                tool: '<li class="vbar-tool {{name}}" title="{{title}}" data-name="{{name}}" data-type="tool">\
                      <div class="icon tool-icon" style="background-image:url({{icon}});"></div>\
                  </li>',
                panel: '<li class="vbar-panel {{panel.name}}" data-name="{{panel.name}}" data-type="panel">\
                       <div class="panel-hd">\
                           <div class="panel-title">{{panel.title}}</div>\
                           <a href="javascript:;" class="vbar-panel-close" target="_self"></a>\
                       </div>\
                       <div class="panel-bd">\
                           <div class="panel-container">\
                               <div class="vbar-panel-wrapper">\
                                   <div class="loading"><img src="//cbu01.alicdn.com/cms/upload/2014/590/188/1881095_2071302863.gif"/></div>\
                               </div>\
                           </div>\
                       </div>\
                   </li>',
                bubble: '<li class="vbar-bubble {{bubble.name}}" data-name="{{bubble.name}}" data-hard="{{if bubble.hard}}true{{/if}}" data-show="{{if bubble.show}}true{{/if}}" data-belongtype="{{type}}" data-belongname="{{name}}" data-type="bubble">\
                        <div class="vbar-bubble-wrapper"></div>\
                	    <a class="vbar-bubble-close" href="javascript:;" target="_self"></a>\
                    </li>'
            }
        };

        var animation = {
            showVbar: function (layout, show) {
                if (!layout || layout.length <= 0) {
                    return;
                }

                var self = this;
                if (show) {
                    $.when(this.showMain(layout, true)).done(function () {
                        self.showBubbles(layout, true);
                    });
                } else {
                    $.when(this.showBubbles(layout, false), this.showPanel(layout, false)).done(function () {
                        $.when(self.showMain(layout, false)).done(function () {
                            self.showBubbles(layout, true);
                        });
                    });
                }
            },
            showMain: function (layout, show) {
                var defer = $.Deferred();

                if (!layout || layout.length <= 0) {
                    return;
                }

                var vbarMain = $('div.vbar-main', layout),
                    vbarSub = $('div.vbar-sub', layout);

                if ((show && !vbarMain.is(':hidden')) || (!show && !vbarSub.is(':hidden'))) {
                    return;
                }

                var showMap = {'right': 0, 'opacity': 1},
                    hideMainMap = {'right': -vbarMain.width(), 'opacity': 0},
                    hideSubMap = {'right': -vbarSub.width(), 'opacity': 0},
                    delay = 150;
                if (show) {
                    vbarSub.stop(true, true).animate(hideSubMap, delay, function () {
                        vbarSub.hide();
                        vbarMain.show().stop(true, true).animate(showMap, delay, function () {
                            defer.resolve();
                        });
                    });
                } else {
                    vbarMain.stop(true, true).animate(hideMainMap, delay, function () {
                        vbarMain.hide();
                        vbarSub.show().stop(true, true).animate(showMap, delay, function () {
                            defer.resolve();
                        });
                    });
                }
                // trigger event @param [type, name, isShow]
                exports.trigger('show', 'vbar', 'main', show);
                return defer;
            },
            showPanel: function (layout, show, name) {
                if (!layout || layout.length <= 0) {
                    return;
                }
                var self = this,
                    vbarMain = $('div.vbar-main', layout),
                    panels = $('div.vbar-panels', layout),
                    panelsWrapper = $('ul.vbar-panels-wrapper', panels),
                    panel = $('li.vbar-panel[data-name=' + name + ']', panels),
                    delay = 300;

                if ((show && !panel.is(':hidden')) ||
                    !show && panels.is(':hidden')) {
                    return;
                }

                var defer = $.Deferred();
                if (show) {
                    self.showBubbles(layout, false);
                    if (panels.is(':hidden')) {
                        panels.find('li.vbar-panel').hide();
                        panel.show();
                        panels.show().stop(true, true).animate({
                            'right': vbarMain.width(),
                            'opacity': 1
                        }, delay, function () {
                            defer.resolve();
                        });
                    } else {
                        panels.find('li.vbar-panel').hide();
                        panelsWrapper.css({
                            top: '100%',
                            opacity: 0
                        });
                        panel.show();
                        panelsWrapper.stop(true, true).animate({
                            top: '-100%',
                            opacity: 1
                        }, delay, function () {
                            defer.resolve();
                        });
                    }
                } else {
                    panels.stop(true, true).animate({
                        'right': -panels.width() + vbarMain.width(),
                        'opacity': 0
                    }, delay, function () {
                        panels.hide();
                        self.showBubbles(layout, true);
                        defer.resolve();
                    });
                }
                // trigger event @param [type, name, isShow]
                exports.trigger('show', 'panel', name, show);
                return defer;
            },
            showBubbles: function (layout, show) {
                if (!layout || layout.length <= 0) {
                    return;
                }

                var self = this,
                    bubble = $('div.vbar-bubbles li.vbar-bubble', layout),
                    defers = [];

                var defer = $.Deferred();
                bubble.each(function (index, ele) {
                    var bubble = $(ele);
                    defers.push(self.showBubble(layout, bubble.data('name'), show));
                });
                $.when(defers).done(function () {
                    defer.resolve();
                });
                // trigger event @param [type, name, isShow]
                exports.trigger('show', 'bubbles', '', show);
                return defer;
            },
            showBubble: function (layout, name, show) {
                if (!layout || layout.length <= 0) {
                    return;
                }

                var bubbles = $('div.vbar-bubbles', layout),
                    bubble = $('li.vbar-bubble[data-name=' + name + ']', bubbles);

                if (bubble.length <= 0 ||
                    show && !bubble.data('show') || !show && bubble.is('show')) {
                    return;
                }

                var showMap = {'opacity': 1},
                    hideMap = {'opacity': 0},
                    delay = 150;

                var defer = $.Deferred();
                if (show) {
                    var vbarMain = $('div.vbar-main', layout),
                        vbarSub = $('div.vbar-sub', layout),
                        target = vbarMain.is(':hidden') ? (vbarSub.is(':hidden') ? null : vbarSub) : vbarMain,
                        right = 'auto',
                        top = 'auto',
                        bottom = 'auto',
                        belongItem;

                    bubbles.show();
                    if (target === vbarMain) { // show for main vbar.
                        belongItem = $('[data-type=' + bubble.data('belongtype') + '][data-name=' + bubble.data('belongname') + ']', vbarMain);
                        if (belongItem.length <= 0) {
                            return true;
                        }
                        bubble.css({'opacity': 0, 'display': 'block'});
                        right = vbarMain.width();
                        top = (belongItem.offset().top - $(document).scrollTop()) + (belongItem.height() - bubble.height()) / 2;

                    } else if (target === vbarSub && bubble.data('hard')) { // show for pack vbar.
                        bubble.css({'opacity': 0, 'display': 'block'});
                        belongItem = $('div.vbar-show', vbarSub);
                        right = vbarSub.width();
                        bottom = 20 + (belongItem.height() - bubble.height()) / 2;
                        bottom = bottom > 0 ? bottom : 0;
                    } else {
                        return true; // just for showing next bubble.
                    }
                    bubble.css({
                        right: right,
                        top: top,
                        bottom: bottom
                    });
                    bubble.show().stop(true, true).animate(showMap, delay, function () {
                        defer.resolve();
                    });
                } else {
                    bubble.stop(true, true).animate(hideMap, delay, function () {
                        bubble.hide();
                        defer.resolve();
                    });
                }
                // trigger event @param [type, name, isShow]
                exports.trigger('show', 'bubble', name, show);
                return defer;
            }
        };

        var configHelper = {
            _fetchConfigObject: function (configName, callback) {
                var path = configName;
                if (!/^(https?:)?\/\//i.test(path)) {
                    path = '//assets.1688.com/app/vbar/1.0.0/js/' + encodeURIComponent(configName) + '-config.js';
                }
                require.use(path, function () {
                    var config = require('vbar.config');
                    callback(config);
                });
            },
            getConfigNameFromScript: function () {
                var script = getVbarScript();
                return script && script.attr('data-config');

            },
            checkPointcuts: function (config) {
                $.each(['menu', 'promotion', 'tool'], function (index, key) {
                    var configKey = key + 's';
                    var list = config[configKey];
                    $.each(list, function (index, item) {
                        if (item.beforeRender) {
                            exports.before('render', key, item.name, item.beforeRender);
                        }
                        if (item.afterRender) {
                            exports.after('render', key, item.name, item.afterRender);
                        }
                        $.each(['link', 'panel', 'bubble'], function (index2, key2) {
                            if (item[key2]) {
                                var subItem = item[key2];
                                if (subItem.beforeOpen) {
                                    exports.before('open', key2, subItem.name, subItem.beforeOpen);
                                }
                                if (subItem.afterOpen) {
                                    exports.after('open', key2, subItem.name, subItem.afterOpen);
                                }
                                if (subItem.beforeClose) {
                                    exports.before('close', key2, subItem.name, subItem.beforeClose);
                                }
                                if (subItem.afterClose) {
                                    exports.after('close', key2, subItem.name, subItem.afterClose);
                                }
                                if (subItem.beforeRender) {
                                    exports.before('render', key2, subItem.name, subItem.beforeRender);
                                }
                                if (subItem.afterRender) {
                                    exports.after('render', key2, subItem.name, subItem.afterRender);
                                }

                            }
                        });
                    });
                });
            },

            // 异步地获取 config 对象
            getConfig: function (config, callback) {
                if (!config) {
                    callback(null);
                } else if (typeof config === 'object') {
                    callback(config);
                } else if (typeof config === 'string') {
                    this._fetchConfigObject(config, callback);
                }
            }
        };


        exports.on = evt.on.bind(evt);
        exports.off = evt.off.bind(evt);
        exports.trigger = evt.trigger.bind(evt);

        exports.getDom = function () {
            var args = slice.call(arguments, 0);
            return view.getItem.apply(view, args);
        };
        exports.open = function () {
            var args = slice.call(arguments, 0);
            view.open.apply(view, args);
        };
        exports.render = function () {
            var args = slice.call(arguments, 0);
            view.render.apply(view, args);
        };
        exports.close = function () {
            var args = slice.call(arguments, 0);
            view.close.apply(view, args);
        };

        exports.hide = function () {
            view.hideVbar();
        };
        exports.show = function () {
            view.showVbar();
        };

        exports.config = null;
        exports.init = function (config, callback) {
            if (isIE6()) { return; }

            if (initialized) {
                return warn('You can not init vbar again.');
            }


            configHelper.getConfig(config, function (configObject) {
                if (!configObject) {
                    warn('vbar.init needs a config object or a config name, for example, "default".');
                    return;
                }

                configHelper.checkPointcuts(configObject);

                exports.config = configObject;
                evt.trigger('getConfig', exports.config);

                var container = view.init(configObject);
                event.init(container, configObject);

                callback && callback();

            });


        };

        exports.before = function (action, type, name, fn) {

            if (indexOf(['open', 'close', 'render'], action) >= 0) {

                aop.before(view, action, function (obj) {
                    var _type = obj.args[0];
                    var _name = obj.args[1];
                    if (type === _type && name === _name) {
                        return fn(exports) === false ? false : true;
                    }
                    return true;
                });

            }
        };

        exports.after = function (action, type, name, fn) {

            if (indexOf(['open', 'close', 'render'], action) >= 0) {

                aop.after(view, action, function (obj) {
                    var _type = obj.args[0];
                    var _name = obj.args[1];
                    if (type === _type && name === _name) {
                        fn.call(null, exports, obj.result);
                    }
                });

            }

        };

        exports.updateIcon = function (type, name, iconUrl, errUrl) {
            view.updateIcon(type, name, iconUrl, errUrl);
        };

        (function () {

            var config = configHelper.getConfigNameFromScript();
            if (config) {
                exports.init(config);
            } else {
                require.use(['vbar.config'], function () {
                    config = require('vbar.config');
                    exports.init(config);
                });
            }
        })();


        // private functions

        function isIE6() {

            if ($.browser) {
                return $.browser.msie && parseInt($.browser.version, 10) === 6;
            } else {
                return /\bMSIE 6/.test(navigator.userAgent) && !window.opera;
            }
        }

        function getVbarScript() {
            var script = $('script#vbar').get(0);
            return script;
        }

        function warn(content) {
            window.console && window.console.error(content);
        }

        function indexOf(array, item) {
            if (!array) {return -1;}

            var length = array.length;
            for (var i = 0; i < length; i++) {
                if (array[i] === item) {
                    return i;
                }
            }
            return -1;
        }

        function polyfill() {
            if (!Function.prototype.bind) {
                Function.prototype.bind = function (oThis) {
                    if (typeof this !== 'function') {
                        // closest thing possible to the ECMAScript 5
                        // internal IsCallable function
                        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
                    }

                    var aArgs = Array.prototype.slice.call(arguments, 1),
                        fToBind = this,
                        fNOP = function () {},
                        fBound = function () {
                            return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                                aArgs.concat(Array.prototype.slice.call(arguments)));
                        };

                    fNOP.prototype = this.prototype;
                    fBound.prototype = new fNOP();

                    return fBound;
                };
            }
        }

        function findByAttr(objectArray, attr, value) {
            if (!objectArray.length || objectArray.length <= 0) {
                return null;
            }
            for (var i = 0, l = objectArray.length; i < l; i++) {
                if (objectArray[i][attr] === value) {
                    return objectArray[i];
                }
            }
        }

        function tracelog(traceName, configName) {
            if (!configName) {
                window.console && window.console.error('tracelog needs config name');
                return;
            }

            traceName = encodeURIComponent(['leftbar', configName, traceName].join('_'));

            var param = 'tracelog=' + traceName;
            var url = '//gm.mmstat.com/btob.6?';

            if (window.dmtrack !== undefined) {
                window.dmtrack.clickstat(url, param);
            } else {
                (new Image()).src = url + 'gokey=' + encodeURIComponent(param) + '&time=' + (new Date().getTime());
            }
        }

        function getAvatarById(memberId) {
            if (!memberId) { return; }
            var base = '//cbu01.alicdn.com/club/upload/pic/user/';
            return base + memberId.substring(0, 4).split('').join('/') + '/' + memberId + '_s.jpeg';
        }

    }

    define('vdrag', ['jquery'], function ($) {
        var VerticalDrag = function (dom, options) {
            this.dom = $(dom).eq(0);
            this.options = options || {};
            if (this.dom.length === 0) {
                return;
            }
            this._bindEvents();

        };
        VerticalDrag.prototype.update = function (options) {
            $.extend(this.options, options);
        };

        VerticalDrag.prototype._bindEvents = function () {

            var self = this;
            var pageYFrom, pageYTo;

            this.dom
                .on('mousedown.VerticalDrag', function (e) {
                    pageYFrom = e.pageY;
                    $('body').on('selectstart.VerticalDrag', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                });

            $(document)
                .on('mouseup.VerticalDrag', function () {
                    pageYFrom = undefined;
                    $('body').off('selectstart.VerticalDrag');
                })
                .on('mousemove.VerticalDrag', function (e) {
                    if (pageYFrom === undefined) {
                        return;
                    }
                    pageYTo = e.pageY;
                    var delta = pageYTo - pageYFrom;
                    var oldTop = parseInt(self.dom.css('top'), 10);
                    var newTop = oldTop + delta;
                    if (newTop <= (self.options.min || 0)) {
                        newTop = self.options.min || 0;
                    } else if (self.options.max && newTop >= self.options.max) {
                        newTop = self.options.max;
                    }
                    if (newTop !== oldTop) {
                        self.dom.css({top: newTop})
                            .trigger('vdrag', newTop);
                    }

                    pageYFrom = pageYTo;
                });

        };


        return VerticalDrag;
    });


    define('scroller', ['jquery', 'vdrag'], function ($, Vdrag) {
        var Scroller = function (element, options) {
            var $element = $(element);
            if ($element.length > 1) {
                throw('You can not instance so many scroller for one time');
            }
            this.element = $element;
            this.child = $element.children().eq(0);

            if ($element.data('scrollerInitialized')) {
                throw 'You can not instance a scroller for multiply times';
            }
            $element.data('scrollerInitialized', true);

            this._setup();
        };

        Scroller.prototype.step = 100;
        Scroller.prototype.interval = 150;

        Scroller.prototype.scroll = function (dir) {
            if (this._noScroll()) { return; }
            if (this._isMoving) { return; }

            var self = this;

            this._stopScroll();
            this._isMoving = true;

            var top;
            if (dir === 'down') {
                top = this._moveChild('up');
                this._syncBar(top, function () {
                    self._isMoving = false;
                });
            } else {
                top = this._moveChild('down');
                this._syncBar(top, function () {
                    self._isMoving = false;
                });
            }

        };

        Scroller.prototype._stopScroll = function () {
            this.child.stop(true, false);
            this.bar.stop(true, false);
            this._isMoving = false;
        };

        Scroller.prototype._atTop = function () {
            var originalTop = Math.abs(parseInt(this.child.css('top'), 10));
            return originalTop <= 0;
        };

        Scroller.prototype._getMaxScrollTop = function () {
            var delta = this.child.height() - this.element.height();
            return delta > 0 ? delta : 0;
        };

        Scroller.prototype._atBottom = function () {

            var originalTop = Math.abs(parseInt(this.child.css('top'), 10));
            var maxScrollTop = this._getMaxScrollTop();
            return originalTop >= maxScrollTop;

        };

        Scroller.prototype._moveChildTo = function (top) {
            top = Math.abs(top);
            if (top <= 0) {
                top = 0;
            } else if (top >= this._getMaxScrollTop) {
                top = this._getMaxScrollTop();
            }

            this.child.stop(true, true).animate({
                top: -top
            }, {
                duration: this.interval,
                easing: 'swing'
            });
        };

        Scroller.prototype._moveChild = function (dir, callback) {
            var originalTop = Math.abs(parseInt(this.child.css('top'), 10));
            var maxScrollTop = this._getMaxScrollTop();
            var top;


            if (dir === 'up') {
                if (maxScrollTop - originalTop <= this.step) {
                    top = -maxScrollTop;
                } else {
                    top = -(originalTop + this.step);
                }
            } else {

                if (originalTop <= this.step) {
                    top = 0;
                } else {
                    top = -(originalTop - this.step);
                }
            }
            this.child.stop(true, true).animate({
                top: top
            }, {
                duration: this.interval,
                easing: 'swing',
                complete: callback ? callback : undefined
            });

            return top;

        };
        Scroller.prototype._getRatio = function () {

            return (this.element.height() - this.bar.height()) /
                (this.child.height() - this.element.height());

        };

        Scroller.prototype._syncBar = function (childTop, callback) {
            childTop = Math.abs(childTop);
            var expectedBarHeight = this.element.height() *
                (this.element.height() / (this.child.height() ));
            var barHeight = this.bar.height();
            if (expectedBarHeight !== barHeight) {
                barHeight = expectedBarHeight;
                this.bar.height(barHeight);
            }
            var top = childTop * this._getRatio();
            var self = this;
            this.bar.css({
                'opacity': 1
            }).stop(true, true).animate({
                top: top
            }, this.interval, function () {
                self._hideBar();
                callback && callback();
            });
        };

        Scroller.prototype._showBar = function () {
            if (this._noScroll()) { return; }
            this.bar.css({opacity: 1});
            if (this.timerForHideBar) {
                clearTimeout(this.timerForHideBar);
            }
        };

        Scroller.prototype._hideBar = function (immediately) {
            var self = this;
            if (this.timerForHideBar) {
                clearTimeout(this.timerForHideBar);
            }
            if (immediately) {
                self.bar.css({opacity: 0});
            } else {
                this.timerForHideBar = setTimeout(function () {
                    self.bar.animate({opacity: 0}, self.interval);
                }, 1000);
            }
        };

        Scroller.prototype._underCursor = null;

        Scroller.prototype._bindEvents = function () {
            var self = this;

            $(document).on('keyup', function (e) {
                if (!Scroller.prototype._underCursor) { return; }
                var that = Scroller.prototype._underCursor;
                switch (e.which) {
                    case 40: // down
                        that.scroll('down');
                        break;
                    case 38: // up
                        that.scroll('up');
                        break;
                }
            });
            this.element
                .on('mouseenter mousemove', function () {
                    self._showBar();
                    self._updateBar();
                    Scroller.prototype._underCursor = self;
                })
                .on('mouseleave', function () {
                    self._hideBar();
                    Scroller.prototype._underCursor = null;
                }).on('DOMMouseScroll mousewheel', function (event) {
                    event.stopPropagation();
                    event.preventDefault();
                    if (event.originalEvent.detail > 0 || event.originalEvent.wheelDelta < 0) { //alternative options for wheelData: wheelDeltaX & wheelDeltaY
                        self.scroll('down');
                    } else {
                        self.scroll('up');
                    }
                    return false;
                });
        };
        Scroller.prototype._setupChild = function (top) {
            this.child.css({
                position: 'relative',
                top: top || 0,
                left: 0
            });
        };

        Scroller.prototype._updateBar = function () {
            if (this._noScroll()) {
                this._hideBar(true);
            } else {
                var old = this.bar.height();
                var barHeight = this.element.height() *
                    (this.element.height() / (this.child.height() ));
                if (old !== barHeight) {
                    this.bar.css({height: barHeight + 'px'});
                    this.barThumb.css({height: barHeight - 6 + 'px'});
                    this.barBody.css({height: barHeight - 6 - 4 + 'px'});
                    this.vdrag.update({max: this._getMaxScrollTop() * this._getRatio()});
                }
            }

        };

        Scroller.prototype._noScroll = function () {
            return this.element.height() >= this.child.height();
        };

        Scroller.prototype._setupBar = function () {
            var self = this;
            var barWidth = 10;
            var barHeight = this.element.height() *
                (this.element.height() / (this.child.height() ));
            this.bar = $('<div></div>').appendTo(this.element)
                .css({
                    position: 'absolute',
                    right: '3px',
                    top: 0,
                    width: barWidth,
                    height: barHeight,
                    opacity: 0
                });

            this.vdrag = new Vdrag(this.bar, {max: this._getMaxScrollTop()});
            this.bar.on('vdrag', function (event, top) {
                self._moveChildTo(-top / self._getRatio());
            });


            var barThumb = this.barThumb = $('<div></div>').appendTo(this.bar)
                .css({
                    height: barHeight - 6 + 'px',
                    top: '3px',
                    width: '100%',
                    position: 'absolute',
                    background: 'url("//cbu01.alicdn.com/cms/upload/2014/590/419/1914095_2071302863.png") no-repeat'
                });

            var barBody = this.barBody = $('<div></div>').appendTo(barThumb)
                .css({
                    'height': barHeight - 6 - 4 + 'px',
                    'position': 'absolute',
                    'bottom': 0,
                    'width': '100%',
                    'background': 'url(//cbu01.alicdn.com/cms/upload/2014/601/419/1914106_2071302863.png) no-repeat 0 bottom'
                });
        };

        Scroller.prototype._setup = function () {

            this.element.css({
                overflow: 'hidden',
                position: 'relative'
            });

            this._bindEvents();
            this._setupChild();
            this._setupBar();
        };


        Scroller.prototype.update = function () {
            this._stopScroll();
            this._updateBar();
        };

        return Scroller;
    });

    define('vbar', ['exports', 'require', 'lofty/lang/observer', 'lofty/lang/aop', 'jquery', 'util/template/2.0', 'util/localstorage/1.0', 'util/date/1.0', 'scroller'], vbarFactory);

    /**
     * nofity plugin
     * 配置示例:
     *  notify : {
     *      topics: string | []; // 关注的消息主题
     *      sources: string | []; // 消息主题来源
     *  }
     * 当获取到消息主题时会发送'notify_update'vbar全局事件; 外部也可以通过发送'notify_update'事件来更新消息。
     * notify_update事件函数声明：function(topic //主题名称, enable //主题状态);
     */
    define(['jquery', 'vbar', 'lofty/alicn/aliuser/1.0/aliuser'], function ($, vbar, aliuser) {
        if (aliuser.getLoginId() === null) {
            return;
        }
        if (vbar.config) {
            onGetConfig(vbar.config);
        } else {
            vbar.on('getConfig', onGetConfig);
        }

        function onGetConfig(config) {
            var items = ['promotions', 'menus', 'tools'],
                notifySources = [];
            $.each(items, function (_, item) {
                if (config[item]) {
                    $.each(config[item], function(_, subItem) {
                        var notify = subItem['notify'];
                        if (notify) {
                            if (notify.sources && notify.sources.length > 0) {
                                notifySources = notifySources.concat(notify.sources);
                            }
                        }
                    });
                }
            });
            if (notifySources.length > 0) {
                // unique notifySources.
                var obj = {}, sources = [];
                $.each(notifySources, function(_, item) {
                    if (!obj[item]) {
                        sources.push(item);
                        obj[item] = 1;
                    }

                });

                $.each(sources, function(index, source) {

                    if (source && source.length > 0) {
                        $.ajax({
                            url: source,
                            dataType: 'JSONP',
                            success: function(result) {

                                if (result && result.topics && result.topics.length > 0) {
                                    $.each(result.topics, function(_, topic) {
                                        vbar.trigger('notify_update', topic, true);
                                    });
                                }
                            }
                        });
                    }
                });
            }
        }

        // subscribe the notify topic.
        vbar.on('notify_update', function(topic, enable) {
            if (!vbar.config) {
                return;
            }
            var types = ['promotions', 'menus', 'tools'],
                template = '<div class="notify"></div>';
            $.each(types, function (_, type) {
                if (vbar.config[type]) {
                    $.each(vbar.config[type], function(_, config) {
                        var notify = config['notify'];
                        if (notify) {
                            if (notify.topics && ((typeof notify.topics === 'string' && notify.topics === topic)
                                || ($.isArray(notify.topics) && $.inArray(topic, notify.topics) > -1))) {
                                var node = vbar.getDom(type, config.name);
                                node.each(function(index, item) {
                                    var notifyDom = $('div.notify', item),
                                        topics = notifyDom.data('topics') || [],
                                        topicIndex = $.inArray(topic, topics);

                                    if (enable) {
                                        if (topicIndex  === -1) {
                                            topics.push(topic);
                                        }
                                    } else {
                                        if (topicIndex > -1) {
                                            topics.splice(topicIndex, 1);
                                        }
                                    }

                                    if (notifyDom.length === 0) {
                                        notifyDom = $(template);
                                        notifyDom.data('topics', topics);
                                        notifyDom.appendTo(item);
                                    }
                                    topics.length > 0 ? notifyDom.show() : notifyDom.hide();
                                });
                            }
                        }
                    });
                }
            });
        });
    });

    define([
        'require', 'vbar', 'jquery', 'lofty/alicn/aliuser/1.0/aliuser', 'sys/logist/1.0'
    ], function (require, vbar, $, user, logist) {

        if (vbar.config) {
            onGetConfig(vbar.config);
        } else {
            vbar.on('getConfig', onGetConfig);
        }

        var isLogin = user.isLogin();

        function onGetConfig(config) {
            var items = ['promotions', 'menus', 'tools'];
            $.each(items, function (_, item) {
                if (config[item]) {
                    $.each(config[item], function (_, subItem) {
                        var checks = ['panel', 'link', 'bubble'];
                        $.each(checks, function (_, type) {
                            if (subItem[type] && subItem[type].login) {
                                vbar.before('open', type, subItem[type].name, function () {
                                    if (!isLogin) {
                                        popLogin();
                                        return false;
                                    }
                                    return true;
                                });
                            }
                        });
                    });
                }
            });
        }

        function popLogin() {
            var loginItem = $('#sys-logist');
            if (loginItem.length > 0 && !loginItem.is(':hidden')) { return; }
            require.use('//astyle-src.alicdn.com/sys/css/logist/logist.css');
            logist.init({
                source: 'bar',
                tab: 'login',
                onLoginSuccess: function () {
                    window.location.reload();
                }
            });
        }
    });


}());


