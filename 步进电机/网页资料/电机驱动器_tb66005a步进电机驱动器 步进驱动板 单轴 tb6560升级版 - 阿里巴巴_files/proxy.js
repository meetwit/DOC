/**
 * 内站版s
 */
(function() {
    let doc = document;
    let valveUrl = 'https://dcms.1688.com/open/jsonp/old-pm-qyzx.json';
    let isDetail = location.host.indexOf('detail.1688.com') !== -1;


    function getScript(url) {
        let h = doc.getElementsByTagName('head')[0],
            s = doc.createElement('script');

        s.id      = 'oPMWebIM';
        s.type    = 'text/javascript';
        s.src     = url;
        s.charset = 'UTF-8';

        h.insertBefore(s, null);
    }
    function getQueryString() {
        let qs = doc.getElementById('oPM_ProxyScript').src;
        return qs.substring(qs.indexOf('?')).replace(/\&_ts\=.*$/, '');
    }


    getRemoteValve(function(show) {
        if (!jQuery) {
            return;
        }

        if (show) {
          getScript(
              '//g.alicdn.com/assets-group/pm/pm/js/itbu/pm/jsserver/launcher-h5-src.js' +
              getQueryString() +
              '&_ts=20171001'
          );
        } else {
          getScript(
              '//g.alicdn.com/assets-group/pm/pm/js/itbu/pm/jsserver/launcher-v3-src.js' +
              getQueryString() +
              '&_ts=20151210'
          );
        }
    });

    /**
     * 远程获取七巧板上面的静态阈值配置
     *
     * @param {Fucntion} callback 回调，回调参数为判断是否切流
     */
    function getRemoteValve(callback) {
        if (!jQuery) {
            return;
        }

        jQuery.ajax({
            url: valveUrl,
            dataType: 'jsonp',
            success(data) {
                let valve = data.num || 0;
                let localValve = getLocalValve();

                if (((isDetail && data.offer) || (!isDetail && data.shop)) && localValve <= valve) {
                    callback(true);
                } else {
                    callback(false);
                }
            },
            fall(e) {
                console.log(e);
            },
        });
        // reqByScript(valveUrl, '', function(data) {
        //     var valve = data.num || 0;
        //     var localValve = getLocalValve();
        //     if (((isDetail && data.offer) || (!isDetail && data.shop)) && localValve <= valve) {
        //         callback(true);
        //     } else {
        //         callback(false);
        //     }
        // });
    }

    /**
     * 获取本地阈值
     *
     * @return {Number} 返回阈值，当不支持localStorage返回0，其他为1-1000的值
     */
    function getLocalValve() {
        let name = '_PM_qyzx_valve_';
        if (!localStorage) {
            return 1001;
        }

        let valve = parseInt(localStorage.getItem(name));
        if (!valve) {
            let newVal = Math.ceil(Math.random() * 1000);
            localStorage.setItem(name, newVal);
            return newVal;
        }
            return valve;

    }
})();

